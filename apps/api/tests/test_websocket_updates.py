"""Tests for WebSocket task updates functionality."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect

from app.main import app
from app.websocket.manager import ConnectionManager, connection_manager
from app.websocket.task_updates import (
    broadcast_task_update,
    broadcast_system_message,
    get_user_from_token,
    websocket_endpoint,
)


class TestConnectionManager:
    """Test cases for WebSocket connection manager."""

    def setup_method(self):
        """Set up test fixtures."""
        self.manager = ConnectionManager()
        self.mock_websocket = MagicMock()
        self.mock_websocket.accept = AsyncMock()
        self.mock_websocket.send_text = AsyncMock()
        self.test_user_id = "test_user_123"

    @pytest.mark.asyncio
    async def test_connect_websocket(self):
        """Test establishing a WebSocket connection."""
        connection_id = await self.manager.connect(
            self.mock_websocket, self.test_user_id
        )

        # Verify connection was established
        assert connection_id in self.manager.active_connections
        assert self.manager.active_connections[connection_id] == self.mock_websocket
        assert self.manager.connection_users[connection_id] == self.test_user_id
        assert self.test_user_id in self.manager.user_connections
        assert connection_id in self.manager.user_connections[self.test_user_id]

        # Verify WebSocket was accepted
        self.mock_websocket.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_multiple_connections_same_user(self):
        """Test multiple connections for the same user."""
        # Create two connections for the same user
        connection_id1 = await self.manager.connect(
            self.mock_websocket, self.test_user_id
        )

        mock_websocket2 = MagicMock()
        mock_websocket2.accept = AsyncMock()
        connection_id2 = await self.manager.connect(mock_websocket2, self.test_user_id)

        # Verify both connections are tracked
        assert len(self.manager.user_connections[self.test_user_id]) == 2
        assert connection_id1 in self.manager.user_connections[self.test_user_id]
        assert connection_id2 in self.manager.user_connections[self.test_user_id]

    def test_disconnect_websocket(self):
        """Test disconnecting a WebSocket."""
        # First connect
        connection_id = self.manager.connection_users.setdefault(
            "test_conn", self.test_user_id
        )
        self.manager.active_connections["test_conn"] = self.mock_websocket
        self.manager.user_connections.setdefault(self.test_user_id, set()).add(
            "test_conn"
        )

        # Then disconnect
        self.manager.disconnect("test_conn")

        # Verify connection was removed
        assert "test_conn" not in self.manager.active_connections
        assert "test_conn" not in self.manager.connection_users
        assert self.test_user_id not in self.manager.user_connections

    def test_disconnect_one_of_multiple_connections(self):
        """Test disconnecting one connection when user has multiple."""
        # Set up two connections for the same user
        self.manager.active_connections["conn1"] = self.mock_websocket
        self.manager.active_connections["conn2"] = MagicMock()
        self.manager.connection_users["conn1"] = self.test_user_id
        self.manager.connection_users["conn2"] = self.test_user_id
        self.manager.user_connections[self.test_user_id] = {"conn1", "conn2"}

        # Disconnect one connection
        self.manager.disconnect("conn1")

        # Verify only one connection was removed
        assert "conn1" not in self.manager.active_connections
        assert "conn2" in self.manager.active_connections
        assert self.test_user_id in self.manager.user_connections
        assert "conn2" in self.manager.user_connections[self.test_user_id]

    @pytest.mark.asyncio
    async def test_send_personal_message(self):
        """Test sending a message to a specific connection."""
        # Set up connection
        connection_id = "test_conn"
        self.manager.active_connections[connection_id] = self.mock_websocket

        message = {"type": "test", "data": {"message": "hello"}}
        await self.manager.send_personal_message(message, connection_id)

        # Verify message was sent
        expected_json = json.dumps(message)
        self.mock_websocket.send_text.assert_called_once_with(expected_json)

    @pytest.mark.asyncio
    async def test_send_personal_message_connection_error(self):
        """Test handling connection error when sending message."""
        # Set up connection that will fail
        connection_id = "test_conn"
        self.manager.active_connections[connection_id] = self.mock_websocket
        self.manager.connection_users[connection_id] = self.test_user_id
        self.mock_websocket.send_text.side_effect = Exception("Connection closed")

        message = {"type": "test", "data": {}}
        await self.manager.send_personal_message(message, connection_id)

        # Verify connection was cleaned up
        assert connection_id not in self.manager.active_connections

    @pytest.mark.asyncio
    async def test_send_user_message(self):
        """Test sending a message to all connections for a user."""
        # Set up multiple connections for user
        mock_websocket1 = MagicMock()
        mock_websocket1.send_text = AsyncMock()
        mock_websocket2 = MagicMock()
        mock_websocket2.send_text = AsyncMock()

        self.manager.active_connections["conn1"] = mock_websocket1
        self.manager.active_connections["conn2"] = mock_websocket2
        self.manager.user_connections[self.test_user_id] = {"conn1", "conn2"}

        message = {"type": "user_message", "data": {"text": "hello user"}}
        await self.manager.send_user_message(message, self.test_user_id)

        # Verify message was sent to all user connections
        expected_json = json.dumps(message)
        mock_websocket1.send_text.assert_called_once_with(expected_json)
        mock_websocket2.send_text.assert_called_once_with(expected_json)

    @pytest.mark.asyncio
    async def test_broadcast_message(self):
        """Test broadcasting a message to all connections."""
        # Set up multiple connections
        mock_websocket1 = MagicMock()
        mock_websocket1.send_text = AsyncMock()
        mock_websocket2 = MagicMock()
        mock_websocket2.send_text = AsyncMock()

        self.manager.active_connections["conn1"] = mock_websocket1
        self.manager.active_connections["conn2"] = mock_websocket2

        message = {"type": "broadcast", "data": {"announcement": "system maintenance"}}
        await self.manager.broadcast_message(message)

        # Verify message was sent to all connections
        expected_json = json.dumps(message)
        mock_websocket1.send_text.assert_called_once_with(expected_json)
        mock_websocket2.send_text.assert_called_once_with(expected_json)

    def test_get_user_connection_count(self):
        """Test getting connection count for a user."""
        # Set up connections
        self.manager.user_connections[self.test_user_id] = {"conn1", "conn2", "conn3"}

        count = self.manager.get_user_connection_count(self.test_user_id)
        assert count == 3

        # Test user with no connections
        count = self.manager.get_user_connection_count("nonexistent_user")
        assert count == 0

    def test_get_total_connections(self):
        """Test getting total connection count."""
        # Set up connections
        self.manager.active_connections["conn1"] = MagicMock()
        self.manager.active_connections["conn2"] = MagicMock()
        self.manager.active_connections["conn3"] = MagicMock()

        total = self.manager.get_total_connections()
        assert total == 3


class TestWebSocketAuthentication:
    """Test cases for WebSocket authentication."""

    @pytest.mark.asyncio
    async def test_get_user_from_token_valid_test_token(self):
        """Test authentication with valid test token."""
        user = await get_user_from_token("test_token")

        assert user["id"] == "test_user"
        assert user["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_get_user_from_token_other_valid_token(self):
        """Test authentication with other token format."""
        user = await get_user_from_token("user123token")

        assert user["id"] == "user_user123t"
        assert user["email"] == "user_user123t@example.com"

    @pytest.mark.asyncio
    async def test_get_user_from_token_missing_token(self):
        """Test authentication with missing token."""
        with pytest.raises(Exception) as exc_info:
            await get_user_from_token(None)

        assert "Authentication token required" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_user_from_token_empty_token(self):
        """Test authentication with empty token."""
        with pytest.raises(Exception) as exc_info:
            await get_user_from_token("")

        assert "Authentication token required" in str(exc_info.value)


class TestWebSocketEndpoint:
    """Test cases for WebSocket endpoint functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_websocket = MagicMock()
        self.mock_websocket.accept = AsyncMock()
        self.mock_websocket.send_text = AsyncMock()
        self.mock_websocket.receive_text = AsyncMock()
        self.mock_websocket.close = AsyncMock()

        self.test_user = {"id": "test_user", "email": "test@example.com"}

    @pytest.mark.asyncio
    async def test_websocket_endpoint_no_user(self):
        """Test WebSocket endpoint with no user (authentication failure)."""
        await websocket_endpoint(self.mock_websocket, user=None)

        # Verify connection was closed with authentication error
        self.mock_websocket.close.assert_called_once_with(
            code=1008, reason="Authentication required"
        )

    @pytest.mark.asyncio
    async def test_websocket_endpoint_successful_connection(self):
        """Test successful WebSocket connection establishment."""
        with (
            patch.object(
                connection_manager, "connect", new_callable=AsyncMock
            ) as mock_connect,
            patch.object(
                connection_manager, "send_personal_message", new_callable=AsyncMock
            ) as mock_send,
            patch.object(connection_manager, "disconnect") as mock_disconnect,
        ):
            mock_connect.return_value = "test_conn_id"
            # Simulate immediate disconnection to end the loop
            self.mock_websocket.receive_text.side_effect = WebSocketDisconnect()

            await websocket_endpoint(self.mock_websocket, self.test_user)

            # Verify connection was established
            mock_connect.assert_called_once_with(self.mock_websocket, "test_user")

            # Verify connection confirmation was sent
            mock_send.assert_called()
            call_args = mock_send.call_args[0]
            assert call_args[0]["type"] == "connection_established"
            assert call_args[0]["data"]["user_id"] == "test_user"

            # Verify cleanup occurred
            mock_disconnect.assert_called_once_with("test_conn_id")

    @pytest.mark.asyncio
    async def test_websocket_endpoint_ping_pong(self):
        """Test ping/pong message handling."""
        with (
            patch.object(
                connection_manager, "connect", new_callable=AsyncMock
            ) as mock_connect,
            patch.object(
                connection_manager, "send_personal_message", new_callable=AsyncMock
            ) as mock_send,
            patch.object(connection_manager, "disconnect"),
        ):
            mock_connect.return_value = "test_conn_id"

            # Set up message sequence: ping, then disconnect
            ping_message = json.dumps({"type": "ping"})
            self.mock_websocket.receive_text.side_effect = [
                ping_message,
                WebSocketDisconnect(),
            ]

            await websocket_endpoint(self.mock_websocket, self.test_user)

            # Verify pong response was sent
            pong_call_found = False
            for call in mock_send.call_args_list:
                if call[0][0].get("type") == "pong":
                    pong_call_found = True
                    assert "timestamp" in call[0][0]
                    break

            assert pong_call_found, "Pong response was not sent"

    @pytest.mark.asyncio
    async def test_websocket_endpoint_invalid_json(self):
        """Test handling of invalid JSON messages."""
        with (
            patch.object(
                connection_manager, "connect", new_callable=AsyncMock
            ) as mock_connect,
            patch.object(
                connection_manager, "send_personal_message", new_callable=AsyncMock
            ) as mock_send,
            patch.object(connection_manager, "disconnect"),
        ):
            mock_connect.return_value = "test_conn_id"

            # Send invalid JSON, then disconnect
            self.mock_websocket.receive_text.side_effect = [
                "invalid json",
                WebSocketDisconnect(),
            ]

            await websocket_endpoint(self.mock_websocket, self.test_user)

            # Verify error message was sent
            error_call_found = False
            for call in mock_send.call_args_list:
                if call[0][0].get("type") == "error":
                    error_call_found = True
                    assert "Invalid JSON format" in call[0][0]["message"]
                    break

            assert error_call_found, "Error message was not sent"

    @pytest.mark.asyncio
    async def test_websocket_endpoint_subscribe_task(self):
        """Test task subscription message handling."""
        with (
            patch.object(
                connection_manager, "connect", new_callable=AsyncMock
            ) as mock_connect,
            patch.object(
                connection_manager, "send_personal_message", new_callable=AsyncMock
            ),
            patch.object(connection_manager, "disconnect"),
        ):
            mock_connect.return_value = "test_conn_id"

            # Send subscribe message, then disconnect
            subscribe_message = json.dumps(
                {"type": "subscribe_task", "task_id": "task_123"}
            )
            self.mock_websocket.receive_text.side_effect = [
                subscribe_message,
                WebSocketDisconnect(),
            ]

            # This should not raise an exception
            await websocket_endpoint(self.mock_websocket, self.test_user)

    @pytest.mark.asyncio
    async def test_websocket_endpoint_unsubscribe_task(self):
        """Test task unsubscription message handling."""
        with (
            patch.object(
                connection_manager, "connect", new_callable=AsyncMock
            ) as mock_connect,
            patch.object(
                connection_manager, "send_personal_message", new_callable=AsyncMock
            ),
            patch.object(connection_manager, "disconnect"),
        ):
            mock_connect.return_value = "test_conn_id"

            # Send unsubscribe message, then disconnect
            unsubscribe_message = json.dumps(
                {"type": "unsubscribe_task", "task_id": "task_123"}
            )
            self.mock_websocket.receive_text.side_effect = [
                unsubscribe_message,
                WebSocketDisconnect(),
            ]

            # This should not raise an exception
            await websocket_endpoint(self.mock_websocket, self.test_user)


