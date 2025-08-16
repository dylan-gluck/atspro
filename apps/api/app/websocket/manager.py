"""WebSocket connection manager for handling multiple clients."""

import json
import logging
from typing import Dict, Set
from uuid import uuid4

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time task updates."""

    def __init__(self):
        # Map of connection_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # Map of user_id -> set of connection_ids
        self.user_connections: Dict[str, Set[str]] = {}
        # Map of connection_id -> user_id
        self.connection_users: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str) -> str:
        """Accept a new WebSocket connection and associate it with a user."""
        await websocket.accept()
        connection_id = uuid4().hex

        self.active_connections[connection_id] = websocket
        self.connection_users[connection_id] = user_id

        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)

        logger.info(f"WebSocket connected: {connection_id} for user {user_id}")
        return connection_id

    def disconnect(self, connection_id: str):
        """Remove a WebSocket connection."""
        if connection_id in self.active_connections:
            user_id = self.connection_users.get(connection_id)

            # Remove from active connections
            del self.active_connections[connection_id]
            del self.connection_users[connection_id]

            # Remove from user connections
            if user_id and user_id in self.user_connections:
                self.user_connections[user_id].discard(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]

            logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_personal_message(self, message: dict, connection_id: str):
        """Send a message to a specific connection."""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)

    async def send_user_message(self, message: dict, user_id: str):
        """Send a message to all connections for a specific user."""
        if user_id in self.user_connections:
            connection_ids = list(self.user_connections[user_id])
            for connection_id in connection_ids:
                await self.send_personal_message(message, connection_id)

    async def broadcast_message(self, message: dict):
        """Send a message to all active connections."""
        connection_ids = list(self.active_connections.keys())
        for connection_id in connection_ids:
            await self.send_personal_message(message, connection_id)

    def get_user_connection_count(self, user_id: str) -> int:
        """Get the number of active connections for a user."""
        return len(self.user_connections.get(user_id, set()))

    def get_total_connections(self) -> int:
        """Get the total number of active connections."""
        return len(self.active_connections)


# Global connection manager instance
connection_manager = ConnectionManager()
