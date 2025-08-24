"""Comprehensive tests for resume service."""

import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.schema.resume import Resume, ContactInfo, WorkExperience, Education
from app.services.resume_service import ResumeService


@pytest.fixture
def mock_arango_db():
    """Create a mock ArangoDB instance."""
    mock_db = MagicMock()
    
    # Mock collection
    mock_collection = MagicMock()
    mock_collection.insert = MagicMock()
    mock_collection.get = MagicMock()
    mock_collection.update = MagicMock()
    mock_collection.delete = MagicMock()
    
    mock_db.collection.return_value = mock_collection
    
    # Mock AQL execution
    mock_cursor = MagicMock()
    mock_cursor.__iter__ = MagicMock(return_value=iter([]))
    mock_db.aql.execute.return_value = mock_cursor
    
    return mock_db


@pytest.fixture
def resume_service():
    """Create a ResumeService instance for testing."""
    return ResumeService()


@pytest.fixture
def sample_resume_data():
    """Sample resume data for testing."""
    return {
        "contact_info": {
            "full_name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+1-555-123-4567",
            "address": "123 Main St, City, State 12345",
            "links": []
        },
        "summary": "Experienced software developer with expertise in web technologies.",
        "work_experience": [
            {
                "position": "Software Engineer",
                "company": "Tech Corp",
                "start_date": "2020-01",
                "end_date": "2023-01",
                "is_current": False,
                "description": "Developed web applications",
                "responsibilities": ["Built APIs", "Wrote tests"],
                "skills": ["Python", "JavaScript"]
            }
        ],
        "education": [
            {
                "degree": "Bachelor of Science",
                "field_of_study": "Computer Science",
                "institution": "Tech University",
                "graduation_date": "2020",
                "gpa": "3.8",
                "honors": ["Magna Cum Laude"],
                "relevant_courses": ["Data Structures", "Algorithms"]
            }
        ],
        "certifications": [],
        "skills": ["Python", "JavaScript", "React", "FastAPI"]
    }


@pytest.fixture
def sample_resume_doc(sample_resume_data):
    """Sample resume document from database."""
    return {
        "_key": "resume-123",
        "_id": "resumes/resume-123",
        "_rev": "revision123",
        "user_id": "user-789",
        "task_id": "task-456",
        "status": "parsed",
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:30:00Z",
        "resume_data": sample_resume_data,
        "file_metadata": {
            "filename": "resume.pdf",
            "size": 1024,
            "content_type": "application/pdf"
        }
    }


class TestResumeServiceInitialization:
    """Test ResumeService initialization."""

    def test_initialization(self, resume_service):
        """Test service initialization."""
        assert isinstance(resume_service, ResumeService)


class TestResumePlaceholderCreation:
    """Test resume placeholder creation."""

    @pytest.mark.asyncio
    async def test_create_resume_placeholder_success(self, resume_service, mock_arango_db):
        """Test successful resume placeholder creation."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.insert.return_value = {"_key": "resume-123"}
            
            result = await resume_service.create_resume_placeholder(
                resume_id="resume-123",
                user_id="user-789",
                task_id="task-456"
            )
            
            assert result == "resume-123"
            
            # Verify collection access and insertion
            mock_arango_db.collection.assert_called_with("resumes")
            mock_arango_db.collection.return_value.insert.assert_called_once()
            
            # Verify placeholder document structure
            call_args = mock_arango_db.collection.return_value.insert.call_args[0][0]
            assert call_args["_key"] == "resume-123"
            assert call_args["user_id"] == "user-789"
            assert call_args["task_id"] == "task-456"
            assert call_args["status"] == "parsing"
            assert call_args["resume_data"] is None
            assert "created_at" in call_args

    @pytest.mark.asyncio
    async def test_create_resume_placeholder_database_error(self, resume_service, mock_arango_db):
        """Test resume placeholder creation with database error."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.insert.side_effect = Exception("Database error")
            
            with pytest.raises(Exception, match="Database error"):
                await resume_service.create_resume_placeholder(
                    resume_id="resume-123",
                    user_id="user-789",
                    task_id="task-456"
                )


