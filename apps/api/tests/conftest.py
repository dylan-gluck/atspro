import os
from unittest.mock import patch

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
    connections._redis_client = None
    connections._arango_client = None
    connections._arango_db = None


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
    original_init_redis = None
    original_init_arango = None

    def _mock_postgres_failure():
        nonlocal original_init_postgres
        from app.database import connections

        original_init_postgres = connections.init_postgres

        async def failing_init_postgres():
            raise Exception("Mock PostgreSQL connection failure")

        connections.init_postgres = failing_init_postgres
        return connections.init_postgres

    def _mock_redis_failure():
        nonlocal original_init_redis
        from app.database import connections

        original_init_redis = connections.init_redis

        async def failing_init_redis():
            raise Exception("Mock Redis connection failure")

        connections.init_redis = failing_init_redis
        return connections.init_redis

    def _mock_arango_failure():
        nonlocal original_init_arango
        from app.database import connections

        original_init_arango = connections.init_arango

        def failing_init_arango():
            raise Exception("Mock ArangoDB connection failure")

        connections.init_arango = failing_init_arango
        return connections.init_arango

    def _restore_originals():
        if original_init_postgres:
            from app.database import connections

            connections.init_postgres = original_init_postgres
        if original_init_redis:
            from app.database import connections

            connections.init_redis = original_init_redis
        if original_init_arango:
            from app.database import connections

            connections.init_arango = original_init_arango

    # Return helper functions for test control
    class MockController:
        def mock_postgres_failure(self):
            return _mock_postgres_failure()

        def mock_redis_failure(self):
            return _mock_redis_failure()

        def mock_arango_failure(self):
            return _mock_arango_failure()

        def restore_all(self):
            _restore_originals()

    controller = MockController()
    yield controller

    # Cleanup: restore original functions
    _restore_originals()
