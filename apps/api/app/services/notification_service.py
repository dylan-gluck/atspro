"""Real-time notification service for task updates."""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

import redis.asyncio as redis

from ..config import settings
from ..websocket.task_updates import broadcast_system_message, broadcast_task_update

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing real-time notifications and task status broadcasts."""

    def __init__(self, redis_url: Optional[str] = None):
        """Initialize notification service.

        Args:
            redis_url: Redis connection URL for pub/sub
        """
        self.redis_url = redis_url or settings.redis_url
        self.redis_client: Optional[redis.Redis] = None
        self.subscriber: Optional[redis.client.PubSub] = None
        self.running = False

        # Channel names for different notification types
        self.task_update_channel = (
            f"{settings.redis_queue_prefix}:notifications:task_updates"
        )
        self.system_message_channel = (
            f"{settings.redis_queue_prefix}:notifications:system"
        )

    async def startup(self) -> None:
        """Initialize Redis connection and start listening for notifications."""
        logger.info("Starting notification service")

        try:
            # Initialize Redis client
            self.redis_client = redis.from_url(self.redis_url)
            await self.redis_client.ping()

            # Initialize subscriber
            self.subscriber = self.redis_client.pubsub()

            # Subscribe to notification channels
            await self.subscriber.subscribe(
                self.task_update_channel, self.system_message_channel
            )

            # Start background task to process messages
            self.running = True
            asyncio.create_task(self._process_notifications())

            logger.info("Notification service started successfully")

        except Exception as e:
            logger.error(f"Failed to start notification service: {e}")
            raise

    async def shutdown(self) -> None:
        """Stop notification service and cleanup connections."""
        logger.info("Shutting down notification service")

        self.running = False

        if self.subscriber:
            await self.subscriber.unsubscribe()
            await self.subscriber.close()

        if self.redis_client:
            await self.redis_client.close()

        logger.info("Notification service shutdown completed")

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
        """Publish a task status update notification.

        Args:
            task_id: ID of the updated task
            user_id: ID of the user who owns the task
            status: Current task status
            progress: Optional progress percentage (0-100)
            result: Optional result data if completed
            error: Optional error message if failed
            **additional_data: Additional data to include in update
        """
        if not self.redis_client:
            logger.warning("Redis client not initialized, cannot publish task update")
            return

        update_data = {
            "task_id": task_id,
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            **additional_data,
        }

        if progress is not None:
            update_data["progress"] = progress

        if result is not None:
            update_data["result"] = result

        if error is not None:
            update_data["error"] = error

        try:
            message = json.dumps(update_data)
            await self.redis_client.publish(self.task_update_channel, message)
            logger.debug(f"Published task update for task {task_id}")

        except Exception as e:
            logger.error(f"Error publishing task update for task {task_id}: {e}")

    async def publish_system_message(
        self, message: str, level: str = "info", target_user: Optional[str] = None
    ) -> None:
        """Publish a system-wide or user-specific message.

        Args:
            message: Message content
            level: Message level (info, warning, error)
            target_user: Optional user ID for targeted messages
        """
        if not self.redis_client:
            logger.warning(
                "Redis client not initialized, cannot publish system message"
            )
            return

        message_data = {
            "message": message,
            "level": level,
            "timestamp": datetime.utcnow().isoformat(),
        }

        if target_user:
            message_data["target_user"] = target_user

        try:
            payload = json.dumps(message_data)
            await self.redis_client.publish(self.system_message_channel, payload)
            logger.debug(f"Published system message: {message}")

        except Exception as e:
            logger.error(f"Error publishing system message: {e}")

    async def _process_notifications(self) -> None:
        """Background task to process incoming notification messages."""
        logger.info("Started processing notifications")

        try:
            while self.running and self.subscriber:
                try:
                    # Get message with timeout
                    message = await asyncio.wait_for(
                        self.subscriber.get_message(ignore_subscribe_messages=True),
                        timeout=1.0,
                    )

                    if message and message["data"]:
                        await self._handle_notification_message(message)

                except asyncio.TimeoutError:
                    # Timeout is expected, continue listening
                    continue
                except Exception as e:
                    logger.error(f"Error processing notification message: {e}")
                    await asyncio.sleep(1)  # Brief pause before retrying

        except Exception as e:
            logger.error(f"Critical error in notification processing: {e}")
        finally:
            logger.info("Stopped processing notifications")

    async def _handle_notification_message(self, message: dict) -> None:
        """Handle a single notification message.

        Args:
            message: Redis pub/sub message
        """
        try:
            channel = message["channel"].decode()
            data = json.loads(message["data"])

            if channel == self.task_update_channel:
                await self._handle_task_update(data)
            elif channel == self.system_message_channel:
                await self._handle_system_message(data)
            else:
                logger.warning(f"Unknown notification channel: {channel}")

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in notification message: {e}")
        except Exception as e:
            logger.error(f"Error handling notification message: {e}")

    async def _handle_task_update(self, data: dict) -> None:
        """Handle a task update notification.

        Args:
            data: Task update data
        """
        try:
            task_id = data.get("task_id")
            user_id = data.get("user_id")

            if not task_id or not user_id:
                logger.error("Task update missing required fields: task_id, user_id")
                return

            # Extract update data (remove metadata)
            update_data = {
                k: v for k, v in data.items() if k not in ["task_id", "user_id"]
            }

            # Broadcast to WebSocket clients
            await broadcast_task_update(task_id, user_id, update_data)

            logger.debug(
                f"Broadcasted task update for task {task_id} to user {user_id}"
            )

        except Exception as e:
            logger.error(f"Error handling task update: {e}")

    async def _handle_system_message(self, data: dict) -> None:
        """Handle a system message notification.

        Args:
            data: System message data
        """
        try:
            message = data.get("message")
            level = data.get("level", "info")
            target_user = data.get("target_user")

            if not message:
                logger.error("System message missing required field: message")
                return

            if target_user:
                # TODO: Implement user-specific message broadcasting
                # For now, we'll log it and potentially extend WebSocket manager
                logger.info(f"User-specific message for {target_user}: {message}")
            else:
                # Broadcast to all connected clients
                await broadcast_system_message(message, level)

            logger.debug(f"Handled system message: {message}")

        except Exception as e:
            logger.error(f"Error handling system message: {e}")

    async def notify_task_started(
        self, task_id: str, user_id: str, estimated_duration: Optional[int] = None
    ) -> None:
        """Convenience method to notify that a task has started.

        Args:
            task_id: ID of the started task
            user_id: ID of the user who owns the task
            estimated_duration: Optional estimated duration in milliseconds
        """
        additional_data = {}
        if estimated_duration:
            additional_data["estimated_duration_ms"] = estimated_duration

        await self.publish_task_update(
            task_id=task_id,
            user_id=user_id,
            status="running",
            progress=0,
            **additional_data,
        )

    async def notify_task_progress(
        self, task_id: str, user_id: str, progress: int, message: Optional[str] = None
    ) -> None:
        """Convenience method to notify task progress update.

        Args:
            task_id: ID of the task
            user_id: ID of the user who owns the task
            progress: Progress percentage (0-100)
            message: Optional progress message
        """
        additional_data = {}
        if message:
            additional_data["message"] = message

        await self.publish_task_update(
            task_id=task_id,
            user_id=user_id,
            status="running",
            progress=progress,
            **additional_data,
        )

    async def notify_task_completed(
        self, task_id: str, user_id: str, result: Optional[Dict[str, Any]] = None
    ) -> None:
        """Convenience method to notify task completion.

        Args:
            task_id: ID of the completed task
            user_id: ID of the user who owns the task
            result: Optional result data
        """
        await self.publish_task_update(
            task_id=task_id,
            user_id=user_id,
            status="completed",
            progress=100,
            result=result,
        )

    async def notify_task_failed(self, task_id: str, user_id: str, error: str) -> None:
        """Convenience method to notify task failure.

        Args:
            task_id: ID of the failed task
            user_id: ID of the user who owns the task
            error: Error message
        """
        await self.publish_task_update(
            task_id=task_id, user_id=user_id, status="failed", error=error
        )

    async def notify_task_cancelled(self, task_id: str, user_id: str) -> None:
        """Convenience method to notify task cancellation.

        Args:
            task_id: ID of the cancelled task
            user_id: ID of the user who owns the task
        """
        await self.publish_task_update(
            task_id=task_id, user_id=user_id, status="cancelled", progress=0
        )


# Global notification service instance
notification_service = NotificationService()
