import os
import json
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4

import pytest


# Ensure GEMINI_API_KEY environment variable is set for tests
@pytest.fixture(autouse=True)
def mock_env_variables():
    with patch.dict(os.environ, {"GEMINI_API_KEY": "test_api_key"}):
        yield


@pytest.fixture
async def clean_database_state():
    """Clean up database global state before and after tests."""
    # Import here to avoid circular imports
    from app.database import connections
    from app import dependencies

    # Clean up before test
    await _reset_database_globals()
    await _reset_service_globals()

    yield

    # Clean up after test
    await _reset_database_globals()
    await _reset_service_globals()


async def _reset_database_globals():
    """Reset all database global variables to None."""
    from app.database import connections

    # Close existing connections first
    try:
        await connections.close_databases()
    except Exception:
        pass  # Ignore errors during cleanup

    # Reset global variables directly
    connections._postgres_pool = None


async def _reset_service_globals():
    """Reset all service global variables to None."""
    from app import dependencies

    # Shutdown services if they exist
    try:
        await dependencies.shutdown_services()
    except Exception:
        pass  # Ignore errors during cleanup

    # Reset global variables directly
    dependencies._task_service = None
    dependencies._job_service = None


@pytest.fixture
def mock_database_failure():
    """Mock database initialization failures for testing error handling."""
    original_init_postgres = None

    def _mock_postgres_failure():
        nonlocal original_init_postgres
        from app.database import connections

        original_init_postgres = connections.init_postgres

        async def failing_init_postgres():
            raise Exception("Mock PostgreSQL connection failure")

        connections.init_postgres = failing_init_postgres
        return connections.init_postgres

    def _restore_originals():
        if original_init_postgres:
            from app.database import connections

            connections.init_postgres = original_init_postgres

    # Return helper functions for test control
    class MockController:
        def mock_postgres_failure(self):
            return _mock_postgres_failure()

        def restore_all(self):
            _restore_originals()

    controller = MockController()
    yield controller

    # Cleanup: restore original functions
    _restore_originals()


# PostgreSQL-specific test fixtures
@pytest.fixture
def mock_postgres_connection():
    """Mock PostgreSQL connection for testing."""
    mock_conn = AsyncMock()
    mock_cursor = AsyncMock()
    
    # Setup cursor mock
    mock_cursor.execute = AsyncMock()
    mock_cursor.fetchone = AsyncMock()
    mock_cursor.fetchall = AsyncMock()
    mock_conn.cursor = MagicMock(return_value=mock_cursor)
    mock_conn.transaction = AsyncMock()
    mock_conn.execute = AsyncMock()
    
    # Row factory for dict results
    mock_conn.row_factory = None
    
    return mock_conn, mock_cursor


@pytest.fixture
def mock_postgres_pool(mock_postgres_connection):
    """Mock PostgreSQL connection pool."""
    mock_conn, mock_cursor = mock_postgres_connection
    mock_pool = AsyncMock()
    
    # Setup pool methods
    mock_pool.wait = AsyncMock()
    mock_pool.close = AsyncMock()
    mock_pool.connection = AsyncMock()
    mock_pool.connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.connection.return_value.__aexit__ = AsyncMock()
    mock_pool.get_stats = MagicMock(return_value={
        "pool_size": 10,
        "pool_available": 8,
        "requests_waiting": 0
    })
    
    return mock_pool


@pytest.fixture
def sample_resume_data():
    """Sample resume data for testing."""
    return {
        "filename": "test_resume.pdf",
        "content_type": "application/pdf",
        "file_size": 1024,
        "parsed_data": {
            "personal_info": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1234567890"
            },
            "summary": "Experienced software engineer",
            "experience": [
                {
                    "title": "Senior Developer",
                    "company": "Tech Corp",
                    "duration": "2020-2023",
                    "responsibilities": ["Led team", "Developed features"]
                }
            ],
            "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            "education": [
                {
                    "degree": "BS Computer Science",
                    "university": "State University",
                    "year": "2018"
                }
            ]
        }
    }


@pytest.fixture
def sample_job_data():
    """Sample job posting data for testing."""
    return {
        "company_name": "Tech Corp",
        "job_title": "Senior Software Engineer",
        "location": "San Francisco, CA",
        "remote_type": "hybrid",
        "job_url": "https://example.com/job/123",
        "is_active": True,
        "parsed_data": {
            "title": "Senior Software Engineer",
            "company": "Tech Corp",
            "description": "We are looking for an experienced engineer",
            "requirements": [
                "5+ years Python experience",
                "FastAPI knowledge",
                "PostgreSQL expertise"
            ],
            "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
            "benefits": ["Health insurance", "401k", "Remote work"]
        }
    }


@pytest.fixture
def sample_optimization_data():
    """Sample optimization result data for testing."""
    return {
        "resume_id": str(uuid4()),
        "job_id": str(uuid4()),
        "optimization_type": "targeted",
        "optimized_content": {
            "summary": "Experienced software engineer with strong Python and FastAPI skills",
            "experience": [
                {
                    "title": "Senior Developer",
                    "company": "Tech Corp",
                    "duration": "2020-2023",
                    "responsibilities": [
                        "Led team using Agile methodologies",
                        "Developed microservices with FastAPI and PostgreSQL"
                    ],
                    "keywords_added": ["FastAPI", "PostgreSQL", "microservices"]
                }
            ],
            "skills": {
                "technical": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
                "matched": ["Python", "FastAPI", "PostgreSQL"],
                "added": ["AWS"]
            },
            "score": {
                "overall": 85,
                "skill_match": 90,
                "experience_match": 80
            }
        }
    }


@pytest.fixture
async def mock_store_document():
    """Mock store_document function for testing."""
    async def _mock_store(table, user_id, data, metadata=None, document_type=None):
        return str(uuid4())
    return _mock_store


@pytest.fixture
async def mock_get_document(sample_resume_data):
    """Mock get_document function for testing."""
    async def _mock_get(table, doc_id, user_id=None):
        if table == "resume_documents":
            return {
                "id": doc_id,
                "user_id": user_id or "test_user",
                **sample_resume_data,
                "metadata": {},
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        return None
    return _mock_get


@pytest.fixture
async def mock_query_documents():
    """Mock query_documents function for testing."""
    async def _mock_query(table, filters=None, user_id=None, limit=100, offset=0, order_by="created_at DESC"):
        return []
    return _mock_query
