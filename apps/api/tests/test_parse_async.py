"""Tests for async resume parsing endpoint functionality."""

import base64
import json
from io import BytesIO
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.routers.parse import (
    get_current_user,
    get_task_service,
    parse_resume,
    get_parse_task_status,
)
from app.queue.redis_queue import TaskPriority
from app.services.task_service import TaskService


class TestParseEndpoint:
    """Test cases for the async parse endpoint."""

    @pytest.fixture
    def mock_user(self):
        """Mock current user."""
        return {"id": "test_user_123", "email": "test@example.com"}

    @pytest.fixture
    def mock_task_service(self):
        """Mock task service."""
        mock_service = AsyncMock(spec=TaskService)
        mock_service.create_task = AsyncMock(return_value="task_123")
        mock_service.get_task = AsyncMock()
        mock_service.get_task_result = AsyncMock()
        return mock_service

    @pytest.fixture
    def mock_file_pdf(self):
        """Mock PDF file upload."""
        mock_file = Mock()
        mock_file.filename = "test_resume.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=b"mock pdf content")
        return mock_file

    @pytest.fixture
    def mock_file_docx(self):
        """Mock DOCX file upload."""
        mock_file = Mock()
        mock_file.filename = "test_resume.docx"
        mock_file.content_type = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        mock_file.read = AsyncMock(return_value=b"mock docx content")
        return mock_file

    @pytest.fixture
    def mock_file_empty(self):
        """Mock empty file upload."""
        mock_file = Mock()
        mock_file.filename = "empty.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=b"")
        return mock_file

    @pytest.fixture
    def mock_file_large(self):
        """Mock large file upload."""
        mock_file = Mock()
        mock_file.filename = "large.pdf"
        mock_file.content_type = "application/pdf"
        # Create 11MB of content
        large_content = b"x" * (11 * 1024 * 1024)
        mock_file.read = AsyncMock(return_value=large_content)
        return mock_file

    @pytest.fixture
    def mock_file_unsupported(self):
        """Mock unsupported file type."""
        mock_file = Mock()
        mock_file.filename = "test.exe"
        mock_file.content_type = "application/x-executable"
        mock_file.read = AsyncMock(return_value=b"mock exe content")
        return mock_file

    @pytest.mark.asyncio
    async def test_parse_resume_success_pdf(
        self, mock_user, mock_task_service, mock_file_pdf
    ):
        """Test successful PDF resume parsing submission."""
        with patch("app.routers.parse.uuid4") as mock_uuid:
            mock_uuid.return_value = Mock()
            mock_uuid.return_value.__str__ = Mock(return_value="resume_123")

            result = await parse_resume(mock_file_pdf, mock_user, mock_task_service)

            # Verify response format
            assert result["success"] is True
            assert "task_id" in result["data"]
            assert "resume_id" in result["data"]
            assert result["data"]["task_id"] == "task_123"
            assert result["data"]["resume_id"] == "resume_123"

            # Verify task creation call
            mock_task_service.create_task.assert_called_once()
            call_args = mock_task_service.create_task.call_args
            assert call_args[1]["task_type"] == "parse_resume"
            assert call_args[1]["user_id"] == "test_user_123"
            assert call_args[1]["priority"] == TaskPriority.NORMAL
            assert call_args[1]["max_retries"] == 3
            assert call_args[1]["estimated_duration_ms"] == 30000

            # Verify payload structure
            payload = call_args[1]["payload"]
            assert payload["resume_id"] == "resume_123"
            assert payload["user_id"] == "test_user_123"
            assert "file_data" in payload

            file_data = payload["file_data"]
            assert file_data["filename"] == "test_resume.pdf"
            assert file_data["content_type"] == "application/pdf"
            assert file_data["size"] == len(b"mock pdf content")
            assert "content" in file_data  # Base64 encoded content

    @pytest.mark.asyncio
    async def test_parse_resume_success_docx(
        self, mock_user, mock_task_service, mock_file_docx
    ):
        """Test successful DOCX resume parsing submission."""
        with patch("app.routers.parse.uuid4") as mock_uuid:
            mock_uuid.return_value = Mock()
            mock_uuid.return_value.__str__ = Mock(return_value="resume_456")

            result = await parse_resume(mock_file_docx, mock_user, mock_task_service)

            assert result["success"] is True
            assert result["data"]["resume_id"] == "resume_456"

    @pytest.mark.asyncio
    async def test_parse_resume_no_file(self, mock_user, mock_task_service):
        """Test parsing with no file provided."""
        with pytest.raises(HTTPException) as exc_info:
            await parse_resume(None, mock_user, mock_task_service)

        assert exc_info.value.status_code == 422
        assert "No file provided" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_parse_resume_unsupported_file_type(
        self, mock_user, mock_task_service, mock_file_unsupported
    ):
        """Test parsing with unsupported file type."""
        with pytest.raises(HTTPException) as exc_info:
            await parse_resume(mock_file_unsupported, mock_user, mock_task_service)

        assert exc_info.value.status_code == 422
        assert "Unsupported file type" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_parse_resume_empty_file(
        self, mock_user, mock_task_service, mock_file_empty
    ):
        """Test parsing with empty file."""
        with pytest.raises(HTTPException) as exc_info:
            await parse_resume(mock_file_empty, mock_user, mock_task_service)

        assert exc_info.value.status_code == 422
        assert "Empty file provided" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_parse_resume_file_too_large(
        self, mock_user, mock_task_service, mock_file_large
    ):
        """Test parsing with file that's too large."""
        with pytest.raises(HTTPException) as exc_info:
            await parse_resume(mock_file_large, mock_user, mock_task_service)

        assert exc_info.value.status_code == 422
        assert "File too large" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_parse_resume_file_read_error(self, mock_user, mock_task_service):
        """Test parsing when file read fails."""
        mock_file = Mock()
        mock_file.filename = "test.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(side_effect=Exception("Read error"))

        with pytest.raises(HTTPException) as exc_info:
            await parse_resume(mock_file, mock_user, mock_task_service)

        assert exc_info.value.status_code == 422
        assert "Error reading uploaded file" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_parse_resume_task_creation_error(
        self, mock_user, mock_task_service, mock_file_pdf
    ):
        """Test parsing when task creation fails."""
        mock_task_service.create_task.side_effect = Exception("Task creation failed")

        with pytest.raises(HTTPException) as exc_info:
            await parse_resume(mock_file_pdf, mock_user, mock_task_service)

        assert exc_info.value.status_code == 500
        assert "Error submitting resume for processing" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_parse_resume_base64_encoding(
        self, mock_user, mock_task_service, mock_file_pdf
    ):
        """Test that file content is properly base64 encoded."""
        with patch("app.routers.parse.uuid4") as mock_uuid:
            mock_uuid.return_value = Mock()
            mock_uuid.return_value.__str__ = Mock(return_value="resume_123")

            await parse_resume(mock_file_pdf, mock_user, mock_task_service)

            call_args = mock_task_service.create_task.call_args
            payload = call_args[1]["payload"]
            encoded_content = payload["file_data"]["content"]

            # Verify it's valid base64
            decoded_content = base64.b64decode(encoded_content)
            assert decoded_content == b"mock pdf content"


