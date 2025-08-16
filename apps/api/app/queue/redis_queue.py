"""Redis queue implementation with priority support for ATSPro API."""

import json
import logging
from datetime import datetime, timedelta
from enum import IntEnum
from typing import Any, Dict, List, Optional
from uuid import uuid4

import redis.asyncio as redis

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

        # Store task metadata
        await self.redis.set(
            self.task_key(task_id),
            json.dumps(task_data),
            ex=expires_in_hours * 3600,  # Convert to seconds
        )

        # Add to appropriate priority queue
        await self.redis.lpush(queue_key, task_id)

        logger.info(f"Enqueued task {task_id} with priority {priority.name}")
        return task_id

    async def dequeue(
        self, worker_id: str, timeout: int = 10, queues: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """Dequeue a task for processing.

        Args:
            worker_id: ID of the worker requesting the task
            timeout: Blocking timeout in seconds
            queues: List of queue keys to check (defaults to all priorities)

        Returns:
            Task data or None if no tasks available
        """
        if queues is None:
            # Check queues in priority order: high, normal, low
            queues = [self.high_queue_key, self.normal_queue_key, self.low_queue_key]

        # Use BRPOP to block until a task is available from any queue
        result = await self.redis.brpop(queues, timeout=timeout)
        if not result:
            return None

        queue_name, task_id = result
        task_id = task_id.decode("utf-8")

        # Get task metadata
        task_data_raw = await self.redis.get(self.task_key(task_id))
        if not task_data_raw:
            logger.warning(f"Task {task_id} metadata not found")
            return None

        task_data = json.loads(task_data_raw)

        # Move task to worker's processing queue
        processing_key = self.processing_key(worker_id)
        await self.redis.lpush(processing_key, task_id)

        # Update task status
        task_data["status"] = "running"
        task_data["started_at"] = datetime.utcnow().isoformat()
        task_data["worker_id"] = worker_id

        await self.redis.set(self.task_key(task_id), json.dumps(task_data))

        logger.info(f"Dequeued task {task_id} for worker {worker_id}")
        return task_data

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
        """
        # Remove from processing queue
        processing_key = self.processing_key(worker_id)
        await self.redis.lrem(processing_key, 0, task_id)

        # Update task status
        task_data_raw = await self.redis.get(self.task_key(task_id))
        if task_data_raw:
            task_data = json.loads(task_data_raw)
            task_data["status"] = "completed"
            task_data["completed_at"] = datetime.utcnow().isoformat()
            task_data["progress"] = 100

            await self.redis.set(self.task_key(task_id), json.dumps(task_data))

        # Store result if provided
        if result:
            await self.redis.set(
                self.result_key(task_id), json.dumps(result), ex=result_ttl_hours * 3600
            )

        logger.info(f"Task {task_id} completed by worker {worker_id}")

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
        """
        # Remove from processing queue
        processing_key = self.processing_key(worker_id)
        await self.redis.lrem(processing_key, 0, task_id)

        # Get current task data
        task_data_raw = await self.redis.get(self.task_key(task_id))
        if not task_data_raw:
            logger.warning(f"Task {task_id} metadata not found")
            return False

        task_data = json.loads(task_data_raw)
        task_data["retry_count"] += 1
        task_data["error_message"] = error_message

        # Check if we should retry
        if retry and task_data["retry_count"] <= task_data["max_retries"]:
            # Requeue with exponential backoff (simulated by adding to low priority)
            task_data["status"] = "pending"
            await self.redis.set(self.task_key(task_id), json.dumps(task_data))

            # Add back to low priority queue for retry
            await self.redis.lpush(self.low_queue_key, task_id)

            logger.info(
                f"Task {task_id} retrying ({task_data['retry_count']}/{task_data['max_retries']})"
            )
            return True
        else:
            # Mark as permanently failed
            task_data["status"] = "failed"
            task_data["completed_at"] = datetime.utcnow().isoformat()

            await self.redis.set(self.task_key(task_id), json.dumps(task_data))

            # Move to dead letter queue
            await self.redis.lpush(self.dlq_key, task_id)

            logger.error(f"Task {task_id} permanently failed: {error_message}")
            return False

    async def update_progress(
        self, task_id: str, progress: int, status_message: Optional[str] = None
    ) -> None:
        """Update task progress.

        Args:
            task_id: Task ID
            progress: Progress percentage (0-100)
            status_message: Optional status message
        """
        task_data_raw = await self.redis.get(self.task_key(task_id))
        if not task_data_raw:
            logger.warning(f"Task {task_id} metadata not found")
            return

        task_data = json.loads(task_data_raw)
        task_data["progress"] = max(0, min(100, progress))

        if status_message:
            task_data["status_message"] = status_message

        await self.redis.set(self.task_key(task_id), json.dumps(task_data))

        logger.debug(f"Task {task_id} progress updated to {progress}%")

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task metadata.

        Args:
            task_id: Task ID

        Returns:
            Task data or None if not found
        """
        task_data_raw = await self.redis.get(self.task_key(task_id))
        if not task_data_raw:
            return None

        return json.loads(task_data_raw)

    async def get_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task result.

        Args:
            task_id: Task ID

        Returns:
            Task result or None if not found
        """
        result_raw = await self.redis.get(self.result_key(task_id))
        if not result_raw:
            return None

        return json.loads(result_raw)

    async def get_queue_stats(self) -> Dict[str, int]:
        """Get queue statistics.

        Returns:
            Dictionary with queue lengths and statistics
        """
        stats = {}

        # Queue lengths
        stats["high_queue"] = await self.redis.llen(self.high_queue_key)
        stats["normal_queue"] = await self.redis.llen(self.normal_queue_key)
        stats["low_queue"] = await self.redis.llen(self.low_queue_key)
        stats["dead_letter_queue"] = await self.redis.llen(self.dlq_key)

        # Total pending
        stats["total_pending"] = (
            stats["high_queue"] + stats["normal_queue"] + stats["low_queue"]
        )

        # Processing queues count
        processing_keys = await self.redis.keys(f"{self.processing_prefix}:*")
        stats["processing_workers"] = len(processing_keys)

        total_processing = 0
        for key in processing_keys:
            total_processing += await self.redis.llen(key)
        stats["total_processing"] = total_processing

        return stats

    async def cleanup_expired_tasks(self) -> int:
        """Clean up expired tasks from processing queues.

        Returns:
            Number of tasks cleaned up
        """
        cleanup_count = 0
        processing_keys = await self.redis.keys(f"{self.processing_prefix}:*")

        for processing_key in processing_keys:
            # Get all tasks in this processing queue
            task_ids = await self.redis.lrange(processing_key, 0, -1)

            for task_id_bytes in task_ids:
                task_id = task_id_bytes.decode("utf-8")

                # Check if task has expired
                task_data = await self.get_task(task_id)
                if not task_data:
                    # Task metadata not found, remove from processing
                    await self.redis.lrem(processing_key, 0, task_id)
                    cleanup_count += 1
                    continue

                # Check if task has expired based on expires_at
                expires_at = datetime.fromisoformat(task_data.get("expires_at", ""))
                if datetime.utcnow() > expires_at:
                    # Move to dead letter queue
                    await self.redis.lrem(processing_key, 0, task_id)
                    await self.redis.lpush(self.dlq_key, task_id)

                    # Update task status
                    task_data["status"] = "expired"
                    task_data["completed_at"] = datetime.utcnow().isoformat()
                    await self.redis.set(self.task_key(task_id), json.dumps(task_data))

                    cleanup_count += 1

        if cleanup_count > 0:
            logger.info(f"Cleaned up {cleanup_count} expired tasks")

        return cleanup_count
