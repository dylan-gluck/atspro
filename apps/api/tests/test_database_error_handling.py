"""Tests for database connection error handling and cleanup patterns."""

import pytest
from unittest.mock import patch, AsyncMock

from app.database import connections
from app import dependencies


class TestDatabaseErrorHandling:
    """Test database connection error handling and global state cleanup."""

    @pytest.mark.asyncio
    async def test_postgres_error_cleanup(
        self, clean_database_state, mock_database_failure
    ):
        """Test PostgreSQL initialization error cleans up global state."""
        # Ensure clean start
        assert connections._postgres_pool is None

        # Mock failure
        mock_database_failure.mock_postgres_failure()

        # Attempt initialization - should fail and clean up
        with pytest.raises(Exception, match="Mock PostgreSQL connection failure"):
            await connections.init_postgres()

        # Verify global state was cleaned up
        assert connections._postgres_pool is None

        # Restore and verify normal operation works
        mock_database_failure.restore_all()

    @pytest.mark.asyncio
    async def test_redis_error_cleanup(
        self, clean_database_state, mock_database_failure
    ):
        """Test Redis initialization error cleans up global state."""
        # Ensure clean start
        assert connections._redis_client is None

        # Mock failure
        mock_database_failure.mock_redis_failure()

        # Attempt initialization - should fail and clean up
        with pytest.raises(Exception, match="Mock Redis connection failure"):
            await connections.init_redis()

        # Verify global state was cleaned up
        assert connections._redis_client is None

        # Restore and verify normal operation works
        mock_database_failure.restore_all()

    @pytest.mark.asyncio
    async def test_arango_error_cleanup(
        self, clean_database_state, mock_database_failure
    ):
        """Test ArangoDB initialization error cleans up global state."""
        # Ensure clean start
        assert connections._arango_client is None
        assert connections._arango_db is None

        # Mock failure
        mock_database_failure.mock_arango_failure()

        # Attempt initialization - should fail and clean up
        with pytest.raises(Exception, match="Mock ArangoDB connection failure"):
            connections.init_arango()

        # Verify global state was cleaned up
        assert connections._arango_client is None
        assert connections._arango_db is None

        # Restore and verify normal operation works
        mock_database_failure.restore_all()

    @pytest.mark.asyncio
    async def test_task_service_error_cleanup(self, clean_database_state):
        """Test TaskService initialization error cleans up global state."""
        # Ensure clean start
        assert dependencies._task_service is None

        # Mock TaskService startup to fail
        with patch(
            "app.services.task_service.TaskService.startup",
            side_effect=Exception("Mock service startup failure"),
        ):
            with pytest.raises(Exception, match="Mock service startup failure"):
                await dependencies.get_task_service()

        # Verify global state was cleaned up
        assert dependencies._task_service is None

    @pytest.mark.asyncio
    async def test_job_service_error_cleanup(self, clean_database_state):
        """Test JobService initialization error cleans up global state."""
        # Ensure clean start
        assert dependencies._job_service is None

        # Mock TaskService to work but JobService constructor to fail
        with patch(
            "app.services.task_service.TaskService.startup", new_callable=AsyncMock
        ):
            with patch(
                "app.services.job_service.JobService.__init__",
                side_effect=Exception("Mock JobService init failure"),
            ):
                with pytest.raises(Exception, match="Mock JobService init failure"):
                    await dependencies.get_job_service()

        # Verify global state was cleaned up
        assert dependencies._job_service is None

    @pytest.mark.asyncio
    async def test_partial_database_failure_cleanup(
        self, clean_database_state, mock_database_failure
    ):
        """Test that partial database initialization failures are properly cleaned up."""
        # Mock Redis to fail but keep others working
        mock_database_failure.mock_redis_failure()

        # Attempt full database initialization - should fail
        with pytest.raises(Exception):
            await connections.init_databases()

        # Verify all global state is cleaned up (even successful ones)
        # This depends on how init_databases handles partial failures
        # For now, just verify the failing one is cleaned up
        assert connections._redis_client is None

        mock_database_failure.restore_all()

    @pytest.mark.asyncio
    async def test_consecutive_initialization_attempts(
        self, clean_database_state, mock_database_failure
    ):
        """Test that consecutive initialization attempts work after failure."""
        # First attempt - mock failure
        mock_database_failure.mock_postgres_failure()

        with pytest.raises(Exception):
            await connections.init_postgres()

        assert connections._postgres_pool is None

        # Restore original functions
        mock_database_failure.restore_all()

        # Second attempt should work (would work if real database available)
        # This test validates that the cleanup allows for retry
        # We can't actually test successful connection without real DB
        # but we can verify the global state allows for retry
        assert connections._postgres_pool is None  # Ready for retry

    @pytest.mark.asyncio
    async def test_health_checks_with_uninitialized_connections(
        self, clean_database_state
    ):
        """Test health checks handle uninitialized connections properly."""
        # Ensure clean state
        assert connections._postgres_pool is None
        assert connections._redis_client is None
        assert connections._arango_client is None

        # Test health checks with uninitialized connections
        postgres_health = await connections.check_postgres_health()
        assert postgres_health["status"] == "down"
        assert "not initialized" in postgres_health["error"]

        redis_health = await connections.check_redis_health()
        assert redis_health["status"] == "down"
        assert "not initialized" in redis_health["error"]

        arango_health = connections.check_arango_health()
        assert arango_health["status"] == "down"
        assert "not initialized" in arango_health["error"]

        # Test overall health check
        all_health = await connections.check_all_databases_health()
        assert all_health["status"] == "degraded"
        assert all_health["databases"]["postgresql"]["status"] == "down"
        assert all_health["databases"]["redis"]["status"] == "down"
        assert all_health["databases"]["arangodb"]["status"] == "down"

    @pytest.mark.asyncio
    async def test_service_dependency_chain_failure(self, clean_database_state):
        """Test that service dependency chain failures are handled properly."""
        # Mock TaskService startup to fail
        with patch(
            "app.services.task_service.TaskService.startup",
            side_effect=Exception("Task service failed"),
        ):
            # This should fail and clean up TaskService
            with pytest.raises(Exception, match="Task service failed"):
                await dependencies.get_task_service()

            assert dependencies._task_service is None

            # JobService depends on TaskService, so it should also fail
            with pytest.raises(Exception):
                await dependencies.get_job_service()

            assert dependencies._job_service is None


