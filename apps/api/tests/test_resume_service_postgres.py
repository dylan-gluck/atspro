"""Test resume service with PostgreSQL JSONB storage."""

import json
import pytest
from datetime import datetime
from uuid import uuid4

from app.services.resume_service import ResumeService
from app.database import (
    init_databases, 
    close_databases, 
    store_document, 
    get_document,
    get_postgres_connection
)


@pytest.fixture
async def resume_service():
    """Create resume service instance with test users."""
    await init_databases()
    
    # Create test users to satisfy foreign key constraints
    async with get_postgres_connection() as conn:
        cursor = conn.cursor()
        test_users = [
            ("test_user_resume_123", "Test Resume User 123", "testresume123@example.com"),
            ("test_user_resume_456", "Test Resume User 456", "testresume456@example.com"),
            ("test_user_resume_789", "Test Resume User 789", "testresume789@example.com"),
        ]
        
        for user_id, name, email in test_users:
            await cursor.execute("""
                INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, true, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """, (user_id, name, email))
        
        await conn.commit()
    
    service = ResumeService()
    yield service
    
    # Clean up test data
    async with get_postgres_connection() as conn:
        cursor = conn.cursor()
        await cursor.execute("""
            DELETE FROM resume_documents WHERE user_id LIKE 'test_user_resume_%'
        """)
        await conn.commit()
    
    await close_databases()


@pytest.fixture
def sample_resume_data():
    """Sample resume data for testing."""
    return {
        "contact_info": {
            "full_name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+1-555-123-4567",
            "address": "123 Main St, City, State 12345",
            "links": [{"name": "LinkedIn", "url": "https://linkedin.com/in/johndoe"}]
        },
        "summary": "Experienced software developer with expertise in Python and cloud technologies.",
        "work_experience": [
            {
                "position": "Senior Software Engineer",
                "company": "Tech Corp",
                "start_date": "2020-01",
                "end_date": "2023-01",
                "is_current": False,
                "description": "Led development of microservices architecture",
                "responsibilities": ["Designed APIs", "Mentored junior developers"],
                "skills": ["Python", "FastAPI", "Docker"]
            }
        ],
        "education": [
            {
                "degree": "Bachelor of Science",
                "field_of_study": "Computer Science",
                "institution": "State University",
                "graduation_date": "2019",
                "gpa": "3.8",
                "honors": ["Magna Cum Laude"],
                "relevant_courses": ["Data Structures", "Algorithms"]
            }
        ],
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
        "certifications": []
    }


@pytest.mark.asyncio
async def test_create_resume_placeholder(resume_service):
    """Test creating a resume placeholder."""
    resume_id = str(uuid4())
    user_id = "test_user_resume_123"
    task_id = str(uuid4())
    
    # Create placeholder
    result_id = await resume_service.create_resume_placeholder(
        resume_id=resume_id,
        user_id=user_id,
        task_id=task_id
    )
    
    assert result_id == resume_id
    
    # Verify it was created
    resume = await resume_service.get_resume(resume_id)
    assert resume is not None
    assert resume["user_id"] == user_id
    assert resume["task_id"] == task_id
    assert resume["status"] == "parsing"


@pytest.mark.asyncio
async def test_update_resume_data(resume_service, sample_resume_data):
    """Test updating resume with parsed data."""
    resume_id = str(uuid4())
    user_id = "test_user_resume_123"
    task_id = str(uuid4())
    
    # Create placeholder first
    await resume_service.create_resume_placeholder(
        resume_id=resume_id,
        user_id=user_id,
        task_id=task_id
    )
    
    # Update with data
    file_metadata = {
        "filename": "test_resume.pdf",
        "size": 1024,
        "content_type": "application/pdf"
    }
    
    success = await resume_service.update_resume_data(
        resume_id=resume_id,
        resume_data=sample_resume_data,
        file_metadata=file_metadata
    )
    
    assert success is True
    
    # Verify update
    resume = await resume_service.get_resume(resume_id)
    assert resume is not None
    assert resume["status"] == "manual"
    assert resume["resume_data"] == sample_resume_data
    assert resume["file_metadata"] == file_metadata


