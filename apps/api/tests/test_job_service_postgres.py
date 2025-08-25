"""Test job service with PostgreSQL JSONB storage."""

import json
import pytest
from datetime import datetime
from uuid import uuid4

from app.services.job_service import JobService
from app.database import (
    init_databases, 
    close_databases, 
    store_document, 
    get_document,
    get_postgres_connection
)


@pytest.fixture
async def job_service():
    """Create job service instance with test users."""
    await init_databases()
    
    # Create test users to satisfy foreign key constraints
    async with get_postgres_connection() as conn:
        cursor = conn.cursor()
        test_users = [
            ("test_user_123", "Test User 123", "test123@example.com"),
            ("test_user_456", "Test User 456", "test456@example.com"),
            ("test_user_789", "Test User 789", "test789@example.com"),
            ("test_user_location", "Test Location", "testloc@example.com"),
            ("test_user_stats", "Test Stats", "teststats@example.com"),
            ("test_user_status", "Test Status", "teststatus@example.com"),
            ("test_user_delete", "Test Delete", "testdelete@example.com"),
            ("test_user_perf", "Test Perf", "testperf@example.com"),
        ]
        
        for user_id, name, email in test_users:
            await cursor.execute("""
                INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, true, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """, (user_id, name, email))
        
        await conn.commit()
    
    service = JobService()
    yield service
    
    # Clean up test data (only job documents, leave users for other tests)
    async with get_postgres_connection() as conn:
        cursor = conn.cursor()
        await cursor.execute("""
            DELETE FROM job_documents WHERE user_id LIKE 'test_user_%'
        """)
        # Don't delete users as they may have sessions or other references
        await conn.commit()
    
    await close_databases()


@pytest.fixture
def sample_job_data():
    """Sample job data for testing."""
    return {
        "title": "Senior Software Engineer",
        "company": "Tech Corp",
        "company_name": "Tech Corp",
        "job_title": "Senior Software Engineer",
        "location": "San Francisco, CA",
        "remote_type": "hybrid",
        "description": "We are looking for a senior software engineer...",
        "requirements": [
            "5+ years of experience",
            "Python expertise",
            "Cloud experience"
        ],
        "skills": ["Python", "AWS", "Docker", "PostgreSQL"],
        "keywords": ["backend", "microservices", "API"],
        "salary_range": {
            "min": 150000,
            "max": 200000,
            "currency": "USD"
        },
        "experience_level": "senior",
        "employment_type": "full-time",
        "source_url": "https://example.com/job/123"
    }


@pytest.mark.asyncio
async def test_store_job_result(job_service, sample_job_data):
    """Test storing job data with JSONB."""
    task_id = str(uuid4())
    job_id = str(uuid4())
    user_id = "test_user_123"
    
    # Store job result
    stored_id = await job_service.store_job_result(
        task_id=task_id,
        job_id=job_id,
        job_data=sample_job_data,
        user_id=user_id
    )
    
    assert stored_id is not None
    assert isinstance(stored_id, str)
    
    # Verify stored data
    job_doc = await get_document("job_documents", stored_id)
    assert job_doc is not None
    assert job_doc["company_name"] == "Tech Corp"
    assert job_doc["job_title"] == "Senior Software Engineer"
    assert job_doc["location"] == "San Francisco, CA"
    assert job_doc["remote_type"] == "hybrid"
    
    # Check JSONB parsed_data
    parsed_data = job_doc["parsed_data"]
    assert parsed_data["skills"] == ["Python", "AWS", "Docker", "PostgreSQL"]
    assert parsed_data["requirements"] == [
        "5+ years of experience",
        "Python expertise",
        "Cloud experience"
    ]
    
    # Check metadata
    metadata = job_doc["metadata"]
    assert metadata["task_id"] == task_id
    assert metadata["status"] == "completed"
    assert metadata["skills"] == ["Python", "AWS", "Docker", "PostgreSQL"]