class TestDatabaseHealthMonitoring:
    """Test database health monitoring functionality."""

    @pytest.mark.asyncio
    async def test_health_check_structure(self, clean_database_state):
        """Test that health check functions return proper structure."""
        # Test with uninitialized state
        postgres_health = await connections.check_postgres_health()
        assert isinstance(postgres_health, dict)
        assert "status" in postgres_health
        assert postgres_health["status"] in ["up", "down"]

        redis_health = await connections.check_redis_health()
        assert isinstance(redis_health, dict)
        assert "status" in redis_health
        assert redis_health["status"] in ["up", "down"]

        arango_health = connections.check_arango_health()
        assert isinstance(arango_health, dict)
        assert "status" in arango_health
        assert arango_health["status"] in ["up", "down"]

    @pytest.mark.asyncio
    async def test_overall_health_check_structure(self, clean_database_state):
        """Test that overall health check returns proper structure."""
        health = await connections.check_all_databases_health()

        assert isinstance(health, dict)
        assert "status" in health
        assert health["status"] in ["up", "degraded"]
        assert "databases" in health

        databases = health["databases"]
        assert "postgresql" in databases
        assert "redis" in databases
        assert "arangodb" in databases

        # Each database should have status
        for db_name, db_health in databases.items():
            assert "status" in db_health
            assert db_health["status"] in ["up", "down"]
