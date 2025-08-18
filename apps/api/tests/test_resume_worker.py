"""Tests for resume parsing worker functionality."""

import base64
import json
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

import pytest

from app.queue.redis_queue import RedisQueue
from app.schema.resume import Resume
from app.workers.base import TaskError, TaskErrorType
from app.workers.resume_parser import ResumeParseWorker


class TestResumeParseWorker:
    """Test cases for the ResumeParseWorker class."""

    @pytest.fixture
    def mock_redis_queue(self):
        """Mock Redis queue."""
        mock_queue = Mock(spec=RedisQueue)
        mock_queue.high_queue_key = "test:queue:high"
        mock_queue.normal_queue_key = "test:queue:normal"
        mock_queue.low_queue_key = "test:queue:low"
        mock_queue.update_progress = AsyncMock()
        return mock_queue

    @pytest.fixture
    def worker(self, mock_redis_queue):
        """Create ResumeParseWorker instance."""
        return ResumeParseWorker(
            redis_queue=mock_redis_queue,
            concurrency=1,
            timeout_seconds=300,
        )

    @pytest.fixture
    def base_task_data(self):
        """Base task data structure."""
        file_content = b"Sample resume content"
        encoded_content = base64.b64encode(file_content).decode("utf-8")

        return {
            "id": "task_123",
            "task_type": "parse_resume",
            "user_id": "user_123",
            "payload": {
                "resume_id": "resume_123",
                "user_id": "user_123",
                "file_data": {
                    "content": encoded_content,
                    "filename": "test_resume.pdf",
                    "content_type": "application/pdf",
                    "size": len(file_content),
                },
            },
            "started_at": "2024-01-01T00:00:00Z",
        }

    @pytest.fixture
    def mock_resume_data(self):
        """Mock parsed resume data."""
        return {
            "contact_info": {
                "full_name": "John Doe",
                "email": "john@example.com",
                "phone": "+1-555-0123",
                "address": "123 Main St, City, State 12345",
                "links": [
                    {"name": "LinkedIn", "url": "https://linkedin.com/in/johndoe"}
                ],
            },
            "summary": "Experienced software developer with 5+ years of experience",
            "work_experience": [
                {
                    "company": "Tech Corp",
                    "position": "Senior Developer",
                    "start_date": "2020-01",
                    "end_date": "2024-01",
                    "is_current": False,
                    "description": "Developed web applications",
                    "responsibilities": ["Code development", "Team leadership"],
                    "skills": ["Python", "JavaScript"],
                }
            ],
            "education": [
                {
                    "institution": "University of Tech",
                    "degree": "Bachelor of Science",
                    "field_of_study": "Computer Science",
                    "graduation_date": "2019-06",
                    "gpa": 3.8,
                    "honors": ["Magna Cum Laude"],
                    "relevant_courses": ["Data Structures", "Algorithms"],
                    "skills": ["Java", "C++"],
                }
            ],
            "certifications": [
                {
                    "name": "AWS Certified Developer",
                    "issuer": "Amazon Web Services",
                    "date_obtained": "2023-01",
                    "expiration_date": "2026-01",
                    "credential_id": "AWS123456",
                }
            ],
            "skills": ["Python", "JavaScript", "AWS", "Docker"],
        }

    def test_worker_initialization(self, mock_redis_queue):
        """Test worker initialization."""
        worker = ResumeParseWorker(mock_redis_queue, concurrency=2, timeout_seconds=600)

        assert worker.redis_queue == mock_redis_queue
        assert worker.concurrency == 2
        assert worker.timeout_seconds == 600
        assert "ResumeParseWorker" in worker.worker_id

    def test_get_queue_names(self, worker):
        """Test queue names configuration."""
        queue_names = worker.get_queue_names()

        expected_queues = [
            "test:queue:high",
            "test:queue:normal",
            "test:queue:low",
        ]
        assert queue_names == expected_queues

    def test_get_task_types(self, worker):
        """Test supported task types."""
        task_types = worker.get_task_types()
        assert task_types == ["parse_resume"]

    @pytest.mark.asyncio
    async def test_execute_task_success(self, worker, base_task_data, mock_resume_data):
        """Test successful resume parsing."""
        with (
            patch("app.workers.resume_parser.partition") as mock_partition,
            patch("app.workers.resume_parser.Runner.run") as mock_runner,
            patch("app.workers.resume_parser.get_arango_client") as mock_arango,
        ):
            # Mock unstructured partition
            mock_elements = [Mock(), Mock()]
            mock_elements[0].__str__ = Mock(return_value="Line 1")
            mock_elements[1].__str__ = Mock(return_value="Line 2")
            mock_partition.return_value = mock_elements

            # Mock AI agent response
            mock_result = Mock()
            mock_result.final_output = mock_resume_data
            mock_runner.return_value = mock_result

            # Mock ArangoDB
            mock_db = Mock()
            mock_collection = Mock()
            mock_db.collection.return_value = mock_collection
            mock_arango.return_value = mock_db

            # Execute task
            result = await worker.execute_task(base_task_data)

            # Verify result structure
            assert result["resume_id"] == "resume_123"
            assert result["user_id"] == "user_123"
            assert result["status"] == "completed"
            assert "resume_data" in result
            assert "file_metadata" in result

            # Verify file metadata
            file_meta = result["file_metadata"]
            assert file_meta["filename"] == "test_resume.pdf"
            assert file_meta["content_type"] == "application/pdf"
            assert file_meta["size"] > 0

            # Verify resume data validation
            Resume.model_validate(result["resume_data"])

            # Verify ArangoDB storage
            mock_collection.insert.assert_called_once()
            insert_call = mock_collection.insert.call_args[0][0]
            assert insert_call["_key"] == "resume_123"
            assert insert_call["user_id"] == "user_123"
            assert insert_call["status"] == "parsed"

            # Verify progress updates
            assert worker.redis_queue.update_progress.call_count >= 5

    @pytest.mark.asyncio
    async def test_execute_task_decode_error(self, worker, base_task_data):
        """Test handling of file decode errors."""
        # Corrupt the base64 content
        base_task_data["payload"]["file_data"]["content"] = "invalid_base64!"

        with pytest.raises(TaskError) as exc_info:
            await worker.execute_task(base_task_data)

        assert exc_info.value.error_type == TaskErrorType.PERMANENT
        assert "Failed to decode file content" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_unstructured_error(self, worker, base_task_data):
        """Test handling of unstructured parsing errors."""
        with patch("app.workers.resume_parser.partition") as mock_partition:
            mock_partition.side_effect = Exception("Unstructured parsing failed")

            with pytest.raises(TaskError) as exc_info:
                await worker.execute_task(base_task_data)

            assert exc_info.value.error_type == TaskErrorType.PERMANENT
            assert "Failed to extract text from document" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_empty_content(self, worker, base_task_data):
        """Test handling of documents with no extractable text."""
        with patch("app.workers.resume_parser.partition") as mock_partition:
            mock_partition.return_value = []  # No elements extracted

            with pytest.raises(TaskError) as exc_info:
                await worker.execute_task(base_task_data)

            assert exc_info.value.error_type == TaskErrorType.PERMANENT
            assert "No text content could be extracted" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_ai_agent_error(self, worker, base_task_data):
        """Test handling of AI agent processing errors."""
        with (
            patch("app.workers.resume_parser.partition") as mock_partition,
            patch("app.workers.resume_parser.Runner.run") as mock_runner,
        ):
            # Mock successful text extraction
            mock_elements = [Mock()]
            mock_elements[0].__str__ = Mock(return_value="Sample text")
            mock_partition.return_value = mock_elements

            # Mock AI agent failure
            mock_runner.side_effect = Exception("AI processing failed")

            with pytest.raises(TaskError) as exc_info:
                await worker.execute_task(base_task_data)

            assert exc_info.value.error_type == TaskErrorType.TRANSIENT
            assert "AI processing failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_ai_rate_limit(self, worker, base_task_data):
        """Test handling of AI rate limit errors."""
        with (
            patch("app.workers.resume_parser.partition") as mock_partition,
            patch("app.workers.resume_parser.Runner.run") as mock_runner,
        ):
            # Mock successful text extraction
            mock_elements = [Mock()]
            mock_elements[0].__str__ = Mock(return_value="Sample text")
            mock_partition.return_value = mock_elements

            # Mock rate limit error
            mock_runner.side_effect = Exception("Rate limit exceeded")

            with pytest.raises(TaskError) as exc_info:
                await worker.execute_task(base_task_data)

            assert exc_info.value.error_type == TaskErrorType.RATE_LIMITED
            assert "AI processing temporarily unavailable" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_ai_empty_result(self, worker, base_task_data):
        """Test handling of empty AI agent results."""
        with (
            patch("app.workers.resume_parser.partition") as mock_partition,
            patch("app.workers.resume_parser.Runner.run") as mock_runner,
        ):
            # Mock successful text extraction
            mock_elements = [Mock()]
            mock_elements[0].__str__ = Mock(return_value="Sample text")
            mock_partition.return_value = mock_elements

            # Mock empty AI result
            mock_runner.return_value = None

            with pytest.raises(TaskError) as exc_info:
                await worker.execute_task(base_task_data)

            assert exc_info.value.error_type == TaskErrorType.TRANSIENT
            assert "AI agent returned empty or invalid result" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_validation_error(self, worker, base_task_data):
        """Test handling of resume data validation errors."""
        with (
            patch("app.workers.resume_parser.partition") as mock_partition,
            patch("app.workers.resume_parser.Runner.run") as mock_runner,
        ):
            # Mock successful text extraction
            mock_elements = [Mock()]
            mock_elements[0].__str__ = Mock(return_value="Sample text")
            mock_partition.return_value = mock_elements

            # Mock AI result with invalid data
            mock_result = Mock()
            mock_result.final_output = {"invalid": "data"}  # Missing required fields
            mock_runner.return_value = mock_result

            with pytest.raises(TaskError) as exc_info:
                await worker.execute_task(base_task_data)

            assert exc_info.value.error_type == TaskErrorType.TRANSIENT
            assert "Parsed resume data validation failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_arango_error(
        self, worker, base_task_data, mock_resume_data
    ):
        """Test handling of ArangoDB storage errors."""
        with (
            patch("app.workers.resume_parser.partition") as mock_partition,
            patch("app.workers.resume_parser.Runner.run") as mock_runner,
            patch("app.workers.resume_parser.get_arango_client") as mock_arango,
        ):
            # Mock successful processing up to storage
            mock_elements = [Mock()]
            mock_elements[0].__str__ = Mock(return_value="Sample text")
            mock_partition.return_value = mock_elements

            mock_result = Mock()
            mock_result.final_output = mock_resume_data
            mock_runner.return_value = mock_result

            # Mock ArangoDB failure
            mock_db = Mock()
            mock_collection = Mock()
            mock_collection.insert.side_effect = Exception("Database error")
            mock_db.collection.return_value = mock_collection
            mock_arango.return_value = mock_db

            with pytest.raises(TaskError) as exc_info:
                await worker.execute_task(base_task_data)

            assert exc_info.value.error_type == TaskErrorType.TRANSIENT
            assert "Failed to store resume data" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_unexpected_error(self, worker, base_task_data):
        """Test handling of unexpected errors."""
        with patch("app.workers.resume_parser.partition") as mock_partition:
            # Mock unexpected error during processing
            mock_partition.side_effect = RuntimeError("Unexpected system error")

            with pytest.raises(TaskError) as exc_info:
                await worker.execute_task(base_task_data)

            # This is caught as an unstructured parsing error (permanent)
            assert exc_info.value.error_type == TaskErrorType.PERMANENT
            assert "Failed to extract text from document" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_progress_updates(
        self, worker, base_task_data, mock_resume_data
    ):
        """Test that progress updates are called at appropriate stages."""
        with (
            patch("app.workers.resume_parser.partition") as mock_partition,
            patch("app.workers.resume_parser.Runner.run") as mock_runner,
            patch("app.workers.resume_parser.get_arango_client") as mock_arango,
            patch("app.workers.resume_parser.get_postgres_pool") as mock_postgres,
        ):
            # Mock successful processing
            mock_elements = [Mock()]
            mock_elements[0].__str__ = Mock(return_value="Sample text")
            mock_partition.return_value = mock_elements

            mock_result = Mock()
            mock_result.final_output = mock_resume_data
            mock_runner.return_value = mock_result

            mock_db = Mock()
            mock_collection = Mock()
            mock_db.collection.return_value = mock_collection
            mock_arango.return_value = mock_db

            # Mock PostgreSQL pool and connection
            mock_pool = Mock()
            mock_conn = Mock()
            mock_cursor = Mock()

            # Configure mocks for async context managers
            mock_pool.connection.return_value.__aenter__ = AsyncMock(
                return_value=mock_conn
            )
            mock_pool.connection.return_value.__aexit__ = AsyncMock(return_value=None)
            mock_conn.transaction.return_value.__aenter__ = AsyncMock(
                return_value=mock_conn
            )
            mock_conn.transaction.return_value.__aexit__ = AsyncMock(return_value=None)
            mock_conn.cursor.return_value.__aenter__ = AsyncMock(
                return_value=mock_cursor
            )
            mock_conn.cursor.return_value.__aexit__ = AsyncMock(return_value=None)

            # Mock cursor operations
            mock_cursor.execute = AsyncMock()
            mock_cursor.fetchone = AsyncMock(
                return_value=("user_123",)
            )  # Profile exists

            mock_postgres.return_value = mock_pool

            await worker.execute_task(base_task_data)

            # Verify progress updates were called
            progress_calls = worker.redis_queue.update_progress.call_args_list
            assert len(progress_calls) == 7  # Updated to include user profile update

            # Check progress sequence
            task_id = "task_123"
            expected_updates = [
                (task_id, 10, "Extracting file content"),
                (task_id, 20, "Processing document with unstructured"),
                (task_id, 50, "Processing with AI agent"),
                (task_id, 70, "Validating parsed data"),
                (task_id, 80, "Storing resume data"),
                (task_id, 90, "Updating user profile"),
                (task_id, 100, "Resume parsing completed"),
            ]

            for i, expected in enumerate(expected_updates):
                actual_call = progress_calls[i]
                assert actual_call[0] == expected

    @pytest.mark.asyncio
    async def test_execute_task_file_metadata_preservation(
        self, worker, base_task_data, mock_resume_data
    ):
        """Test that file metadata is preserved in the result."""
        with (
            patch("app.workers.resume_parser.partition") as mock_partition,
            patch("app.workers.resume_parser.Runner.run") as mock_runner,
            patch("app.workers.resume_parser.get_arango_client") as mock_arango,
        ):
            # Mock successful processing
            mock_elements = [Mock()]
            mock_elements[0].__str__ = Mock(return_value="Sample text")
            mock_partition.return_value = mock_elements

            mock_result = Mock()
            mock_result.final_output = mock_resume_data
            mock_runner.return_value = mock_result

            mock_db = Mock()
            mock_collection = Mock()
            mock_db.collection.return_value = mock_collection
            mock_arango.return_value = mock_db

            result = await worker.execute_task(base_task_data)

            # Verify file metadata in result
            file_metadata = result["file_metadata"]
            original_file_data = base_task_data["payload"]["file_data"]

            assert file_metadata["filename"] == original_file_data["filename"]
            assert file_metadata["content_type"] == original_file_data["content_type"]
            assert file_metadata["size"] == original_file_data["size"]

    @pytest.mark.asyncio
    async def test_execute_task_arango_document_structure(
        self, worker, base_task_data, mock_resume_data
    ):
        """Test that ArangoDB document has correct structure."""
        with (
            patch("app.workers.resume_parser.partition") as mock_partition,
            patch("app.workers.resume_parser.Runner.run") as mock_runner,
            patch("app.workers.resume_parser.get_arango_client") as mock_arango,
        ):
            # Mock successful processing
            mock_elements = [Mock()]
            mock_elements[0].__str__ = Mock(return_value="Sample text")
            mock_partition.return_value = mock_elements

            mock_result = Mock()
            mock_result.final_output = mock_resume_data
            mock_runner.return_value = mock_result

            mock_db = Mock()
            mock_collection = Mock()
            mock_db.collection.return_value = mock_collection
            mock_arango.return_value = mock_db

            await worker.execute_task(base_task_data)

            # Check the document structure passed to ArangoDB
            insert_call = mock_collection.insert.call_args[0][0]

            required_fields = [
                "_key",
                "user_id",
                "file_metadata",
                "resume_data",
                "status",
                "task_id",
            ]

            for field in required_fields:
                assert field in insert_call

            assert insert_call["_key"] == "resume_123"
            assert insert_call["user_id"] == "user_123"
            assert insert_call["status"] == "parsed"
            assert insert_call["task_id"] == "task_123"
            assert insert_call["resume_data"] == mock_resume_data

    @pytest.mark.asyncio
    async def test_worker_health_check(self, worker):
        """Test worker health check functionality."""
        health = await worker.health_check()

        assert health["worker_id"] == worker.worker_id
        assert health["status"] == "stopped"  # Not running yet
        assert health["concurrency"] == 1
        assert health["supported_types"] == ["parse_resume"]
        assert health["timeout_seconds"] == 300

    def test_worker_repr(self, worker):
        """Test worker string representation."""
        repr_str = repr(worker)
        assert "ResumeParseWorker" in repr_str
        assert worker.worker_id in repr_str
        assert "concurrency=1" in repr_str
        assert "running=False" in repr_str
