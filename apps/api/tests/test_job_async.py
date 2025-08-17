"""Tests for async job parsing endpoint."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.routers.job import (
    JobParseRequest,
    parse_job_async,
    get_current_user,
    get_job_service,
)
from app.queue.redis_queue import TaskPriority
from app.services.job_service import JobService


class TestJobAsyncEndpoint:
    """Test cases for async job parsing endpoint."""

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user."""
        return {"id": "test_user_123", "email": "test@example.com"}

    @pytest.fixture
    def mock_job_service(self):
        """Mock job service."""
        service = AsyncMock(spec=JobService)
        service.create_parse_task = AsyncMock(return_value="task_123")
        return service

    @pytest.fixture
    def job_request_valid(self):
        """Valid job parse request."""
        return JobParseRequest(url="https://example.com/job/123")

    @pytest.fixture
    def job_request_invalid_url(self):
        """Invalid URL job parse request."""
        return JobParseRequest(url="not-a-url")

    @pytest.mark.asyncio
    async def test_parse_job_async_success(
        self, mock_user, mock_job_service, job_request_valid
    ):
        """Test successful async job parsing."""
        # Mock the UUID generation to be predictable
        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.hex = "job_456"
            mock_uuid.return_value.__str__ = lambda x: "job_456"

            result = await parse_job_async(
                request=job_request_valid,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        # Verify service was called correctly
        mock_job_service.create_parse_task.assert_called_once_with(
            user_id="test_user_123",
            url="https://example.com/job/123",
            job_id="job_456",
            priority=TaskPriority.NORMAL,
        )

        # Verify response structure
        assert result.success is True
        assert result.data["task_id"] == "task_123"
        assert result.data["job_id"] == "job_456"
        assert result.data["url"] == "https://example.com/job/123"

    @pytest.mark.asyncio
    async def test_parse_job_async_invalid_url_format(
        self, mock_user, mock_job_service, job_request_invalid_url
    ):
        """Test async job parsing with invalid URL format."""
        with pytest.raises(HTTPException) as exc_info:
            await parse_job_async(
                request=job_request_invalid_url,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 422
        assert "Invalid URL format" in str(exc_info.value.detail)

        # Service should not be called
        mock_job_service.create_parse_task.assert_not_called()

    @pytest.mark.asyncio
    async def test_parse_job_async_empty_url(self, mock_user, mock_job_service):
        """Test async job parsing with empty URL."""
        request = JobParseRequest(url="")

        with pytest.raises(HTTPException) as exc_info:
            await parse_job_async(
                request=request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 422
        assert "Invalid URL format" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_parse_job_async_service_error(
        self, mock_user, mock_job_service, job_request_valid
    ):
        """Test async job parsing when service raises an error."""
        # Mock service to raise an exception
        mock_job_service.create_parse_task.side_effect = Exception("Service error")

        with pytest.raises(HTTPException) as exc_info:
            await parse_job_async(
                request=job_request_valid,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 500
        assert "Error creating job parse task" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_parse_job_async_value_error_from_service(
        self, mock_user, mock_job_service, job_request_valid
    ):
        """Test async job parsing when service raises ValueError."""
        # Mock service to raise a ValueError (which should become HTTPException)
        mock_job_service.create_parse_task.side_effect = ValueError("Invalid input")

        with pytest.raises(HTTPException) as exc_info:
            await parse_job_async(
                request=job_request_valid,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 500
        assert "Error creating job parse task" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_parse_job_async_different_priority(
        self, mock_user, mock_job_service, job_request_valid
    ):
        """Test async job parsing uses correct priority."""
        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "job_789"

            await parse_job_async(
                request=job_request_valid,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        # Verify the priority is set to NORMAL
        call_args = mock_job_service.create_parse_task.call_args
        assert call_args.kwargs["priority"] == TaskPriority.NORMAL

    @pytest.mark.asyncio
    async def test_parse_job_async_https_url(self, mock_user, mock_job_service):
        """Test async job parsing with HTTPS URL."""
        request = JobParseRequest(url="https://secure-job-site.com/posting/456")

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "job_secure"

            result = await parse_job_async(
                request=request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert result.success is True
        assert result.data["url"] == "https://secure-job-site.com/posting/456"

    @pytest.mark.asyncio
    async def test_parse_job_async_http_url(self, mock_user, mock_job_service):
        """Test async job parsing with HTTP URL."""
        request = JobParseRequest(url="http://job-site.com/posting/789")

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "job_http"

            result = await parse_job_async(
                request=request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert result.success is True
        assert result.data["url"] == "http://job-site.com/posting/789"


class TestJobAsyncDependencies:
    """Test cases for job async endpoint dependencies."""

    @pytest.mark.asyncio
    async def test_get_current_user_with_authorization(self):
        """Test get_current_user with authorization header."""
        result = await get_current_user(authorization="Bearer token123")

        # Test token generates user based on token value
        assert result["id"] == "user_token123"
        assert result["email"] == "user_token123@example.com"
        assert result["name"] == "User token123"
        assert "session_id" in result

    @pytest.mark.asyncio
    async def test_get_current_user_without_authorization(self):
        """Test get_current_user without authorization header."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(authorization=None)

        assert exc_info.value.status_code == 401
        assert "Authorization header required" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_job_service_function_exists(self):
        """Test that get_job_service function exists and is callable."""
        # Simple test to verify the function is importable and callable
        assert callable(get_job_service)

        # The function should work with proper mocking for database dependencies
        with patch("app.services.task_service.TaskService") as mock_task_service_class:
            mock_task_service = AsyncMock()
            mock_task_service.postgres_pool = MagicMock()  # Already started
            mock_task_service_class.return_value = mock_task_service

            result = await get_job_service()

            # Verify we get a JobService instance
            assert isinstance(result, JobService)


class TestJobParseRequest:
    """Test cases for JobParseRequest model."""

    def test_job_parse_request_valid(self):
        """Test valid JobParseRequest creation."""
        request = JobParseRequest(url="https://example.com/job")
        assert request.url == "https://example.com/job"

    def test_job_parse_request_model_validation(self):
        """Test JobParseRequest model validation."""
        # Test with valid data
        data = {"url": "https://test.com"}
        request = JobParseRequest(**data)
        assert request.url == "https://test.com"

    def test_job_parse_request_serialization(self):
        """Test JobParseRequest serialization."""
        request = JobParseRequest(url="https://example.com/test")
        data = request.model_dump()
        assert data == {"url": "https://example.com/test"}


class TestTaskResponse:
    """Test cases for TaskResponse model."""

    def test_task_response_success(self):
        """Test TaskResponse creation with success."""
        from app.routers.job import TaskResponse

        response = TaskResponse(success=True, data={"task_id": "123", "job_id": "456"})

        assert response.success is True
        assert response.data["task_id"] == "123"
        assert response.data["job_id"] == "456"

    def test_task_response_failure(self):
        """Test TaskResponse creation with failure."""
        from app.routers.job import TaskResponse

        response = TaskResponse(success=False, data={"error": "Something went wrong"})

        assert response.success is False
        assert response.data["error"] == "Something went wrong"

    def test_task_response_serialization(self):
        """Test TaskResponse serialization."""
        from app.routers.job import TaskResponse

        response = TaskResponse(
            success=True, data={"task_id": "abc123", "url": "https://test.com"}
        )

        data = response.model_dump()
        expected = {
            "success": True,
            "data": {"task_id": "abc123", "url": "https://test.com"},
        }
        assert data == expected


class TestJobAsyncIntegration:
    """Integration test cases for job async functionality."""

    @pytest.mark.asyncio
    async def test_full_workflow_success(self):
        """Test full workflow of job parsing request."""
        # Mock all dependencies
        mock_user = {"id": "integration_user", "email": "integration@test.com"}
        mock_service = AsyncMock(spec=JobService)
        mock_service.create_parse_task.return_value = "integration_task_123"

        request = JobParseRequest(url="https://integration-test.com/job")

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "integration_job_456"

            result = await parse_job_async(
                request=request,
                current_user=mock_user,
                job_service=mock_service,
            )

        # Verify complete workflow
        assert result.success is True
        assert "task_id" in result.data
        assert "job_id" in result.data
        assert "url" in result.data
        assert result.data["task_id"] == "integration_task_123"
        assert result.data["job_id"] == "integration_job_456"
        assert result.data["url"] == "https://integration-test.com/job"

        # Verify service was called with correct parameters
        mock_service.create_parse_task.assert_called_once_with(
            user_id="integration_user",
            url="https://integration-test.com/job",
            job_id="integration_job_456",
            priority=TaskPriority.NORMAL,
        )
