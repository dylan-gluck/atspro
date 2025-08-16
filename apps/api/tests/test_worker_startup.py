"""Tests for worker startup and management."""

import pytest
from unittest.mock import AsyncMock, Mock, patch

from app.workers.startup import (
    start_workers,
    stop_workers,
    get_worker_manager,
    get_worker_status,
    scale_resume_workers,
)


class TestWorkerStartup:
    """Test worker startup functionality."""

    @pytest.fixture(autouse=True)
    def reset_global_state(self):
        """Reset global worker manager before each test."""
        import app.workers.startup
        app.workers.startup._worker_manager = None
        yield
        app.workers.startup._worker_manager = None

    @pytest.mark.asyncio
    async def test_start_workers_success(self):
        """Test successful worker startup."""
        with (
            patch("app.workers.startup.get_redis_client") as mock_redis,
            patch("app.workers.startup.RedisQueue") as mock_queue_class,
            patch("app.workers.startup.WorkerManager") as mock_manager_class,
            patch("asyncio.create_task") as mock_create_task,
        ):
            # Setup mocks
            mock_redis_client = Mock()
            mock_redis.return_value = mock_redis_client
            
            mock_queue = Mock()
            mock_queue_class.return_value = mock_queue
            
            mock_manager = Mock()
            mock_manager_class.return_value = mock_manager
            
            # Call start_workers
            result = await start_workers()
            
            # Verify calls
            mock_redis.assert_called_once()
            mock_queue_class.assert_called_once_with(mock_redis_client)
            mock_manager_class.assert_called_once_with(mock_queue)
            mock_manager.add_worker.assert_called_once()
            mock_create_task.assert_called_once()
            
            assert result == mock_manager

    @pytest.mark.asyncio
    async def test_start_workers_already_started(self):
        """Test starting workers when already started."""
        with (
            patch("app.workers.startup.get_redis_client") as mock_redis,
            patch("app.workers.startup.RedisQueue") as mock_queue_class,
            patch("app.workers.startup.WorkerManager") as mock_manager_class,
        ):
            # First startup
            await start_workers()
            
            # Reset mocks
            mock_redis.reset_mock()
            mock_queue_class.reset_mock()
            mock_manager_class.reset_mock()
            
            # Second startup should not create new instances
            result = await start_workers()
            
            # Verify no new instances created
            mock_redis.assert_not_called()
            mock_queue_class.assert_not_called()
            mock_manager_class.assert_not_called()

    @pytest.mark.asyncio
    async def test_stop_workers_success(self):
        """Test successful worker stop."""
        with (
            patch("app.workers.startup.get_redis_client"),
            patch("app.workers.startup.RedisQueue"),
            patch("app.workers.startup.WorkerManager") as mock_manager_class,
        ):
            # Start workers first
            mock_manager = Mock()
            mock_manager.stop = AsyncMock()
            mock_manager_class.return_value = mock_manager
            
            await start_workers()
            
            # Stop workers
            await stop_workers(30)
            
            # Verify stop was called
            mock_manager.stop.assert_called_once_with(30)

    @pytest.mark.asyncio
    async def test_stop_workers_not_started(self):
        """Test stopping workers when not started."""
        # Should not raise error
        await stop_workers()

    @pytest.mark.asyncio
    async def test_get_worker_status_not_started(self):
        """Test getting status when workers not started."""
        status = await get_worker_status()
        
        expected = {
            "manager_status": "not_started",
            "total_workers": 0,
            "running_workers": 0,
            "total_active_tasks": 0,
            "workers": []
        }
        
        assert status == expected

    @pytest.mark.asyncio
    async def test_get_worker_status_running(self):
        """Test getting status when workers are running."""
        with (
            patch("app.workers.startup.get_redis_client"),
            patch("app.workers.startup.RedisQueue"),
            patch("app.workers.startup.WorkerManager") as mock_manager_class,
        ):
            # Setup mock manager
            mock_manager = Mock()
            mock_status = {
                "manager_status": "running",
                "total_workers": 2,
                "running_workers": 2,
                "total_active_tasks": 1,
                "workers": [
                    {"worker_id": "worker1", "status": "running"},
                    {"worker_id": "worker2", "status": "running"}
                ]
            }
            mock_manager.get_status = AsyncMock(return_value=mock_status)
            mock_manager_class.return_value = mock_manager
            
            # Start workers and get status
            await start_workers()
            status = await get_worker_status()
            
            assert status == mock_status

    @pytest.mark.asyncio
    async def test_scale_resume_workers_success(self):
        """Test scaling resume workers."""
        with (
            patch("app.workers.startup.get_redis_client"),
            patch("app.workers.startup.RedisQueue"),
            patch("app.workers.startup.WorkerManager") as mock_manager_class,
        ):
            # Setup mock manager
            mock_manager = Mock()
            mock_manager.scale_workers = AsyncMock()
            mock_manager_class.return_value = mock_manager
            
            # Start workers and scale
            await start_workers()
            await scale_resume_workers(5)
            
            # Verify scale_workers was called correctly
            mock_manager.scale_workers.assert_called_once()
            call_args = mock_manager.scale_workers.call_args
            
            assert call_args.kwargs["target_count"] == 5
            assert call_args.kwargs["concurrency"] == 1
            assert call_args.kwargs["timeout_seconds"] == 300

    @pytest.mark.asyncio
    async def test_scale_resume_workers_not_started(self):
        """Test scaling workers when not started."""
        with pytest.raises(RuntimeError, match="Workers not started"):
            await scale_resume_workers(3)

    def test_get_worker_manager_not_started(self):
        """Test getting worker manager when not started."""
        manager = get_worker_manager()
        assert manager is None

    def test_get_worker_manager_started(self):
        """Test getting worker manager when started."""
        with (
            patch("app.workers.startup.get_redis_client"),
            patch("app.workers.startup.RedisQueue"),
            patch("app.workers.startup.WorkerManager") as mock_manager_class,
        ):
            import asyncio
            
            # Setup mock manager
            mock_manager = Mock()
            mock_manager_class.return_value = mock_manager
            
            # Start workers
            asyncio.run(start_workers())
            
            # Get manager
            manager = get_worker_manager()
            assert manager == mock_manager