class TestResumeRetrieval:
    """Test resume retrieval methods."""

    @pytest.mark.asyncio
    async def test_get_resume_success_without_user_check(self, resume_service, mock_arango_db, sample_resume_doc):
        """Test successful resume retrieval without user verification."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = sample_resume_doc
            
            result = await resume_service.get_resume("resume-123")
            
            assert result == sample_resume_doc
            mock_arango_db.collection.assert_called_with("resumes")
            mock_arango_db.collection.return_value.get.assert_called_with("resume-123")

    @pytest.mark.asyncio
    async def test_get_resume_success_with_user_check(self, resume_service, mock_arango_db, sample_resume_doc):
        """Test successful resume retrieval with user verification."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = sample_resume_doc
            
            result = await resume_service.get_resume("resume-123", "user-789")
            
            assert result == sample_resume_doc

    @pytest.mark.asyncio
    async def test_get_resume_not_found(self, resume_service, mock_arango_db):
        """Test resume retrieval when resume not found."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = None
            
            result = await resume_service.get_resume("nonexistent-resume")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_get_resume_unauthorized_user(self, resume_service, mock_arango_db, sample_resume_doc):
        """Test resume retrieval with unauthorized user."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = sample_resume_doc
            
            result = await resume_service.get_resume("resume-123", "unauthorized-user")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_get_resume_database_error(self, resume_service, mock_arango_db):
        """Test resume retrieval with database error."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.side_effect = Exception("Database error")
            
            result = await resume_service.get_resume("resume-123")
            
            assert result is None


class TestResumeDataUpdate:
    """Test resume data update methods."""

    @pytest.mark.asyncio
    async def test_update_resume_data_success(self, resume_service, mock_arango_db, sample_resume_data, sample_resume_doc):
        """Test successful resume data update."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = sample_resume_doc
            mock_arango_db.collection.return_value.update.return_value = {"_key": "resume-123"}
            
            file_metadata = {"filename": "updated_resume.pdf", "size": 2048}
            
            result = await resume_service.update_resume_data(
                resume_id="resume-123",
                resume_data=sample_resume_data,
                file_metadata=file_metadata
            )
            
            assert result is True
            
            # Verify update was called
            mock_arango_db.collection.return_value.update.assert_called_once()
            call_args = mock_arango_db.collection.return_value.update.call_args
            
            assert call_args[0][0] == "resume-123"
            update_data = call_args[0][1]
            assert update_data["resume_data"] == sample_resume_data
            assert update_data["status"] == "manual"
            assert update_data["file_metadata"] == file_metadata
            assert "updated_at" in update_data

    @pytest.mark.asyncio
    async def test_update_resume_data_without_metadata(self, resume_service, mock_arango_db, sample_resume_data, sample_resume_doc):
        """Test resume data update without file metadata."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = sample_resume_doc
            mock_arango_db.collection.return_value.update.return_value = {"_key": "resume-123"}
            
            result = await resume_service.update_resume_data(
                resume_id="resume-123",
                resume_data=sample_resume_data
            )
            
            assert result is True
            
            call_args = mock_arango_db.collection.return_value.update.call_args
            update_data = call_args[0][1]
            assert "file_metadata" not in update_data

    @pytest.mark.asyncio
    async def test_update_resume_data_resume_not_found(self, resume_service, mock_arango_db, sample_resume_data):
        """Test resume data update when resume not found."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = None
            
            result = await resume_service.update_resume_data(
                resume_id="nonexistent-resume",
                resume_data=sample_resume_data
            )
            
            assert result is False
            mock_arango_db.collection.return_value.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_resume_data_update_failure(self, resume_service, mock_arango_db, sample_resume_data, sample_resume_doc):
        """Test resume data update with update failure."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = sample_resume_doc
            mock_arango_db.collection.return_value.update.return_value = None
            
            result = await resume_service.update_resume_data(
                resume_id="resume-123",
                resume_data=sample_resume_data
            )
            
            assert result is False

    @pytest.mark.asyncio
    async def test_update_resume_data_database_error(self, resume_service, mock_arango_db, sample_resume_data):
        """Test resume data update with database error."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.side_effect = Exception("Database error")
            
            result = await resume_service.update_resume_data(
                resume_id="resume-123",
                resume_data=sample_resume_data
            )
            
            assert result is False