@pytest.mark.asyncio
async def test_update_resume_status(resume_service):
    """Test updating resume status."""
    resume_id = str(uuid4())
    user_id = "test_user_resume_123"
    task_id = str(uuid4())
    
    # Create placeholder
    await resume_service.create_resume_placeholder(
        resume_id=resume_id,
        user_id=user_id,
        task_id=task_id
    )
    
    # Update status to completed
    success = await resume_service.update_resume_status(
        resume_id=resume_id,
        status="parsed"
    )
    
    assert success is True
    
    # Verify status update
    resume = await resume_service.get_resume(resume_id)
    assert resume["status"] == "parsed"
    
    # Update status to failed with error
    error_msg = "Processing failed"
    success = await resume_service.update_resume_status(
        resume_id=resume_id,
        status="failed",
        error_message=error_msg
    )
    
    assert success is True
    
    resume = await resume_service.get_resume(resume_id)
    assert resume["status"] == "failed"
    assert resume["error_message"] == error_msg


@pytest.mark.asyncio
async def test_get_user_resumes(resume_service, sample_resume_data):
    """Test retrieving user resumes."""
    user_id = "test_user_resume_456"
    
    # Create multiple resumes
    resume_ids = []
    for i in range(3):
        resume_id = str(uuid4())
        resume_ids.append(resume_id)
        
        await resume_service.create_resume_placeholder(
            resume_id=resume_id,
            user_id=user_id,
            task_id=str(uuid4())
        )
        
        # Set different statuses
        if i == 0:
            await resume_service.update_resume_status(resume_id, "parsed")
        elif i == 1:
            await resume_service.update_resume_status(resume_id, "parsing")
        else:
            await resume_service.update_resume_status(resume_id, "failed", "Test error")
    
    # Get all resumes
    resumes = await resume_service.get_user_resumes(user_id)
    assert len(resumes) == 3
    
    # Get filtered by status
    parsed_resumes = await resume_service.get_user_resumes(user_id, status="parsed")
    assert len(parsed_resumes) == 1
    assert parsed_resumes[0]["status"] == "parsed"
    
    # Test pagination
    page1 = await resume_service.get_user_resumes(user_id, limit=2, offset=0)
    assert len(page1) <= 2
    
    page2 = await resume_service.get_user_resumes(user_id, limit=2, offset=2)
    assert len(page2) <= 1


@pytest.mark.asyncio
async def test_delete_resume(resume_service):
    """Test deleting a resume."""
    resume_id = str(uuid4())
    user_id = "test_user_resume_123"
    
    # Create resume
    await resume_service.create_resume_placeholder(
        resume_id=resume_id,
        user_id=user_id,
        task_id=str(uuid4())
    )
    
    # Verify it exists
    resume = await resume_service.get_resume(resume_id)
    assert resume is not None
    
    # Delete it
    success = await resume_service.delete_resume(resume_id)
    assert success is True
    
    # Verify it's gone
    resume = await resume_service.get_resume(resume_id)
    assert resume is None
    
    # Delete with user verification
    resume_id2 = str(uuid4())
    await resume_service.create_resume_placeholder(
        resume_id=resume_id2,
        user_id=user_id,
        task_id=str(uuid4())
    )
    
    # Try to delete with wrong user
    success = await resume_service.delete_resume(resume_id2, "wrong_user")
    assert success is False
    
    # Delete with correct user
    success = await resume_service.delete_resume(resume_id2, user_id)
    assert success is True


@pytest.mark.asyncio
async def test_search_resumes(resume_service, sample_resume_data):
    """Test searching resumes with JSONB queries."""
    user_id = "test_user_resume_789"
    
    # Create resumes with different data
    resume_data_variations = [
        {**sample_resume_data, "summary": "Python developer with FastAPI experience"},
        {**sample_resume_data, "summary": "Java developer with Spring Boot experience"},
        {**sample_resume_data, "summary": "JavaScript developer with React experience"}
    ]
    
    resume_ids = []
    for i, data in enumerate(resume_data_variations):
        resume_id = str(uuid4())
        resume_ids.append(resume_id)
        
        await resume_service.create_resume_placeholder(
            resume_id=resume_id,
            user_id=user_id,
            task_id=str(uuid4())
        )
        
        await resume_service.update_resume_data(
            resume_id=resume_id,
            resume_data=data
        )
    
    # Search for Python
    results = await resume_service.search_resumes(user_id, "Python")
    assert len(results) >= 1
    assert any("Python" in str(r.get("resume_data", {})) for r in results)
    
    # Search for non-existent term
    results = await resume_service.search_resumes(user_id, "Rust")
    # Should still return results if term appears anywhere
    
    # Test limit
    results = await resume_service.search_resumes(user_id, "developer", limit=2)
    assert len(results) <= 2