class TestParseTaskStatus:
    """Test cases for the parse task status endpoint."""

    @pytest.fixture
    def mock_user(self):
        """Mock current user."""
        return {"id": "test_user_123", "email": "test@example.com"}

    @pytest.fixture
    def mock_task_service(self):
        """Mock task service."""
        mock_service = AsyncMock(spec=TaskService)
        return mock_service

    @pytest.fixture
    def mock_pending_task(self):
        """Mock pending task data."""
        return {
            "id": "task_123",
            "user_id": "test_user_123",
            "task_type": "parse_resume",
            "status": "pending",
            "progress": 0,
            "created_at": "2024-01-01T00:00:00Z",
            "started_at": None,
            "completed_at": None,
            "error_message": None,
        }

    @pytest.fixture
    def mock_running_task(self):
        """Mock running task data."""
        return {
            "id": "task_123",
            "user_id": "test_user_123",
            "task_type": "parse_resume",
            "status": "running",
            "progress": 50,
            "created_at": "2024-01-01T00:00:00Z",
            "started_at": "2024-01-01T00:01:00Z",
            "completed_at": None,
            "error_message": None,
        }

    @pytest.fixture
    def mock_completed_task(self):
        """Mock completed task data."""
        return {
            "id": "task_123",
            "user_id": "test_user_123",
            "task_type": "parse_resume",
            "status": "completed",
            "progress": 100,
            "created_at": "2024-01-01T00:00:00Z",
            "started_at": "2024-01-01T00:01:00Z",
            "completed_at": "2024-01-01T00:02:00Z",
            "error_message": None,
        }

    @pytest.fixture
    def mock_failed_task(self):
        """Mock failed task data."""
        return {
            "id": "task_123",
            "user_id": "test_user_123",
            "task_type": "parse_resume",
            "status": "failed",
            "progress": 0,
            "created_at": "2024-01-01T00:00:00Z",
            "started_at": "2024-01-01T00:01:00Z",
            "completed_at": "2024-01-01T00:02:00Z",
            "error_message": "AI processing failed",
        }

    @pytest.fixture
    def mock_task_result(self):
        """Mock task result data."""
        return {
            "resume_id": "resume_123",
            "user_id": "test_user_123",
            "resume_data": {
                "contact_info": {
                    "full_name": "John Doe",
                    "email": "john@example.com",
                },
                "summary": "Experienced developer",
                "work_experience": [],
                "education": [],
                "certifications": [],
                "skills": ["Python", "FastAPI"],
            },
            "status": "completed",
        }

    @pytest.mark.asyncio
    async def test_get_task_status_pending(
        self, mock_user, mock_task_service, mock_pending_task
    ):
        """Test getting status of pending task."""
        mock_task_service.get_task.return_value = mock_pending_task
        mock_task_service.get_task_result.return_value = None

        result = await get_parse_task_status("task_123", mock_user, mock_task_service)

        assert result["success"] is True
        data = result["data"]
        assert data["id"] == "task_123"
        assert data["status"] == "pending"
        assert data["progress"] == 0
        assert data["result"] is None
        assert data["error"] is None

    @pytest.mark.asyncio
    async def test_get_task_status_running(
        self, mock_user, mock_task_service, mock_running_task
    ):
        """Test getting status of running task."""
        mock_task_service.get_task.return_value = mock_running_task
        mock_task_service.get_task_result.return_value = None

        result = await get_parse_task_status("task_123", mock_user, mock_task_service)

        assert result["success"] is True
        data = result["data"]
        assert data["status"] == "running"
        assert data["progress"] == 50
        assert data["started_at"] == "2024-01-01T00:01:00Z"

    @pytest.mark.asyncio
    async def test_get_task_status_completed_with_result(
        self, mock_user, mock_task_service, mock_completed_task, mock_task_result
    ):
        """Test getting status of completed task with result."""
        mock_task_service.get_task.return_value = mock_completed_task
        mock_task_service.get_task_result.return_value = mock_task_result

        result = await get_parse_task_status("task_123", mock_user, mock_task_service)

        assert result["success"] is True
        data = result["data"]
        assert data["status"] == "completed"
        assert data["progress"] == 100
        assert data["completed_at"] == "2024-01-01T00:02:00Z"
        assert data["result"] == mock_task_result

    @pytest.mark.asyncio
    async def test_get_task_status_failed(
        self, mock_user, mock_task_service, mock_failed_task
    ):
        """Test getting status of failed task."""
        mock_task_service.get_task.return_value = mock_failed_task
        mock_task_service.get_task_result.return_value = None

        result = await get_parse_task_status("task_123", mock_user, mock_task_service)

        assert result["success"] is True
        data = result["data"]
        assert data["status"] == "failed"
        assert data["error"] == "AI processing failed"

    @pytest.mark.asyncio
    async def test_get_task_status_not_found(self, mock_user, mock_task_service):
        """Test getting status of non-existent task."""
        mock_task_service.get_task.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await get_parse_task_status(
                "nonexistent_task", mock_user, mock_task_service
            )

        assert exc_info.value.status_code == 404
        assert "Task not found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_task_status_access_denied(
        self, mock_user, mock_task_service, mock_pending_task
    ):
        """Test getting status of task owned by different user."""
        # Modify task to have different user
        mock_pending_task["user_id"] = "different_user"
        mock_task_service.get_task.return_value = mock_pending_task

        with pytest.raises(HTTPException) as exc_info:
            await get_parse_task_status("task_123", mock_user, mock_task_service)

        assert exc_info.value.status_code == 403
        assert "Access denied" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_task_status_service_error(self, mock_user, mock_task_service):
        """Test handling of task service errors."""
        mock_task_service.get_task.side_effect = Exception("Service error")

        with pytest.raises(HTTPException) as exc_info:
            await get_parse_task_status("task_123", mock_user, mock_task_service)

        assert exc_info.value.status_code == 500
        assert "Error retrieving task status" in exc_info.value.detail