class TestWebSocketBroadcastFunctions:
    """Test cases for broadcast functions."""

    @pytest.mark.asyncio
    async def test_broadcast_task_update(self):
        """Test broadcasting task updates."""
        with patch.object(
            connection_manager, "send_user_message", new_callable=AsyncMock
        ) as mock_send:
            task_id = "task_123"
            user_id = "user_456"
            update_data = {
                "status": "completed",
                "progress": 100,
                "result": {"data": "test"},
            }

            await broadcast_task_update(task_id, user_id, update_data)

            # Verify message was sent correctly
            mock_send.assert_called_once()
            call_args = mock_send.call_args[0]

            assert call_args[0]["type"] == "task_update"
            assert call_args[0]["data"]["task_id"] == task_id
            assert call_args[0]["data"]["status"] == "completed"
            assert call_args[0]["data"]["progress"] == 100
            assert call_args[1] == user_id

    @pytest.mark.asyncio
    async def test_broadcast_task_update_error_handling(self):
        """Test error handling in task update broadcasting."""
        with patch.object(
            connection_manager, "send_user_message", new_callable=AsyncMock
        ) as mock_send:
            mock_send.side_effect = Exception("Connection error")

            # This should not raise an exception
            await broadcast_task_update("task_123", "user_456", {"status": "failed"})

    @pytest.mark.asyncio
    async def test_broadcast_system_message(self):
        """Test broadcasting system messages."""
        with patch.object(
            connection_manager, "broadcast_message", new_callable=AsyncMock
        ) as mock_broadcast:
            message = "System maintenance in 10 minutes"
            level = "warning"

            await broadcast_system_message(message, level)

            # Verify message was broadcast correctly
            mock_broadcast.assert_called_once()
            call_args = mock_broadcast.call_args[0][0]

            assert call_args["type"] == "system_message"
            assert call_args["data"]["message"] == message
            assert call_args["data"]["level"] == level
            assert "timestamp" in call_args["data"]

    @pytest.mark.asyncio
    async def test_broadcast_system_message_default_level(self):
        """Test broadcasting system message with default level."""
        with patch.object(
            connection_manager, "broadcast_message", new_callable=AsyncMock
        ) as mock_broadcast:
            message = "System is healthy"

            await broadcast_system_message(message)  # No level specified

            # Verify default level was used
            call_args = mock_broadcast.call_args[0][0]
            assert call_args["data"]["level"] == "info"

    @pytest.mark.asyncio
    async def test_broadcast_system_message_error_handling(self):
        """Test error handling in system message broadcasting."""
        with patch.object(
            connection_manager, "broadcast_message", new_callable=AsyncMock
        ) as mock_broadcast:
            mock_broadcast.side_effect = Exception("Broadcast error")

            # This should not raise an exception
            await broadcast_system_message("Test message")


