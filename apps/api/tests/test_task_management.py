"""Tests for task management endpoints."""

import json
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from app.services.task_service import TaskService
from app.routers.tasks import task_service


class TestTaskManagement:
    """Test cases for task management endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = TestClient(app)
        self.test_user = {"id": "test_user", "email": "test@example.com"}
        self.test_token = "test_token"
        self.auth_header = {"Authorization": f"Bearer {self.test_token}"}

        # Sample task data
        self.sample_task = {
            "id": str(uuid4()),
            "user_id": "test_user",
            "task_type": "parse_resume",
            "status": "pending",
            "priority": 2,
            "payload": {"file_data": "test"},
            "progress": 0,
            "max_retries": 3,
            "retry_count": 0,
            "created_at": datetime.utcnow(),
            "started_at": None,
            "completed_at": None,
            "error_message": None,
            "result_id": None,
            "estimated_duration_ms": 30000,
        }

    @pytest.fixture(autouse=True)
    async def mock_task_service(self):
        """Mock the task service for all tests."""
        with (
            patch.object(task_service, "startup", new_callable=AsyncMock),
            patch.object(task_service, "shutdown", new_callable=AsyncMock),
            patch.object(
                task_service, "get_task", new_callable=AsyncMock
            ) as mock_get_task,
            patch.object(
                task_service, "get_user_tasks", new_callable=AsyncMock
            ) as mock_get_user_tasks,
            patch.object(
                task_service, "cancel_task", new_callable=AsyncMock
            ) as mock_cancel_task,
            patch.object(
                task_service, "get_task_result", new_callable=AsyncMock
            ) as mock_get_task_result,
        ):
            # Set default return values
            mock_get_task.return_value = self.sample_task.copy()
            mock_get_user_tasks.return_value = [self.sample_task.copy()]
            mock_cancel_task.return_value = True
            mock_get_task_result.return_value = {"data": "test_result"}

            yield {
                "get_task": mock_get_task,
                "get_user_tasks": mock_get_user_tasks,
                "cancel_task": mock_cancel_task,
                "get_task_result": mock_get_task_result,
            }

    def test_get_task_status_success(self, mock_task_service):
        """Test successfully retrieving task status."""
        task_id = self.sample_task["id"]

        response = self.client.get(f"/api/tasks/{task_id}", headers=self.auth_header)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == task_id
        assert data["status"] == "pending"
        assert data["task_type"] == "parse_resume"
        assert data["user_id"] == "test_user"
        assert data["progress"] == 0

        # Verify task service was called correctly
        mock_task_service["get_task"].assert_called_once_with(task_id)

    def test_get_task_status_not_found(self, mock_task_service):
        """Test retrieving status for non-existent task."""
        mock_task_service["get_task"].return_value = None

        response = self.client.get("/api/tasks/nonexistent", headers=self.auth_header)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Task not found" in response.json()["detail"]

    def test_get_task_status_access_denied(self, mock_task_service):
        """Test access denied for task owned by different user."""
        # Return task owned by different user
        different_user_task = self.sample_task.copy()
        different_user_task["user_id"] = "different_user"
        mock_task_service["get_task"].return_value = different_user_task

        response = self.client.get(
            f"/api/tasks/{self.sample_task['id']}", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Access denied" in response.json()["detail"]

    def test_get_task_status_unauthorized(self, mock_task_service):
        """Test accessing task without authentication."""
        response = self.client.get(f"/api/tasks/{self.sample_task['id']}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_user_tasks_success(self, mock_task_service):
        """Test successfully listing user tasks."""
        # Create multiple sample tasks
        tasks = []
        for i in range(3):
            task = self.sample_task.copy()
            task["id"] = str(uuid4())
            task["task_type"] = f"task_type_{i}"
            tasks.append(task)

        mock_task_service["get_user_tasks"].return_value = tasks

        response = self.client.get("/api/tasks/", headers=self.auth_header)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["tasks"]) == 3
        assert data["total"] == 3
        assert data["page"] == 1
        assert data["per_page"] == 50
        assert not data["has_next"]
        assert not data["has_prev"]

        # Verify service was called correctly
        mock_task_service["get_user_tasks"].assert_called_once_with(
            user_id="test_user",
            status=None,
            task_type=None,
            limit=51,  # per_page + 1
            offset=0,
        )

    def test_list_user_tasks_with_filters(self, mock_task_service):
        """Test listing tasks with status and type filters."""
        response = self.client.get(
            "/api/tasks/?status=completed&task_type=parse_resume&page=2&per_page=10",
            headers=self.auth_header,
        )

        assert response.status_code == status.HTTP_200_OK

        # Verify filters were applied
        mock_task_service["get_user_tasks"].assert_called_once_with(
            user_id="test_user",
            status="completed",
            task_type="parse_resume",
            limit=11,  # per_page + 1
            offset=10,  # (page - 1) * per_page
        )

    def test_list_user_tasks_invalid_status(self, mock_task_service):
        """Test listing tasks with invalid status filter."""
        response = self.client.get(
            "/api/tasks/?status=invalid_status", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid status" in response.json()["detail"]

    def test_list_user_tasks_pagination(self, mock_task_service):
        """Test task list pagination."""
        # Return per_page + 1 tasks to indicate there's a next page
        tasks = []
        for i in range(11):  # per_page + 1
            task = self.sample_task.copy()
            task["id"] = str(uuid4())
            tasks.append(task)

        mock_task_service["get_user_tasks"].return_value = tasks

        response = self.client.get(
            "/api/tasks/?page=2&per_page=10", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["tasks"]) == 10  # Extra task removed
        assert data["has_next"] is True  # Has more pages
        assert data["has_prev"] is True  # Not first page

    def test_cancel_task_success(self, mock_task_service):
        """Test successfully cancelling a task."""
        task_id = self.sample_task["id"]

        with patch(
            "app.routers.tasks.broadcast_task_update", new_callable=AsyncMock
        ) as mock_broadcast:
            response = self.client.delete(
                f"/api/tasks/{task_id}", headers=self.auth_header
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert data["task_id"] == task_id
        assert "cancelled successfully" in data["message"]

        # Verify service was called
        mock_task_service["cancel_task"].assert_called_once_with(task_id, "test_user")

        # Verify broadcast was called
        mock_broadcast.assert_called_once()

    def test_cancel_task_not_found(self, mock_task_service):
        """Test cancelling non-existent task."""
        mock_task_service["get_task"].return_value = None

        response = self.client.delete(
            "/api/tasks/nonexistent", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cancel_task_access_denied(self, mock_task_service):
        """Test cancelling task owned by different user."""
        different_user_task = self.sample_task.copy()
        different_user_task["user_id"] = "different_user"
        mock_task_service["get_task"].return_value = different_user_task

        response = self.client.delete(
            f"/api/tasks/{self.sample_task['id']}", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cancel_completed_task(self, mock_task_service):
        """Test cancelling already completed task."""
        completed_task = self.sample_task.copy()
        completed_task["status"] = "completed"
        mock_task_service["get_task"].return_value = completed_task

        response = self.client.delete(
            f"/api/tasks/{self.sample_task['id']}", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot cancel task with status: completed" in response.json()["detail"]

    def test_cancel_task_service_failure(self, mock_task_service):
        """Test cancellation when service returns failure."""
        mock_task_service["cancel_task"].return_value = False

        response = self.client.delete(
            f"/api/tasks/{self.sample_task['id']}", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "could not be cancelled" in response.json()["detail"]

    def test_get_task_result_success(self, mock_task_service):
        """Test successfully retrieving task result."""
        # Set up completed task
        completed_task = self.sample_task.copy()
        completed_task["status"] = "completed"
        completed_task["result_id"] = "result123"
        mock_task_service["get_task"].return_value = completed_task

        expected_result = {"data": "test_result", "score": 95}
        mock_task_service["get_task_result"].return_value = expected_result

        response = self.client.get(
            f"/api/tasks/{self.sample_task['id']}/result", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["task_id"] == self.sample_task["id"]
        assert data["status"] == "completed"
        assert data["result"] == expected_result
        assert data["error"] is None

    def test_get_task_result_failed_task(self, mock_task_service):
        """Test retrieving result for failed task."""
        failed_task = self.sample_task.copy()
        failed_task["status"] = "failed"
        failed_task["error_message"] = "Processing failed"
        mock_task_service["get_task"].return_value = failed_task

        response = self.client.get(
            f"/api/tasks/{self.sample_task['id']}/result", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["status"] == "failed"
        assert data["result"] is None
        assert data["error"] == "Processing failed"

    def test_get_task_result_pending_task(self, mock_task_service):
        """Test retrieving result for pending task."""
        response = self.client.get(
            f"/api/tasks/{self.sample_task['id']}/result", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "still pending" in response.json()["detail"]

    def test_get_task_result_running_task(self, mock_task_service):
        """Test retrieving result for running task."""
        running_task = self.sample_task.copy()
        running_task["status"] = "running"
        mock_task_service["get_task"].return_value = running_task

        response = self.client.get(
            f"/api/tasks/{self.sample_task['id']}/result", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "still running" in response.json()["detail"]

    def test_get_task_result_cancelled_task(self, mock_task_service):
        """Test retrieving result for cancelled task."""
        cancelled_task = self.sample_task.copy()
        cancelled_task["status"] = "cancelled"
        mock_task_service["get_task"].return_value = cancelled_task

        response = self.client.get(
            f"/api/tasks/{self.sample_task['id']}/result", headers=self.auth_header
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "was cancelled" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_task_service_lifecycle(self):
        """Test task service startup and shutdown events."""
        # These should not raise exceptions
        await task_service.startup()
        await task_service.shutdown()


class TestTaskManagementIntegration:
    """Integration tests with mocked dependencies."""

    def setup_method(self):
        """Set up integration test fixtures."""
        self.client = TestClient(app)
        self.auth_header = {"Authorization": "Bearer test_token"}

    @patch("app.services.task_service.TaskService")
    def test_task_service_error_handling(self, mock_service_class):
        """Test error handling when task service fails."""
        # Mock service to raise exception
        mock_service = MagicMock()
        mock_service.get_task = AsyncMock(side_effect=Exception("Database error"))
        mock_service_class.return_value = mock_service

        # Replace the global task service
        with patch("app.routers.tasks.task_service", mock_service):
            response = self.client.get("/api/tasks/test123", headers=self.auth_header)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Internal server error" in response.json()["detail"]

    def test_missing_authorization_header(self):
        """Test all endpoints require authorization."""
        endpoints = [
            ("/api/tasks/test123", "GET"),
            ("/api/tasks/", "GET"),
            ("/api/tasks/test123", "DELETE"),
            ("/api/tasks/test123/result", "GET"),
        ]

        for endpoint, method in endpoints:
            response = self.client.request(method, endpoint)
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Authorization header required" in response.json()["detail"]

    def test_invalid_authorization_format(self):
        """Test invalid authorization header format."""
        response = self.client.get(
            "/api/tasks/test123", headers={"Authorization": "InvalidFormat token"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid authorization format" in response.json()["detail"]

    @pytest.mark.parametrize(
        "page,per_page,expected_status",
        [
            (0, 50, 422),  # page must be >= 1
            (1, 0, 422),  # per_page must be >= 1
            (1, 101, 422),  # per_page must be <= 100
            (-1, 50, 422),  # negative page
            (1, -10, 422),  # negative per_page
        ],
    )
    def test_invalid_pagination_parameters(self, page, per_page, expected_status):
        """Test validation of pagination parameters."""
        response = self.client.get(
            f"/api/tasks/?page={page}&per_page={per_page}", headers=self.auth_header
        )

        assert response.status_code == expected_status
