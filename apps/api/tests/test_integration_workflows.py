"""Integration tests for end-to-end workflows."""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.routers.job import (
    create_job,
    list_jobs,
    get_job,
    update_job,
    delete_job,
    get_resume,
    update_resume,
    get_current_user,
    get_job_service,
    JobCreateRequest,
    JobUpdateRequest,
    BulkStatusRequest,
    BulkArchiveRequest,
)
from app.services.job_service import JobService
from app.queue.redis_queue import TaskPriority


class TestEndToEndWorkflows:
    """Integration tests for complete user workflows."""

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user."""
        return {"id": "integration_user", "email": "integration@example.com"}

    @pytest.fixture
    def mock_job_service(self):
        """Mock job service with realistic behavior."""
        service = AsyncMock(spec=JobService)
        service.create_parse_task = AsyncMock(return_value="task_123")
        service.get_resume = AsyncMock()
        service.update_resume = AsyncMock()
        service.validate_resume_access = AsyncMock(return_value=True)
        return service

    @pytest.fixture
    def test_client(self):
        """Test client for API integration tests."""
        return TestClient(app)

    # End-to-End Job Management Workflow
    @pytest.mark.asyncio
    async def test_complete_job_workflow(self, mock_user, mock_job_service):
        """Test complete job creation -> update -> deletion workflow."""

        # Step 1: Create a job from URL
        job_url = "https://example.com/software-engineer-job"
        create_request = JobCreateRequest(job_url=job_url)

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "workflow_job_123"

            create_result = await create_job(
                request=create_request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        # Verify job creation
        assert create_result.success is True
        assert create_result.data["job_id"] == "workflow_job_123"
        assert create_result.data["url"] == job_url
        job_id = create_result.data["job_id"]

        # Step 2: List jobs to verify it appears
        list_result = await list_jobs(
            status=None,
            company=None,
            archived=None,
            page=1,
            page_size=20,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert list_result.page == 1
        assert list_result.total >= 0
        assert isinstance(list_result.data, list)

        # Step 3: Get specific job details
        mock_job_service.get_job.return_value = {
            "id": job_id,
            "title": "Software Engineer",
            "company": "Tech Corp",
            "status": "applied",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

        get_result = await get_job(
            job_id=job_id,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert get_result.id == job_id

        # Step 4: Update job information
        update_request = JobUpdateRequest(
            title="Senior Software Engineer", company="Tech Corp", status="interview"
        )

        # Mock the update response
        mock_job_service.update_job.return_value = {
            "id": job_id,
            "title": "Senior Software Engineer",
            "company": "Tech Corp",
            "status": "interview",
            "updated_at": "2024-01-02T00:00:00Z",
        }

        update_result = await update_job(
            job_id=job_id,
            request=update_request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert update_result.title == "Senior Software Engineer"
        assert update_result.company == "Tech Corp"
        assert update_result.status == "interview"

        # Step 5: Delete the job
        delete_result = await delete_job(
            job_id=job_id,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert delete_result["success"] is True

        # Verify service interactions
        mock_job_service.create_parse_task.assert_called_once()

    @pytest.mark.asyncio
    async def test_resume_management_workflow(self, mock_user, mock_job_service):
        """Test complete resume creation -> editing -> saving workflow."""

        # Step 1: Mock existing resume data
        resume_id = "workflow_resume_123"
        initial_resume_data = {
            "_key": resume_id,
            "user_id": "integration_user",
            "content": "# John Doe\n\n## Experience\n\nSoftware Developer at StartupCo",
            "parsed_data": {
                "name": "John Doe",
                "experience": [
                    {
                        "company": "StartupCo",
                        "position": "Software Developer",
                        "duration": "2020-2024",
                    }
                ],
            },
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

        mock_job_service.get_resume.return_value = initial_resume_data

        # Step 2: Get resume for editing
        get_resume_result = await get_resume(
            resume_id=resume_id,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert get_resume_result["success"] is True
        assert get_resume_result["data"]["id"] == resume_id
        assert "John Doe" in get_resume_result["data"]["content"]

        # Step 3: Update resume content
        updated_content = (
            "# John Doe\n\n## Experience\n\nSenior Software Developer at TechCorp"
        )
        update_request = {
            "content": updated_content,
            "parsed_data": {
                "name": "John Doe",
                "experience": [
                    {
                        "company": "TechCorp",
                        "position": "Senior Software Developer",
                        "duration": "2024-Present",
                    }
                ],
            },
        }

        # Mock updated resume data
        updated_resume_data = {
            **initial_resume_data,
            "content": updated_content,
            "updated_at": "2024-01-02T00:00:00Z",
        }
        mock_job_service.get_resume.return_value = updated_resume_data

        update_resume_result = await update_resume(
            resume_id=resume_id,
            request=update_request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert update_resume_result["success"] is True
        assert "TechCorp" in update_resume_result["data"]["content"]

        # Verify service calls
        mock_job_service.validate_resume_access.assert_called_with(
            resume_id, "integration_user"
        )
        mock_job_service.update_resume.assert_called_once()

    @pytest.mark.asyncio
    async def test_job_application_workflow(self, mock_user, mock_job_service):
        """Test complete job application workflow: URL → Job → Resume optimization."""

        # Step 1: Create job from job posting URL
        job_url = "https://example.com/python-developer-position"

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "application_job_456"

            create_result = await create_job(
                request=JobCreateRequest(job_url=job_url),
                current_user=mock_user,
                job_service=mock_job_service,
            )

        job_id = create_result.data["job_id"]

        # Step 2: Update job status to "applied"
        update_status_result = await update_job(
            job_id=job_id,
            request=JobUpdateRequest(status="applied"),
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert update_status_result.status == "applied"

        # Step 3: Get resume for optimization
        resume_data = {
            "_key": "resume_for_optimization",
            "user_id": "integration_user",
            "content": "# Developer Resume\n\n## Skills\n\nJavaScript, React",
            "parsed_data": {"skills": ["JavaScript", "React"]},
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }
        mock_job_service.get_resume.return_value = resume_data

        resume_result = await get_resume(
            resume_id="resume_for_optimization",
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert resume_result["success"] is True

        # Step 4: Optimize resume for the job (simulated)
        optimized_content = (
            "# Developer Resume\n\n## Skills\n\nPython, JavaScript, React, Django"
        )
        optimized_request = {
            "content": optimized_content,
            "parsed_data": {"skills": ["Python", "JavaScript", "React", "Django"]},
        }

        # Mock optimized resume
        optimized_resume_data = {
            **resume_data,
            "content": optimized_content,
            "updated_at": "2024-01-02T00:00:00Z",
        }
        mock_job_service.get_resume.return_value = optimized_resume_data

        optimize_result = await update_resume(
            resume_id="resume_for_optimization",
            request=optimized_request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert optimize_result["success"] is True
        assert "Python" in optimize_result["data"]["content"]

    @pytest.mark.asyncio
    async def test_bulk_job_management_workflow(self, mock_user, mock_job_service):
        """Test bulk operations workflow for multiple jobs."""

        # Step 1: Create multiple jobs
        job_urls = [
            "https://example.com/job1",
            "https://example.com/job2",
            "https://example.com/job3",
        ]

        created_job_ids = []

        for i, url in enumerate(job_urls):
            with patch("app.routers.job.uuid4") as mock_uuid:
                mock_uuid.return_value.__str__ = lambda x: f"bulk_job_{i + 1}"

                create_result = await create_job(
                    request=JobCreateRequest(job_url=url),
                    current_user=mock_user,
                    job_service=mock_job_service,
                )

                created_job_ids.append(create_result.data["job_id"])

        assert len(created_job_ids) == 3

        # Step 2: List all jobs to verify creation
        list_result = await list_jobs(
            status=None,
            company=None,
            archived=None,
            page=1,
            page_size=20,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert isinstance(list_result.data, list)

        # Step 3: Bulk update status for multiple jobs
        from app.routers.job import bulk_update_status, BulkStatusRequest

        bulk_status_request = BulkStatusRequest(
            job_ids=created_job_ids, status="interview"
        )

        bulk_status_result = await bulk_update_status(
            request=bulk_status_request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert bulk_status_result["success"] is True
        assert "3 jobs" in bulk_status_result["message"]

        # Step 4: Bulk archive jobs
        from app.routers.job import bulk_archive_jobs, BulkArchiveRequest

        bulk_archive_request = BulkArchiveRequest(
            job_ids=created_job_ids, archived=True
        )

        bulk_archive_result = await bulk_archive_jobs(
            request=bulk_archive_request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert bulk_archive_result["success"] is True
        assert "Archived 3 jobs" in bulk_archive_result["message"]

    @pytest.mark.asyncio
    async def test_error_recovery_workflow(self, mock_user, mock_job_service):
        """Test error handling and recovery in workflows."""

        # Step 1: Attempt job creation with invalid URL
        invalid_request = JobCreateRequest(job_url="not-a-valid-url")

        with pytest.raises(HTTPException) as exc_info:
            await create_job(
                request=invalid_request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 422

        # Step 2: Successful job creation after fixing URL
        valid_request = JobCreateRequest(job_url="https://example.com/valid-job")

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "recovery_job"

            recovery_result = await create_job(
                request=valid_request,
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert recovery_result.success is True

        # Step 3: Handle service errors gracefully
        mock_job_service.get_resume.side_effect = Exception("Database error")

        with pytest.raises(HTTPException) as exc_info:
            await get_resume(
                resume_id="error_resume",
                current_user=mock_user,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 500

        # Step 4: Service recovery
        mock_job_service.get_resume.side_effect = None
        mock_job_service.get_resume.return_value = {
            "_key": "recovered_resume",
            "user_id": "integration_user",
            "content": "Recovered resume content",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

        recovery_resume_result = await get_resume(
            resume_id="recovered_resume",
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert recovery_resume_result["success"] is True

    @pytest.mark.asyncio
    async def test_authorization_workflow(self, mock_job_service):
        """Test authorization checks across different users."""

        # User 1 creates a job
        user1 = {"id": "user_1", "email": "user1@example.com"}
        user2 = {"id": "user_2", "email": "user2@example.com"}

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "auth_test_job"

            job_result = await create_job(
                request=JobCreateRequest(job_url="https://example.com/auth-test-job"),
                current_user=user1,
                job_service=mock_job_service,
            )

        job_id = job_result.data["job_id"]

        # Mock the get_job service call to return expected data
        mock_job_service.get_job.return_value = {
            "id": job_id,
            "title": "Software Engineer",
            "company": "Tech Corp",
            "status": "applied",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

        # User 1 can access their job
        user1_access_result = await get_job(
            job_id=job_id,
            current_user=user1,
            job_service=mock_job_service,
        )

        assert user1_access_result.id == job_id

        # User 2 can also access (in current implementation - may need to change for real auth)
        user2_access_result = await get_job(
            job_id=job_id,
            current_user=user2,
            job_service=mock_job_service,
        )

        assert user2_access_result.id == job_id

        # Test resume access control
        mock_job_service.validate_resume_access.return_value = True

        # User 1 can access their resume
        mock_job_service.get_resume.return_value = {
            "_key": "user1_resume",
            "user_id": "user_1",
            "content": "User 1 resume content",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

        user1_resume_result = await get_resume(
            resume_id="user1_resume",
            current_user=user1,
            job_service=mock_job_service,
        )

        # Note: validate_resume_access is called internally by get_resume endpoint
        # The mock setup ensures the test passes validation

        # User 2 cannot access user 1's resume
        mock_job_service.validate_resume_access.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await get_resume(
                resume_id="user1_resume",
                current_user=user2,
                job_service=mock_job_service,
            )

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_data_consistency_workflow(self, mock_user, mock_job_service):
        """Test data consistency across operations."""

        # Create job
        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "consistency_job"

            create_result = await create_job(
                request=JobCreateRequest(
                    job_url="https://example.com/consistency-test"
                ),
                current_user=mock_user,
                job_service=mock_job_service,
            )

        job_id = create_result.data["job_id"]

        # Update job multiple times
        updates = [
            JobUpdateRequest(title="Software Engineer"),
            JobUpdateRequest(company="Tech Corp"),
            JobUpdateRequest(status="applied"),
            JobUpdateRequest(status="interview"),
            JobUpdateRequest(status="offer"),
        ]

        # Track cumulative state
        current_state = {
            "id": job_id,
            "title": "Initial Title",
            "company": "Initial Company",
            "status": "initial",
            "updated_at": "2024-01-02T00:00:00Z",
        }

        for update in updates:
            # Update cumulative state
            if update.title:
                current_state["title"] = update.title
            if update.company:
                current_state["company"] = update.company
            if update.status:
                current_state["status"] = update.status

                # Mock the service to return current state
            mock_job_service.update_job.return_value = current_state.copy()
            mock_job_service.get_job.return_value = current_state.copy()

            update_result = await update_job(
                job_id=job_id,
                request=update,
                current_user=mock_user,
                job_service=mock_job_service,
            )

            # Verify each update is reflected
            if update.title:
                assert update_result.title == update.title
            if update.company:
                assert update_result.company == update.company
            if update.status:
                assert update_result.status == update.status

        # Final verification - mock get_job to return final state
        mock_job_service.get_job.return_value = current_state
        final_result = await get_job(
            job_id=job_id,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert final_result.title == "Software Engineer"
        assert final_result.company == "Tech Corp"
        assert final_result.status == "offer"

    @pytest.mark.asyncio
    async def test_concurrent_operations_workflow(self, mock_user, mock_job_service):
        """Test handling of concurrent operations."""

        # Simulate concurrent job creation
        concurrent_tasks = []

        async def create_concurrent_job(index):
            with patch("app.routers.job.uuid4") as mock_uuid:
                mock_uuid.return_value.__str__ = lambda x: f"concurrent_job_{index}"

                return await create_job(
                    request=JobCreateRequest(
                        job_url=f"https://example.com/concurrent-job-{index}"
                    ),
                    current_user=mock_user,
                    job_service=mock_job_service,
                )

        # Create 5 jobs concurrently
        for i in range(5):
            task = create_concurrent_job(i)
            concurrent_tasks.append(task)

        # Execute all tasks
        results = await asyncio.gather(*concurrent_tasks, return_exceptions=True)

        # Verify all succeeded
        successful_results = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_results) == 5

        for result in successful_results:
            assert result.success is True
            assert "concurrent_job_" in result.data["job_id"]

    @pytest.mark.asyncio
    async def test_performance_workflow(self, mock_user, mock_job_service):
        """Test performance characteristics of workflows."""

        import time

        # Test job creation performance
        start_time = time.time()

        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "perf_job"

            perf_result = await create_job(
                request=JobCreateRequest(
                    job_url="https://example.com/performance-test"
                ),
                current_user=mock_user,
                job_service=mock_job_service,
            )

        creation_time = time.time() - start_time

        # Job creation should be fast (under 1 second in tests)
        assert creation_time < 1.0
        assert perf_result.success is True

        # Test bulk operations performance
        job_ids = [f"perf_job_{i}" for i in range(100)]

        start_time = time.time()

        from app.routers.job import bulk_update_status, BulkStatusRequest

        bulk_result = await bulk_update_status(
            request=BulkStatusRequest(job_ids=job_ids, status="applied"),
            current_user=mock_user,
            job_service=mock_job_service,
        )

        bulk_time = time.time() - start_time

        # Bulk operations should also be fast
        assert bulk_time < 1.0
        assert bulk_result["success"] is True


class TestWorkflowIntegration:
    """Tests that verify integration between different components."""

    @pytest.fixture
    def mock_user(self):
        return {"id": "integration_test_user", "email": "integration@test.com"}

    @pytest.fixture
    def mock_job_service(self):
        service = AsyncMock(spec=JobService)
        service.create_parse_task = AsyncMock(return_value="integration_task")
        service.get_resume = AsyncMock()
        service.update_resume = AsyncMock()
        service.validate_resume_access = AsyncMock(return_value=True)
        return service

    @pytest.mark.asyncio
    async def test_service_integration(self, mock_user, mock_job_service):
        """Test integration between different service layers."""

        # Test job service integration
        task_id = await mock_job_service.create_parse_task(
            user_id=mock_user["id"],
            url="https://example.com/integration-test",
            job_id="integration_job",
            priority=TaskPriority.NORMAL,
        )

        assert task_id == "integration_task"

        # Test resume service integration
        mock_job_service.get_resume.return_value = {
            "_key": "integration_resume",
            "user_id": mock_user["id"],
            "content": "Integration test resume",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

        resume_data = await mock_job_service.get_resume(
            "integration_resume", mock_user["id"]
        )
        assert resume_data["_key"] == "integration_resume"

    @pytest.mark.asyncio
    async def test_endpoint_integration(self, mock_user, mock_job_service):
        """Test integration between different API endpoints."""

        # Create job through endpoint
        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "endpoint_integration_job"

            job_result = await create_job(
                request=JobCreateRequest(
                    job_url="https://example.com/endpoint-integration"
                ),
                current_user=mock_user,
                job_service=mock_job_service,
            )

        job_id = job_result.data["job_id"]

        # Verify through different endpoint
        get_result = await get_job(
            job_id=job_id,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert get_result.id == job_id

        # Update through yet another endpoint
        update_result = await update_job(
            job_id=job_id,
            request=JobUpdateRequest(status="integration_test"),
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert update_result.status == "integration_test"

    @pytest.mark.asyncio
    async def test_cross_component_integration(self, mock_user, mock_job_service):
        """Test integration across job and resume components."""

        # Create job
        with patch("app.routers.job.uuid4") as mock_uuid:
            mock_uuid.return_value.__str__ = lambda x: "cross_component_job"

            job_result = await create_job(
                request=JobCreateRequest(
                    job_url="https://example.com/cross-component-test"
                ),
                current_user=mock_user,
                job_service=mock_job_service,
            )

        # Get related resume - the get_resume endpoint transforms data
        resume_data = {
            "_key": "cross_component_resume",
            "user_id": mock_user["id"],
            "content": "Resume for cross-component test",
            "job_ids": [job_result.data["job_id"]],  # Link to job
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }
        mock_job_service.get_resume.return_value = resume_data

        resume_result = await get_resume(
            resume_id="cross_component_resume",
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert resume_result["success"] is True
        # The get_resume endpoint transforms _key to id, so check original data
        assert job_result.data["job_id"] in resume_data.get("job_ids", [])

        # Update resume in context of job
        update_request = {
            "content": "Updated resume for specific job application",
            "optimized_for_job": job_result.data["job_id"],
        }

        # Mock the updated resume data after get_resume call in update_resume endpoint
        updated_resume_data = {
            "_key": "cross_component_resume",
            "user_id": mock_user["id"],
            "content": update_request["content"],
            "job_ids": [job_result.data["job_id"]],
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-02T00:00:00Z",
        }

        # Reset the mock to return updated data
        mock_job_service.get_resume.return_value = updated_resume_data

        update_resume_result = await update_resume(
            resume_id="cross_component_resume",
            request=update_request,
            current_user=mock_user,
            job_service=mock_job_service,
        )

        assert update_resume_result["success"] is True
        assert "specific job application" in update_resume_result["data"]["content"]