class TestResumeStatusUpdate:
    """Test resume status update methods."""

    @pytest.mark.asyncio
    async def test_update_resume_status_success(self, resume_service, mock_arango_db):
        """Test successful resume status update."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            result = await resume_service.update_resume_status(
                resume_id="resume-123",
                status="completed"
            )
            
            assert result is True
            
            # Verify update was called
            mock_arango_db.collection.return_value.update.assert_called_once()
            call_args = mock_arango_db.collection.return_value.update.call_args
            
            assert call_args[0][0] == "resume-123"
            update_data = call_args[0][1]
            assert update_data["status"] == "completed"
            assert "updated_at" in update_data
            assert "error_message" not in update_data

    @pytest.mark.asyncio
    async def test_update_resume_status_with_error_message(self, resume_service, mock_arango_db):
        """Test resume status update with error message."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            error_message = "Processing failed due to invalid format"
            
            result = await resume_service.update_resume_status(
                resume_id="resume-123",
                status="failed",
                error_message=error_message
            )
            
            assert result is True
            
            call_args = mock_arango_db.collection.return_value.update.call_args
            update_data = call_args[0][1]
            assert update_data["status"] == "failed"
            assert update_data["error_message"] == error_message

    @pytest.mark.asyncio
    async def test_update_resume_status_database_error(self, resume_service, mock_arango_db):
        """Test resume status update with database error."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.update.side_effect = Exception("Database error")
            
            result = await resume_service.update_resume_status(
                resume_id="resume-123",
                status="failed"
            )
            
            assert result is False


class TestUserResumesRetrieval:
    """Test user resumes retrieval methods."""

    @pytest.mark.asyncio
    async def test_get_user_resumes_success(self, resume_service, mock_arango_db):
        """Test successful user resumes retrieval."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            sample_resumes = [
                {"_key": "resume-1", "user_id": "user-789", "status": "parsed"},
                {"_key": "resume-2", "user_id": "user-789", "status": "parsing"}
            ]
            mock_arango_db.aql.execute.return_value = sample_resumes
            
            result = await resume_service.get_user_resumes(
                user_id="user-789",
                status="parsed",
                limit=10,
                offset=0
            )
            
            assert result == sample_resumes
            
            # Verify AQL query was executed
            mock_arango_db.aql.execute.assert_called_once()
            call_args = mock_arango_db.aql.execute.call_args
            
            # Check query contains user filter
            assert "FILTER resume.user_id == @user_id" in call_args[0][0]
            assert "FILTER resume.status == @status" in call_args[0][0]
            
            # Check bind variables
            bind_vars = call_args[1]["bind_vars"]
            assert bind_vars["user_id"] == "user-789"
            assert bind_vars["status"] == "parsed"
            assert bind_vars["limit"] == 10
            assert bind_vars["offset"] == 0

    @pytest.mark.asyncio
    async def test_get_user_resumes_without_status_filter(self, resume_service, mock_arango_db):
        """Test user resumes retrieval without status filter."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.aql.execute.return_value = []
            
            await resume_service.get_user_resumes("user-789")
            
            call_args = mock_arango_db.aql.execute.call_args
            # Should not have status filter in query
            assert "FILTER resume.status == @status" not in call_args[0][0]
            # Should not have status in bind vars
            assert "status" not in call_args[1]["bind_vars"]

    @pytest.mark.asyncio
    async def test_get_user_resumes_with_defaults(self, resume_service, mock_arango_db):
        """Test user resumes retrieval with default parameters."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.aql.execute.return_value = []
            
            await resume_service.get_user_resumes("user-789")
            
            call_args = mock_arango_db.aql.execute.call_args
            bind_vars = call_args[1]["bind_vars"]
            assert bind_vars["limit"] == 50  # Default limit
            assert bind_vars["offset"] == 0   # Default offset

    @pytest.mark.asyncio
    async def test_get_user_resumes_database_error(self, resume_service, mock_arango_db):
        """Test user resumes retrieval with database error."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.aql.execute.side_effect = Exception("Database error")
            
            result = await resume_service.get_user_resumes("user-789")
            
            assert result == []


class TestResumeDeletion:
    """Test resume deletion methods."""

    @pytest.mark.asyncio
    async def test_delete_resume_success_without_user_check(self, resume_service, mock_arango_db):
        """Test successful resume deletion without user check."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            result = await resume_service.delete_resume("resume-123")
            
            assert result is True
            mock_arango_db.collection.return_value.delete.assert_called_with("resume-123")

    @pytest.mark.asyncio
    async def test_delete_resume_success_with_user_check(self, resume_service, mock_arango_db, sample_resume_doc):
        """Test successful resume deletion with user verification."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = sample_resume_doc
            
            result = await resume_service.delete_resume("resume-123", "user-789")
            
            assert result is True
            # Should check ownership first
            mock_arango_db.collection.return_value.get.assert_called_with("resume-123")
            # Then delete
            mock_arango_db.collection.return_value.delete.assert_called_with("resume-123")

    @pytest.mark.asyncio
    async def test_delete_resume_unauthorized(self, resume_service, mock_arango_db, sample_resume_doc):
        """Test resume deletion with unauthorized user."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = sample_resume_doc
            
            result = await resume_service.delete_resume("resume-123", "unauthorized-user")
            
            assert result is False
            # Should not delete
            mock_arango_db.collection.return_value.delete.assert_not_called()

    @pytest.mark.asyncio
    async def test_delete_resume_not_found_with_user_check(self, resume_service, mock_arango_db):
        """Test resume deletion when resume not found with user check."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = None
            
            result = await resume_service.delete_resume("nonexistent-resume", "user-789")
            
            assert result is False
            mock_arango_db.collection.return_value.delete.assert_not_called()

    @pytest.mark.asyncio
    async def test_delete_resume_database_error(self, resume_service, mock_arango_db):
        """Test resume deletion with database error."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.delete.side_effect = Exception("Database error")
            
            result = await resume_service.delete_resume("resume-123")
            
            assert result is False


