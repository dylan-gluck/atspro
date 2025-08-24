"""Tests for optimization processor service."""

import asyncio
import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.schema.job import Job
from app.schema.resume import Resume, ContactInfo, WorkExperience, Education, Certification
from app.services.optimization_processor import (
    OptimizationError,
    OptimizationProcessorService,
)


@pytest.fixture
def mock_arango_db():
    """Create a mock ArangoDB instance."""
    mock_db = MagicMock()
    
    # Mock collections
    mock_resumes_collection = MagicMock()
    mock_jobs_collection = MagicMock()
    mock_documents_collection = MagicMock()
    
    # Configure collection returns
    collection_map = {
        "resumes": mock_resumes_collection,
        "jobs": mock_jobs_collection,
        "documents": mock_documents_collection
    }
    
    mock_db.collection.side_effect = lambda name: collection_map.get(name, MagicMock())
    
    return mock_db


@pytest.fixture
def optimization_service(mock_arango_db):
    """Create an OptimizationProcessorService instance for testing."""
    return OptimizationProcessorService(mock_arango_db)


@pytest.fixture
def sample_contact_info():
    """Sample contact information."""
    return ContactInfo(
        full_name="John Doe",
        email="john.doe@example.com",
        phone="+1-555-123-4567",
        address="123 Main St, City, State 12345",
        links=[]
    )


@pytest.fixture
def sample_work_experience():
    """Sample work experience."""
    return [
        WorkExperience(
            position="Software Engineer",
            company="Tech Corp",
            start_date="2020-01",
            end_date="2023-01",
            is_current=False,
            description="Developed web applications",
            responsibilities=["Built APIs", "Wrote tests", "Code reviews"],
            skills=["Python", "JavaScript", "React"]
        ),
        WorkExperience(
            position="Senior Developer",
            company="Innovation Labs",
            start_date="2023-02",
            end_date=None,
            is_current=True,
            description="Lead development team",
            responsibilities=["Architect solutions", "Mentor developers", "Project planning"],
            skills=["Python", "FastAPI", "PostgreSQL"]
        )
    ]


@pytest.fixture
def sample_education():
    """Sample education."""
    return [
        Education(
            degree="Bachelor of Science",
            field_of_study="Computer Science",
            institution="Tech University",
            graduation_date="2020",
            gpa="3.8",
            honors=["Magna Cum Laude"],
            relevant_courses=["Data Structures", "Algorithms", "Software Engineering"]
        )
    ]


@pytest.fixture
def sample_certifications():
    """Sample certifications."""
    return [
        Certification(
            name="AWS Certified Developer",
            issuer="Amazon Web Services",
            date_obtained="2022-03",
            expiration_date="2025-03",
            credential_id="AWS-12345"
        )
    ]


@pytest.fixture
def sample_resume(sample_contact_info, sample_work_experience, sample_education, sample_certifications):
    """Sample resume for testing."""
    return Resume(
        contact_info=sample_contact_info,
        summary="Experienced software engineer with expertise in web development and cloud technologies.",
        work_experience=sample_work_experience,
        education=sample_education,
        certifications=sample_certifications,
        skills=["Python", "JavaScript", "React", "FastAPI", "PostgreSQL", "AWS"]
    )


@pytest.fixture
def sample_job():
    """Sample job for testing."""
    return Job(
        title="Senior Software Engineer",
        company="Awesome Company",
        location="Remote",
        description="We are looking for a senior software engineer to join our team.",
        requirements=["5+ years Python", "React experience", "AWS knowledge"],
        benefits=["Health insurance", "Remote work", "Stock options"],
        salary_range="$120,000 - $160,000",
        employment_type="full_time",
        experience_level="senior",
        posted_date="2024-01-15",
        application_deadline="2024-02-15"
    )


