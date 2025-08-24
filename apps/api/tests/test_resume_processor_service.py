"""Tests for resume processor service."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schema.resume import Resume
from app.services.resume_processor import (
    AIProcessingError,
    FileProcessingError,
    ResumeProcessorService,
    StorageError,
    ValidationError,
    process_resume_synchronously,
)


@pytest.fixture
def processor_service():
    """Create a ResumeProcessorService instance for testing."""
    return ResumeProcessorService()


@pytest.fixture
def sample_resume_data():
    """Sample resume data for testing."""
    return {
        "contact_info": {
            "full_name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+1-555-123-4567",
            "address": "123 Main St, City, State 12345",
            "links": [],
        },
        "summary": "Experienced software developer",
        "work_experience": [],
        "education": [],
        "certifications": [],
        "skills": ["Python", "JavaScript"],
    }


@pytest.fixture
def sample_file_content():
    """Sample file content for testing."""
    return b"Sample resume content here."


class TestResumeProcessorService:
    """Test cases for ResumeProcessorService."""

    def test_init(self, processor_service):
        """Test service initialization."""
        assert processor_service.timeout_seconds == 60
        assert processor_service.max_retries == 3
        assert processor_service.base_delay == 1.0

    @patch("app.services.resume_processor.partition")
    async def test_extract_text_from_file_success(
        self, mock_partition, processor_service, sample_file_content
    ):
        """Test successful text extraction from file."""
        # Mock unstructured partition response
        mock_elements = [MagicMock(), MagicMock()]
        mock_elements[0].__str__ = lambda x: "First line"
        mock_elements[1].__str__ = lambda x: "Second line"
        mock_partition.return_value = mock_elements

        result = await processor_service._extract_text_from_file(
            sample_file_content, "test.pdf"
        )

        assert result == "First line\\nSecond line"
        mock_partition.assert_called_once()

    @patch("app.services.resume_processor.partition")
    async def test_extract_text_from_file_empty_content(
        self, mock_partition, processor_service, sample_file_content
    ):
        """Test text extraction when no content is extracted."""
        mock_partition.return_value = []

        with pytest.raises(
            FileProcessingError, match="No text content could be extracted"
        ):
            await processor_service._extract_text_from_file(
                sample_file_content, "test.pdf"
            )

    @patch("app.services.resume_processor.partition")
    async def test_extract_text_from_file_exception(
        self, mock_partition, processor_service, sample_file_content
    ):
        """Test text extraction when partition fails."""
        mock_partition.side_effect = Exception("Partition failed")

        with pytest.raises(
            FileProcessingError, match="Failed to extract text from file"
        ):
            await processor_service._extract_text_from_file(
                sample_file_content, "test.pdf"
            )

    @patch("app.services.resume_processor.Runner")
    async def test_process_with_ai_agent_success(
        self, mock_runner, processor_service, sample_resume_data
    ):
        """Test successful AI agent processing."""
        # Mock successful AI response - async function needs AsyncMock
        mock_result = MagicMock()
        mock_result.final_output = sample_resume_data
        mock_runner.run = AsyncMock(return_value=mock_result)

        result = await processor_service._process_with_ai_agent(
            "test content", "resume-123"
        )

        assert result == sample_resume_data
        mock_runner.run.assert_called_once()

    @patch("app.services.resume_processor.Runner")
    @patch("app.services.resume_processor.asyncio.sleep")
    async def test_process_with_ai_agent_timeout_retry(
        self, mock_sleep, mock_runner, processor_service
    ):
        """Test AI agent processing with timeout and retry."""
        # Mock timeout on first two attempts, success on third
        mock_result = MagicMock()
        mock_result.final_output = {"test": "data"}
        mock_runner.run = AsyncMock(
            side_effect=[asyncio.TimeoutError(), asyncio.TimeoutError(), mock_result]
        )
        mock_sleep.return_value = None  # Mock asyncio.sleep

        result = await processor_service._process_with_ai_agent(
            "test content", "resume-123"
        )

        assert result == {"test": "data"}
        assert mock_runner.run.call_count == 3
        assert mock_sleep.call_count == 2  # Two sleeps before retries

    @patch("app.services.resume_processor.Runner")
    async def test_process_with_ai_agent_permanent_failure(
        self, mock_runner, processor_service
    ):
        """Test AI agent processing with permanent failure."""
        mock_runner.run = AsyncMock(side_effect=Exception("Invalid API key"))

        with pytest.raises(AIProcessingError, match="AI processing failed"):
            await processor_service._process_with_ai_agent("test content", "resume-123")

    @patch("app.services.resume_processor.Runner")
    @patch("app.services.resume_processor.asyncio.sleep")
    async def test_process_with_ai_agent_rate_limit_failure(
        self, mock_sleep, mock_runner, processor_service
    ):
        """Test AI agent processing with rate limit failure after max retries."""
        mock_runner.run = AsyncMock(side_effect=Exception("Rate limit exceeded"))
        mock_sleep.return_value = None  # Mock asyncio.sleep

        with pytest.raises(
            AIProcessingError, match="AI processing temporarily unavailable"
        ):
            await processor_service._process_with_ai_agent("test content", "resume-123")

        assert mock_runner.run.call_count == 3  # Max retries
        assert mock_sleep.call_count == 2  # Sleeps between retries

    def test_validate_resume_data_success(self, processor_service, sample_resume_data):
        """Test successful resume data validation."""
        result = processor_service._validate_resume_data(
            sample_resume_data, "resume-123"
        )

        assert isinstance(result, Resume)
        assert result.contact_info.full_name == "John Doe"

    def test_validate_resume_data_failure(self, processor_service):
        """Test resume data validation failure."""
        invalid_data = {"invalid": "data"}

        with pytest.raises(
            ValidationError, match="Parsed resume data validation failed"
        ):
            processor_service._validate_resume_data(invalid_data, "resume-123")

    @patch("app.services.resume_processor.get_arango_client")
    async def test_store_resume_data_success(
        self, mock_get_arango, processor_service, sample_resume_data
    ):
        """Test successful resume data storage."""
        # Mock ArangoDB client
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        mock_get_arango.return_value = mock_db

        parsed_resume = Resume.model_validate(sample_resume_data)

        await processor_service._store_resume_data(
            resume_id="resume-123",
            user_id="user-456",
            parsed_resume=parsed_resume,
            filename="test.pdf",
            content_type="application/pdf",
            file_size=1024,
        )

        mock_collection.insert.assert_called_once()
        insert_args = mock_collection.insert.call_args[0][0]
        assert insert_args["_key"] == "resume-123"
        assert insert_args["user_id"] == "user-456"
        assert insert_args["status"] == "parsed"

    @patch("app.services.resume_processor.get_arango_client")
    async def test_store_resume_data_failure(
        self, mock_get_arango, processor_service, sample_resume_data
    ):
        """Test resume data storage failure."""
        mock_get_arango.side_effect = Exception("Database connection failed")

        parsed_resume = Resume.model_validate(sample_resume_data)

        with pytest.raises(StorageError, match="Failed to store resume data"):
            await processor_service._store_resume_data(
                resume_id="resume-123",
                user_id="user-456",
                parsed_resume=parsed_resume,
                filename="test.pdf",
                content_type="application/pdf",
                file_size=1024,
            )

    @patch("app.services.resume_processor.get_postgres_pool")
    async def test_update_user_profile_error_handling(
        self, mock_get_pool, processor_service
    ):
        """Test user profile update error handling (logs warning but doesn't fail)."""
        mock_get_pool.side_effect = Exception("Database connection failed")

        # This should not raise an exception - it should log a warning instead
        await processor_service._update_user_profile("user-456", "resume-123")

        # Test passes if no exception is raised - warning is logged in the service


class TestConvenienceFunction:
    """Test cases for the convenience function."""

    @patch("app.services.resume_processor.ResumeProcessorService")
    async def test_process_resume_synchronously(
        self, mock_service_class, sample_file_content, sample_resume_data
    ):
        """Test the convenience function creates service and processes resume."""
        # Mock service instance and method - must be AsyncMock since it's an async method
        mock_service = MagicMock()
        mock_service.process_resume_sync = AsyncMock(
            return_value={"status": "completed"}
        )
        mock_service_class.return_value = mock_service

        result = await process_resume_synchronously(
            sample_file_content, "test.pdf", "user-123", "application/pdf"
        )

        assert result == {"status": "completed"}
        mock_service_class.assert_called_once()
        mock_service.process_resume_sync.assert_called_once_with(
            sample_file_content, "test.pdf", "user-123", "application/pdf"
        )
