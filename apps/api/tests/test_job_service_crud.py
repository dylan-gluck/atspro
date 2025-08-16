"""Tests for new JobService CRUD methods."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.job_service import JobService
from app.services.task_service import TaskService


class TestJobServiceUpdateJob:
    """Test cases for JobService.update_job method."""

    @pytest.fixture
    def mock_task_service(self):
        """Mock task service with ArangoDB."""
        task_service = AsyncMock(spec=TaskService)
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        task_service.arango_db = mock_db
        return task_service

    @pytest.fixture
    def job_service(self, mock_task_service):
        """JobService instance with mocked dependencies."""
        return JobService(mock_task_service)

    @pytest.mark.asyncio
    async def test_update_job_success(self, job_service, mock_task_service):
        """Test successful job update."""
        job_id = "job_123"
        updates = {
            "title": "Senior Software Engineer",
            "company": "New Tech Corp",
            "status": "interviewed",
        }

        with patch("app.services.job_service.datetime") as mock_datetime:
            mock_datetime.utcnow.return_value.isoformat.return_value = (
                "2024-01-02T00:00:00Z"
            )

            await job_service.update_job(job_id, updates)

        # Verify collection update was called correctly
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_task_service.arango_db.collection.assert_called_once_with("jobs")

        expected_updates = {
            "title": "Senior Software Engineer",
            "company": "New Tech Corp",
            "status": "interviewed",
            "updated_at": "2024-01-02T00:00:00Z",
        }
        mock_collection.update.assert_called_once_with(
            {"_key": job_id}, expected_updates
        )

    @pytest.mark.asyncio
    async def test_update_job_empty_updates(self, job_service, mock_task_service):
        """Test job update with empty updates."""
        job_id = "job_123"
        updates = {}

        with patch("app.services.job_service.datetime") as mock_datetime:
            mock_datetime.utcnow.return_value.isoformat.return_value = (
                "2024-01-02T00:00:00Z"
            )

            await job_service.update_job(job_id, updates)

        # Should still add updated_at timestamp
        mock_collection = mock_task_service.arango_db.collection.return_value
        expected_updates = {"updated_at": "2024-01-02T00:00:00Z"}
        mock_collection.update.assert_called_once_with(
            {"_key": job_id}, expected_updates
        )

    @pytest.mark.asyncio
    async def test_update_job_database_error(self, job_service, mock_task_service):
        """Test job update with database error."""
        job_id = "job_123"
        updates = {"title": "New Title"}

        # Mock database error
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_collection.update.side_effect = Exception("Database connection failed")

        with pytest.raises(Exception) as exc_info:
            await job_service.update_job(job_id, updates)

        assert "Database connection failed" in str(exc_info.value)


class TestJobServiceDeleteJob:
    """Test cases for JobService.delete_job method."""

    @pytest.fixture
    def mock_task_service(self):
        """Mock task service with ArangoDB."""
        task_service = AsyncMock(spec=TaskService)
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        task_service.arango_db = mock_db
        return task_service

    @pytest.fixture
    def job_service(self, mock_task_service):
        """JobService instance with mocked dependencies."""
        return JobService(mock_task_service)

    @pytest.mark.asyncio
    async def test_delete_job_success(self, job_service, mock_task_service):
        """Test successful job deletion."""
        job_id = "job_123"

        await job_service.delete_job(job_id)

        # Verify collection delete was called correctly
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_task_service.arango_db.collection.assert_called_once_with("jobs")
        mock_collection.delete.assert_called_once_with({"_key": job_id})

    @pytest.mark.asyncio
    async def test_delete_job_database_error(self, job_service, mock_task_service):
        """Test job deletion with database error."""
        job_id = "job_123"

        # Mock database error
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_collection.delete.side_effect = Exception("Delete operation failed")

        with pytest.raises(Exception) as exc_info:
            await job_service.delete_job(job_id)

        assert "Delete operation failed" in str(exc_info.value)


class TestJobServiceGetResume:
    """Test cases for JobService.get_resume method."""

    @pytest.fixture
    def mock_task_service(self):
        """Mock task service with ArangoDB."""
        task_service = AsyncMock(spec=TaskService)
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        task_service.arango_db = mock_db
        return task_service

    @pytest.fixture
    def job_service(self, mock_task_service):
        """JobService instance with mocked dependencies."""
        return JobService(mock_task_service)

    @pytest.fixture
    def mock_resume_doc(self):
        """Mock resume document."""
        return {
            "_key": "resume_123",
            "user_id": "user_123",
            "content": "Resume content...",
            "parsed_data": {"skills": ["Python", "FastAPI"]},
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

    @pytest.mark.asyncio
    async def test_get_resume_success(
        self, job_service, mock_task_service, mock_resume_doc
    ):
        """Test successful resume retrieval."""
        resume_id = "resume_123"
        user_id = "user_123"

        # Mock successful retrieval
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_collection.get.return_value = mock_resume_doc

        result = await job_service.get_resume(resume_id, user_id)

        # Verify collection access
        mock_task_service.arango_db.collection.assert_called_once_with("resumes")
        mock_collection.get.assert_called_once_with(resume_id)

        # Verify result
        assert result == mock_resume_doc

    @pytest.mark.asyncio
    async def test_get_resume_not_found(self, job_service, mock_task_service):
        """Test resume retrieval when resume not found."""
        resume_id = "nonexistent_resume"
        user_id = "user_123"

        # Mock resume not found
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_collection.get.return_value = None

        result = await job_service.get_resume(resume_id, user_id)

        assert result is None

    @pytest.mark.asyncio
    async def test_get_resume_wrong_user(
        self, job_service, mock_task_service, mock_resume_doc
    ):
        """Test resume retrieval with wrong user ID."""
        resume_id = "resume_123"
        wrong_user_id = "wrong_user"

        # Mock resume found but belongs to different user
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_collection.get.return_value = mock_resume_doc

        result = await job_service.get_resume(resume_id, wrong_user_id)

        # Should return None due to ownership validation
        assert result is None

    @pytest.mark.asyncio
    async def test_get_resume_no_user_validation(
        self, job_service, mock_task_service, mock_resume_doc
    ):
        """Test resume retrieval without user validation."""
        resume_id = "resume_123"

        # Mock successful retrieval
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_collection.get.return_value = mock_resume_doc

        result = await job_service.get_resume(resume_id)

        # Should return resume without user validation
        assert result == mock_resume_doc

    @pytest.mark.asyncio
    async def test_get_resume_database_error(self, job_service, mock_task_service):
        """Test resume retrieval with database error."""
        resume_id = "resume_123"
        user_id = "user_123"

        # Mock database error
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_collection.get.side_effect = Exception("Database connection failed")

        result = await job_service.get_resume(resume_id, user_id)

        # Should return None on error
        assert result is None


class TestJobServiceValidateResumeAccess:
    """Test cases for JobService.validate_resume_access method."""

    @pytest.fixture
    def job_service(self):
        """JobService instance with mocked get_resume."""
        service = JobService(AsyncMock())
        return service

    @pytest.mark.asyncio
    async def test_validate_resume_access_success(self, job_service):
        """Test successful resume access validation."""
        resume_id = "resume_123"
        user_id = "user_123"

        # Mock get_resume to return a resume
        with patch.object(job_service, "get_resume") as mock_get_resume:
            mock_get_resume.return_value = {"_key": resume_id, "user_id": user_id}

            result = await job_service.validate_resume_access(resume_id, user_id)

            assert result is True
            mock_get_resume.assert_called_once_with(resume_id, user_id)

    @pytest.mark.asyncio
    async def test_validate_resume_access_no_access(self, job_service):
        """Test resume access validation when user has no access."""
        resume_id = "resume_123"
        user_id = "user_123"

        # Mock get_resume to return None (no access)
        with patch.object(job_service, "get_resume") as mock_get_resume:
            mock_get_resume.return_value = None

            result = await job_service.validate_resume_access(resume_id, user_id)

            assert result is False
            mock_get_resume.assert_called_once_with(resume_id, user_id)


class TestJobServiceUpdateResume:
    """Test cases for JobService.update_resume method."""

    @pytest.fixture
    def mock_task_service(self):
        """Mock task service with ArangoDB."""
        task_service = AsyncMock(spec=TaskService)
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        task_service.arango_db = mock_db
        return task_service

    @pytest.fixture
    def job_service(self, mock_task_service):
        """JobService instance with mocked dependencies."""
        return JobService(mock_task_service)

    @pytest.mark.asyncio
    async def test_update_resume_success(self, job_service, mock_task_service):
        """Test successful resume update."""
        resume_id = "resume_123"
        updates = {
            "content": "Updated resume content",
            "parsed_data": {"skills": ["Python", "FastAPI", "PostgreSQL"]},
        }

        with patch("app.services.job_service.datetime") as mock_datetime:
            mock_datetime.utcnow.return_value.isoformat.return_value = (
                "2024-01-02T00:00:00Z"
            )

            await job_service.update_resume(resume_id, updates)

        # Verify collection update was called correctly
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_task_service.arango_db.collection.assert_called_once_with("resumes")

        expected_updates = {
            "content": "Updated resume content",
            "parsed_data": {"skills": ["Python", "FastAPI", "PostgreSQL"]},
            "updated_at": "2024-01-02T00:00:00Z",
        }
        mock_collection.update.assert_called_once_with(
            {"_key": resume_id}, expected_updates
        )

    @pytest.mark.asyncio
    async def test_update_resume_partial_update(self, job_service, mock_task_service):
        """Test partial resume update."""
        resume_id = "resume_123"
        updates = {"content": "Only updating content"}

        with patch("app.services.job_service.datetime") as mock_datetime:
            mock_datetime.utcnow.return_value.isoformat.return_value = (
                "2024-01-02T00:00:00Z"
            )

            await job_service.update_resume(resume_id, updates)

        # Verify only content and timestamp are updated
        mock_collection = mock_task_service.arango_db.collection.return_value
        expected_updates = {
            "content": "Only updating content",
            "updated_at": "2024-01-02T00:00:00Z",
        }
        mock_collection.update.assert_called_once_with(
            {"_key": resume_id}, expected_updates
        )

    @pytest.mark.asyncio
    async def test_update_resume_database_error(self, job_service, mock_task_service):
        """Test resume update with database error."""
        resume_id = "resume_123"
        updates = {"content": "New content"}

        # Mock database error
        mock_collection = mock_task_service.arango_db.collection.return_value
        mock_collection.update.side_effect = Exception("Update operation failed")

        with pytest.raises(Exception) as exc_info:
            await job_service.update_resume(resume_id, updates)

        assert "Update operation failed" in str(exc_info.value)


class TestJobServiceIntegration:
    """Integration tests for new JobService methods."""

    @pytest.fixture
    def mock_task_service(self):
        """Mock task service with complete ArangoDB setup."""
        task_service = AsyncMock(spec=TaskService)
        mock_db = MagicMock()

        # Setup collections
        jobs_collection = MagicMock()
        resumes_collection = MagicMock()

        def collection_side_effect(name):
            if name == "jobs":
                return jobs_collection
            elif name == "resumes":
                return resumes_collection
            return MagicMock()

        mock_db.collection.side_effect = collection_side_effect
        task_service.arango_db = mock_db

        # Store collections for easy access in tests
        task_service._jobs_collection = jobs_collection
        task_service._resumes_collection = resumes_collection

        return task_service

    @pytest.fixture
    def job_service(self, mock_task_service):
        """JobService instance with mocked dependencies."""
        return JobService(mock_task_service)

    @pytest.mark.asyncio
    async def test_job_crud_workflow(self, job_service, mock_task_service):
        """Test complete job CRUD workflow."""
        job_id = "job_123"

        # Mock initial job data
        initial_job = {
            "_key": job_id,
            "user_id": "user_123",
            "status": "pending",
            "title": "Software Engineer",
            "company": "Tech Corp",
        }

        jobs_collection = mock_task_service._jobs_collection
        jobs_collection.get.return_value = initial_job

        # 1. Update job
        updates = {"status": "applied", "title": "Senior Software Engineer"}

        with patch("app.services.job_service.datetime") as mock_datetime:
            mock_datetime.utcnow.return_value.isoformat.return_value = (
                "2024-01-02T00:00:00Z"
            )
            await job_service.update_job(job_id, updates)

        # Verify update was called
        expected_updates = {
            "status": "applied",
            "title": "Senior Software Engineer",
            "updated_at": "2024-01-02T00:00:00Z",
        }
        jobs_collection.update.assert_called_once_with(
            {"_key": job_id}, expected_updates
        )

        # 2. Delete job
        await job_service.delete_job(job_id)

        # Verify delete was called
        jobs_collection.delete.assert_called_once_with({"_key": job_id})

    @pytest.mark.asyncio
    async def test_resume_crud_workflow(self, job_service, mock_task_service):
        """Test complete resume CRUD workflow."""
        resume_id = "resume_123"
        user_id = "user_123"

        # Mock initial resume data
        initial_resume = {
            "_key": resume_id,
            "user_id": user_id,
            "content": "Original content",
            "parsed_data": {"skills": ["Python"]},
        }

        resumes_collection = mock_task_service._resumes_collection
        resumes_collection.get.return_value = initial_resume

        # 1. Get resume
        result = await job_service.get_resume(resume_id, user_id)
        assert result == initial_resume
        resumes_collection.get.assert_called_once_with(resume_id)

        # 2. Validate access
        access_result = await job_service.validate_resume_access(resume_id, user_id)
        assert access_result is True

        # 3. Update resume
        updates = {
            "content": "Updated content",
            "parsed_data": {"skills": ["Python", "FastAPI"]},
        }

        with patch("app.services.job_service.datetime") as mock_datetime:
            mock_datetime.utcnow.return_value.isoformat.return_value = (
                "2024-01-02T00:00:00Z"
            )
            await job_service.update_resume(resume_id, updates)

        # Verify update was called
        expected_updates = {
            "content": "Updated content",
            "parsed_data": {"skills": ["Python", "FastAPI"]},
            "updated_at": "2024-01-02T00:00:00Z",
        }
        resumes_collection.update.assert_called_once_with(
            {"_key": resume_id}, expected_updates
        )

    @pytest.mark.asyncio
    async def test_cross_user_access_validation(self, job_service, mock_task_service):
        """Test that users cannot access each other's resumes."""
        resume_id = "resume_123"
        owner_user_id = "user_123"
        other_user_id = "user_456"

        # Mock resume belonging to user_123
        resume_doc = {
            "_key": resume_id,
            "user_id": owner_user_id,
            "content": "Private content",
        }

        resumes_collection = mock_task_service._resumes_collection
        resumes_collection.get.return_value = resume_doc

        # Owner should have access
        owner_result = await job_service.get_resume(resume_id, owner_user_id)
        assert owner_result == resume_doc

        # Other user should not have access
        other_result = await job_service.get_resume(resume_id, other_user_id)
        assert other_result is None

        # Validate access methods
        owner_access = await job_service.validate_resume_access(
            resume_id, owner_user_id
        )
        other_access = await job_service.validate_resume_access(
            resume_id, other_user_id
        )

        assert owner_access is True
        assert other_access is False