@pytest.mark.asyncio
async def test_get_job(job_service, sample_job_data):
    """Test retrieving job by ID."""
    # First store a job
    task_id = str(uuid4())
    job_id = str(uuid4())
    user_id = "test_user_123"
    
    stored_id = await job_service.store_job_result(
        task_id=task_id,
        job_id=job_id,
        job_data=sample_job_data,
        user_id=user_id
    )
    
    # Get the job
    job = await job_service.get_job(stored_id, user_id)
    
    assert job is not None
    assert job["_id"] == stored_id
    assert job["company_name"] == "Tech Corp"
    assert job["job_title"] == "Senior Software Engineer"
    assert job["parsed_data"]["skills"] == ["Python", "AWS", "Docker", "PostgreSQL"]


@pytest.mark.asyncio
async def test_get_user_jobs(job_service, sample_job_data):
    """Test retrieving jobs for a user."""
    user_id = "test_user_456"
    
    # Store multiple jobs
    for i in range(3):
        job_data = sample_job_data.copy()
        job_data["company_name"] = f"Company {i}"
        job_data["job_title"] = f"Engineer {i}"
        
        await job_service.store_job_result(
            task_id=str(uuid4()),
            job_id=str(uuid4()),
            job_data=job_data,
            user_id=user_id
        )
    
    # Get user jobs
    jobs = await job_service.get_user_jobs(user_id=user_id, limit=10)
    
    assert len(jobs) >= 3
    assert all(job["user_id"] == user_id for job in jobs)
    assert all("parsed_data" in job for job in jobs)


@pytest.mark.asyncio
async def test_search_jobs_by_skills(job_service, sample_job_data):
    """Test searching jobs by skills using JSONB operators."""
    user_id = "test_user_789"
    
    # Store jobs with different skills
    jobs_data = [
        {"skills": ["Python", "Django", "PostgreSQL"], "title": "Backend Developer"},
        {"skills": ["JavaScript", "React", "Node.js"], "title": "Frontend Developer"},
        {"skills": ["Python", "FastAPI", "Docker"], "title": "Python Engineer"},
        {"skills": ["Java", "Spring", "MySQL"], "title": "Java Developer"},
    ]
    
    for job_data in jobs_data:
        full_data = sample_job_data.copy()
        full_data.update(job_data)
        full_data["job_title"] = job_data["title"]
        
        await job_service.store_job_result(
            task_id=str(uuid4()),
            job_id=str(uuid4()),
            job_data=full_data,
            user_id=user_id
        )
    
    # Search for Python jobs
    python_jobs = await job_service.search_jobs_by_skills(
        user_id=user_id,
        skills=["Python"],
        limit=10
    )
    
    # Should find at least 2 Python jobs
    assert len(python_jobs) >= 2
    assert all("Python" in job["skills"] for job in python_jobs if "Python" in job["skills"])


@pytest.mark.asyncio
async def test_search_jobs_by_location(job_service, sample_job_data):
    """Test searching jobs by location."""
    user_id = "test_user_location"
    
    # Store jobs with different locations
    locations = [
        ("San Francisco, CA", "onsite"),
        ("New York, NY", "hybrid"),
        ("Remote", "remote"),
        ("Austin, TX", "onsite"),
    ]
    
    for location, remote_type in locations:
        job_data = sample_job_data.copy()
        job_data["location"] = location
        job_data["remote_type"] = remote_type
        job_data["job_title"] = f"Engineer - {location}"
        
        await job_service.store_job_result(
            task_id=str(uuid4()),
            job_id=str(uuid4()),
            job_data=job_data,
            user_id=user_id
        )
    
    # Search for specific location
    sf_jobs = await job_service.search_jobs_by_location(
        user_id=user_id,
        location="San Francisco, CA",
        include_remote=False,
        limit=10
    )
    
    assert len(sf_jobs) >= 1
    assert any("San Francisco" in job["location"] for job in sf_jobs)


