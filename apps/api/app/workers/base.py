"""Base worker class with error handling and retry logic for ATSPro API."""

import asyncio
import logging
import signal
import time
import traceback
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

import redis.exceptions as redis_exc
from ..queue.redis_queue import RedisQueue

logger = logging.getLogger(__name__)


class TaskErrorType(Enum):
    """Task error types for categorizing failures."""

    TRANSIENT = "transient"  # Retry possible
    PERMANENT = "permanent"  # Do not retry
    RATE_LIMITED = "rate_limited"  # Retry with backoff
    RESOURCE_EXHAUSTED = "resource_exhausted"


class TaskError(Exception):
    """Custom exception for task processing errors."""

    def __init__(
        self, message: str, error_type: TaskErrorType, retryable: Optional[bool] = None
    ):
        """Initialize task error.

        Args:
            message: Error description
            error_type: Type of error for handling strategy
            retryable: Whether task should be retried (overrides default)
        """
        super().__init__(message)
        self.error_type = error_type
        self.retryable = (
            retryable
            if retryable is not None
            else error_type != TaskErrorType.PERMANENT
        )


class BaseWorker(ABC):
    """Base worker class for processing tasks asynchronously."""

    def __init__(
        self,
        redis_queue: RedisQueue,
        task_service=None,
        concurrency: int = 1,
        timeout_seconds: int = 300,
        graceful_shutdown_timeout: int = 30,
    ):
        """Initialize base worker.

        Args:
            redis_queue: Redis queue instance for task operations
            task_service: Task service for PostgreSQL synchronization (optional)
            concurrency: Number of concurrent tasks to process
            timeout_seconds: Task timeout in seconds
            graceful_shutdown_timeout: Shutdown timeout in seconds
        """
        self.redis_queue = redis_queue
        self.task_service = task_service
        self.concurrency = concurrency
        self.timeout_seconds = timeout_seconds
        self.graceful_shutdown_timeout = graceful_shutdown_timeout

        self.worker_id = f"{self.__class__.__name__}_{uuid4().hex[:8]}"
        self.running = False
        self.tasks: List[asyncio.Task] = []
        self._shutdown_event = asyncio.Event()

        # Connection health and backoff tracking
        self._redis_connection_healthy = True
        self._last_redis_error = None
        self._consecutive_failures = 0
        self._max_backoff_delay = 30.0  # 30 seconds max
        self._base_backoff_delay = 1.0  # 1 second base

    async def _complete_task_synchronized(
        self,
        task_id: str,
        result: Optional[Dict[str, Any]] = None,
        result_ttl_hours: int = 24,
    ) -> None:
        """Complete task with synchronization between Redis and PostgreSQL.

        Args:
            task_id: Task ID
            result: Task result data
            result_ttl_hours: Result TTL in hours
        """
        # Update Redis first
        await self.redis_queue.complete_task(
            task_id=task_id,
            worker_id=self.worker_id,
            result=result,
            result_ttl_hours=result_ttl_hours,
        )

        # Update PostgreSQL if task service is available
        if self.task_service:
            try:
                await self.task_service._update_task_status_in_postgres(
                    task_id=task_id,
                    status="completed",
                    completed_at=datetime.utcnow(),
                    progress=100,
                )
                logger.info(f"Task {task_id} status synchronized to PostgreSQL")
            except Exception as e:
                logger.error(
                    f"Failed to sync completed task {task_id} to PostgreSQL: {e}"
                )

    async def _fail_task_synchronized(
        self, task_id: str, error_message: str, retry: bool = True
    ) -> bool:
        """Fail task with synchronization between Redis and PostgreSQL.

        Args:
            task_id: Task ID
            error_message: Error description
            retry: Whether to retry the task

        Returns:
            True if task was retried, False if failed permanently
        """
        # Update Redis first
        retried = await self.redis_queue.fail_task(
            task_id=task_id,
            worker_id=self.worker_id,
            error_message=error_message,
            retry=retry,
        )

        # Update PostgreSQL if task service is available
        if self.task_service:
            try:
                status = "pending" if retried else "failed"
                await self.task_service._update_task_status_in_postgres(
                    task_id=task_id,
                    status=status,
                    completed_at=None if retried else datetime.utcnow(),
                    error_message=error_message,
                )
                logger.info(f"Task {task_id} failure status synchronized to PostgreSQL")
            except Exception as e:
                logger.error(f"Failed to sync failed task {task_id} to PostgreSQL: {e}")

        return retried

    @abstractmethod
    async def execute_task(self, task_data: Dict[str, Any]) -> Any:
        """Execute the specific task logic.

        Args:
            task_data: Task data containing payload and metadata

        Returns:
            Task result to be stored

        Raises:
            TaskError: For expected task failures
            Exception: For unexpected errors
        """
        pass

    async def _check_redis_connection(self) -> bool:
        """Check if Redis connection is healthy.

        Returns:
            True if connection is healthy, False otherwise
        """
        try:
            await self.redis_queue.redis.ping()
            if not self._redis_connection_healthy:
                logger.info(f"Worker {self.worker_id} Redis connection restored")
                self._redis_connection_healthy = True
                self._consecutive_failures = 0
            return True
        except (
            redis_exc.ConnectionError,
            redis_exc.TimeoutError,
            redis_exc.RedisError,
        ) as e:
            self._redis_connection_healthy = False
            self._last_redis_error = str(e)
            logger.warning(
                f"Worker {self.worker_id} Redis connection check failed: {e}"
            )
            return False

    def _calculate_backoff_delay(self) -> float:
        """Calculate exponential backoff delay.

        Returns:
            Delay in seconds (1 to 30 seconds)
        """
        if self._consecutive_failures == 0:
            return 0

        # Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
        delay = min(
            self._base_backoff_delay * (2 ** (self._consecutive_failures - 1)),
            self._max_backoff_delay,
        )
        return delay

    async def _handle_redis_error(self, error: Exception, operation: str) -> None:
        """Handle Redis errors with logging and backoff tracking.

        Args:
            error: The Redis exception that occurred
            operation: Description of the operation that failed
        """
        self._consecutive_failures += 1
        self._last_redis_error = str(error)

        delay = self._calculate_backoff_delay()

        logger.error(
            f"Worker {self.worker_id} Redis {operation} failed (attempt {self._consecutive_failures}): {error}. "
            f"Queues: {self.get_queue_names()}. Backing off for {delay:.1f}s"
        )

        if delay > 0:
            await asyncio.sleep(delay)

    def _reset_backoff(self) -> None:
        """Reset backoff state after successful operation."""
        if self._consecutive_failures > 0:
            logger.info(
                f"Worker {self.worker_id} Redis operations recovered after {self._consecutive_failures} failures"
            )
            self._consecutive_failures = 0
            self._last_redis_error = None

    @abstractmethod
    def get_queue_names(self) -> List[str]:
        """Return list of queue names this worker processes.

        Returns:
            List of Redis queue keys
        """
        pass

    @abstractmethod
    def get_task_types(self) -> List[str]:
        """Return list of task types this worker can handle.

        Returns:
            List of task type strings
        """
        pass

    async def start(self) -> None:
        """Start worker with specified concurrency."""
        if self.running:
            logger.warning(f"Worker {self.worker_id} is already running")
            return

        self.running = True
        logger.info(
            f"Starting worker {self.worker_id} with concurrency {self.concurrency}"
        )

        # Setup signal handlers for graceful shutdown
        try:
            for sig in (signal.SIGTERM, signal.SIGINT):
                signal.signal(sig, self._signal_handler)
        except ValueError:
            # Signal handling may not be available in some environments
            pass

        # Start worker tasks
        for i in range(self.concurrency):
            task = asyncio.create_task(self._worker_loop(f"{self.worker_id}_task_{i}"))
            self.tasks.append(task)

        # Wait for shutdown signal
        await self._shutdown_event.wait()
        logger.info(f"Worker {self.worker_id} shutdown signal received")

    async def stop(self) -> None:
        """Stop worker gracefully."""
        if not self.running:
            return

        logger.info(f"Stopping worker {self.worker_id}")
        self.running = False
        self._shutdown_event.set()

        # Wait for tasks to complete with timeout
        if self.tasks:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*self.tasks, return_exceptions=True),
                    timeout=self.graceful_shutdown_timeout,
                )
            except asyncio.TimeoutError:
                logger.warning(f"Worker {self.worker_id} shutdown timeout reached")
                # Cancel remaining tasks
                for task in self.tasks:
                    if not task.done():
                        task.cancel()

        logger.info(f"Worker {self.worker_id} stopped")

    def _signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals."""
        logger.info(f"Worker {self.worker_id} received signal {signum}")
        asyncio.create_task(self.stop())

    async def _worker_loop(self, task_name: str) -> None:
        """Main worker loop for processing tasks.

        Args:
            task_name: Name for this worker task
        """
        logger.info(f"Started worker task {task_name}")

        while self.running:
            try:
                # Check Redis connection health before attempting operations
                if not await self._check_redis_connection():
                    await self._handle_redis_error(
                        Exception("Redis connection health check failed"),
                        "connection health check",
                    )
                    continue

                # Dequeue task with timeout and specific error handling
                try:
                    task_data = await self.redis_queue.dequeue(
                        worker_id=self.worker_id,
                        timeout=5,  # Short timeout to check running status
                        queues=self.get_queue_names(),
                    )

                    # Reset backoff on successful operation
                    self._reset_backoff()

                except redis_exc.TimeoutError as e:
                    # Redis timeout - not necessarily an error, just no tasks available
                    logger.debug(
                        f"Worker {self.worker_id} Redis dequeue timeout (no tasks available): {e}"
                    )
                    continue

                except (redis_exc.ConnectionError, redis_exc.RedisError) as e:
                    # Redis connection or other Redis errors - use backoff
                    await self._handle_redis_error(e, "dequeue operation")
                    continue

                if not task_data:
                    continue

                task_id = task_data["id"]
                task_type = task_data["task_type"]

                # Validate task type
                if task_type not in self.get_task_types():
                    await self._handle_invalid_task_type(task_id, task_type)
                    continue

                logger.info(
                    f"Worker {self.worker_id} processing task {task_id} of type {task_type} from queues {self.get_queue_names()}"
                )

                # Process task with timeout
                try:
                    result = await asyncio.wait_for(
                        self._process_task(task_data), timeout=self.timeout_seconds
                    )

                    # Mark task as completed - with synchronized Redis/PostgreSQL update
                    try:
                        await self._complete_task_synchronized(
                            task_id=task_id, result=result
                        )
                        logger.info(f"Worker {self.worker_id} completed task {task_id}")

                    except (
                        redis_exc.TimeoutError,
                        redis_exc.ConnectionError,
                        redis_exc.RedisError,
                    ) as e:
                        logger.error(
                            f"Worker {self.worker_id} failed to mark task {task_id} as completed: {e}"
                        )
                        # Task was processed successfully but we couldn't update Redis
                        # This could lead to task reprocessing, but that's better than losing the result
                        await self._handle_redis_error(e, f"complete_task({task_id})")

                except asyncio.TimeoutError:
                    error_msg = (
                        f"Task {task_id} timed out after {self.timeout_seconds}s"
                    )
                    logger.error(f"Worker {self.worker_id} task timeout: {error_msg}")

                    try:
                        await self._fail_task_synchronized(
                            task_id=task_id,
                            error_message=error_msg,
                            retry=False,  # Don't retry timeout errors
                        )
                    except (
                        redis_exc.TimeoutError,
                        redis_exc.ConnectionError,
                        redis_exc.RedisError,
                    ) as e:
                        logger.error(
                            f"Worker {self.worker_id} failed to mark task {task_id} as failed: {e}"
                        )
                        await self._handle_redis_error(e, f"fail_task({task_id})")

                except TaskError as e:
                    logger.warning(
                        f"Worker {self.worker_id} task {task_id} failed: {e}"
                    )

                    try:
                        await self._fail_task_synchronized(
                            task_id=task_id,
                            error_message=str(e),
                            retry=e.retryable,
                        )
                    except (
                        redis_exc.TimeoutError,
                        redis_exc.ConnectionError,
                        redis_exc.RedisError,
                    ) as redis_err:
                        logger.error(
                            f"Worker {self.worker_id} failed to mark task {task_id} as failed: {redis_err}"
                        )
                        await self._handle_redis_error(
                            redis_err, f"fail_task({task_id})"
                        )

                except Exception as e:
                    error_msg = f"Unexpected error in task {task_id}: {e}"
                    logger.error(
                        f"Worker {self.worker_id} unexpected error: {error_msg}"
                    )
                    logger.error(traceback.format_exc())

                    # Retry unexpected errors
                    try:
                        await self._fail_task_synchronized(
                            task_id=task_id,
                            error_message=error_msg,
                            retry=True,
                        )
                    except (
                        redis_exc.TimeoutError,
                        redis_exc.ConnectionError,
                        redis_exc.RedisError,
                    ) as redis_err:
                        logger.error(
                            f"Worker {self.worker_id} failed to mark task {task_id} as failed: {redis_err}"
                        )
                        await self._handle_redis_error(
                            redis_err, f"fail_task({task_id})"
                        )

            except Exception as e:
                logger.error(f"Error in worker loop {task_name}: {e}")
                logger.error(traceback.format_exc())

                # Sleep briefly to avoid tight error loops, but don't use exponential backoff
                # for non-Redis errors as they might be different issues
                await asyncio.sleep(1)

        logger.info(f"Worker task {task_name} completed")

    async def _process_task(
        self, task_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Process a single task with progress tracking.

        Args:
            task_data: Task data from queue

        Returns:
            Task result
        """
        task_id = task_data["id"]
        start_time = time.time()

        try:
            # Update task progress to indicate processing started
            await self.redis_queue.update_progress(task_id, 5, "Processing started")

            # Execute the specific task logic
            result = await self.execute_task(task_data)

            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)

            # Add metadata to result
            if isinstance(result, dict):
                result["_metadata"] = {
                    "worker_id": self.worker_id,
                    "processing_time_ms": processing_time_ms,
                    "completed_at": datetime.utcnow().isoformat(),
                }

            return result

        except Exception as e:
            # Update progress to indicate failure
            await self.redis_queue.update_progress(task_id, 0, f"Failed: {str(e)}")
            raise

    async def _handle_invalid_task_type(self, task_id: str, task_type: str) -> None:
        """Handle tasks with invalid types.

        Args:
            task_id: Task ID
            task_type: Invalid task type
        """
        error_msg = (
            f"Worker {self.worker_id} cannot handle task type '{task_type}'. "
            f"Supported types: {self.get_task_types()}"
        )

        logger.error(error_msg)

        await self._fail_task_synchronized(
            task_id=task_id,
            error_message=error_msg,
            retry=False,  # Don't retry invalid task types
        )

    async def update_progress(
        self, task_id: str, progress: int, message: Optional[str] = None
    ) -> None:
        """Update task progress (helper method for subclasses).

        Args:
            task_id: Task ID
            progress: Progress percentage (0-100)
            message: Optional progress message
        """
        await self.redis_queue.update_progress(task_id, progress, message)

    async def health_check(self) -> Dict[str, Any]:
        """Check worker health status.

        Returns:
            Health status information
        """
        active_tasks = len([task for task in self.tasks if not task.done()])
        redis_healthy = await self._check_redis_connection()

        return {
            "worker_id": self.worker_id,
            "status": "running" if self.running else "stopped",
            "concurrency": self.concurrency,
            "active_tasks": active_tasks,
            "total_tasks": len(self.tasks),
            "supported_types": self.get_task_types(),
            "queue_names": self.get_queue_names(),
            "timeout_seconds": self.timeout_seconds,
            "redis_connection_healthy": redis_healthy,
            "consecutive_redis_failures": self._consecutive_failures,
            "last_redis_error": self._last_redis_error,
            "current_backoff_delay": self._calculate_backoff_delay(),
        }

    def __repr__(self) -> str:
        """String representation of worker."""
        return (
            f"{self.__class__.__name__}("
            f"worker_id={self.worker_id}, "
            f"concurrency={self.concurrency}, "
            f"running={self.running})"
        )