class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality."""

    def setup_method(self):
        """Set up integration test fixtures."""
        self.client = TestClient(app)

    def test_websocket_endpoint_in_app(self):
        """Test that WebSocket endpoint is properly configured in the app."""
        # This test verifies the WebSocket route exists
        # The actual WebSocket testing would require a more complex setup
        # with a real WebSocket client, which is beyond the scope of unit tests

        # For now, we just verify the endpoint exists in the app routes
        websocket_routes = [
            route
            for route in app.routes
            if hasattr(route, "path") and route.path == "/ws/tasks"
        ]
        assert len(websocket_routes) == 1
        assert hasattr(websocket_routes[0], "endpoint")

    @pytest.mark.asyncio
    async def test_notification_service_integration(self):
        """Test integration with notification service."""
        from app.services.notification_service import notification_service

        # Mock the Redis components
        with patch.object(
            notification_service, "redis_client", new_callable=AsyncMock
        ) as mock_redis:
            mock_redis.publish = AsyncMock()

            # Test publishing task update
            await notification_service.publish_task_update(
                task_id="task_123", user_id="user_456", status="completed", progress=100
            )

            # Verify Redis publish was called
            mock_redis.publish.assert_called_once()
            call_args = mock_redis.publish.call_args

            # Verify the channel and message format
            channel = call_args[0][0]
            message_json = call_args[0][1]
            message_data = json.loads(message_json)

            assert "task_updates" in channel
            assert message_data["task_id"] == "task_123"
            assert message_data["user_id"] == "user_456"
            assert message_data["status"] == "completed"
            assert message_data["progress"] == 100