@pytest.mark.asyncio
async def test_resume_statistics(resume_service):
    """Test getting resume statistics."""
    user_id = "test_user_resume_123"
    
    # Create resumes with different statuses
    statuses = ["parsed", "parsed", "parsing", "failed"]
    for status in statuses:
        resume_id = str(uuid4())
        await resume_service.create_resume_placeholder(
            resume_id=resume_id,
            user_id=user_id,
            task_id=str(uuid4())
        )
        await resume_service.update_resume_status(resume_id, status)
    
    # Get statistics
    stats = await resume_service.get_resume_statistics(user_id)
    
    assert stats["total"] == 4
    assert stats["by_status"]["parsed"] == 2
    assert stats["by_status"]["parsing"] == 1
    assert stats["by_status"]["failed"] == 1


@pytest.mark.asyncio
async def test_create_manual_resume(resume_service, sample_resume_data):
    """Test creating a manual resume."""
    resume_id = str(uuid4())
    user_id = "test_user_resume_123"
    
    # Create manual resume
    result_id = await resume_service.create_manual_resume(
        resume_id=resume_id,
        user_id=user_id,
        resume_data=sample_resume_data
    )
    
    assert result_id == resume_id
    
    # Verify it was created with correct status
    resume = await resume_service.get_resume(resume_id)
    assert resume is not None
    assert resume["user_id"] == user_id
    assert resume["status"] == "manual"
    assert resume["source"] == "manual"
    assert resume["resume_data"] == sample_resume_data


@pytest.mark.asyncio
async def test_validate_resume_data(resume_service, sample_resume_data):
    """Test resume data validation."""
    # Valid data
    is_valid, error = await resume_service.validate_resume_data(sample_resume_data)
    assert is_valid is True
    assert error is None
    
    # Invalid data - missing required fields
    invalid_data = {
        "summary": "Test summary"
        # Missing contact_info
    }
    
    is_valid, error = await resume_service.validate_resume_data(invalid_data)
    assert is_valid is False
    assert error is not None
    assert "validation failed" in error.lower()


@pytest.mark.asyncio
async def test_jsonb_specific_queries(resume_service, sample_resume_data):
    """Test JSONB-specific query operations."""
    user_id = "test_user_resume_789"
    
    # Create resume with specific skills
    resume_id = str(uuid4())
    await resume_service.create_resume_placeholder(
        resume_id=resume_id,
        user_id=user_id,
        task_id=str(uuid4())
    )
    
    await resume_service.update_resume_data(
        resume_id=resume_id,
        resume_data=sample_resume_data
    )
    
    # Search by skill
    results = await resume_service.search_by_skill(user_id, "Python")
    assert len(results) >= 1
    
    # Find by email
    results = await resume_service.find_by_email(user_id, "john.doe@example.com")
    assert len(results) >= 1
    
    # Find by multiple skills
    results = await resume_service.find_by_multiple_skills(user_id, ["Python", "FastAPI"])
    assert len(results) >= 1


@pytest.mark.asyncio
async def test_edge_cases(resume_service):
    """Test edge cases and error handling."""
    # Get non-existent resume
    resume = await resume_service.get_resume("non-existent-id")
    assert resume is None
    
    # Update non-existent resume
    success = await resume_service.update_resume_status("non-existent-id", "parsed")
    assert success is False
    
    # Delete non-existent resume
    success = await resume_service.delete_resume("non-existent-id")
    assert success is False
    
    # Search with empty user
    results = await resume_service.get_user_resumes("non-existent-user")
    assert results == []
    
    # Statistics for user with no resumes
    stats = await resume_service.get_resume_statistics("non-existent-user")
    assert stats["total"] == 0
    assert stats["by_status"] == {}


@pytest.mark.asyncio
async def test_concurrent_operations(resume_service):
    """Test concurrent resume operations."""
    import asyncio
    
    user_id = "test_user_resume_123"
    
    # Create multiple resumes concurrently
    tasks = []
    resume_ids = []
    for i in range(5):
        resume_id = str(uuid4())
        resume_ids.append(resume_id)
        task = resume_service.create_resume_placeholder(
            resume_id=resume_id,
            user_id=user_id,
            task_id=str(uuid4())
        )
        tasks.append(task)
    
    results = await asyncio.gather(*tasks)
    
    # All should succeed
    assert all(r is not None for r in results)
    assert len(results) == 5
    
    # Verify all were created
    for resume_id in resume_ids:
        resume = await resume_service.get_resume(resume_id)
        assert resume is not None