@pytest.fixture
def large_resume(sample_contact_info, sample_education, sample_certifications):
    """Large resume for testing chunking functionality."""
    # Create many work experiences to make the resume oversized
    large_work_experience = []
    for i in range(20):  # Create 20 work experiences
        large_work_experience.append(
            WorkExperience(
                position=f"Software Engineer {i}",
                company=f"Company {i}",
                start_date=f"202{i % 4}-01",
                end_date=f"202{(i % 4) + 1}-01",
                is_current=False,
                description="Very long description " * 100,  # Make it long
                responsibilities=[f"Responsibility {j}" for j in range(10)],
                skills=[f"Skill{j}" for j in range(15)]
            )
        )
    
    return Resume(
        contact_info=sample_contact_info,
        summary="Very long summary " * 50,  # Make summary long
        work_experience=large_work_experience,
        education=sample_education,
        certifications=sample_certifications,
        skills=[f"Skill{i}" for i in range(50)]  # Many skills
    )


class TestOptimizationProcessorService:
    """Test OptimizationProcessorService functionality."""

    def test_initialization(self, mock_arango_db):
        """Test service initialization."""
        service = OptimizationProcessorService(mock_arango_db)
        assert service.arango_db is mock_arango_db
        assert service.timeout_seconds == 90

    @pytest.mark.asyncio
    async def test_optimize_resume_sync_success(self, optimization_service, mock_arango_db, sample_resume, sample_job):
        """Test successful synchronous resume optimization."""
        resume_id = "resume-123"
        job_id = "job-456"
        user_id = "user-789"
        
        # Mock database returns
        mock_arango_db.collection("resumes").get.return_value = {
            "user_id": user_id,
            "data": sample_resume.model_dump()
        }
        mock_arango_db.collection("jobs").get.return_value = {
            "user_id": user_id,
            "data": sample_job.model_dump()
        }
        mock_arango_db.collection("documents").insert.return_value = {"_key": "doc-123"}
        
        # Mock the AI optimization
        with patch('app.services.optimization_processor.optimize_agent') as mock_agent:
            mock_agent.run.return_value = sample_resume
            
            result = await optimization_service.optimize_resume_sync(resume_id, job_id, user_id)
        
        assert result["type"] == "optimization"
        assert result["resume_id"] == resume_id
        assert result["job_id"] == job_id
        assert result["status"] == "completed"
        assert "document_id" in result

    @pytest.mark.asyncio
    async def test_optimize_resume_sync_timeout(self, optimization_service, mock_arango_db):
        """Test optimization timeout handling."""
        resume_id = "resume-123"
        job_id = "job-456"
        user_id = "user-789"
        
        # Set short timeout for test
        optimization_service.timeout_seconds = 0.1
        
        # Mock slow database operation
        async def slow_operation(*args, **kwargs):
            await asyncio.sleep(0.2)
            return {"user_id": user_id, "data": {}}
        
        mock_arango_db.collection("resumes").get = slow_operation
        
        with pytest.raises(OptimizationError) as exc_info:
            await optimization_service.optimize_resume_sync(resume_id, job_id, user_id)
        
        assert exc_info.value.error_type == "timeout_error"
        assert "timed out" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_optimize_resume_sync_unexpected_error(self, optimization_service, mock_arango_db):
        """Test handling of unexpected errors."""
        resume_id = "resume-123"
        job_id = "job-456"
        user_id = "user-789"
        
        # Mock unexpected database error
        mock_arango_db.collection("resumes").get.side_effect = RuntimeError("Unexpected error")
        
        with pytest.raises(OptimizationError) as exc_info:
            await optimization_service.optimize_resume_sync(resume_id, job_id, user_id)
        
        assert exc_info.value.error_type == "unexpected_error"
        assert "Unexpected error" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_resume_data_success(self, optimization_service, mock_arango_db, sample_resume):
        """Test successful resume data retrieval."""
        resume_id = "resume-123"
        user_id = "user-789"
        
        mock_arango_db.collection("resumes").get.return_value = {
            "user_id": user_id,
            "data": sample_resume.model_dump()
        }
        
        result = await optimization_service._get_resume_data(resume_id, user_id)
        
        assert result == sample_resume.model_dump()
        mock_arango_db.collection("resumes").get.assert_called_once_with(resume_id)

    @pytest.mark.asyncio
    async def test_get_resume_data_not_found(self, optimization_service, mock_arango_db):
        """Test resume data retrieval when resume not found."""
        resume_id = "nonexistent-resume"
        user_id = "user-789"
        
        mock_arango_db.collection("resumes").get.return_value = None
        
        with pytest.raises(OptimizationError) as exc_info:
            await optimization_service._get_resume_data(resume_id, user_id)
        
        assert exc_info.value.error_type == "not_found_error"
        assert f"Resume {resume_id} not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_resume_data_unauthorized(self, optimization_service, mock_arango_db, sample_resume):
        """Test resume data retrieval with unauthorized access."""
        resume_id = "resume-123"
        user_id = "unauthorized-user"
        actual_owner = "actual-owner"
        
        mock_arango_db.collection("resumes").get.return_value = {
            "user_id": actual_owner,
            "data": sample_resume.model_dump()
        }
        
        with pytest.raises(OptimizationError) as exc_info:
            await optimization_service._get_resume_data(resume_id, user_id)
        
        assert exc_info.value.error_type == "authorization_error"
        assert f"Unauthorized access to resume {resume_id}" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_resume_data_no_data(self, optimization_service, mock_arango_db):
        """Test resume data retrieval when resume has no data."""
        resume_id = "empty-resume"
        user_id = "user-789"
        
        mock_arango_db.collection("resumes").get.return_value = {
            "user_id": user_id,
            "data": {}  # Empty data
        }
        
        with pytest.raises(OptimizationError) as exc_info:
            await optimization_service._get_resume_data(resume_id, user_id)
        
        assert exc_info.value.error_type == "data_error"
        assert f"Resume {resume_id} contains no data" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_job_data_success(self, optimization_service, mock_arango_db, sample_job):
        """Test successful job data retrieval."""
        job_id = "job-456"
        user_id = "user-789"
        
        mock_arango_db.collection("jobs").get.return_value = {
            "user_id": user_id,
            "data": sample_job.model_dump()
        }
        
        result = await optimization_service._get_job_data(job_id, user_id)
        
        assert result == sample_job.model_dump()
        mock_arango_db.collection("jobs").get.assert_called_once_with(job_id)

    @pytest.mark.asyncio
    async def test_get_job_data_not_found(self, optimization_service, mock_arango_db):
        """Test job data retrieval when job not found."""
        job_id = "nonexistent-job"
        user_id = "user-789"
        
        mock_arango_db.collection("jobs").get.return_value = None
        
        with pytest.raises(OptimizationError) as exc_info:
            await optimization_service._get_job_data(job_id, user_id)
        
        assert exc_info.value.error_type == "not_found_error"
        assert f"Job {job_id} not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_job_data_database_error(self, optimization_service, mock_arango_db):
        """Test job data retrieval with database error."""
        job_id = "job-456"
        user_id = "user-789"
        
        mock_arango_db.collection("jobs").get.side_effect = Exception("Database connection failed")
        
        with pytest.raises(OptimizationError) as exc_info:
            await optimization_service._get_job_data(job_id, user_id)
        
        assert exc_info.value.error_type == "data_fetch_error"
        assert "Failed to fetch job data" in str(exc_info.value)

    def test_is_resume_oversized_normal(self, optimization_service, sample_resume):
        """Test oversized check for normal resume."""
        result = optimization_service._is_resume_oversized(sample_resume)
        assert result is False

    def test_is_resume_oversized_large(self, optimization_service, large_resume):
        """Test oversized check for large resume."""
        result = optimization_service._is_resume_oversized(large_resume)
        assert result is True

    @pytest.mark.asyncio
    async def test_optimize_standard_success(self, optimization_service, sample_resume, sample_job):
        """Test successful standard optimization."""
        with patch('app.services.optimization_processor.optimize_agent') as mock_agent:
            mock_agent.run.return_value = sample_resume
            
            result = await optimization_service._optimize_standard(sample_resume, sample_job)
            
            assert isinstance(result, Resume)
            assert result == sample_resume
            mock_agent.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_optimize_standard_invalid_response(self, optimization_service, sample_resume, sample_job):
        """Test standard optimization with invalid AI response."""
        with patch('app.services.optimization_processor.optimize_agent') as mock_agent:
            mock_agent.run.return_value = "invalid response"  # Not a Resume object
            
            with pytest.raises(OptimizationError) as exc_info:
                await optimization_service._optimize_standard(sample_resume, sample_job)
            
            assert exc_info.value.error_type == "ai_service_error"
            assert "invalid response format" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_optimize_standard_rate_limit_error(self, optimization_service, sample_resume, sample_job):
        """Test standard optimization with rate limit error."""
        with patch('app.services.optimization_processor.optimize_agent') as mock_agent:
            mock_agent.run.side_effect = Exception("Rate limit exceeded")
            
            with pytest.raises(OptimizationError) as exc_info:
                await optimization_service._optimize_standard(sample_resume, sample_job)
            
            assert exc_info.value.error_type == "rate_limit_error"
            assert "rate limited" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_optimize_standard_auth_error(self, optimization_service, sample_resume, sample_job):
        """Test standard optimization with authentication error."""
        with patch('app.services.optimization_processor.optimize_agent') as mock_agent:
            mock_agent.run.side_effect = Exception("Authentication failed")
            
            with pytest.raises(OptimizationError) as exc_info:
                await optimization_service._optimize_standard(sample_resume, sample_job)
            
            assert exc_info.value.error_type == "authentication_error"
            assert "authentication error" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_optimize_with_chunking_success(self, optimization_service, large_resume, sample_job):
        """Test successful chunked optimization."""
        with patch.object(optimization_service, '_optimize_standard') as mock_standard:
            # Mock the standard optimization to return modified chunks
            def mock_optimize(resume_chunk, job):
                return resume_chunk  # Return the chunk as-is for simplicity
            
            mock_standard.side_effect = mock_optimize
            
            result = await optimization_service._optimize_with_chunking(large_resume, sample_job)
            
            assert isinstance(result, Resume)
            # Should have called _optimize_standard multiple times for chunking
            assert mock_standard.call_count > 1

    @pytest.mark.asyncio
    async def test_optimize_with_chunking_failure(self, optimization_service, large_resume, sample_job):
        """Test chunked optimization with failure."""
        with patch.object(optimization_service, '_optimize_standard') as mock_standard:
            mock_standard.side_effect = Exception("Chunked optimization failed")
            
            with pytest.raises(OptimizationError) as exc_info:
                await optimization_service._optimize_with_chunking(large_resume, sample_job)
            
            assert "Chunked optimization failed" in str(exc_info.value)

    def test_format_resume_as_markdown_complete(self, optimization_service, sample_resume):
        """Test markdown formatting with complete resume."""
        markdown = optimization_service._format_resume_as_markdown(sample_resume)
        
        # Check for key sections
        assert "# John Doe" in markdown
        assert "## Contact Information" in markdown
        assert "## Professional Summary" in markdown
        assert "## Work Experience" in markdown
        assert "## Education" in markdown
        assert "## Certifications" in markdown
        assert "## Skills" in markdown
        
        # Check for specific content
        assert "john.doe@example.com" in markdown
        assert "Software Engineer - Tech Corp" in markdown
        assert "Bachelor of Science" in markdown
        assert "AWS Certified Developer" in markdown

    def test_format_resume_as_markdown_minimal(self, optimization_service, sample_contact_info):
        """Test markdown formatting with minimal resume."""
        minimal_resume = Resume(
            contact_info=sample_contact_info,
            summary="",
            work_experience=[],
            education=[],
            certifications=[],
            skills=[]
        )
        
        markdown = optimization_service._format_resume_as_markdown(minimal_resume)
        
        # Should have name and contact info
        assert "# John Doe" in markdown
        assert "## Contact Information" in markdown
        
        # Should not have empty sections
        assert "## Work Experience" not in markdown
        assert "## Education" not in markdown

    @pytest.mark.asyncio
    async def test_store_optimization_result_success(self, optimization_service, mock_arango_db, sample_resume):
        """Test successful optimization result storage."""
        user_id = "user-789"
        resume_id = "resume-123"
        job_id = "job-456"
        markdown_content = "# Optimized Resume\n\nContent here"
        document_id = "doc-123"
        
        mock_arango_db.collection("documents").insert.return_value = {"_key": document_id}
        
        result_id = await optimization_service._store_optimization_result(
            user_id, resume_id, job_id, markdown_content, sample_resume
        )
        
        assert result_id == document_id
        
        # Verify the document structure
        mock_arango_db.collection("documents").insert.assert_called_once()
        call_args = mock_arango_db.collection("documents").insert.call_args[0][0]
        
        assert call_args["type"] == "optimization"
        assert call_args["user_id"] == user_id
        assert call_args["resume_id"] == resume_id
        assert call_args["job_id"] == job_id
        assert call_args["content"] == markdown_content
        assert call_args["optimized_data"] == sample_resume.model_dump()
        assert call_args["status"] == "completed"
        assert "created_at" in call_args

    @pytest.mark.asyncio
    async def test_store_optimization_result_storage_error(self, optimization_service, mock_arango_db, sample_resume):
        """Test optimization result storage with database error."""
        user_id = "user-789"
        resume_id = "resume-123"
        job_id = "job-456"
        markdown_content = "# Content"
        
        mock_arango_db.collection("documents").insert.side_effect = Exception("Storage failed")
        
        with pytest.raises(OptimizationError) as exc_info:
            await optimization_service._store_optimization_result(
                user_id, resume_id, job_id, markdown_content, sample_resume
            )
        
        assert exc_info.value.error_type == "storage_error"
        assert "Failed to store optimization result" in str(exc_info.value)


