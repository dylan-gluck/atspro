"""Test for the critical 405 fix."""

import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi import HTTPException

from app.routers.job import (
    JobCreateRequest,
    create_job,
    get_current_user,
    get_job_service,
)
from app.queue.redis_queue import TaskPriority
from app.services.job_service import JobService


class TestCritical405Fix:
    """Test that the critical 405 error is fixed."""

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

    @pytest.mark.asyncio
    async def test_post_jobs_endpoint_accepts_job_url(
        self, mock_user, mock_job_service
    ):
        """Test that POST /api/jobs accepts {job_url: string} format."""
        # This is the exact format the frontend sends
        request = JobCreateRequest(job_url="https://example.com/job/123")

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "job_456"

            result = await create_job(
                request=request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        # Verify service was called with the correct URL from job_url field
        mock_job_service.create_parse_task.assert_called_once_with(
            user_id="test_user_123",
            url="https://example.com/job/123",  # Note: URL comes from job_url
            job_id="job_456",
            priority=TaskPriority.NORMAL,
        )

        # Verify response structure matches expectations
        assert result.success is True
        assert result.data["task_id"] == "task_123"
        assert result.data["job_id"] == "job_456"
        assert result.data["url"] == "https://example.com/job/123"

    @pytest.mark.asyncio
    async def test_job_create_request_model_validation(self):
        """Test JobCreateRequest model accepts job_url field."""
        # Test with valid job_url
        request = JobCreateRequest(job_url="https://example.com/job")
        assert request.job_url == "https://example.com/job"

        # Test serialization
        data = request.model_dump()
        assert data == {"job_url": "https://example.com/job"}

        # Test model validation from dict
        request_dict = {"job_url": "https://test.com/posting"}
        request_from_dict = JobCreateRequest(**request_dict)
        assert request_from_dict.job_url == "https://test.com/posting"

    @pytest.mark.asyncio
    async def test_frontend_backend_compatibility(self, mock_user, mock_job_service):
        """Test that frontend request format works with backend."""
        # Simulate exact frontend request
        frontend_data = {"job_url": "https://jobs.company.com/posting/12345"}
        request = JobCreateRequest(**frontend_data)

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "generated_job_id"

            result = await create_job(
                request=request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        # Verify the frontend's job_url is properly handled
        assert result.success is True
        assert result.data["url"] == "https://jobs.company.com/posting/12345"

        # Verify service received the URL correctly
        call_args = mock_job_service.create_parse_task.call_args
        assert call_args.kwargs["url"] == "https://jobs.company.com/posting/12345"

    @pytest.mark.asyncio
    async def test_error_message_uses_job_url_terminology(
        self, mock_user, mock_job_service
    ):
        """Test that error messages are appropriate for job_url field."""
        # Test with invalid URL
        request = JobCreateRequest(job_url="invalid-url")

        with pytest.raises(HTTPException) as exc_info:
            await create_job(
                request=request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 422
        assert "Invalid URL format" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_backward_compatibility_maintained(self, mock_user, mock_job_service):
        """Test that existing /api/job endpoint still works."""
        from app.routers.job import JobParseRequest, parse_job_async

        # Test the old format still works
        old_request = JobParseRequest(url="https://example.com/job")

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "old_job_id"

            result = await parse_job_async(
                request=old_request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        # Verify backward compatibility
        assert result.success is True
        assert result.data["url"] == "https://example.com/job"

        # Both endpoints should call the same service method
        mock_job_service.create_parse_task.assert_called_with(
            user_id="test_user_123",
            url="https://example.com/job",
            job_id="old_job_id",
            priority=TaskPriority.NORMAL,
        )
