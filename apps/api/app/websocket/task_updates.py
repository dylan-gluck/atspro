"""WebSocket handlers for real-time task updates."""

import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, Query, WebSocket, WebSocketDisconnect

from .manager import connection_manager
from ..auth import validate_bearer_token, User, AuthenticationError

logger = logging.getLogger(__name__)


async def get_user_from_token(token: Optional[str] = Query(None)) -> User:
    """Extract user information from WebSocket token parameter.

    Validates the session token against the better-auth database.

    Args:
        token: Authentication token from query parameter

    Returns:
        User: Authenticated user object

    Raises:
        HTTPException: If token is invalid or missing
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required")

    try:
        # For WebSocket, we pass the token as Bearer authorization
        return await validate_bearer_token(f"Bearer {token}")
    except AuthenticationError as e:
        # Convert auth errors to WebSocket-compatible HTTPException
        raise HTTPException(status_code=401, detail=str(e.detail))
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=401, detail="Authentication service unavailable"
        )


async def websocket_endpoint(websocket: WebSocket, user: User = None):
    """WebSocket endpoint for real-time task updates.

    This endpoint allows authenticated users to receive real-time updates
    about their task status changes.

    Message format:
    {
        "type": "task_update",
        "data": {
            "task_id": "uuid",
            "status": "pending|running|completed|failed",
            "progress": 75,
            "result": {...},  // if completed
            "error": "..."    // if failed
        }
    }
    """
    if user is None:
        await websocket.close(code=1008, reason="Authentication required")
        return

    connection_id = None
    try:
        # Connect the WebSocket
        connection_id = await connection_manager.connect(websocket, user.id)

        # Send connection confirmation
        await connection_manager.send_personal_message(
            {
                "type": "connection_established",
                "data": {
                    "connection_id": connection_id,
                    "user_id": user.id,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            },
            connection_id,
        )

        # Keep the connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from the client
                data = await websocket.receive_text()
                message = json.loads(data)

                # Handle different message types
                if message.get("type") == "ping":
                    await connection_manager.send_personal_message(
                        {"type": "pong", "timestamp": datetime.utcnow().isoformat()},
                        connection_id,
                    )
                elif message.get("type") == "subscribe_task":
                    # Client wants to subscribe to updates for a specific task
                    task_id = message.get("task_id")
                    if task_id:
                        logger.info(f"User {user.id} subscribed to task {task_id}")
                        # TODO: Store subscription mapping when task service is available
                elif message.get("type") == "unsubscribe_task":
                    # Client wants to unsubscribe from a specific task
                    task_id = message.get("task_id")
                    if task_id:
                        logger.info(f"User {user.id} unsubscribed from task {task_id}")
                        # TODO: Remove subscription mapping when task service is available
                else:
                    logger.warning(f"Unknown message type: {message.get('type')}")

            except json.JSONDecodeError:
                logger.error("Invalid JSON received from client")
                await connection_manager.send_personal_message(
                    {"type": "error", "message": "Invalid JSON format"}, connection_id
                )
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user.id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if connection_id:
            connection_manager.disconnect(connection_id)


async def broadcast_task_update(task_id: str, user_id: str, update_data: dict):
    """Broadcast a task update to all connections for a specific user.

    Args:
        task_id: The ID of the task being updated
        user_id: The ID of the user who owns the task
        update_data: Dictionary containing task status, progress, result, etc.
    """
    message = {"type": "task_update", "data": {"task_id": task_id, **update_data}}

    try:
        await connection_manager.send_user_message(message, user_id)
        logger.info(f"Broadcasted task update for task {task_id} to user {user_id}")
    except Exception as e:
        logger.error(f"Error broadcasting task update: {e}")


async def broadcast_system_message(message: str, level: str = "info"):
    """Broadcast a system-wide message to all connected clients.

    Args:
        message: The message to broadcast
        level: Message level (info, warning, error)
    """
    broadcast_data = {
        "type": "system_message",
        "data": {
            "message": message,
            "level": level,
            "timestamp": datetime.utcnow().isoformat(),
        },
    }

    try:
        await connection_manager.broadcast_message(broadcast_data)
        logger.info(f"Broadcasted system message: {message}")
    except Exception as e:
        logger.error(f"Error broadcasting system message: {e}")
