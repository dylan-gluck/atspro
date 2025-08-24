"""Task update broadcasting stubs."""

from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)


async def broadcast_task_update(task_id: str, user_id: str, update_data: Dict[str, Any]) -> None:
    """Stub for task update broadcasting.
    
    Args:
        task_id: ID of the task
        user_id: ID of the user
        update_data: Update data to broadcast
    """
    logger.debug(f"Task update broadcast (stub): {task_id} -> {update_data}")


async def broadcast_system_message(message: str, level: str = "info") -> None:
    """Stub for system message broadcasting.
    
    Args:
        message: System message to broadcast
        level: Message level (info, warning, error)
    """
    logger.debug(f"System message broadcast (stub): {level} - {message}")