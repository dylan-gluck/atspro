"""Real-time notification service stub (Redis removed)."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from ..websocket.task_updates import broadcast_system_message, broadcast_task_update

logger = logging.getLogger(__name__)


class NotificationService:
    """Stub service for managing real-time notifications without Redis."""

    def __init__(self, redis_url: Optional[str] = None):
        """Initialize notification service stub.

        Args:
            redis_url: Unused parameter for compatibility
        """
        self.running = False

    async def startup(self) -> None:
        """Stub startup method."""
        logger.info("Notification service stub started")
        self.running = True

    async def shutdown(self) -> None:
        """Stub shutdown method."""
        logger.info("Notification service stub shutdown")
        self.running = False

    async def publish_task_update(
        self,
        task_id: str,
        user_id: str,
        status: str,
        progress: Optional[int] = None,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        **additional_data,
    ) -> None:
        """Stub for task update publishing."""
        logger.debug(f"Task update stub: {task_id} -> {status}")

    async def publish_system_message(
        self, message: str, level: str = "info", target_user: Optional[str] = None
    ) -> None:
        """Stub for system message publishing."""
        logger.debug(f"System message stub: {level} - {message}")

    async def notify_task_started(
        self, task_id: str, user_id: str, estimated_duration: Optional[int] = None
    ) -> None:
        """Stub for task started notification."""
        await self.publish_task_update(task_id, user_id, "running", progress=0)

    async def notify_task_progress(
        self, task_id: str, user_id: str, progress: int, message: Optional[str] = None
    ) -> None:
        """Stub for task progress notification."""
        await self.publish_task_update(task_id, user_id, "running", progress=progress)

    async def notify_task_completed(
        self, task_id: str, user_id: str, result: Optional[Dict[str, Any]] = None
    ) -> None:
        """Stub for task completion notification."""
        await self.publish_task_update(task_id, user_id, "completed", progress=100, result=result)

    async def notify_task_failed(self, task_id: str, user_id: str, error: str) -> None:
        """Stub for task failure notification."""
        await self.publish_task_update(task_id, user_id, "failed", error=error)

    async def notify_task_cancelled(self, task_id: str, user_id: str) -> None:
        """Stub for task cancellation notification."""
        await self.publish_task_update(task_id, user_id, "cancelled", progress=0)


# Global notification service instance
notification_service = NotificationService()