class TestOptimizationError:
    """Test OptimizationError custom exception."""

    def test_optimization_error_default_type(self):
        """Test OptimizationError with default error type."""
        error = OptimizationError("Test error message")
        assert str(error) == "Test error message"
        assert error.error_type == "processing_error"

    def test_optimization_error_custom_type(self):
        """Test OptimizationError with custom error type."""
        error = OptimizationError("Custom error", "custom_error_type")
        assert str(error) == "Custom error"
        assert error.error_type == "custom_error_type"


class TestIntegrationScenarios:
    """Test integration scenarios and complex workflows."""

    @pytest.mark.asyncio
    async def test_full_optimization_workflow_normal_resume(
        self, optimization_service, mock_arango_db, sample_resume, sample_job
    ):
        """Test complete optimization workflow for normal-sized resume."""
        resume_id = "resume-123"
        job_id = "job-456"
        user_id = "user-789"
        document_id = "doc-123"
        
        # Setup mocks
        mock_arango_db.collection("resumes").get.return_value = {
            "user_id": user_id,
            "data": sample_resume.model_dump()
        }
        mock_arango_db.collection("jobs").get.return_value = {
            "user_id": user_id,
            "data": sample_job.model_dump()
        }
        mock_arango_db.collection("documents").insert.return_value = {"_key": document_id}
        
        with patch('app.services.optimization_processor.optimize_agent') as mock_agent:
            mock_agent.run.return_value = sample_resume
            
            result = await optimization_service.optimize_resume_sync(resume_id, job_id, user_id)
        
        # Verify complete workflow
        assert result["type"] == "optimization"
        assert result["status"] == "completed"
        assert result["document_id"] == document_id
        
        # Verify all collections were accessed
        mock_arango_db.collection("resumes").get.assert_called_once_with(resume_id)
        mock_arango_db.collection("jobs").get.assert_called_once_with(job_id)
        mock_arango_db.collection("documents").insert.assert_called_once()

    @pytest.mark.asyncio
    async def test_full_optimization_workflow_large_resume(
        self, optimization_service, mock_arango_db, large_resume, sample_job
    ):
        """Test complete optimization workflow for oversized resume with chunking."""
        resume_id = "large-resume-123"
        job_id = "job-456"
        user_id = "user-789"
        document_id = "doc-123"
        
        # Setup mocks
        mock_arango_db.collection("resumes").get.return_value = {
            "user_id": user_id,
            "data": large_resume.model_dump()
        }
        mock_arango_db.collection("jobs").get.return_value = {
            "user_id": user_id,
            "data": sample_job.model_dump()
        }
        mock_arango_db.collection("documents").insert.return_value = {"_key": document_id}
        
        with patch('app.services.optimization_processor.optimize_agent') as mock_agent:
            # Mock agent to return reasonable chunks
            def mock_optimize(input_text):
                # Create a minimal resume for the chunk
                return Resume(
                    contact_info=large_resume.contact_info,
                    summary="Optimized summary",
                    work_experience=large_resume.work_experience[:3],  # Return first 3
                    education=[],
                    certifications=[],
                    skills=large_resume.skills[:10]  # Return first 10 skills
                )
            
            mock_agent.run.side_effect = mock_optimize
            
            result = await optimization_service.optimize_resume_sync(resume_id, job_id, user_id)
        
        # Verify chunking was used (multiple AI calls)
        assert mock_agent.run.call_count > 1
        assert result["type"] == "optimization"
        assert result["status"] == "completed"

    @pytest.mark.asyncio
    async def test_error_recovery_and_logging(self, optimization_service, mock_arango_db):
        """Test error recovery and proper error logging."""
        resume_id = "resume-123"
        job_id = "job-456"
        user_id = "user-789"
        
        # Mock database failure
        mock_arango_db.collection("resumes").get.side_effect = Exception("Database connection lost")
        
        with patch('app.services.optimization_processor.logger') as mock_logger:
            with pytest.raises(OptimizationError):
                await optimization_service.optimize_resume_sync(resume_id, job_id, user_id)
            
            # Verify error logging occurred
            mock_logger.error.assert_called()

    @pytest.mark.asyncio
    async def test_concurrent_optimization_safety(self, optimization_service, mock_arango_db, sample_resume, sample_job):
        """Test that concurrent optimizations don't interfere with each other."""
        user_id = "user-789"
        
        # Setup mocks for different resumes/jobs
        def mock_get_resume(resume_id):
            return {"user_id": user_id, "data": sample_resume.model_dump()}
        
        def mock_get_job(job_id):
            return {"user_id": user_id, "data": sample_job.model_dump()}
        
        mock_arango_db.collection("resumes").get.side_effect = mock_get_resume
        mock_arango_db.collection("jobs").get.side_effect = mock_get_job
        mock_arango_db.collection("documents").insert.return_value = {"_key": "doc-123"}
        
        with patch('app.services.optimization_processor.optimize_agent') as mock_agent:
            mock_agent.run.return_value = sample_resume
            
            # Run multiple optimizations concurrently
            tasks = [
                optimization_service.optimize_resume_sync(f"resume-{i}", f"job-{i}", user_id)
                for i in range(3)
            ]
            
            results = await asyncio.gather(*tasks)
            
            # All should succeed
            assert len(results) == 3
            for result in results:
                assert result["status"] == "completed"

    @pytest.mark.asyncio
    async def test_markdown_formatting_edge_cases(self, optimization_service, sample_contact_info):
        """Test markdown formatting with various edge cases."""
        # Resume with missing optional fields
        edge_case_resume = Resume(
            contact_info=ContactInfo(
                full_name="Test User",
                email=None,  # Missing email
                phone=None,  # Missing phone
                address=None,  # Missing address
                links=[]
            ),
            summary="",  # Empty summary
            work_experience=[
                WorkExperience(
                    position="Developer",
                    company="Company",
                    start_date=None,  # Missing dates
                    end_date=None,
                    is_current=False,
                    description="",  # Empty description
                    responsibilities=[],  # Empty responsibilities
                    skills=[]  # Empty skills
                )
            ],
            education=[
                Education(
                    degree="Degree",
                    field_of_study=None,  # Missing field
                    institution="School",
                    graduation_date=None,  # Missing date
                    gpa=None,
                    honors=[],
                    relevant_courses=[]
                )
            ],
            certifications=[],
            skills=[]
        )
        
        markdown = optimization_service._format_resume_as_markdown(edge_case_resume)
        
        # Should handle missing fields gracefully
        assert "# Test User" in markdown
        assert "## Work Experience" in markdown
        assert "### Developer - Company" in markdown
        assert "## Education" in markdown