class TestResumeSearch:
    """Test resume search methods."""

    @pytest.mark.asyncio
    async def test_search_resumes_success(self, resume_service, mock_arango_db):
        """Test successful resume search."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            search_results = [
                {"_key": "resume-1", "user_id": "user-789", "resume_data": {"summary": "Python developer"}},
                {"_key": "resume-2", "user_id": "user-789", "resume_data": {"skills": ["Python", "Django"]}}
            ]
            mock_arango_db.aql.execute.return_value = search_results
            
            result = await resume_service.search_resumes(
                user_id="user-789",
                search_term="Python",
                limit=25
            )
            
            assert result == search_results
            
            # Verify AQL query
            call_args = mock_arango_db.aql.execute.call_args
            assert "FILTER resume.user_id == @user_id" in call_args[0][0]
            assert "FILTER resume.status == \"parsed\"" in call_args[0][0]
            assert "LOWER(@search_term)" in call_args[0][0]
            
            # Check bind variables
            bind_vars = call_args[1]["bind_vars"]
            assert bind_vars["user_id"] == "user-789"
            assert bind_vars["search_term"] == "Python"
            assert bind_vars["limit"] == 25

    @pytest.mark.asyncio
    async def test_search_resumes_no_results(self, resume_service, mock_arango_db):
        """Test resume search with no results."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.aql.execute.return_value = []
            
            result = await resume_service.search_resumes(
                user_id="user-789",
                search_term="nonexistent term"
            )
            
            assert result == []

    @pytest.mark.asyncio
    async def test_search_resumes_default_limit(self, resume_service, mock_arango_db):
        """Test resume search with default limit."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.aql.execute.return_value = []
            
            await resume_service.search_resumes("user-789", "test")
            
            call_args = mock_arango_db.aql.execute.call_args
            bind_vars = call_args[1]["bind_vars"]
            assert bind_vars["limit"] == 50  # Default limit

    @pytest.mark.asyncio
    async def test_search_resumes_database_error(self, resume_service, mock_arango_db):
        """Test resume search with database error."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.aql.execute.side_effect = Exception("Database error")
            
            result = await resume_service.search_resumes("user-789", "Python")
            
            assert result == []


