"""Task queue interface and operations for ATSPro API."""

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from .redis_queue import RedisQueue, TaskPriority

logger = logging.getLogger(__name__)


class TaskQueueInterface(ABC):
    """Abstract interface for task queues."""

    @abstractmethod
    async def enqueue(
        self,
        task_type: str,
        payload: Dict[str, Any],
        priority: TaskPriority = TaskPriority.NORMAL,
        **kwargs,
    ) -> str:
        """Enqueue a task for processing."""
        pass

    @abstractmethod
    async def dequeue(self, worker_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Dequeue a task for processing."""
        pass

    @abstractmethod
    async def complete_task(self, task_id: str, worker_id: str, **kwargs) -> None:
        """Mark task as completed."""
        pass

    @abstractmethod
    async def fail_task(
        self, task_id: str, worker_id: str, error: str, **kwargs
    ) -> bool:
        """Mark task as failed."""
        pass

    @abstractmethod
    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task information."""
        pass


class TaskQueue:
    """High-level task queue operations wrapper."""

    def __init__(self, redis_queue: RedisQueue):
        """Initialize task queue.

        Args:
            redis_queue: Redis queue implementation
        """
        self.redis_queue = redis_queue
        self._running = False

    async def submit_task(
        self,
        task_type: str,
        payload: Dict[str, Any],
        user_id: Optional[str] = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        max_retries: int = 3,
        estimated_duration_ms: Optional[int] = None,
    ) -> str:
        """Submit a task for processing.

        Args:
            task_type: Type of task (e.g., 'parse_resume', 'optimize')
            payload: Task payload data
            user_id: ID of user submitting the task
            priority: Task priority level
            max_retries: Maximum retry attempts
            estimated_duration_ms: Estimated processing time

        Returns:
            Task ID
        """
        return await self.redis_queue.enqueue(
            task_type=task_type,
            payload=payload,
            priority=priority,
            user_id=user_id,
            max_retries=max_retries,
            estimated_duration_ms=estimated_duration_ms,
        )

    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task status and information.

        Args:
            task_id: Task ID

        Returns:
            Task information including status, progress, and result
        """
        task_data = await self.redis_queue.get_task(task_id)
        if not task_data:
            return None

        # Add result if task is completed
        if task_data.get("status") == "completed":
            result = await self.redis_queue.get_result(task_id)
            if result:
                task_data["result"] = result

        return task_data

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending task.

        Args:
            task_id: Task ID to cancel

        Returns:
            True if task was cancelled, False if not found or not cancellable
        """
        task_data = await self.redis_queue.get_task(task_id)
        if not task_data:
            return False

        status = task_data.get("status")
        if status not in ["pending", "running"]:
            return False

        if status == "pending":
            # Remove from all queues
            for queue_key in [
                self.redis_queue.high_queue_key,
                self.redis_queue.normal_queue_key,
                self.redis_queue.low_queue_key,
            ]:
                await self.redis_queue.redis.lrem(queue_key, 0, task_id)

        # Update task status
        task_data["status"] = "cancelled"
        task_data["completed_at"] = (
            task_data.get("started_at") or task_data["created_at"]
        )

        await self.redis_queue.redis.set(
            self.redis_queue.task_key(task_id),
            self.redis_queue.redis.json().dumps(task_data),
        )

        logger.info(f"Task {task_id} cancelled")
        return True

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
        # Note: This is a simplified implementation
        # In a production system, you'd want to use a proper indexing strategy
        # or store user tasks in a separate data structure

        pattern = f"{self.redis_queue.prefix}:task:*"
        keys = await self.redis_queue.redis.keys(pattern)

        tasks = []
        for key in keys[offset : offset + limit]:
            task_data_raw = await self.redis_queue.redis.get(key)
            if task_data_raw:
                task_data = self.redis_queue.redis.json().loads(task_data_raw)

                # Filter by user_id
                if task_data.get("user_id") != user_id:
                    continue

                # Filter by status if provided
                if status and task_data.get("status") != status:
                    continue

                # Filter by task_type if provided
                if task_type and task_data.get("task_type") != task_type:
                    continue

                # Add result if completed
                if task_data.get("status") == "completed":
                    result = await self.redis_queue.get_result(task_data["id"])
                    if result:
                        task_data["result"] = result

                tasks.append(task_data)

        # Sort by created_at (most recent first)
        tasks.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        return tasks

    async def get_queue_health(self) -> Dict[str, Any]:
        """Get queue health and statistics.

        Returns:
            Queue health information
        """
        stats = await self.redis_queue.get_queue_stats()

        # Calculate health metrics
        total_tasks = stats["total_pending"] + stats["total_processing"]

        health = {
            "status": "healthy",
            "queues": {
                "high_priority": stats["high_queue"],
                "normal_priority": stats["normal_queue"],
                "low_priority": stats["low_queue"],
                "dead_letter": stats["dead_letter_queue"],
            },
            "processing": {
                "workers": stats["processing_workers"],
                "tasks": stats["total_processing"],
            },
            "totals": {
                "pending": stats["total_pending"],
                "processing": stats["total_processing"],
                "total": total_tasks,
            },
        }

        # Determine health status
        if stats["dead_letter_queue"] > 10:
            health["status"] = "degraded"
            health["warnings"] = ["High number of failed tasks in dead letter queue"]

        if total_tasks > 1000:
            health["status"] = "under_load"
            health["warnings"] = health.get("warnings", []) + ["High task volume"]

        return health

    async def start_cleanup_task(self, interval_seconds: int = 300) -> None:
        """Start background cleanup task.

        Args:
            interval_seconds: Cleanup interval in seconds
        """
        if self._running:
            return

        self._running = True

        async def cleanup_loop():
            while self._running:
                try:
                    await self.redis_queue.cleanup_expired_tasks()
                    await asyncio.sleep(interval_seconds)
                except Exception as e:
                    logger.error(f"Error in cleanup task: {e}")
                    await asyncio.sleep(interval_seconds)

        asyncio.create_task(cleanup_loop())
        logger.info(f"Started cleanup task with {interval_seconds}s interval")

    async def stop_cleanup_task(self) -> None:
        """Stop background cleanup task."""
        self._running = False
        logger.info("Stopped cleanup task")

    async def requeue_failed_tasks(
        self, max_tasks: int = 100, priority: TaskPriority = TaskPriority.LOW
    ) -> int:
        """Requeue failed tasks from dead letter queue.

        Args:
            max_tasks: Maximum number of tasks to requeue
            priority: Priority to assign to requeued tasks

        Returns:
            Number of tasks requeued
        """
        requeued = 0

        for _ in range(max_tasks):
            # Pop from dead letter queue
            task_id_bytes = await self.redis_queue.redis.rpop(self.redis_queue.dlq_key)
            if not task_id_bytes:
                break

            task_id = task_id_bytes.decode("utf-8")

            # Get task data
            task_data = await self.redis_queue.get_task(task_id)
            if not task_data:
                continue

            # Reset task for retry
            task_data["status"] = "pending"
            task_data["retry_count"] = 0
            task_data["error_message"] = None

            # Update task
            await self.redis_queue.redis.set(
                self.redis_queue.task_key(task_id),
                self.redis_queue.redis.json().dumps(task_data),
            )

            # Add to appropriate queue
            queue_key = {
                TaskPriority.HIGH: self.redis_queue.high_queue_key,
                TaskPriority.NORMAL: self.redis_queue.normal_queue_key,
                TaskPriority.LOW: self.redis_queue.low_queue_key,
            }[priority]

            await self.redis_queue.redis.lpush(queue_key, task_id)
            requeued += 1

        if requeued > 0:
            logger.info(f"Requeued {requeued} failed tasks")

        return requeued
