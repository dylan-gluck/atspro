"""Tests for resume management endpoints."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from fastapi import HTTPException

from app.routers.job import (
    get_resume,
    update_resume,
    get_current_user,
    get_job_service,
)
from app.services.job_service import JobService


class TestResumeEndpoints:
    """Test cases for resume management endpoints."""

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user."""
        return {"id": "test_user_123", "email": "test@example.com"}

    @pytest.fixture
    def mock_job_service(self):
        """Mock job service."""
        service = AsyncMock(spec=JobService)
        return service

    @pytest.fixture
    def sample_resume_data(self):
        """Sample resume data from database."""
        return {
            "_key": "resume_123",
            "user_id": "test_user_123",
            "content": "# John Doe\n\n## Experience\n\nSoftware Engineer at Tech Corp",
            "parsed_data": {
                "name": "John Doe",
                "title": "Software Engineer",
                "experience": [
                    {
                        "company": "Tech Corp",
                        "position": "Software Engineer",
                        "duration": "2020-2024",
                    }
                ],
            },
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

    # Test get_resume endpoint (GET /api/resume/{resume_id})
    @pytest.mark.asyncio
    async def test_get_resume_success(
        self, mock_user, mock_job_service, sample_resume_data
    ):
        """Test successful resume retrieval."""
        mock_job_service.get_resume.return_value = sample_resume_data

        result = await get_resume(
            resume_id="resume_123",
            current_user=mock_user,
            job_service=mock_job_service,
        )

        # Verify service was called correctly
        mock_job_service.get_resume.assert_called_once_with(
            "resume_123", "test_user_123"
        )

        # Verify response structure
        assert result["success"] is True
        assert "data" in result
        data = result["data"]

        assert data["id"] == "resume_123"
        assert data["user_id"] == "test_user_123"
        assert "John Doe" in data["content"]
        assert data["parsed_data"]["name"] == "John Doe"
        assert data["created_at"] == "2024-01-01T00:00:00Z"
        assert data["updated_at"] == "2024-01-01T00:00:00Z"

    @pytest.mark.asyncio
    async def test_get_resume_not_found(self, mock_user, mock_job_service):
        """Test resume retrieval when resume doesn't exist."""
        mock_job_service.get_resume.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await get_resume(
                resume_id="nonexistent_resume",
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 404
        assert "Resume not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_resume_service_error(self, mock_user, mock_job_service):
        """Test resume retrieval when service raises error."""
        mock_job_service.get_resume.side_effect = Exception("Database error")

        with pytest.raises(HTTPException) as exc_info:
            await get_resume(
                resume_id="resume_123",
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 500
        assert "Error retrieving resume" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_resume_unauthorized_access(self, mock_user, mock_job_service):
        """Test resume retrieval when user doesn't have access."""
        # Mock get_resume to return None (no access)
        mock_job_service.get_resume.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await get_resume(
                resume_id="resume_123",
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 404
        assert "Resume not found" in str(exc_info.value.detail)

    # Test update_resume endpoint (PATCH /api/resume/{resume_id})
    @pytest.mark.asyncio
    async def test_update_resume_success(
        self, mock_user, mock_job_service, sample_resume_data
    ):
        """Test successful resume update."""
        # Mock access validation and update
        mock_job_service.validate_resume_access.return_value = True
        mock_job_service.update_resume = AsyncMock()

        # Updated resume data
        updated_resume_data = sample_resume_data.copy()
        updated_resume_data["content"] = (
            "# John Doe - Updated\n\n## Experience\n\nSenior Software Engineer at Tech Corp"
        )
        updated_resume_data["updated_at"] = "2024-01-02T00:00:00Z"
        mock_job_service.get_resume.return_value = updated_resume_data

        update_request = {
            "content": "# John Doe - Updated\n\n## Experience\n\nSenior Software Engineer at Tech Corp"
        }

        result = await update_resume(
            resume_id="resume_123",
            request=update_request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        # Verify access validation
        mock_job_service.validate_resume_access.assert_called_once_with(
            "resume_123", "test_user_123"
        )

        # Verify update was called
        mock_job_service.update_resume.assert_called_once_with(
            resume_id="resume_123",
            updates=update_request,
        )

        # Verify response
        assert result["success"] is True
        assert "Updated" in result["data"]["content"]
        assert result["data"]["updated_at"] == "2024-01-02T00:00:00Z"

    @pytest.mark.asyncio
    async def test_update_resume_not_found(self, mock_user, mock_job_service):
        """Test resume update when resume doesn't exist."""
        mock_job_service.validate_resume_access.return_value = False

        update_request = {"content": "Updated content"}

        with pytest.raises(HTTPException) as exc_info:
            await update_resume(
                resume_id="nonexistent_resume",
                request=update_request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 404
        assert "Resume not found" in str(exc_info.value.detail)

        # Update should not be called if access validation fails
        mock_job_service.update_resume.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_resume_unauthorized_access(self, mock_user, mock_job_service):
        """Test resume update when user doesn't have access."""
        mock_job_service.validate_resume_access.return_value = False

        update_request = {"content": "Unauthorized update"}

        with pytest.raises(HTTPException) as exc_info:
            await update_resume(
                resume_id="resume_123",
                request=update_request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 404
        assert "Resume not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_resume_service_error(self, mock_user, mock_job_service):
        """Test resume update when service raises error."""
        mock_job_service.validate_resume_access.return_value = True
        mock_job_service.update_resume.side_effect = Exception("Database error")

        update_request = {"content": "Updated content"}

        with pytest.raises(HTTPException) as exc_info:
            await update_resume(
                resume_id="resume_123",
                request=update_request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 500
        assert "Error updating resume" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_resume_partial_update(
        self, mock_user, mock_job_service, sample_resume_data
    ):
        """Test partial resume update (only some fields)."""
        mock_job_service.validate_resume_access.return_value = True
        mock_job_service.update_resume = AsyncMock()
        mock_job_service.get_resume.return_value = sample_resume_data

        # Only update content
        partial_update = {"content": "Updated content only"}

        result = await update_resume(
            resume_id="resume_123",
            request=partial_update,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        # Verify update was called with only the changed field
        mock_job_service.update_resume.assert_called_once_with(
            resume_id="resume_123",
            updates=partial_update,
        )

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_update_resume_empty_update(
        self, mock_user, mock_job_service, sample_resume_data
    ):
        """Test resume update with empty request."""
        mock_job_service.validate_resume_access.return_value = True
        mock_job_service.update_resume = AsyncMock()
        mock_job_service.get_resume.return_value = sample_resume_data

        empty_update = {}

        result = await update_resume(
            resume_id="resume_123",
            request=empty_update,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        # Should still call update (even with empty dict)
        mock_job_service.update_resume.assert_called_once_with(
            resume_id="resume_123",
            updates=empty_update,
        )

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_update_resume_complex_data(
        self, mock_user, mock_job_service, sample_resume_data
    ):
        """Test resume update with complex data structure."""
        mock_job_service.validate_resume_access.return_value = True
        mock_job_service.update_resume = AsyncMock()

        # Updated resume with new parsed data
        updated_resume = sample_resume_data.copy()
        updated_resume["parsed_data"] = {
            "name": "John Doe",
            "title": "Senior Software Engineer",
            "experience": [
                {
                    "company": "Tech Corp",
                    "position": "Senior Software Engineer",
                    "duration": "2020-2024",
                    "skills": ["Python", "FastAPI", "React"],
                },
                {
                    "company": "Startup Inc",
                    "position": "Full Stack Developer",
                    "duration": "2018-2020",
                    "skills": ["JavaScript", "Node.js", "PostgreSQL"],
                },
            ],
            "skills": [
                "Python",
                "FastAPI",
                "React",
                "JavaScript",
                "Node.js",
                "PostgreSQL",
            ],
            "education": [
                {
                    "degree": "Bachelor of Science",
                    "major": "Computer Science",
                    "university": "Tech University",
                    "year": "2018",
                }
            ],
        }
        mock_job_service.get_resume.return_value = updated_resume

        complex_update = {
            "content": "# John Doe - Senior Software Engineer",
            "parsed_data": updated_resume["parsed_data"],
        }

        result = await update_resume(
            resume_id="resume_123",
            request=complex_update,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        # Verify the complex update was processed
        mock_job_service.update_resume.assert_called_once_with(
            resume_id="resume_123",
            updates=complex_update,
        )

        assert result["success"] is True
        assert result["data"]["parsed_data"]["title"] == "Senior Software Engineer"
        assert len(result["data"]["parsed_data"]["experience"]) == 2
        assert "Python" in result["data"]["parsed_data"]["skills"]


class TestResumeEndpointsAuth:
    """Test authentication and authorization for resume endpoints."""

    @pytest.fixture
    def mock_job_service(self):
        """Mock job service."""
        return AsyncMock(spec=JobService)

    @pytest.mark.asyncio
    async def test_get_current_user_valid_auth(self):
        """Test get_current_user with valid authorization."""
        result = await get_current_user(authorization="Bearer token123")

        # Test token generates user based on token value
        assert result["id"] == "user_token123"
        assert result["email"] == "user_token123@example.com"
        assert result["name"] == "User token123"
        assert "session_id" in result

    @pytest.mark.asyncio
    async def test_get_current_user_missing_auth(self):
        """Test get_current_user without authorization header."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(authorization=None)

        assert exc_info.value.status_code == 401
        assert "Authorization header required" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_job_service_dependency(self):
        """Test get_job_service dependency injection."""
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


class TestResumeEndpointsIntegration:
    """Integration tests for resume management functionality."""

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user."""
        return {"id": "integration_user", "email": "integration@example.com"}

    @pytest.fixture
    def mock_job_service(self):
        """Mock job service."""
        service = AsyncMock(spec=JobService)
        return service

    @pytest.fixture
    def sample_resume_data(self):
        """Sample resume data."""
        return {
            "_key": "integration_resume",
            "user_id": "integration_user",
            "content": "# Integration Test Resume",
            "parsed_data": {"name": "Integration User"},
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

    @pytest.mark.asyncio
    async def test_resume_get_update_workflow(
        self, mock_user, mock_job_service, sample_resume_data
    ):
        """Test complete resume get -> update workflow."""
        resume_id = "integration_resume"

        # Setup mocks for the workflow
        mock_job_service.get_resume.return_value = sample_resume_data
        mock_job_service.validate_resume_access.return_value = True
        mock_job_service.update_resume = AsyncMock()

        # 1. Get initial resume
        get_result = await get_resume(
            resume_id=resume_id,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert get_result["success"] is True
        assert get_result["data"]["id"] == resume_id
        initial_content = get_result["data"]["content"]

        # 2. Update the resume
        updated_content = initial_content + "\n\n## Updated Section"
        update_request = {"content": updated_content}

        # Mock the updated resume data
        updated_resume_data = sample_resume_data.copy()
        updated_resume_data["content"] = updated_content
        updated_resume_data["updated_at"] = "2024-01-02T00:00:00Z"

        # Reset the mock to return updated data
        mock_job_service.get_resume.return_value = updated_resume_data

        update_result = await update_resume(
            resume_id=resume_id,
            request=update_request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        # Verify the update workflow
        assert update_result["success"] is True
        assert "Updated Section" in update_result["data"]["content"]
        assert update_result["data"]["updated_at"] == "2024-01-02T00:00:00Z"

        # Verify service calls
        assert (
            mock_job_service.get_resume.call_count == 2
        )  # Initial get + post-update get
        mock_job_service.validate_resume_access.assert_called_once()
        mock_job_service.update_resume.assert_called_once()

    @pytest.mark.asyncio
    async def test_resume_access_control(self, mock_job_service):
        """Test resume access control across different users."""
        resume_id = "shared_resume"

        # User 1 - has access
        user1 = {"id": "user_1", "email": "user1@example.com"}
        mock_job_service.validate_resume_access.return_value = True
        mock_job_service.get_resume.return_value = {
            "_key": resume_id,
            "user_id": "user_1",
            "content": "User 1's resume",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

        # User 1 can access
        result1 = await get_resume(
            resume_id=resume_id,
            current_user=user1,
            job_service=mock_job_service,
        )
        assert result1["success"] is True

        # User 2 - no access
        user2 = {"id": "user_2", "email": "user2@example.com"}
        mock_job_service.get_resume.return_value = None  # No access

        # User 2 cannot access
        with pytest.raises(HTTPException) as exc_info:
            await get_resume(
                resume_id=resume_id,
                current_user=user2,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_resume_error_recovery(self, mock_user, mock_job_service):
        """Test error handling and recovery in resume operations."""
        resume_id = "error_prone_resume"

        # Test transient error recovery scenario
        error_count = 0

        def mock_get_resume_with_retry(*args, **kwargs):
            nonlocal error_count
            error_count += 1
            if error_count == 1:
                raise Exception("Transient database error")
            return {
                "_key": resume_id,
                "user_id": "integration_user",
                "content": "Recovered resume",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            }

        mock_job_service.get_resume.side_effect = mock_get_resume_with_retry

        # First call should fail
        with pytest.raises(HTTPException) as exc_info:
            await get_resume(
                resume_id=resume_id,
                current_user=mock_user,
                job_service=mock_job_service,
            )
        assert exc_info.value.status_code == 500

        # Second call should succeed (simulating retry mechanism)
        result = await get_resume(
            resume_id=resume_id,
            current_user=mock_user,
            job_service=mock_job_service,
        )
        assert result["success"] is True
        assert result["data"]["content"] == "Recovered resume"