class TestResumeStatistics:
    """Test resume statistics methods."""

    @pytest.mark.asyncio
    async def test_get_resume_statistics_success(self, resume_service, mock_arango_db):
        """Test successful resume statistics generation."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            status_counts = [
                {"status": "parsed", "count": 5},
                {"status": "parsing", "count": 2},
                {"status": "failed", "count": 1}
            ]
            mock_arango_db.aql.execute.return_value = status_counts
            
            result = await resume_service.get_resume_statistics("user-789")
            
            assert result["total"] == 8
            assert result["by_status"]["parsed"] == 5
            assert result["by_status"]["parsing"] == 2
            assert result["by_status"]["failed"] == 1
            
            # Verify AQL query
            call_args = mock_arango_db.aql.execute.call_args
            assert "COLLECT status = resume.status WITH COUNT INTO count" in call_args[0][0]
            assert call_args[1]["bind_vars"]["user_id"] == "user-789"

    @pytest.mark.asyncio
    async def test_get_resume_statistics_empty(self, resume_service, mock_arango_db):
        """Test resume statistics with no resumes."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.aql.execute.return_value = []
            
            result = await resume_service.get_resume_statistics("user-789")
            
            assert result["total"] == 0
            assert result["by_status"] == {}

    @pytest.mark.asyncio
    async def test_get_resume_statistics_database_error(self, resume_service, mock_arango_db):
        """Test resume statistics with database error."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.aql.execute.side_effect = Exception("Database error")
            
            result = await resume_service.get_resume_statistics("user-789")
            
            assert result["total"] == 0
            assert result["by_status"] == {}


class TestResumeValidation:
    """Test resume data validation methods."""

    @pytest.mark.asyncio
    async def test_validate_resume_data_success(self, resume_service, sample_resume_data):
        """Test successful resume data validation."""
        is_valid, error_message = await resume_service.validate_resume_data(sample_resume_data)
        
        assert is_valid is True
        assert error_message is None

    @pytest.mark.asyncio
    async def test_validate_resume_data_invalid(self, resume_service):
        """Test resume data validation with invalid data."""
        invalid_data = {
            "contact_info": {
                # Missing required fields
                "full_name": None,
                "email": "invalid-email"
            }
        }
        
        is_valid, error_message = await resume_service.validate_resume_data(invalid_data)
        
        assert is_valid is False
        assert error_message is not None
        assert "Resume validation failed" in error_message

    @pytest.mark.asyncio
    async def test_validate_resume_data_empty(self, resume_service):
        """Test resume data validation with empty data."""
        is_valid, error_message = await resume_service.validate_resume_data({})
        
        assert is_valid is False
        assert error_message is not None

    @pytest.mark.asyncio
    async def test_validate_resume_data_malformed(self, resume_service):
        """Test resume data validation with malformed structure."""
        malformed_data = {
            "contact_info": "should be object not string",
            "work_experience": "should be array not string"
        }
        
        is_valid, error_message = await resume_service.validate_resume_data(malformed_data)
        
        assert is_valid is False
        assert error_message is not None


class TestManualResumeCreation:
    """Test manual resume creation methods."""

    @pytest.mark.asyncio
    async def test_create_manual_resume_success(self, resume_service, mock_arango_db, sample_resume_data):
        """Test successful manual resume creation."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.insert.return_value = {"_key": "manual-resume-123"}
            
            result = await resume_service.create_manual_resume(
                resume_id="manual-resume-123",
                user_id="user-789",
                resume_data=sample_resume_data
            )
            
            assert result == "manual-resume-123"
            
            # Verify insertion
            mock_arango_db.collection.assert_called_with("resumes")
            mock_arango_db.collection.return_value.insert.assert_called_once()
            
            # Verify document structure
            call_args = mock_arango_db.collection.return_value.insert.call_args[0][0]
            assert call_args["_key"] == "manual-resume-123"
            assert call_args["user_id"] == "user-789"
            assert call_args["status"] == "manual"
            assert call_args["source"] == "manual"
            assert call_args["resume_data"] == sample_resume_data
            assert call_args["file_metadata"]["source"] == "manual_entry"
            assert call_args["file_metadata"]["created_by"] == "user-789"
            assert call_args["file_metadata"]["entry_method"] == "manual_form"
            assert "created_at" in call_args

    @pytest.mark.asyncio
    async def test_create_manual_resume_database_error(self, resume_service, mock_arango_db, sample_resume_data):
        """Test manual resume creation with database error."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.insert.side_effect = Exception("Database error")
            
            with pytest.raises(Exception, match="Database error"):
                await resume_service.create_manual_resume(
                    resume_id="manual-resume-123",
                    user_id="user-789",
                    resume_data=sample_resume_data
                )


class TestErrorHandlingAndEdgeCases:
    """Test error handling and edge case scenarios."""

    @pytest.mark.asyncio
    async def test_concurrent_operations(self, resume_service, mock_arango_db, sample_resume_data):
        """Test concurrent resume operations."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.insert.return_value = {"_key": "test"}
            
            import asyncio
            
            # Create multiple placeholders concurrently
            tasks = [
                resume_service.create_resume_placeholder(f"resume-{i}", f"user-{i}", f"task-{i}")
                for i in range(5)
            ]
            
            results = await asyncio.gather(*tasks)
            
            # All should succeed
            assert all(result == "test" for result in results)
            assert mock_arango_db.collection.return_value.insert.call_count == 5

    @pytest.mark.asyncio
    async def test_large_resume_data_handling(self, resume_service, mock_arango_db):
        """Test handling of large resume data."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = {"user_id": "user-789"}
            mock_arango_db.collection.return_value.update.return_value = {"_key": "resume-123"}
            
            # Create large resume data
            large_resume_data = {
                "contact_info": {
                    "full_name": "John Doe",
                    "email": "john@example.com",
                    "phone": "+1-555-123-4567",
                    "address": "123 Main St",
                    "links": []
                },
                "summary": "Large summary " * 1000,  # Very long summary
                "work_experience": [
                    {
                        "position": f"Position {i}",
                        "company": f"Company {i}",
                        "start_date": "2020-01",
                        "end_date": "2021-01",
                        "is_current": False,
                        "description": "Description " * 100,  # Long description
                        "responsibilities": [f"Responsibility {j}" for j in range(50)],
                        "skills": [f"Skill {j}" for j in range(100)]
                    }
                    for i in range(20)  # Many work experiences
                ],
                "education": [],
                "certifications": [],
                "skills": [f"Skill {i}" for i in range(200)]  # Many skills
            }
            
            result = await resume_service.update_resume_data("resume-123", large_resume_data)
            
            assert result is True
            # Should handle large data without issues

    @pytest.mark.asyncio
    async def test_special_characters_in_search(self, resume_service, mock_arango_db):
        """Test search with special characters."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.aql.execute.return_value = []
            
            special_searches = [
                "C++",
                ".NET",
                "React.js",
                "Node.js",
                "search with spaces",
                "search-with-hyphens",
                "search_with_underscores",
                "search/with/slashes",
                "search@with#symbols"
            ]
            
            for search_term in special_searches:
                result = await resume_service.search_resumes("user-789", search_term)
                assert result == []  # Should handle without errors

    @pytest.mark.asyncio
    async def test_unicode_content_handling(self, resume_service, mock_arango_db):
        """Test handling of unicode content in resumes."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.collection.return_value.get.return_value = {"user_id": "user-789"}
            mock_arango_db.collection.return_value.update.return_value = {"_key": "resume-123"}
            
            unicode_resume_data = {
                "contact_info": {
                    "full_name": "José María González-López",
                    "email": "josé@example.com",
                    "phone": "+34-123-456-789",
                    "address": "Calle de la Esperanza, 123, Madrid, España",
                    "links": []
                },
                "summary": "Desarrollador experimentado con experiência en tecnologías web. Especialista en Python y JavaScript. 中文测试内容。日本語のテスト。",
                "work_experience": [],
                "education": [],
                "certifications": [],
                "skills": ["Python", "JavaScript", "Español", "中文", "日本語"]
            }
            
            result = await resume_service.update_resume_data("resume-123", unicode_resume_data)
            
            assert result is True
            # Unicode content should be handled properly

    @pytest.mark.asyncio
    async def test_database_connection_recovery_scenarios(self, resume_service, mock_arango_db):
        """Test behavior during database connection issues."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            # Simulate intermittent connection issues
            mock_arango_db.collection.return_value.get.side_effect = [
                Exception("Connection lost"),
                {"user_id": "user-789"},  # Recovery
            ]
            
            # First call should fail
            result1 = await resume_service.get_resume("resume-123")
            assert result1 is None
            
            # Reset side effect for recovery
            mock_arango_db.collection.return_value.get.side_effect = None
            mock_arango_db.collection.return_value.get.return_value = {"user_id": "user-789"}
            
            # Second call should succeed
            result2 = await resume_service.get_resume("resume-123")
            assert result2 == {"user_id": "user-789"}

    @pytest.mark.asyncio
    async def test_partial_data_validation_scenarios(self, resume_service):
        """Test validation with various partial data scenarios."""
        partial_scenarios = [
            # Minimal valid data
            {
                "contact_info": {
                    "full_name": "John Doe",
                    "email": "john@example.com",
                    "phone": None,
                    "address": None,
                    "links": []
                },
                "summary": "",
                "work_experience": [],
                "education": [],
                "certifications": [],
                "skills": []
            },
            # Only contact info and summary
            {
                "contact_info": {
                    "full_name": "Jane Smith",
                    "email": "jane@example.com",
                    "phone": "+1-555-987-6543",
                    "address": "456 Oak Ave",
                    "links": []
                },
                "summary": "Brief summary",
                "work_experience": [],
                "education": [],
                "certifications": [],
                "skills": []
            }
        ]
        
        for scenario in partial_scenarios:
            is_valid, error_message = await resume_service.validate_resume_data(scenario)
            assert is_valid is True, f"Failed for scenario: {scenario}"
            assert error_message is None

    @pytest.mark.asyncio
    async def test_edge_case_search_terms(self, resume_service, mock_arango_db):
        """Test search with edge case search terms."""
        with patch('app.services.resume_service.get_arango_client', return_value=mock_arango_db):
            mock_arango_db.aql.execute.return_value = []
            
            edge_cases = [
                "",  # Empty string
                " ",  # Just space
                "   ",  # Multiple spaces
                "\n",  # Newline
                "\t",  # Tab
                "a",  # Single character
                "a" * 1000,  # Very long term
            ]
            
            for search_term in edge_cases:
                result = await resume_service.search_resumes("user-789", search_term)
                assert result == []  # Should handle gracefully