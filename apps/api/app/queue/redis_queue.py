"""Redis queue implementation with priority support for ATSPro API."""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from enum import IntEnum
from typing import Any, Dict, List, Optional
from uuid import uuid4

import redis.asyncio as redis
from redis.exceptions import ConnectionError, TimeoutError, RedisError

logger = logging.getLogger(__name__)


class TaskPriority(IntEnum):
    """Task priority levels."""

    HIGH = 1
    NORMAL = 2
    LOW = 3


class RedisQueue:
    """Redis-based task queue with priority support."""

    def __init__(self, redis_client: redis.Redis, queue_prefix: str = "atspro"):
        """Initialize Redis queue.

        Args:
            redis_client: Async Redis client instance
            queue_prefix: Prefix for Redis keys
        """
        self.redis = redis_client
        self.prefix = queue_prefix
        self._running = False
        self._max_retry_attempts = 3
        self._base_retry_delay = 0.1  # 100ms base delay
        self._max_retry_delay = 5.0  # 5 second max delay
        
        # Connection health monitoring
        self._connection_failures = 0
        self._last_health_check = None

    async def _validate_connection(self) -> bool:
        """Validate Redis connection health.

        Returns:
            True if connection is healthy, False otherwise
        """
        try:
            await self.redis.ping()
            return True
        except (ConnectionError, TimeoutError, RedisError) as e:
            logger.warning(f"Redis connection validation failed: {e}")
            return False

    async def _execute_with_retry(self, operation, *args, **kwargs):
        """Execute Redis operation with retry logic.

        Args:
            operation: Redis operation to execute
            *args: Positional arguments for operation
            **kwargs: Keyword arguments for operation

        Returns:
            Operation result

        Raises:
            RedisError: If all retry attempts fail
        """
        last_error = None

        for attempt in range(self._max_retry_attempts):
            try:
                # Validate connection before operation
                if not await self._validate_connection():
                    raise ConnectionError("Redis connection validation failed")

                return await operation(*args, **kwargs)

            except (ConnectionError, TimeoutError) as e:
                last_error = e
                if attempt < self._max_retry_attempts - 1:
                    delay = min(
                        self._base_retry_delay * (2**attempt), self._max_retry_delay
                    )
                    logger.warning(
                        f"Redis operation failed (attempt {attempt + 1}/{self._max_retry_attempts}), "
                        f"retrying in {delay:.2f}s: {e}"
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"Redis operation failed after {self._max_retry_attempts} attempts: {e}"
                    )
            except RedisError as e:
                # Don't retry for non-connection errors
                logger.error(f"Redis operation failed with non-retryable error: {e}")
                raise

        raise last_error or RedisError("Operation failed after retries")

    @property
    def high_queue_key(self) -> str:
        """High priority queue key."""
        return f"{self.prefix}:queue:high"

    @property
    def normal_queue_key(self) -> str:
        """Normal priority queue key."""
        return f"{self.prefix}:queue:normal"

    @property
    def low_queue_key(self) -> str:
        """Low priority queue key."""
        return f"{self.prefix}:queue:low"

    @property
    def processing_prefix(self) -> str:
        """Processing queue prefix."""
        return f"{self.prefix}:processing"

    @property
    def dlq_key(self) -> str:
        """Dead letter queue key."""
        return f"{self.prefix}:dlq"

    def task_key(self, task_id: str) -> str:
        """Task metadata key."""
        return f"{self.prefix}:task:{task_id}"

    def result_key(self, task_id: str) -> str:
        """Task result key."""
        return f"{self.prefix}:result:{task_id}"

    def processing_key(self, worker_id: str) -> str:
        """Worker processing queue key."""
        return f"{self.processing_prefix}:{worker_id}"

    async def enqueue(
        self,
        task_type: str,
        payload: Dict[str, Any],
        priority: TaskPriority = TaskPriority.NORMAL,
        user_id: Optional[str] = None,
        max_retries: int = 3,
        estimated_duration_ms: Optional[int] = None,
        expires_in_hours: int = 24 * 7,  # 7 days default
    ) -> str:
        """Enqueue a task for processing.

        Args:
            task_type: Type of task to process
            payload: Task payload data
            priority: Task priority level
            user_id: ID of user who created the task
            max_retries: Maximum retry attempts
            estimated_duration_ms: Estimated processing time in milliseconds
            expires_in_hours: Task expiration time in hours

        Returns:
            Task ID
        """
        task_id = str(uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=expires_in_hours)

        task_data = {
            "id": task_id,
            "task_type": task_type,
            "user_id": user_id,
            "payload": payload,
            "priority": priority.value,
            "max_retries": max_retries,
            "retry_count": 0,
            "estimated_duration_ms": estimated_duration_ms,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "status": "pending",
        }

        # Select queue based on priority
        queue_key = {
            TaskPriority.HIGH: self.high_queue_key,
            TaskPriority.NORMAL: self.normal_queue_key,
            TaskPriority.LOW: self.low_queue_key,
        }[priority]

        try:
            # Store task metadata with retry logic
            await self._execute_with_retry(
                self.redis.set,
                self.task_key(task_id),
                json.dumps(task_data),
                ex=expires_in_hours * 3600,  # Convert to seconds
            )

            # Add to appropriate priority queue with retry logic
            await self._execute_with_retry(self.redis.lpush, queue_key, task_id)

            logger.info(
                f"Enqueued task {task_id} with priority {priority.name} to queue {queue_key}"
            )
            return task_id

        except (ConnectionError, TimeoutError, RedisError) as e:
            logger.error(f"Failed to enqueue task {task_id}: {e}")
            raise

    async def dequeue(
        self, worker_id: str, timeout: int = 10, queues: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """Dequeue a task for processing.

        Args:
            worker_id: ID of the worker requesting the task
            timeout: Blocking timeout in seconds (1-300)
            queues: List of queue keys to check (defaults to all priorities)

        Returns:
            Task data or None if no tasks available

        Raises:
            ValueError: If timeout is invalid or worker_id is empty
            RedisError: If Redis operations fail after retries
        """
        # Validate parameters
        if not worker_id or not worker_id.strip():
            raise ValueError("worker_id cannot be empty")

        if not isinstance(timeout, int) or timeout < 1 or timeout > 300:
            raise ValueError("timeout must be an integer between 1 and 300 seconds")

        if queues is None:
            # Check queues in priority order: high, normal, low
            queues = [self.high_queue_key, self.normal_queue_key, self.low_queue_key]
        elif not queues or not all(isinstance(q, str) and q.strip() for q in queues):
            raise ValueError("queues must be a non-empty list of non-empty strings")

        logger.debug(
            f"Worker {worker_id} dequeuing from queues {queues} with timeout {timeout}s"
        )

        try:
            # Use BRPOP to block until a task is available from any queue
            # Wrap in retry logic for connection reliability
            result = await self._execute_with_retry(
                self.redis.brpop, queues, timeout=timeout
            )

            if not result:
                logger.debug(
                    f"No tasks available for worker {worker_id} after {timeout}s timeout"
                )
                return None

            queue_name, task_id_bytes = result
            task_id = (
                task_id_bytes.decode("utf-8")
                if isinstance(task_id_bytes, bytes)
                else task_id_bytes
            )
            queue_name = (
                queue_name.decode("utf-8")
                if isinstance(queue_name, bytes)
                else queue_name
            )

            logger.info(
                f"Worker {worker_id} received task {task_id} from queue {queue_name}"
            )

            # Get task metadata with retry logic
            task_data_raw = await self._execute_with_retry(
                self.redis.get, self.task_key(task_id)
            )

            if not task_data_raw:
                logger.warning(
                    f"Task {task_id} metadata not found, possibly expired or corrupted"
                )
                return None

            task_data = json.loads(task_data_raw)

            # Move task to worker's processing queue with retry logic
            processing_key = self.processing_key(worker_id)
            await self._execute_with_retry(self.redis.lpush, processing_key, task_id)

            # Update task status
            task_data["status"] = "running"
            task_data["started_at"] = datetime.utcnow().isoformat()
            task_data["worker_id"] = worker_id
            task_data["queue_name"] = queue_name

            await self._execute_with_retry(
                self.redis.set, self.task_key(task_id), json.dumps(task_data)
            )

            logger.info(
                f"Task {task_id} assigned to worker {worker_id} from queue {queue_name}"
            )
            return task_data

        except (ConnectionError, TimeoutError) as e:
            logger.error(
                f"Failed to dequeue task for worker {worker_id} from queues {queues} "
                f"with timeout {timeout}s: {e}"
            )
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode task metadata: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error dequeuing task for worker {worker_id}: {e}")
            raise

    async def complete_task(
        self,
        task_id: str,
        worker_id: str,
        result: Optional[Dict[str, Any]] = None,
        result_ttl_hours: int = 24,
    ) -> None:
        """Mark task as completed.

        Args:
            task_id: Task ID
            worker_id: Worker ID that processed the task
            result: Task result data
            result_ttl_hours: Result TTL in hours

        Raises:
            RedisError: If Redis operations fail after retries
        """
        try:
            # Remove from processing queue with retry logic
            processing_key = self.processing_key(worker_id)
            await self._execute_with_retry(self.redis.lrem, processing_key, 0, task_id)

            # Update task status with retry logic
            task_data_raw = await self._execute_with_retry(
                self.redis.get, self.task_key(task_id)
            )

            if task_data_raw:
                task_data = json.loads(task_data_raw)
                task_data["status"] = "completed"
                task_data["completed_at"] = datetime.utcnow().isoformat()
                task_data["progress"] = 100

                await self._execute_with_retry(
                    self.redis.set, self.task_key(task_id), json.dumps(task_data)
                )

            # Store result if provided with retry logic
            if result:
                await self._execute_with_retry(
                    self.redis.set,
                    self.result_key(task_id),
                    json.dumps(result),
                    ex=result_ttl_hours * 3600,
                )

            logger.info(f"Task {task_id} completed by worker {worker_id}")

        except (ConnectionError, TimeoutError, RedisError) as e:
            logger.error(
                f"Failed to complete task {task_id} for worker {worker_id}: {e}"
            )
            raise

    async def fail_task(
        self, task_id: str, worker_id: str, error_message: str, retry: bool = True
    ) -> bool:
        """Mark task as failed and optionally retry.

        Args:
            task_id: Task ID
            worker_id: Worker ID that processed the task
            error_message: Error description
            retry: Whether to retry the task

        Returns:
            True if task was retried, False if failed permanently

        Raises:
            RedisError: If Redis operations fail after retries
        """
        try:
            # Remove from processing queue with retry logic
            processing_key = self.processing_key(worker_id)
            await self._execute_with_retry(self.redis.lrem, processing_key, 0, task_id)

            # Get current task data with retry logic
            task_data_raw = await self._execute_with_retry(
                self.redis.get, self.task_key(task_id)
            )

            if not task_data_raw:
                logger.warning(
                    f"Task {task_id} metadata not found for failure handling"
                )
                return False

            task_data = json.loads(task_data_raw)
            task_data["retry_count"] += 1
            task_data["error_message"] = error_message

            # Check if we should retry
            if retry and task_data["retry_count"] <= task_data["max_retries"]:
                # Requeue with exponential backoff (simulated by adding to low priority)
                task_data["status"] = "pending"

                await self._execute_with_retry(
                    self.redis.set, self.task_key(task_id), json.dumps(task_data)
                )

                # Add back to low priority queue for retry
                await self._execute_with_retry(
                    self.redis.lpush, self.low_queue_key, task_id
                )

                logger.info(
                    f"Task {task_id} retrying ({task_data['retry_count']}/{task_data['max_retries']}) "
                    f"after error: {error_message}"
                )
                return True
            else:
                # Mark as permanently failed
                task_data["status"] = "failed"
                task_data["completed_at"] = datetime.utcnow().isoformat()

                await self._execute_with_retry(
                    self.redis.set, self.task_key(task_id), json.dumps(task_data)
                )

                # Move to dead letter queue
                await self._execute_with_retry(self.redis.lpush, self.dlq_key, task_id)

                logger.error(
                    f"Task {task_id} permanently failed after {task_data['retry_count']} attempts: {error_message}"
                )
                return False

        except (ConnectionError, TimeoutError, RedisError) as e:
            logger.error(f"Failed to handle task failure for {task_id}: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to decode task metadata for failed task {task_id}: {e}"
            )
            return False

    async def update_progress(
        self, task_id: str, progress: int, status_message: Optional[str] = None
    ) -> None:
        """Update task progress.

        Args:
            task_id: Task ID
            progress: Progress percentage (0-100)
            status_message: Optional status message

        Raises:
            ValueError: If progress is not between 0-100
            RedisError: If Redis operations fail after retries
        """
        if not isinstance(progress, int) or progress < 0 or progress > 100:
            raise ValueError("progress must be an integer between 0 and 100")

        try:
            task_data_raw = await self._execute_with_retry(
                self.redis.get, self.task_key(task_id)
            )

            if not task_data_raw:
                logger.warning(f"Task {task_id} metadata not found for progress update")
                return

            task_data = json.loads(task_data_raw)
            task_data["progress"] = progress

            if status_message:
                task_data["status_message"] = status_message

            await self._execute_with_retry(
                self.redis.set, self.task_key(task_id), json.dumps(task_data)
            )

            logger.debug(f"Task {task_id} progress updated to {progress}%")

        except (ConnectionError, TimeoutError, RedisError) as e:
            logger.error(f"Failed to update progress for task {task_id}: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to decode task metadata for progress update {task_id}: {e}"
            )
            raise

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task metadata.

        Args:
            task_id: Task ID

        Returns:
            Task data or None if not found

        Raises:
            RedisError: If Redis operations fail after retries
        """
        try:
            task_data_raw = await self._execute_with_retry(
                self.redis.get, self.task_key(task_id)
            )

            if not task_data_raw:
                return None

            return json.loads(task_data_raw)

        except (ConnectionError, TimeoutError, RedisError) as e:
            logger.error(f"Failed to get task {task_id}: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode task metadata for {task_id}: {e}")
            return None

    async def get_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task result.

        Args:
            task_id: Task ID

        Returns:
            Task result or None if not found

        Raises:
            RedisError: If Redis operations fail after retries
        """
        try:
            result_raw = await self._execute_with_retry(
                self.redis.get, self.result_key(task_id)
            )

            if not result_raw:
                return None

            return json.loads(result_raw)

        except (ConnectionError, TimeoutError, RedisError) as e:
            logger.error(f"Failed to get result for task {task_id}: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode result for task {task_id}: {e}")
            return None

    async def get_queue_stats(self) -> Dict[str, int]:
        """Get queue statistics.

        Returns:
            Dictionary with queue lengths and statistics

        Raises:
            RedisError: If Redis operations fail after retries
        """
        try:
            stats = {}

            # Queue lengths with retry logic
            stats["high_queue"] = await self._execute_with_retry(
                self.redis.llen, self.high_queue_key
            )
            stats["normal_queue"] = await self._execute_with_retry(
                self.redis.llen, self.normal_queue_key
            )
            stats["low_queue"] = await self._execute_with_retry(
                self.redis.llen, self.low_queue_key
            )
            stats["dead_letter_queue"] = await self._execute_with_retry(
                self.redis.llen, self.dlq_key
            )

            # Total pending
            stats["total_pending"] = (
                stats["high_queue"] + stats["normal_queue"] + stats["low_queue"]
            )

            # Processing queues count with retry logic
            processing_keys = await self._execute_with_retry(
                self.redis.keys, f"{self.processing_prefix}:*"
            )
            stats["processing_workers"] = len(processing_keys)

            total_processing = 0
            for key in processing_keys:
                length = await self._execute_with_retry(self.redis.llen, key)
                total_processing += length
            stats["total_processing"] = total_processing

            # Connection pool info (if available)
            if hasattr(self.redis.connection_pool, "connection_kwargs"):
                pool = self.redis.connection_pool
                stats["connection_pool_size"] = getattr(pool, "max_connections", 0)
                stats["connection_pool_created"] = len(
                    getattr(pool, "_created_connections", [])
                )
                stats["connection_pool_available"] = len(
                    getattr(pool, "_available_connections", [])
                )
                stats["connection_pool_in_use"] = len(
                    getattr(pool, "_in_use_connections", [])
                )

            logger.debug(f"Queue stats: {stats}")
            return stats

        except (ConnectionError, TimeoutError, RedisError) as e:
            logger.error(f"Failed to get queue statistics: {e}")
            raise

    async def cleanup_expired_tasks(self) -> int:
        """Clean up expired tasks from processing queues.

        Returns:
            Number of tasks cleaned up

        Raises:
            RedisError: If Redis operations fail after retries
        """
        cleanup_count = 0

        try:
            processing_keys = await self._execute_with_retry(
                self.redis.keys, f"{self.processing_prefix}:*"
            )

            for processing_key in processing_keys:
                # Get all tasks in this processing queue with retry logic
                task_ids = await self._execute_with_retry(
                    self.redis.lrange, processing_key, 0, -1
                )

                for task_id_bytes in task_ids:
                    task_id = task_id_bytes.decode("utf-8")

                    # Check if task has expired
                    task_data = await self.get_task(task_id)
                    if not task_data:
                        # Task metadata not found, remove from processing
                        await self._execute_with_retry(
                            self.redis.lrem, processing_key, 0, task_id
                        )
                        cleanup_count += 1
                        logger.info(
                            f"Removed orphaned task {task_id} from processing queue"
                        )
                        continue

                    # Check if task has expired based on expires_at
                    try:
                        expires_at = datetime.fromisoformat(
                            task_data.get("expires_at", "")
                        )
                        if datetime.utcnow() > expires_at:
                            # Move to dead letter queue
                            await self._execute_with_retry(
                                self.redis.lrem, processing_key, 0, task_id
                            )
                            await self._execute_with_retry(
                                self.redis.lpush, self.dlq_key, task_id
                            )

                            # Update task status
                            task_data["status"] = "expired"
                            task_data["completed_at"] = datetime.utcnow().isoformat()
                            await self._execute_with_retry(
                                self.redis.set,
                                self.task_key(task_id),
                                json.dumps(task_data),
                            )

                            cleanup_count += 1
                            logger.info(
                                f"Moved expired task {task_id} to dead letter queue"
                            )
                    except (ValueError, TypeError) as e:
                        logger.warning(
                            f"Invalid expires_at format for task {task_id}: {e}"
                        )

            if cleanup_count > 0:
                logger.info(f"Cleaned up {cleanup_count} expired/orphaned tasks")

            return cleanup_count

        except (ConnectionError, TimeoutError, RedisError) as e:
            logger.error(f"Failed to cleanup expired tasks: {e}")
            raise
