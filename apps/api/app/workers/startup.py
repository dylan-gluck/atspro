"""Worker startup and management for ATSPro API."""

import asyncio
import logging
from typing import Optional

from ..database.connections import get_redis_client
from ..queue.redis_queue import RedisQueue
from ..services.task_service import TaskService
from .manager import WorkerManager
from .resume_parser import ResumeParseWorker

logger = logging.getLogger(__name__)

# Global worker manager instance
_worker_manager: Optional[WorkerManager] = None


async def start_workers(task_service: Optional[TaskService] = None) -> WorkerManager:
    """Start all workers for the ATSPro API.
    
    Returns:
        WorkerManager: The initialized worker manager
    """
    global _worker_manager
    
    if _worker_manager is not None:
        logger.warning("Workers already started")
        return _worker_manager
    
    try:
        # Get Redis client
        redis_client = get_redis_client()
        
        # Create Redis queue
        redis_queue = RedisQueue(redis_client)
        
        # Create worker manager
        _worker_manager = WorkerManager(redis_queue, task_service)
        
        # Add resume parsing workers
        _worker_manager.add_worker(
            worker_class=ResumeParseWorker,
            count=2,  # Start with 2 resume parsing workers
            concurrency=1,  # Each worker handles 1 task at a time
            timeout_seconds=300,  # 5 minute timeout for resume parsing
        )
        
        # Start all workers in background
        asyncio.create_task(_worker_manager.start())
        
        logger.info("Workers started successfully")
        return _worker_manager
        
    except Exception as e:
        logger.error(f"Failed to start workers: {e}")
        raise


async def stop_workers(timeout_seconds: int = 60) -> None:
    """Stop all workers gracefully.
    
    Args:
        timeout_seconds: Maximum time to wait for workers to stop
    """
    global _worker_manager
    
    if _worker_manager is None:
        logger.warning("No workers to stop")
        return
    
    try:
        await _worker_manager.stop(timeout_seconds)
        _worker_manager = None
        logger.info("Workers stopped successfully")
        
    except Exception as e:
        logger.error(f"Error stopping workers: {e}")
        raise


def get_worker_manager() -> Optional[WorkerManager]:
    """Get the global worker manager instance.
    
    Returns:
        WorkerManager or None if not started
    """
    return _worker_manager


async def get_worker_status() -> dict:
    """Get status of all workers.
    
    Returns:
        Dictionary with worker status information
    """
    if _worker_manager is None:
        return {
            "manager_status": "not_started",
            "total_workers": 0,
            "running_workers": 0,
            "total_active_tasks": 0,
            "workers": []
        }
    
    return await _worker_manager.get_status()


async def scale_resume_workers(target_count: int) -> None:
    """Scale resume parsing workers to target count.
    
    Args:
        target_count: Target number of resume parsing workers
    """
    if _worker_manager is None:
        raise RuntimeError("Workers not started")
    
    await _worker_manager.scale_workers(
        worker_class=ResumeParseWorker,
        target_count=target_count,
        concurrency=1,
        timeout_seconds=300,
    )
    
    logger.info(f"Scaled resume workers to {target_count}")