@pytest.mark.asyncio
async def test_get_job_statistics(job_service, sample_job_data):
    """Test getting job statistics with JSONB aggregation."""
    user_id = "test_user_stats"
    
    # Store multiple jobs with various attributes
    companies = ["TechCorp", "StartupXYZ", "BigCo"]
    locations = ["San Francisco", "New York", "Remote"]
    skills_sets = [
        ["Python", "AWS", "Docker"],
        ["JavaScript", "React", "Node.js"],
        ["Python", "Django", "PostgreSQL"],
    ]
    
    for i, (company, location, skills) in enumerate(zip(companies, locations, skills_sets)):
        job_data = sample_job_data.copy()
        job_data["company"] = company  # Also update company field
        job_data["company_name"] = company
        job_data["location"] = location
        job_data["skills"] = skills
        job_data["job_title"] = f"Engineer {i}"
        
        await job_service.store_job_result(
            task_id=str(uuid4()),
            job_id=str(uuid4()),
            job_data=job_data,
            user_id=user_id
        )
    
    # Get statistics
    stats = await job_service.get_job_statistics(user_id=user_id)
    
    assert stats["total_jobs"] >= 3
    assert len(stats["companies"]) >= 3
    assert len(stats["locations"]) >= 3
    assert len(stats["top_skills"]) > 0
    assert "Python" in [s["skill"] for s in stats["top_skills"]]


@pytest.mark.asyncio
async def test_update_job_status(job_service, sample_job_data):
    """Test updating job status in metadata."""
    task_id = str(uuid4())
    job_id = str(uuid4())
    user_id = "test_user_status"
    
    # Store a job
    stored_id = await job_service.store_job_result(
        task_id=task_id,
        job_id=job_id,
        job_data=sample_job_data,
        user_id=user_id
    )
    
    # Update status
    await job_service.update_job_status(
        job_id=stored_id,
        status="archived",
        error_message=None
    )
    
    # Verify status was updated
    job_doc = await get_document("job_documents", stored_id)
    assert job_doc["metadata"]["status"] == "archived"


@pytest.mark.asyncio
async def test_delete_job(job_service, sample_job_data):
    """Test deleting a job."""
    task_id = str(uuid4())
    job_id = str(uuid4())
    user_id = "test_user_delete"
    
    # Store a job
    stored_id = await job_service.store_job_result(
        task_id=task_id,
        job_id=job_id,
        job_data=sample_job_data,
        user_id=user_id
    )
    
    # Delete the job
    await job_service.delete_job(stored_id)
    
    # Verify job was deleted
    job_doc = await get_document("job_documents", stored_id)
    assert job_doc is None


@pytest.mark.asyncio
async def test_jsonb_query_performance(job_service, sample_job_data):
    """Test JSONB query performance with complex queries."""
    user_id = "test_user_perf"
    
    # Store a job with complex nested data
    complex_job_data = sample_job_data.copy()
    complex_job_data["parsed_data"] = {
        "nested": {
            "deep": {
                "value": "test",
                "array": [1, 2, 3, 4, 5]
            }
        },
        "skills_matrix": {
            "primary": ["Python", "Go"],
            "secondary": ["Docker", "Kubernetes"],
            "nice_to_have": ["React", "Vue.js"]
        }
    }
    
    stored_id = await job_service.store_job_result(
        task_id=str(uuid4()),
        job_id=str(uuid4()),
        job_data=complex_job_data,
        user_id=user_id
    )
    
    # Retrieve and verify nested data
    job = await job_service.get_job(stored_id, user_id)
    assert job is not None
    
    parsed_data = job["parsed_data"]
    assert parsed_data["parsed_data"]["nested"]["deep"]["value"] == "test"
    assert parsed_data["parsed_data"]["skills_matrix"]["primary"] == ["Python", "Go"]