class TestDependencies:
    """Test cases for endpoint dependencies."""

    @pytest.mark.asyncio
    async def test_get_current_user_mock(self):
        """Test mock current user dependency."""
        user = await get_current_user()
        assert user["id"] == "mock_user_123"
        assert user["email"] == "user@example.com"

    @pytest.mark.asyncio
    async def test_get_task_service(self):
        """Test task service dependency creation."""
        with patch("app.routers.parse.TaskService") as mock_task_service_class:
            mock_instance = AsyncMock()
            mock_task_service_class.return_value = mock_instance

            # Reset global variable
            import app.routers.parse

            app.routers.parse.task_service = None

            service = await get_task_service()

            assert service == mock_instance
            mock_instance.startup.assert_called_once()


class TestIntegration:
    """Integration test cases."""

    @pytest.mark.asyncio
    async def test_full_parse_workflow(self):
        """Test complete parse workflow from submission to completion."""
        # Mock dependencies
        mock_user = {"id": "test_user", "email": "test@example.com"}
        mock_task_service = AsyncMock()
        mock_task_service.create_task.return_value = "task_456"

        # Mock file
        mock_file = Mock()
        mock_file.filename = "integration_test.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=b"test content")

        # Submit parse request
        with patch("app.routers.parse.uuid4") as mock_uuid:
            mock_uuid.return_value = Mock()
            mock_uuid.return_value.__str__ = Mock(return_value="resume_456")

            result = await parse_resume(mock_file, mock_user, mock_task_service)

            assert result["success"] is True
            assert result["data"]["task_id"] == "task_456"
            assert result["data"]["resume_id"] == "resume_456"

        # Check task status - pending
        pending_task = {
            "id": "task_456",
            "user_id": "test_user",
            "task_type": "parse_resume",
            "status": "pending",
            "progress": 0,
            "created_at": "2024-01-01T00:00:00Z",
        }

        mock_task_service.get_task.return_value = pending_task
        mock_task_service.get_task_result.return_value = None

        status_result = await get_parse_task_status(
            "task_456", mock_user, mock_task_service
        )
        assert status_result["data"]["status"] == "pending"

        # Check task status - completed
        completed_task = {
            "id": "task_456",
            "user_id": "test_user",
            "task_type": "parse_resume",
            "status": "completed",
            "progress": 100,
            "created_at": "2024-01-01T00:00:00Z",
            "completed_at": "2024-01-01T00:02:00Z",
        }

        task_result = {
            "resume_id": "resume_456",
            "resume_data": {"contact_info": {"full_name": "Test User"}},
        }

        mock_task_service.get_task.return_value = completed_task
        mock_task_service.get_task_result.return_value = task_result

        final_result = await get_parse_task_status(
            "task_456", mock_user, mock_task_service
        )
        assert final_result["data"]["status"] == "completed"
        assert final_result["data"]["result"] == task_result
