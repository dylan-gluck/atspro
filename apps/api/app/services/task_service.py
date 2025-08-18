"""Task management service layer for ATSPro API."""

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

import psycopg_pool
import redis.asyncio as redis
from arango import ArangoClient

from ..config import settings
from ..queue.redis_queue import RedisQueue, TaskPriority
from ..queue.task_queue import TaskQueue

logger = logging.getLogger(__name__)


class TaskService:
    """Service layer for task management and database operations."""

    def __init__(
        self,
        postgres_url: Optional[str] = None,
        redis_url: Optional[str] = None,
        arango_url: Optional[str] = None,
    ):
        """Initialize task service.

        Args:
            postgres_url: PostgreSQL connection URL
            redis_url: Redis connection URL
            arango_url: ArangoDB connection URL
        """
        self.postgres_url = postgres_url or settings.database_url
        self.redis_url = redis_url or settings.redis_url
        self.arango_url = arango_url or settings.arango_url

        # Initialize clients (will be set up in startup)
        self.postgres_pool: Optional[psycopg_pool.AsyncConnectionPool] = None
        self.redis_client: Optional[redis.Redis] = None
        self.arango_client: Optional[ArangoClient] = None
        self.arango_db = None

        # Task queue components
        self.redis_queue: Optional[RedisQueue] = None
        self.task_queue: Optional[TaskQueue] = None

    async def startup(self) -> None:
        """Initialize database connections and components."""
        logger.info("Starting task service")

        # Initialize PostgreSQL connection pool
        try:
            self.postgres_pool = psycopg_pool.AsyncConnectionPool(
                self.postgres_url, min_size=1, max_size=10
            )
            logger.info("PostgreSQL connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL pool: {e}")
            raise

        # Initialize Redis client
        try:
            self.redis_client = redis.from_url(self.redis_url)
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            raise

        # Initialize ArangoDB client
        try:
            self.arango_client = ArangoClient(hosts=self.arango_url)

            # Connect to database
            if settings.arango_username and settings.arango_password:
                self.arango_db = self.arango_client.db(
                    settings.arango_database,
                    username=settings.arango_username,
                    password=settings.arango_password,
                )
            else:
                self.arango_db = self.arango_client.db(settings.arango_database)

            # Test connection and log database info
            collections = self.arango_db.collections()
            logger.info(
                f"ArangoDB client initialized for database '{settings.arango_database}' with user '{settings.arango_username}'"
            )
            logger.info(f"Available collections: {[c['name'] for c in collections]}")
        except Exception as e:
            logger.error(f"Failed to initialize ArangoDB client: {e}")
            raise

        # Initialize queue components
        self.redis_queue = RedisQueue(
            self.redis_client, queue_prefix=settings.redis_queue_prefix
        )
        self.task_queue = TaskQueue(self.redis_queue)

        logger.info("Task service startup completed")

    async def shutdown(self) -> None:
        """Clean up database connections."""
        logger.info("Shutting down task service")

        if self.postgres_pool:
            await self.postgres_pool.close()

        if self.redis_client:
            await self.redis_client.close()

        logger.info("Task service shutdown completed")

    async def create_task(
        self,
        task_type: str,
        payload: Dict[str, Any],
        user_id: Optional[str] = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        max_retries: int = 3,
        estimated_duration_ms: Optional[int] = None,
    ) -> str:
        """Create a new task.

        Args:
            task_type: Type of task to create
            payload: Task payload data
            user_id: ID of user creating the task
            priority: Task priority level
            max_retries: Maximum retry attempts
            estimated_duration_ms: Estimated processing time

        Returns:
            Task ID
        """
        # Submit task to queue
        task_id = await self.task_queue.submit_task(
            task_type=task_type,
            payload=payload,
            user_id=user_id,
            priority=priority,
            max_retries=max_retries,
            estimated_duration_ms=estimated_duration_ms,
        )

        # Store task in PostgreSQL
        await self._store_task_in_postgres(
            task_id=task_id,
            task_type=task_type,
            user_id=user_id,
            payload=payload,
            priority=priority.value,
            max_retries=max_retries,
            estimated_duration_ms=estimated_duration_ms,
        )

        logger.info(f"Created task {task_id} of type {task_type}")
        return task_id

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task information.

        Args:
            task_id: Task ID

        Returns:
            Task information or None if not found
        """
        # Get from Redis queue first (most up-to-date status)
        logger.debug(f"Looking for task {task_id} in Redis queue")
        task_data = await self.task_queue.get_task_status(task_id)
        if task_data:
            logger.debug(
                f"Found task {task_id} in Redis with status {task_data.get('status')}"
            )
            return task_data

        # Fallback to PostgreSQL
        logger.debug(f"Task {task_id} not found in Redis, checking PostgreSQL")
        pg_task_data = await self._get_task_from_postgres(task_id)
        if pg_task_data:
            logger.debug(
                f"Found task {task_id} in PostgreSQL with status {pg_task_data.get('status')}"
            )
        else:
            logger.debug(f"Task {task_id} not found in PostgreSQL either")
        return pg_task_data

    async def get_user_tasks(
        self,
        user_id: str,
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get tasks for a specific user.

        Args:
            user_id: User ID
            status: Optional status filter
            task_type: Optional task type filter
            limit: Maximum number of tasks to return
            offset: Number of tasks to skip

        Returns:
            List of task information
        """
        return await self._get_user_tasks_from_postgres(
            user_id=user_id,
            status=status,
            task_type=task_type,
            limit=limit,
            offset=offset,
        )

    async def cancel_task(self, task_id: str, user_id: Optional[str] = None) -> bool:
        """Cancel a task.

        Args:
            task_id: Task ID to cancel
            user_id: Optional user ID for authorization

        Returns:
            True if task was cancelled, False otherwise
        """
        # Verify task ownership if user_id provided
        if user_id:
            task = await self.get_task(task_id)
            if not task or task.get("user_id") != user_id:
                return False

        # Cancel in queue
        success = await self.task_queue.cancel_task(task_id)

        if success:
            # Update PostgreSQL
            await self._update_task_status_in_postgres(
                task_id=task_id, status="cancelled", completed_at=datetime.utcnow()
            )

        return success

    async def store_task_result(
        self, task_id: str, result: Dict[str, Any], result_id: Optional[str] = None
    ) -> str:
        """Store task result in ArangoDB.

        Args:
            task_id: Task ID
            result: Task result data
            result_id: Optional specific result ID

        Returns:
            Result document ID
        """
        if not result_id:
            result_id = str(uuid4())

        # Add metadata
        result_doc = {
            "_key": result_id,
            "task_id": task_id,
            "result": result,
            "created_at": datetime.utcnow().isoformat(),
            "type": "task_result",
        }

        # Store in ArangoDB
        collection = self.arango_db.collection("task_results")
        collection.insert(result_doc)

        # Update task in PostgreSQL with result reference
        await self._update_task_result_in_postgres(task_id, result_id)

        logger.info(f"Stored result for task {task_id} as document {result_id}")
        return result_id

    async def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task result from storage.

        Args:
            task_id: Task ID

        Returns:
            Task result or None if not found
        """
        # First check Redis cache
        result = await self.redis_queue.get_result(task_id)
        if result:
            return result

        # Check ArangoDB via PostgreSQL reference
        task = await self._get_task_from_postgres(task_id)
        if not task or not task.get("result_id"):
            return None

        try:
            collection = self.arango_db.collection("task_results")
            doc = collection.get(task["result_id"])
            return doc.get("result") if doc else None
        except Exception as e:
            logger.error(f"Error retrieving result for task {task_id}: {e}")
            return None

    async def record_task_metrics(
        self,
        task_type: str,
        duration_ms: int,
        status: str,
        error_type: Optional[str] = None,
        worker_id: Optional[str] = None,
    ) -> None:
        """Record task performance metrics.

        Args:
            task_type: Type of task
            duration_ms: Processing duration in milliseconds
            status: Task completion status
            error_type: Type of error if failed
            worker_id: Worker that processed the task
        """
        try:
            async with self.postgres_pool.connection() as conn:
                await conn.execute(
                    """
                    INSERT INTO task_metrics
                    (task_type, duration_ms, status, error_type, worker_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (task_type, duration_ms, status, error_type, worker_id),
                )
        except Exception as e:
            logger.error(f"Error recording task metrics: {e}")

    async def get_task_metrics(
        self,
        task_type: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Get task performance metrics.

        Args:
            task_type: Optional task type filter
            start_time: Optional start time filter
            end_time: Optional end time filter

        Returns:
            List of metric records
        """
        conditions = ["1=1"]
        params = []

        if task_type:
            conditions.append("task_type = %s")
            params.append(task_type)

        if start_time:
            conditions.append("created_at >= %s")
            params.append(start_time)

        if end_time:
            conditions.append("created_at <= %s")
            params.append(end_time)

        query = f"""
            SELECT task_type, duration_ms, status, error_type, worker_id, created_at
            FROM task_metrics
            WHERE {" AND ".join(conditions)}
            ORDER BY created_at DESC
            LIMIT 1000
        """

        try:
            async with self.postgres_pool.connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(query, params)
                    rows = await cursor.fetchall()

                    columns = [desc[0] for desc in cursor.description]
                    return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logger.error(f"Error retrieving task metrics: {e}")
            return []

    # Private helper methods

    async def _store_task_in_postgres(
        self,
        task_id: str,
        task_type: str,
        user_id: Optional[str],
        payload: Dict[str, Any],
        priority: int,
        max_retries: int,
        estimated_duration_ms: Optional[int],
    ) -> None:
        """Store task in PostgreSQL database."""
        expires_at = datetime.utcnow() + timedelta(days=7)

        try:
            async with self.postgres_pool.connection() as conn:
                await conn.execute(
                    """
                    INSERT INTO tasks
                    (id, user_id, task_type, status, priority, payload, max_retries,
                     estimated_duration_ms, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        task_id,
                        user_id,
                        task_type,
                        "pending",
                        priority,
                        json.dumps(payload),
                        max_retries,
                        estimated_duration_ms,
                        expires_at,
                    ),
                )
        except Exception as e:
            logger.error(f"Error storing task in PostgreSQL: {e}")
            raise

    async def _get_task_from_postgres(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task from PostgreSQL database."""
        try:
            async with self.postgres_pool.connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(
                        "SELECT * FROM tasks WHERE id = %s", (task_id,)
                    )
                    row = await cursor.fetchone()

                    if not row:
                        return None

                    columns = [desc[0] for desc in cursor.description]
                    return dict(zip(columns, row))
        except Exception as e:
            logger.error(f"Error retrieving task from PostgreSQL: {e}")
            return None

    async def _get_user_tasks_from_postgres(
        self,
        user_id: str,
        status: Optional[str],
        task_type: Optional[str],
        limit: int,
        offset: int,
    ) -> List[Dict[str, Any]]:
        """Get user tasks from PostgreSQL database."""
        conditions = ["user_id = %s"]
        params = [user_id]

        if status:
            conditions.append("status = %s")
            params.append(status)

        if task_type:
            conditions.append("task_type = %s")
            params.append(task_type)

        query = f"""
            SELECT * FROM tasks
            WHERE {" AND ".join(conditions)}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])

        try:
            async with self.postgres_pool.connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(query, params)
                    rows = await cursor.fetchall()

                    columns = [desc[0] for desc in cursor.description]
                    return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logger.error(f"Error retrieving user tasks from PostgreSQL: {e}")
            return []

    async def _update_task_status_in_postgres(
        self,
        task_id: str,
        status: str,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        error_message: Optional[str] = None,
        progress: Optional[int] = None,
    ) -> None:
        """Update task status in PostgreSQL database."""
        updates = ["status = %s"]
        params = [status]

        if started_at:
            updates.append("started_at = %s")
            params.append(started_at)

        if completed_at:
            updates.append("completed_at = %s")
            params.append(completed_at)

        if error_message:
            updates.append("error_message = %s")
            params.append(error_message)

        if progress is not None:
            updates.append("progress = %s")
            params.append(progress)

        params.append(task_id)

        query = f"""
            UPDATE tasks
            SET {", ".join(updates)}
            WHERE id = %s
        """

        try:
            async with self.postgres_pool.connection() as conn:
                await conn.execute(query, params)
        except Exception as e:
            logger.error(f"Error updating task status in PostgreSQL: {e}")

    async def _update_task_result_in_postgres(
        self, task_id: str, result_id: str
    ) -> None:
        """Update task result reference in PostgreSQL."""
        try:
            async with self.postgres_pool.connection() as conn:
                await conn.execute(
                    "UPDATE tasks SET result_id = %s WHERE id = %s",
                    (result_id, task_id),
                )
        except Exception as e:
            logger.error(f"Error updating task result in PostgreSQL: {e}")
