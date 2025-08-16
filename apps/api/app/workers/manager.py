"""Worker manager for orchestrating multiple workers in ATSPro API."""

import asyncio
import logging
import signal
from typing import Any, Dict, List, Type

from ..queue.redis_queue import RedisQueue
from .base import BaseWorker

logger = logging.getLogger(__name__)


class WorkerManager:
    """Manager for orchestrating multiple workers with different configurations."""

    def __init__(self, redis_queue: RedisQueue):
        """Initialize worker manager.

        Args:
            redis_queue: Redis queue instance for task operations
        """
        self.redis_queue = redis_queue
        self.workers: List[BaseWorker] = []
        self.worker_tasks: List[asyncio.Task] = []
        self.running = False
        self._shutdown_event = asyncio.Event()

    def add_worker(
        self,
        worker_class: Type[BaseWorker],
        count: int = 1,
        concurrency: int = 1,
        timeout_seconds: int = 300,
        **kwargs,
    ) -> None:
        """Add workers of a specific type to the manager.

        Args:
            worker_class: Worker class to instantiate
            count: Number of worker instances to create
            concurrency: Concurrency level for each worker
            timeout_seconds: Task timeout for each worker
            **kwargs: Additional arguments for worker initialization
        """
        for i in range(count):
            worker = worker_class(
                redis_queue=self.redis_queue,
                concurrency=concurrency,
                timeout_seconds=timeout_seconds,
                **kwargs,
            )
            self.workers.append(worker)
            logger.info(
                f"Added worker {worker.worker_id} "
                f"(type: {worker_class.__name__}, concurrency: {concurrency})"
            )

    async def start(self) -> None:
        """Start all workers."""
        if self.running:
            logger.warning("Worker manager is already running")
            return

        if not self.workers:
            logger.warning("No workers configured")
            return

        self.running = True
        logger.info(f"Starting worker manager with {len(self.workers)} workers")

        # Setup signal handlers for graceful shutdown
        try:
            for sig in (signal.SIGTERM, signal.SIGINT):
                signal.signal(sig, self._signal_handler)
        except ValueError:
            # Signal handling may not be available in some environments
            pass

        # Start all workers
        for worker in self.workers:
            task = asyncio.create_task(worker.start())
            self.worker_tasks.append(task)

        # Start health monitoring
        monitor_task = asyncio.create_task(self._health_monitor())
        self.worker_tasks.append(monitor_task)

        logger.info("All workers started")

        # Wait for shutdown signal
        await self._shutdown_event.wait()
        logger.info("Worker manager shutdown signal received")

    async def stop(self, timeout_seconds: int = 60) -> None:
        """Stop all workers gracefully.

        Args:
            timeout_seconds: Maximum time to wait for workers to stop
        """
        if not self.running:
            return

        logger.info("Stopping worker manager")
        self.running = False
        self._shutdown_event.set()

        # Stop all workers
        stop_tasks = []
        for worker in self.workers:
            stop_tasks.append(asyncio.create_task(worker.stop()))

        # Wait for workers to stop with timeout
        try:
            await asyncio.wait_for(
                asyncio.gather(*stop_tasks, return_exceptions=True),
                timeout=timeout_seconds,
            )
            logger.info("All workers stopped gracefully")
        except asyncio.TimeoutError:
            logger.warning("Worker shutdown timeout reached")

        # Cancel any remaining tasks
        for task in self.worker_tasks:
            if not task.done():
                task.cancel()

        # Wait for task cancellation
        try:
            await asyncio.gather(*self.worker_tasks, return_exceptions=True)
        except Exception as e:
            logger.error(f"Error during task cancellation: {e}")

        logger.info("Worker manager stopped")

    def _signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals."""
        logger.info(f"Worker manager received signal {signum}")
        asyncio.create_task(self.stop())

    async def _health_monitor(self) -> None:
        """Monitor worker health and restart failed workers."""
        logger.info("Started worker health monitor")

        while self.running:
            try:
                # Check each worker's health
                for i, worker in enumerate(self.workers):
                    try:
                        health = await worker.health_check()

                        # Check if worker is still running
                        if health["status"] != "running" and self.running:
                            logger.warning(
                                f"Worker {worker.worker_id} is not running, "
                                f"status: {health['status']}"
                            )

                            # Restart worker
                            await self._restart_worker(i)

                    except Exception as e:
                        logger.error(
                            f"Health check failed for worker {worker.worker_id}: {e}"
                        )
                        # Restart worker on health check failure
                        await self._restart_worker(i)

                # Wait before next health check
                await asyncio.sleep(30)  # Health check every 30 seconds

            except Exception as e:
                logger.error(f"Error in health monitor: {e}")
                await asyncio.sleep(30)

        logger.info("Worker health monitor stopped")

    async def _restart_worker(self, worker_index: int) -> None:
        """Restart a specific worker.

        Args:
            worker_index: Index of worker in workers list
        """
        if worker_index >= len(self.workers):
            return

        old_worker = self.workers[worker_index]
        logger.info(f"Restarting worker {old_worker.worker_id}")

        try:
            # Stop old worker
            await old_worker.stop()

            # Create new worker instance of same type
            new_worker = type(old_worker)(
                redis_queue=self.redis_queue,
                concurrency=old_worker.concurrency,
                timeout_seconds=old_worker.timeout_seconds,
            )

            # Replace in workers list
            self.workers[worker_index] = new_worker

            # Start new worker
            if self.running:
                asyncio.create_task(new_worker.start())
                # Note: In practice you'd need better task tracking
                # to replace the corresponding task in worker_tasks

                logger.info(f"Restarted worker as {new_worker.worker_id}")

        except Exception as e:
            logger.error(f"Failed to restart worker {old_worker.worker_id}: {e}")

    async def get_status(self) -> Dict[str, Any]:
        """Get status of all workers.

        Returns:
            Manager and worker status information
        """
        worker_statuses = []

        for worker in self.workers:
            try:
                health = await worker.health_check()
                worker_statuses.append(health)
            except Exception as e:
                worker_statuses.append(
                    {"worker_id": worker.worker_id, "status": "error", "error": str(e)}
                )

        # Calculate aggregate statistics
        running_workers = len(
            [w for w in worker_statuses if w.get("status") == "running"]
        )
        total_active_tasks = sum(w.get("active_tasks", 0) for w in worker_statuses)

        return {
            "manager_status": "running" if self.running else "stopped",
            "total_workers": len(self.workers),
            "running_workers": running_workers,
            "total_active_tasks": total_active_tasks,
            "workers": worker_statuses,
        }

    async def scale_workers(
        self,
        worker_class: Type[BaseWorker],
        target_count: int,
        concurrency: int = 1,
        timeout_seconds: int = 300,
        **kwargs,
    ) -> None:
        """Scale workers of a specific type to target count.

        Args:
            worker_class: Worker class to scale
            target_count: Target number of workers
            concurrency: Concurrency for new workers
            timeout_seconds: Timeout for new workers
            **kwargs: Additional worker arguments
        """
        # Count existing workers of this type
        existing_workers = [w for w in self.workers if isinstance(w, worker_class)]
        current_count = len(existing_workers)

        if target_count == current_count:
            logger.info(
                f"Worker count for {worker_class.__name__} already at target: {target_count}"
            )
            return

        if target_count > current_count:
            # Scale up - add new workers
            to_add = target_count - current_count
            logger.info(f"Scaling up {worker_class.__name__} by {to_add} workers")

            for i in range(to_add):
                worker = worker_class(
                    redis_queue=self.redis_queue,
                    concurrency=concurrency,
                    timeout_seconds=timeout_seconds,
                    **kwargs,
                )
                self.workers.append(worker)

                # Start worker if manager is running
                if self.running:
                    task = asyncio.create_task(worker.start())
                    self.worker_tasks.append(task)

                logger.info(f"Added worker {worker.worker_id}")

        else:
            # Scale down - remove workers
            to_remove = current_count - target_count
            logger.info(f"Scaling down {worker_class.__name__} by {to_remove} workers")

            workers_to_remove = existing_workers[:to_remove]

            # Stop and remove workers
            for worker in workers_to_remove:
                try:
                    await worker.stop()
                    self.workers.remove(worker)
                    logger.info(f"Removed worker {worker.worker_id}")
                except Exception as e:
                    logger.error(f"Error removing worker {worker.worker_id}: {e}")

    def get_worker_types(self) -> Dict[str, int]:
        """Get count of workers by type.

        Returns:
            Dictionary mapping worker class names to counts
        """
        type_counts = {}
        for worker in self.workers:
            worker_type = type(worker).__name__
            type_counts[worker_type] = type_counts.get(worker_type, 0) + 1
        return type_counts

    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics.

        Returns:
            Queue statistics and health information
        """
        return await self.redis_queue.get_queue_stats()

    def __repr__(self) -> str:
        """String representation of worker manager."""
        return f"WorkerManager(workers={len(self.workers)}, running={self.running})"
