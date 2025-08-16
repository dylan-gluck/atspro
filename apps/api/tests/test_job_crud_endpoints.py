"""Tests for job CRUD endpoints."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi import HTTPException

from app.routers.job import (
    JobCreateRequest,
    JobUpdateRequest,
    JobStatusRequest,
    BulkStatusRequest,
    BulkArchiveRequest,
    JobFilterRequest,
    JobEntity,
    PaginatedResponse,
    create_job,
    list_jobs,
    get_job,
    update_job,
    delete_job,
    update_job_status,
    bulk_update_status,
    bulk_archive_jobs,
    search_jobs,
    filter_jobs,
    get_job_insights,
    get_job_documents,
    create_job_document,
    get_current_user,
    get_job_service,
)
from app.queue.redis_queue import TaskPriority
from app.services.job_service import JobService


class TestJobCRUDEndpoints:
    """Test cases for job CRUD endpoints."""

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

    # Test create_job endpoint (POST /api/jobs)
    @pytest.mark.asyncio
    async def test_create_job_success(self, mock_user, mock_job_service):
        """Test successful job creation."""
        request = JobCreateRequest(job_url="https://example.com/job/123")

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "job_456"

            result = await create_job(
                request=request,
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
    async def test_create_job_invalid_url(self, mock_user, mock_job_service):
        """Test job creation with invalid URL."""
        request = JobCreateRequest(job_url="not-a-url")

        with pytest.raises(HTTPException) as exc_info:
            await create_job(
                request=request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 422
        assert "Invalid URL format" in str(exc_info.value.detail)
        mock_job_service.create_parse_task.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_job_service_error(self, mock_user, mock_job_service):
        """Test job creation when service raises error."""
        request = JobCreateRequest(job_url="https://example.com/job")
        mock_job_service.create_parse_task.side_effect = Exception("Service error")

        with pytest.raises(HTTPException) as exc_info:
            await create_job(
                request=request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 500
        assert "Error creating job" in str(exc_info.value.detail)

    # Test list_jobs endpoint (GET /api/jobs)
    @pytest.mark.asyncio
    async def test_list_jobs_success(self, mock_user, mock_job_service):
        """Test successful job listing."""
        result = await list_jobs(
            status=None,
            company=None,
            archived=None,
            page=1,
            page_size=20,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert isinstance(result, PaginatedResponse)
        assert result.page == 1
        assert result.page_size == 20
        assert result.total >= 0
        assert isinstance(result.data, list)

    @pytest.mark.asyncio
    async def test_list_jobs_with_filters(self, mock_user, mock_job_service):
        """Test job listing with filters."""
        result = await list_jobs(
            status="applied",
            company="Tech Corp",
            archived=False,
            page=2,
            page_size=10,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert isinstance(result, PaginatedResponse)
        assert result.page == 2
        assert result.page_size == 10

    # Test get_job endpoint (GET /api/jobs/{job_id})
    @pytest.mark.asyncio
    async def test_get_job_success(self, mock_user, mock_job_service):
        """Test successful job retrieval."""
        result = await get_job(
            job_id="job_123",
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert isinstance(result, JobEntity)
        assert result.id == "job_123"
        assert result.title == "Software Engineer"
        assert result.company == "Tech Corp"

    # Test update_job endpoint (PATCH /api/jobs/{job_id})
    @pytest.mark.asyncio
    async def test_update_job_success(self, mock_user, mock_job_service):
        """Test successful job update."""
        request = JobUpdateRequest(
            title="Senior Software Engineer",
            company="Big Tech Corp",
            status="interview",
        )

        result = await update_job(
            job_id="job_123",
            request=request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert isinstance(result, JobEntity)
        assert result.id == "job_123"
        assert result.title == "Senior Software Engineer"
        assert result.company == "Big Tech Corp"
        assert result.status == "interview"

    # Test delete_job endpoint (DELETE /api/jobs/{job_id})
    @pytest.mark.asyncio
    async def test_delete_job_success(self, mock_user, mock_job_service):
        """Test successful job deletion."""
        result = await delete_job(
            job_id="job_123",
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert result["success"] is True
        assert "deleted successfully" in result["message"]

    # Test update_job_status endpoint (PATCH /api/jobs/{job_id}/status)
    @pytest.mark.asyncio
    async def test_update_job_status_success(self, mock_user, mock_job_service):
        """Test successful job status update."""
        request = JobStatusRequest(status="interview")

        result = await update_job_status(
            job_id="job_123",
            request=request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert isinstance(result, JobEntity)
        assert result.status == "interview"

    # Test bulk operations
    @pytest.mark.asyncio
    async def test_bulk_update_status_success(self, mock_user, mock_job_service):
        """Test successful bulk status update."""
        request = BulkStatusRequest(
            job_ids=["job_1", "job_2", "job_3"],
            status="interview"
        )

        result = await bulk_update_status(
            request=request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert result["success"] is True
        assert "Updated 3 jobs" in result["message"]

    @pytest.mark.asyncio
    async def test_bulk_archive_jobs_success(self, mock_user, mock_job_service):
        """Test successful bulk archive."""
        request = BulkArchiveRequest(
            job_ids=["job_1", "job_2"],
            archived=True
        )

        result = await bulk_archive_jobs(
            request=request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert result["success"] is True
        assert "Archived 2 jobs" in result["message"]

    # Test search and filter endpoints
    @pytest.mark.asyncio
    async def test_search_jobs_success(self, mock_user, mock_job_service):
        """Test successful job search."""
        result = await search_jobs(
            q="software engineer",
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_filter_jobs_success(self, mock_user, mock_job_service):
        """Test successful job filtering."""
        request = JobFilterRequest(
            status=["applied", "interview"],
            company=["Tech Corp"],
            location=["San Francisco"]
        )

        result = await filter_jobs(
            request=request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert isinstance(result, list)

    # Test get_job_insights endpoint
    @pytest.mark.asyncio
    async def test_get_job_insights_success(self, mock_user, mock_job_service):
        """Test successful job insights retrieval."""
        result = await get_job_insights(
            job_id="job_123",
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert "skill_match" in result
        assert "experience_match" in result
        assert "missing_skills" in result
        assert "recommendations" in result
        assert isinstance(result["skill_match"], int)
        assert isinstance(result["missing_skills"], list)

    # Test document endpoints
    @pytest.mark.asyncio
    async def test_get_job_documents_success(self, mock_user, mock_job_service):
        """Test successful job documents retrieval."""
        result = await get_job_documents(
            job_id="job_123",
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_create_job_document_success(self, mock_user, mock_job_service):
        """Test successful job document creation."""
        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "doc_123"

            result = await create_job_document(
                job_id="job_123",
                content="Resume content",
                type="resume",
                current_user=mock_user,
                job_service=mock_job_service,
            )

            assert result["id"] == "doc_123"
            assert result["job_id"] == "job_123"
            assert result["type"] == "resume"
            assert result["content"] == "Resume content"


class TestJobRequestModels:
    """Test cases for job request models."""

    def test_job_create_request_valid(self):
        """Test valid JobCreateRequest creation."""
        request = JobCreateRequest(job_url="https://example.com/job")
        assert request.job_url == "https://example.com/job"

    def test_job_update_request_partial(self):
        """Test partial JobUpdateRequest creation."""
        request = JobUpdateRequest(title="New Title")
        assert request.title == "New Title"
        assert request.company is None
        assert request.status is None

    def test_job_status_request_valid(self):
        """Test valid JobStatusRequest creation."""
        request = JobStatusRequest(status="interview")
        assert request.status == "interview"

    def test_bulk_status_request_valid(self):
        """Test valid BulkStatusRequest creation."""
        request = BulkStatusRequest(
            job_ids=["job_1", "job_2"],
            status="rejected"
        )
        assert request.job_ids == ["job_1", "job_2"]
        assert request.status == "rejected"

    def test_bulk_archive_request_valid(self):
        """Test valid BulkArchiveRequest creation."""
        request = BulkArchiveRequest(
            job_ids=["job_1", "job_2", "job_3"],
            archived=True
        )
        assert request.job_ids == ["job_1", "job_2", "job_3"]
        assert request.archived is True


class TestJobResponseModels:
    """Test cases for job response models."""

    def test_job_entity_creation(self):
        """Test JobEntity creation."""
        job = JobEntity(
            id="job_123",
            title="Software Engineer",
            company="Tech Corp",
            location="San Francisco, CA",
            url="https://example.com/job",
            status="applied",
            archived=False,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z",
        )

        assert job.id == "job_123"
        assert job.title == "Software Engineer"
        assert job.company == "Tech Corp"
        assert job.status == "applied"
        assert job.archived is False

    def test_paginated_response_creation(self):
        """Test PaginatedResponse creation."""
        jobs = [
            JobEntity(
                id="job_1",
                title="Engineer 1",
                company="Corp 1",
                url="https://example.com/job1",
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z",
            )
        ]

        response = PaginatedResponse(
            data=jobs,
            total=50,
            page=2,
            page_size=20,
            total_pages=3
        )

        assert len(response.data) == 1
        assert response.total == 50
        assert response.page == 2
        assert response.page_size == 20
        assert response.total_pages == 3