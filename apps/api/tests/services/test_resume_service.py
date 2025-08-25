"""Comprehensive tests for resume service with PostgreSQL."""

import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.schema.resume import Resume, ContactInfo, WorkExperience, Education
from app.services.resume_service import ResumeService
from app.database.connections import search_jsonb_field


@pytest.fixture
def mock_postgres_conn():
    """Create a mock PostgreSQL connection."""
    mock_conn = AsyncMock()
    mock_cursor = AsyncMock()
    
    # Setup cursor mock
    mock_cursor.execute = AsyncMock()
    mock_cursor.fetchone = AsyncMock()
    mock_cursor.fetchall = AsyncMock()
    
    # Setup connection mock
    mock_conn.cursor = MagicMock(return_value=mock_cursor)
    mock_conn.transaction = AsyncMock()
    mock_conn.execute = AsyncMock()
    mock_conn.row_factory = None
    
    # Setup transaction context manager
    mock_transaction = AsyncMock()
    mock_transaction.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_transaction.__aexit__ = AsyncMock()
    mock_conn.transaction.return_value = mock_transaction
    
    return mock_conn, mock_cursor


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
    """Sample resume document from PostgreSQL database."""
    return {
        "id": "resume-123",
        "user_id": "user-789",
        "task_id": "task-456",
        "status": "parsed",
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:30:00Z",
        "filename": "resume.pdf",
        "content_type": "application/pdf",
        "file_size": 1024,
        "parsed_data": sample_resume_data,
        "metadata": {
            "source": "upload",
            "parser_version": "1.0"
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
    async def test_create_resume_placeholder_success(self, resume_service, mock_postgres_conn):
        """Test successful resume placeholder creation."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            # Setup pool mock
            mock_pool = AsyncMock()
            mock_pool.connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_pool.connection.return_value.__aexit__ = AsyncMock()
            mock_get_pool.return_value = mock_pool
            
            mock_cursor.fetchone = AsyncMock(return_value=["resume-123"])
            
            result = await resume_service.create_resume_placeholder(
                resume_id="resume-123",
                user_id="user-789",
                task_id="task-456"
            )
            
            assert result == "resume-123"
            
            # Verify SQL execution
            mock_cursor.execute.assert_called()
            call_args = mock_cursor.execute.call_args[0]
            assert "INSERT INTO resume_documents" in call_args[0]
            assert "RETURNING id" in call_args[0]

    @pytest.mark.asyncio
    async def test_create_resume_placeholder_database_error(self, resume_service, mock_postgres_conn):
        """Test resume placeholder creation with database error."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.side_effect = Exception("Database error")
            
            with pytest.raises(Exception, match="Database error"):
                await resume_service.create_resume_placeholder(
                    resume_id="resume-123",
                    user_id="user-789",
                    task_id="task-456"
                )


class TestResumeRetrieval:
    """Test resume retrieval methods."""

    @pytest.mark.asyncio
    async def test_get_resume_success_without_user_check(self, resume_service, mock_postgres_conn, sample_resume_doc):
        """Test successful resume retrieval without user verification."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=sample_resume_doc)
            
            result = await resume_service.get_resume("resume-123")
            
            assert result == sample_resume_doc
            mock_cursor.execute.assert_called()
            call_args = mock_cursor.execute.call_args[0]
            assert "SELECT * FROM resume_documents" in call_args[0]
            assert "WHERE id = %s" in call_args[0]

    @pytest.mark.asyncio
    async def test_get_resume_success_with_user_check(self, resume_service, mock_postgres_conn, sample_resume_doc):
        """Test successful resume retrieval with user verification."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=sample_resume_doc)
            
            result = await resume_service.get_resume("resume-123", "user-789")
            
            assert result == sample_resume_doc
            call_args = mock_cursor.execute.call_args[0]
            assert "AND user_id = %s" in call_args[0]

    @pytest.mark.asyncio
    async def test_get_resume_not_found(self, resume_service, mock_postgres_conn):
        """Test resume retrieval when resume not found."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=None)
            
            result = await resume_service.get_resume("nonexistent-resume")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_get_resume_unauthorized_user(self, resume_service, mock_postgres_conn, sample_resume_doc):
        """Test resume retrieval with unauthorized user."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            # Return None when user doesn't match
            mock_cursor.fetchone = AsyncMock(return_value=None)
            
            result = await resume_service.get_resume("resume-123", "unauthorized-user")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_get_resume_database_error(self, resume_service, mock_postgres_conn):
        """Test resume retrieval with database error."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.side_effect = Exception("Database error")
            
            result = await resume_service.get_resume("resume-123")
            
            assert result is None


class TestResumeDataUpdate:
    """Test resume data update methods."""

    @pytest.mark.asyncio
    async def test_update_resume_data_success(self, resume_service, mock_postgres_conn, sample_resume_data):
        """Test successful resume data update."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_trans.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=["resume-123"])
            
            file_metadata = {"filename": "updated_resume.pdf", "size": 2048}
            
            result = await resume_service.update_resume_data(
                resume_id="resume-123",
                resume_data=sample_resume_data,
                file_metadata=file_metadata
            )
            
            assert result is True
            
            # Verify UPDATE was called
            mock_cursor.execute.assert_called()
            call_args = mock_cursor.execute.call_args[0]
            assert "UPDATE resume_documents" in call_args[0]
            assert "SET" in call_args[0]
            assert "WHERE id = %s" in call_args[0]

    @pytest.mark.asyncio
    async def test_update_resume_data_not_found(self, resume_service, mock_postgres_conn, sample_resume_data):
        """Test resume data update when resume not found."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_trans.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=None)
            
            result = await resume_service.update_resume_data(
                resume_id="nonexistent-resume",
                resume_data=sample_resume_data
            )
            
            assert result is False

    @pytest.mark.asyncio
    async def test_update_resume_data_database_error(self, resume_service, mock_postgres_conn, sample_resume_data):
        """Test resume data update with database error."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.side_effect = Exception("Database error")
            
            result = await resume_service.update_resume_data(
                resume_id="resume-123",
                resume_data=sample_resume_data
            )
            
            assert result is False


class TestResumeStatusUpdate:
    """Test resume status update methods."""

    @pytest.mark.asyncio
    async def test_update_resume_status_success(self, resume_service, mock_postgres_conn):
        """Test successful resume status update."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_trans.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=["resume-123"])
            
            result = await resume_service.update_resume_status(
                resume_id="resume-123",
                status="completed"
            )
            
            assert result is True
            
            # Verify UPDATE was called
            mock_cursor.execute.assert_called()
            call_args = mock_cursor.execute.call_args[0]
            assert "UPDATE resume_documents" in call_args[0]
            assert "status = %s" in call_args[0]

    @pytest.mark.asyncio
    async def test_update_resume_status_with_error_message(self, resume_service, mock_postgres_conn):
        """Test resume status update with error message."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_trans.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=["resume-123"])
            
            error_message = "Processing failed due to invalid format"
            
            result = await resume_service.update_resume_status(
                resume_id="resume-123",
                status="failed",
                error_message=error_message
            )
            
            assert result is True

    @pytest.mark.asyncio
    async def test_update_resume_status_database_error(self, resume_service, mock_postgres_conn):
        """Test resume status update with database error."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.side_effect = Exception("Database error")
            
            result = await resume_service.update_resume_status(
                resume_id="resume-123",
                status="failed"
            )
            
            assert result is False


class TestUserResumesRetrieval:
    """Test user resumes retrieval methods."""

    @pytest.mark.asyncio
    async def test_get_user_resumes_success(self, resume_service, mock_postgres_conn):
        """Test successful user resumes retrieval."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            sample_resumes = [
                {"id": "resume-1", "user_id": "user-789", "status": "parsed"},
                {"id": "resume-2", "user_id": "user-789", "status": "parsing"}
            ]
            mock_cursor.fetchall = AsyncMock(return_value=sample_resumes)
            
            result = await resume_service.get_user_resumes(
                user_id="user-789",
                status="parsed",
                limit=10,
                offset=0
            )
            
            assert result == sample_resumes
            
            # Verify SQL query
            mock_cursor.execute.assert_called()
            call_args = mock_cursor.execute.call_args[0]
            assert "SELECT * FROM resume_documents" in call_args[0]
            assert "WHERE user_id = %s" in call_args[0]

    @pytest.mark.asyncio
    async def test_get_user_resumes_without_status_filter(self, resume_service, mock_postgres_conn):
        """Test user resumes retrieval without status filter."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchall = AsyncMock(return_value=[])
            
            await resume_service.get_user_resumes("user-789")
            
            call_args = mock_cursor.execute.call_args[0]
            # Should only have user_id filter
            assert "WHERE user_id = %s" in call_args[0]

    @pytest.mark.asyncio
    async def test_get_user_resumes_database_error(self, resume_service, mock_postgres_conn):
        """Test user resumes retrieval with database error."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.side_effect = Exception("Database error")
            
            result = await resume_service.get_user_resumes("user-789")
            
            assert result == []


class TestResumeDeletion:
    """Test resume deletion methods."""

    @pytest.mark.asyncio
    async def test_delete_resume_success(self, resume_service, mock_postgres_conn):
        """Test successful resume deletion."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_trans.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=["resume-123"])
            
            result = await resume_service.delete_resume("resume-123")
            
            assert result is True
            mock_cursor.execute.assert_called()
            call_args = mock_cursor.execute.call_args[0]
            assert "DELETE FROM resume_documents" in call_args[0]

    @pytest.mark.asyncio
    async def test_delete_resume_with_user_check(self, resume_service, mock_postgres_conn):
        """Test resume deletion with user verification."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_trans.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=["resume-123"])
            
            result = await resume_service.delete_resume("resume-123", "user-789")
            
            assert result is True
            call_args = mock_cursor.execute.call_args[0]
            assert "AND user_id = %s" in call_args[0]

    @pytest.mark.asyncio
    async def test_delete_resume_not_found(self, resume_service, mock_postgres_conn):
        """Test resume deletion when resume not found."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_trans.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=None)
            
            result = await resume_service.delete_resume("nonexistent-resume")
            
            assert result is False

    @pytest.mark.asyncio
    async def test_delete_resume_database_error(self, resume_service, mock_postgres_conn):
        """Test resume deletion with database error."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.side_effect = Exception("Database error")
            
            result = await resume_service.delete_resume("resume-123")
            
            assert result is False


class TestResumeSearch:
    """Test resume search methods using PostgreSQL JSONB."""

    @pytest.mark.asyncio
    async def test_search_resumes_success(self, resume_service, mock_postgres_conn):
        """Test successful resume search with JSONB queries."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            search_results = [
                {"id": "resume-1", "user_id": "user-789", "parsed_data": {"summary": "Python developer"}},
                {"id": "resume-2", "user_id": "user-789", "parsed_data": {"skills": ["Python", "Django"]}}
            ]
            mock_cursor.fetchall = AsyncMock(return_value=search_results)
            
            result = await resume_service.search_resumes(
                user_id="user-789",
                search_term="Python",
                limit=25
            )
            
            assert result == search_results
            
            # Verify JSONB search query
            mock_cursor.execute.assert_called()
            call_args = mock_cursor.execute.call_args[0]
            assert "parsed_data::text ILIKE %s" in call_args[0]

    @pytest.mark.asyncio
    async def test_search_resumes_no_results(self, resume_service, mock_postgres_conn):
        """Test resume search with no results."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchall = AsyncMock(return_value=[])
            
            result = await resume_service.search_resumes(
                user_id="user-789",
                search_term="nonexistent term"
            )
            
            assert result == []

    @pytest.mark.asyncio
    async def test_search_resumes_database_error(self, resume_service, mock_postgres_conn):
        """Test resume search with database error."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.side_effect = Exception("Database error")
            
            result = await resume_service.search_resumes("user-789", "Python")
            
            assert result == []


class TestResumeStatistics:
    """Test resume statistics methods with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_get_resume_statistics_success(self, resume_service, mock_postgres_conn):
        """Test successful resume statistics generation."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            status_counts = [
                {"status": "parsed", "count": 5},
                {"status": "parsing", "count": 2},
                {"status": "failed", "count": 1}
            ]
            mock_cursor.fetchall = AsyncMock(return_value=status_counts)
            
            result = await resume_service.get_resume_statistics("user-789")
            
            assert result["total"] == 8
            assert result["by_status"]["parsed"] == 5
            assert result["by_status"]["parsing"] == 2
            assert result["by_status"]["failed"] == 1
            
            # Verify SQL aggregation query
            mock_cursor.execute.assert_called()
            call_args = mock_cursor.execute.call_args[0]
            assert "GROUP BY status" in call_args[0]
            assert "COUNT(*)" in call_args[0]

    @pytest.mark.asyncio
    async def test_get_resume_statistics_empty(self, resume_service, mock_postgres_conn):
        """Test resume statistics with no resumes."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchall = AsyncMock(return_value=[])
            
            result = await resume_service.get_resume_statistics("user-789")
            
            assert result["total"] == 0
            assert result["by_status"] == {}


class TestJSONBOperations:
    """Test PostgreSQL JSONB-specific operations."""

    @pytest.mark.asyncio
    async def test_jsonb_containment_query(self, resume_service, mock_postgres_conn):
        """Test JSONB containment operator @>."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.services.resume_service.search_jsonb_field') as mock_search:
            mock_search.return_value = [
                {"id": "resume-1", "parsed_data": {"skills": ["Python", "FastAPI"]}}
            ]
            
            # Search for resumes containing specific skill
            result = await resume_service.search_by_skill("user-789", "Python")
            
            assert len(result) == 1
            mock_search.assert_called_with(
                table="resume_documents",
                field="parsed_data",
                search_value={"skills": ["Python"]},
                user_id="user-789"
            )

    @pytest.mark.asyncio
    async def test_jsonb_path_query(self, resume_service, mock_postgres_conn):
        """Test JSONB path queries."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchall = AsyncMock(return_value=[
                {"id": "resume-1", "parsed_data": {"contact_info": {"email": "john@example.com"}}}
            ])
            
            # Query specific JSONB path
            result = await resume_service.find_by_email("user-789", "john@example.com")
            
            assert len(result) == 1
            call_args = mock_cursor.execute.call_args[0]
            assert "parsed_data->'contact_info'->>'email'" in call_args[0]

    @pytest.mark.asyncio
    async def test_jsonb_array_operations(self, resume_service, mock_postgres_conn):
        """Test JSONB array operations."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            # Test array contains
            mock_cursor.fetchall = AsyncMock(return_value=[
                {"id": "resume-1", "parsed_data": {"skills": ["Python", "FastAPI", "PostgreSQL"]}}
            ])
            
            result = await resume_service.find_by_multiple_skills(
                "user-789", 
                ["Python", "FastAPI"]
            )
            
            assert len(result) == 1
            call_args = mock_cursor.execute.call_args[0]
            assert "parsed_data->'skills' @>" in call_args[0]


class TestErrorHandlingAndEdgeCases:
    """Test error handling and edge case scenarios."""

    @pytest.mark.asyncio
    async def test_concurrent_operations(self, resume_service, mock_postgres_conn):
        """Test concurrent resume operations."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_trans.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=["test"])
            
            import asyncio
            
            # Create multiple placeholders concurrently
            tasks = [
                resume_service.create_resume_placeholder(f"resume-{i}", f"user-{i}", f"task-{i}")
                for i in range(5)
            ]
            
            results = await asyncio.gather(*tasks)
            
            # All should succeed
            assert all(result == "test" for result in results)
            assert mock_cursor.execute.call_count == 5

    @pytest.mark.asyncio
    async def test_large_jsonb_data_handling(self, resume_service, mock_postgres_conn):
        """Test handling of large JSONB data."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_trans.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=["resume-123"])
            
            # Create large resume data
            large_resume_data = {
                "summary": "Large summary " * 1000,
                "work_experience": [
                    {
                        "position": f"Position {i}",
                        "company": f"Company {i}",
                        "description": "Description " * 100,
                        "responsibilities": [f"Responsibility {j}" for j in range(50)],
                        "skills": [f"Skill {j}" for j in range(100)]
                    }
                    for i in range(20)
                ],
                "skills": [f"Skill {i}" for i in range(200)]
            }
            
            result = await resume_service.update_resume_data("resume-123", large_resume_data)
            
            assert result is True
            # Should handle large JSONB data without issues

    @pytest.mark.asyncio
    async def test_special_characters_in_jsonb_search(self, resume_service, mock_postgres_conn):
        """Test JSONB search with special characters."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_conn.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchall = AsyncMock(return_value=[])
            
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
    async def test_unicode_content_in_jsonb(self, resume_service, mock_postgres_conn):
        """Test handling of unicode content in JSONB fields."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            mock_get_trans.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_get_trans.return_value.__aexit__ = AsyncMock()
            
            mock_cursor.fetchone = AsyncMock(return_value=["resume-123"])
            
            unicode_resume_data = {
                "contact_info": {
                    "full_name": "José María González-López",
                    "email": "josé@example.com",
                    "address": "Calle de la Esperanza, 123, Madrid, España"
                },
                "summary": "Desarrollador experimentado. 中文测试内容。日本語のテスト。",
                "skills": ["Python", "JavaScript", "Español", "中文", "日本語"]
            }
            
            result = await resume_service.update_resume_data("resume-123", unicode_resume_data)
            
            assert result is True
            # Unicode content should be handled properly in JSONB

    @pytest.mark.asyncio
    async def test_connection_pool_exhaustion(self, resume_service, mock_postgres_conn):
        """Test behavior when connection pool is exhausted."""
        mock_conn, mock_cursor = mock_postgres_conn
        
        with patch('app.database.connections.get_postgres_pool') as mock_get_pool:
            # Simulate pool exhaustion after 3 successful connections
            mock_get_conn.side_effect = [
                AsyncMock(__aenter__=AsyncMock(return_value=mock_conn), __aexit__=AsyncMock()),
                AsyncMock(__aenter__=AsyncMock(return_value=mock_conn), __aexit__=AsyncMock()),
                AsyncMock(__aenter__=AsyncMock(return_value=mock_conn), __aexit__=AsyncMock()),
                Exception("Connection pool exhausted")
            ]
            
            mock_cursor.fetchone = AsyncMock(return_value={"id": "resume-123"})
            
            # First 3 calls should succeed
            for i in range(3):
                result = await resume_service.get_resume(f"resume-{i}")
                assert result is not None
            
            # Fourth call should handle pool exhaustion gracefully
            result = await resume_service.get_resume("resume-4")
            assert result is None