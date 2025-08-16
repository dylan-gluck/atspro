"""Tests for job parsing worker."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

# Mock problematic imports before importing the worker
with patch.dict(
    "sys.modules",
    {
        "psycopg_pool": MagicMock(),
        "redis.asyncio": MagicMock(),
        "arango": MagicMock(),
    },
):
    from app.workers.job_parser import JobParseWorker
    from app.workers.base import TaskError, TaskErrorType
    from app.schema.job import Job
    from app.services.job_service import JobService


class TestJobParseWorker:
    """Test cases for JobParseWorker."""

    @pytest.fixture
    def mock_redis_queue(self):
        """Mock Redis queue."""
        queue = AsyncMock()
        queue.high_queue_key = "atspro:queue:high"
        queue.normal_queue_key = "atspro:queue:normal"
        queue.low_queue_key = "atspro:queue:low"
        return queue

    @pytest.fixture
    def job_worker(self, mock_redis_queue):
        """Job parsing worker instance."""
        return JobParseWorker(mock_redis_queue, concurrency=1, timeout_seconds=300)

    @pytest.fixture
    def mock_job_service(self):
        """Mock job service."""
        service = AsyncMock(spec=JobService)
        service.update_job_status = AsyncMock()
        service.store_job_result = AsyncMock(return_value="job_123")
        return service

    @pytest.fixture
    def valid_task_data(self):
        """Valid task data for job parsing."""
        return {
            "id": "task_123",
            "task_type": "parse_job",
            "payload": {
                "url": "https://example.com/job/123",
                "job_id": "job_456",
                "user_id": "user_789",
                "created_at": datetime.utcnow().isoformat(),
            },
        }

    @pytest.fixture
    def sample_job_data(self):
        """Sample job data returned from agent."""
        return {
            "company": "Tech Corp",
            "title": "Software Engineer",
            "description": "Build amazing software",
            "salary": "$100,000 - $120,000",
            "responsibilities": ["Write code", "Review code"],
            "qualifications": ["Python", "JavaScript"],
            "logistics": ["Remote work", "Flexible hours"],
            "location": ["San Francisco", "Remote"],
            "additional_info": ["Stock options"],
            "link": "https://example.com/job/123",
        }

    def test_get_queue_names(self, job_worker):
        """Test worker returns correct queue names."""
        queue_names = job_worker.get_queue_names()
        expected = [
            "atspro:queue:high",
            "atspro:queue:normal",
            "atspro:queue:low",
        ]
        assert queue_names == expected

    def test_get_task_types(self, job_worker):
        """Test worker returns correct task types."""
        task_types = job_worker.get_task_types()
        assert task_types == ["parse_job"]

    @pytest.mark.asyncio
    async def test_execute_task_success(
        self, job_worker, mock_job_service, valid_task_data, sample_job_data
    ):
        """Test successful job parsing execution."""
        # Set up mocks
        job_worker.job_service = mock_job_service

        with (
            patch("app.workers.job_parser.fetch") as mock_fetch,
            patch("app.workers.job_parser.Runner.run") as mock_runner,
        ):
            # Mock HTML fetch
            mock_fetch.return_value = "<html>Job posting content</html>"

            # Mock OpenAI agent response
            mock_result = MagicMock()
            mock_result.final_output = sample_job_data
            mock_runner.return_value = mock_result

            # Mock progress updates
            job_worker.update_progress = AsyncMock()

            # Execute task
            result = await job_worker.execute_task(valid_task_data)

        # Verify fetch was called
        mock_fetch.assert_called_once_with("https://example.com/job/123")

        # Verify OpenAI agent was called
        mock_runner.assert_called_once()

        # Verify progress updates
        assert job_worker.update_progress.call_count >= 3

        # Verify job service calls
        mock_job_service.store_job_result.assert_called_once()
        store_call = mock_job_service.store_job_result.call_args
        assert store_call.kwargs["task_id"] == "task_123"
        assert store_call.kwargs["job_id"] == "job_456"
        assert store_call.kwargs["user_id"] == "user_789"

        # Verify result structure
        assert result["job_id"] == "job_456"
        assert result["url"] == "https://example.com/job/123"
        assert result["status"] == "completed"
        assert "job_data" in result
        assert result["job_data"]["source_url"] == "https://example.com/job/123"

    @pytest.mark.asyncio
    async def test_execute_task_missing_url(self, job_worker, mock_job_service):
        """Test execution with missing URL in payload."""
        task_data = {
            "id": "task_123",
            "task_type": "parse_job",
            "payload": {
                "job_id": "job_456",
                "user_id": "user_789",
            },
        }

        job_worker.job_service = mock_job_service

        with pytest.raises(TaskError) as exc_info:
            await job_worker.execute_task(task_data)

        assert exc_info.value.error_type == TaskErrorType.PERMANENT
        assert "Missing URL" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_missing_job_id(self, job_worker, mock_job_service):
        """Test execution with missing job_id in payload."""
        task_data = {
            "id": "task_123",
            "task_type": "parse_job",
            "payload": {
                "url": "https://example.com/job/123",
                "user_id": "user_789",
            },
        }

        job_worker.job_service = mock_job_service

        with pytest.raises(TaskError) as exc_info:
            await job_worker.execute_task(task_data)

        assert exc_info.value.error_type == TaskErrorType.PERMANENT
        assert "Missing job_id" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_fetch_error_timeout(
        self, job_worker, mock_job_service, valid_task_data
    ):
        """Test execution with fetch timeout error."""
        job_worker.job_service = mock_job_service
        job_worker.update_progress = AsyncMock()

        with patch("app.workers.job_parser.fetch") as mock_fetch:
            mock_fetch.side_effect = Exception("Request timeout")

            with pytest.raises(TaskError) as exc_info:
                await job_worker.execute_task(valid_task_data)

        assert exc_info.value.error_type == TaskErrorType.TRANSIENT
        assert "timeout" in str(exc_info.value).lower()

        # Verify job status was updated
        mock_job_service.update_job_status.assert_called_once_with(
            "job_456",
            "failed",
            "Failed to fetch URL https://example.com/job/123: Request timeout",
        )

    @pytest.mark.asyncio
    async def test_execute_task_fetch_error_permanent(
        self, job_worker, mock_job_service, valid_task_data
    ):
        """Test execution with permanent fetch error."""
        job_worker.job_service = mock_job_service
        job_worker.update_progress = AsyncMock()

        with patch("app.workers.job_parser.fetch") as mock_fetch:
            mock_fetch.side_effect = Exception("404 Not Found")

            with pytest.raises(TaskError) as exc_info:
                await job_worker.execute_task(valid_task_data)

        assert exc_info.value.error_type == TaskErrorType.PERMANENT
        assert "404 Not Found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_parsing_error(
        self, job_worker, mock_job_service, valid_task_data
    ):
        """Test execution with AI parsing error."""
        job_worker.job_service = mock_job_service
        job_worker.update_progress = AsyncMock()

        with (
            patch("app.workers.job_parser.fetch") as mock_fetch,
            patch("app.workers.job_parser.Runner.run") as mock_runner,
        ):
            mock_fetch.return_value = "<html>Content</html>"
            mock_runner.side_effect = Exception("OpenAI API error")

            with pytest.raises(TaskError) as exc_info:
                await job_worker.execute_task(valid_task_data)

        assert exc_info.value.error_type == TaskErrorType.PERMANENT
        assert "Failed to parse job content" in str(exc_info.value)

        # Verify job status was updated
        mock_job_service.update_job_status.assert_called_once_with(
            "job_456", "failed", "Failed to parse job content: OpenAI API error"
        )

    @pytest.mark.asyncio
    async def test_execute_task_validation_error(
        self, job_worker, mock_job_service, valid_task_data
    ):
        """Test execution with Pydantic validation error."""
        job_worker.job_service = mock_job_service
        job_worker.update_progress = AsyncMock()

        # Invalid job data (missing required fields)
        invalid_job_data = {"company": "Tech Corp"}  # Missing required fields

        with (
            patch("app.workers.job_parser.fetch") as mock_fetch,
            patch("app.workers.job_parser.Runner.run") as mock_runner,
        ):
            mock_fetch.return_value = "<html>Content</html>"
            mock_result = MagicMock()
            mock_result.final_output = invalid_job_data
            mock_runner.return_value = mock_result

            with pytest.raises(TaskError) as exc_info:
                await job_worker.execute_task(valid_task_data)

        assert exc_info.value.error_type == TaskErrorType.PERMANENT
        assert "Failed to parse job content" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_storage_error(
        self, job_worker, mock_job_service, valid_task_data, sample_job_data
    ):
        """Test execution with storage error."""
        job_worker.job_service = mock_job_service
        job_worker.update_progress = AsyncMock()

        # Mock storage to fail
        mock_job_service.store_job_result.side_effect = Exception("Database error")

        with (
            patch("app.workers.job_parser.fetch") as mock_fetch,
            patch("app.workers.job_parser.Runner.run") as mock_runner,
        ):
            mock_fetch.return_value = "<html>Content</html>"
            mock_result = MagicMock()
            mock_result.final_output = sample_job_data
            mock_runner.return_value = mock_result

            with pytest.raises(TaskError) as exc_info:
                await job_worker.execute_task(valid_task_data)

        assert exc_info.value.error_type == TaskErrorType.TRANSIENT
        assert "Failed to store job data" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_unexpected_error(
        self, job_worker, mock_job_service, valid_task_data
    ):
        """Test execution with unexpected error."""
        job_worker.job_service = mock_job_service
        job_worker.update_progress = AsyncMock()

        with patch("app.workers.job_parser.fetch") as mock_fetch:
            mock_fetch.side_effect = RuntimeError("Unexpected error")

            with pytest.raises(TaskError) as exc_info:
                await job_worker.execute_task(valid_task_data)

        assert exc_info.value.error_type == TaskErrorType.TRANSIENT
        assert "Unexpected error during job parsing" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_initializes_job_service(
        self, job_worker, valid_task_data, sample_job_data
    ):
        """Test that job service is initialized if not present."""
        # Ensure job_service is None
        job_worker.job_service = None
        job_worker.update_progress = AsyncMock()

        with (
            patch("app.workers.job_parser.fetch") as mock_fetch,
            patch("app.workers.job_parser.Runner.run") as mock_runner,
            patch("app.workers.job_parser.TaskService") as mock_task_service_class,
            patch("app.workers.job_parser.JobService") as mock_job_service_class,
        ):
            # Set up mocks
            mock_fetch.return_value = "<html>Content</html>"
            mock_result = MagicMock()
            mock_result.final_output = sample_job_data
            mock_runner.return_value = mock_result

            # Mock task service
            mock_task_service = AsyncMock()
            mock_task_service.startup = AsyncMock()
            mock_task_service_class.return_value = mock_task_service

            # Mock job service
            mock_job_service = AsyncMock()
            mock_job_service.store_job_result = AsyncMock(return_value="job_123")
            mock_job_service_class.return_value = mock_job_service

            # Execute task
            result = await job_worker.execute_task(valid_task_data)

            # Verify services were initialized
            mock_task_service.startup.assert_called_once()
            mock_job_service_class.assert_called_once_with(mock_task_service)

            # Verify job_service was set
            assert job_worker.job_service == mock_job_service

            # Verify result is correct
            assert result["status"] == "completed"

    @pytest.mark.asyncio
    async def test_health_check(self, job_worker):
        """Test worker health check."""
        # Mock the base health check
        with patch.object(
            job_worker, "health_check", wraps=job_worker.health_check
        ) as mock_base:
            # Mock the super().health_check() call to return base health info
            with patch(
                "app.workers.job_parser.BaseWorker.health_check"
            ) as mock_super_health:
                mock_super_health.return_value = {
                    "worker_id": "JobParseWorker_abc123",
                    "status": "running",
                    "concurrency": 1,
                    "active_tasks": 0,
                    "total_tasks": 0,
                    "supported_types": ["parse_job"],
                    "queue_names": [
                        "atspro:queue:high",
                        "atspro:queue:normal",
                        "atspro:queue:low",
                    ],
                    "timeout_seconds": 300,
                }

                health = await job_worker.health_check()

        # Verify base health info is included
        assert health["worker_id"] == "JobParseWorker_abc123"
        assert health["status"] == "running"
        assert health["supported_types"] == ["parse_job"]

        # Verify job-specific health info is added
        assert health["worker_type"] == "job_parser"
        assert health["supported_urls"] == ["http://", "https://"]
        assert health["ai_agent"] == "job_agent"
        assert health["estimated_duration_ms"] == 30000

    @pytest.mark.asyncio
    async def test_execute_task_with_connection_error(
        self, job_worker, mock_job_service, valid_task_data
    ):
        """Test execution with connection error (should be retryable)."""
        job_worker.job_service = mock_job_service
        job_worker.update_progress = AsyncMock()

        with patch("app.workers.job_parser.fetch") as mock_fetch:
            mock_fetch.side_effect = Exception("Connection refused")

            with pytest.raises(TaskError) as exc_info:
                await job_worker.execute_task(valid_task_data)

        assert exc_info.value.error_type == TaskErrorType.TRANSIENT
        assert "connection" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_execute_task_progress_updates(
        self, job_worker, mock_job_service, valid_task_data, sample_job_data
    ):
        """Test that progress updates are called at correct stages."""
        job_worker.job_service = mock_job_service
        job_worker.update_progress = AsyncMock()

        with (
            patch("app.workers.job_parser.fetch") as mock_fetch,
            patch("app.workers.job_parser.Runner.run") as mock_runner,
        ):
            mock_fetch.return_value = "<html>Content</html>"
            mock_result = MagicMock()
            mock_result.final_output = sample_job_data
            mock_runner.return_value = mock_result

            await job_worker.execute_task(valid_task_data)

        # Verify progress was updated at key stages
        progress_calls = job_worker.update_progress.call_args_list
        assert len(progress_calls) >= 4  # At least 4 progress updates

        # Check specific progress stages
        progress_values = [
            call[0][1] for call in progress_calls
        ]  # Extract progress values
        assert 10 in progress_values  # Fetching HTML
        assert 30 in progress_values  # Parsing with AI
        assert 80 in progress_values  # Storing data
        assert 100 in progress_values  # Completion

    @pytest.mark.asyncio
    async def test_execute_task_adds_source_url(
        self, job_worker, mock_job_service, valid_task_data, sample_job_data
    ):
        """Test that source URL is added to parsed job data."""
        job_worker.job_service = mock_job_service
        job_worker.update_progress = AsyncMock()

        with (
            patch("app.workers.job_parser.fetch") as mock_fetch,
            patch("app.workers.job_parser.Runner.run") as mock_runner,
        ):
            mock_fetch.return_value = "<html>Content</html>"
            mock_result = MagicMock()
            mock_result.final_output = sample_job_data
            mock_runner.return_value = mock_result

            result = await job_worker.execute_task(valid_task_data)

        # Verify source URL was added to job data
        assert result["job_data"]["source_url"] == "https://example.com/job/123"

        # Verify it was passed to store_job_result
        store_call = mock_job_service.store_job_result.call_args
        stored_job_data = store_call.kwargs["job_data"]
        assert stored_job_data["source_url"] == "https://example.com/job/123"
