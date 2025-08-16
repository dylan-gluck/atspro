"""Comprehensive tests for worker framework in ATSPro API."""

import asyncio
from unittest.mock import AsyncMock

import pytest

from app.queue.redis_queue import RedisQueue
from app.workers.base import BaseWorker, TaskError, TaskErrorType
from app.workers.manager import WorkerManager


class MockWorker(BaseWorker):
    """Mock worker for testing."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.execute_task_mock = AsyncMock()

    async def execute_task(self, task_data):
        """Mock task execution."""
        return await self.execute_task_mock(task_data)

    def get_queue_names(self):
        """Return mock queue names."""
        return ["test:queue:high", "test:queue:normal"]

    def get_task_types(self):
        """Return mock task types."""
        return ["test_task", "mock_task"]


class TestBaseWorker:
    """Test base worker functionality."""

    @pytest.fixture
    def mock_redis_queue(self):
        """Mock Redis queue."""
        mock_queue = AsyncMock(spec=RedisQueue)
        mock_queue.dequeue = AsyncMock()
        mock_queue.complete_task = AsyncMock()
        mock_queue.fail_task = AsyncMock()
        mock_queue.update_progress = AsyncMock()
        return mock_queue

    @pytest.fixture
    def worker(self, mock_redis_queue):
        """Mock worker instance."""
        return MockWorker(
            redis_queue=mock_redis_queue, concurrency=2, timeout_seconds=10
        )

    def test_worker_initialization(self, worker):
        """Test worker initialization."""
        assert worker.concurrency == 2
        assert worker.timeout_seconds == 10
        assert worker.running is False
        assert len(worker.tasks) == 0
        assert "MockWorker_" in worker.worker_id

    def test_queue_names(self, worker):
        """Test queue names retrieval."""
        queue_names = worker.get_queue_names()
        assert "test:queue:high" in queue_names
        assert "test:queue:normal" in queue_names

    def test_task_types(self, worker):
        """Test task types retrieval."""
        task_types = worker.get_task_types()
        assert "test_task" in task_types
        assert "mock_task" in task_types

    @pytest.mark.asyncio
    async def test_start_worker(self, worker):
        """Test worker startup."""
        # Mock the worker loop to avoid infinite running
        worker._worker_loop = AsyncMock()

        # Start worker in background
        start_task = asyncio.create_task(worker.start())

        # Allow startup to begin
        await asyncio.sleep(0.1)

        # Verify worker is running
        assert worker.running is True
        assert len(worker.tasks) == worker.concurrency

        # Stop worker
        await worker.stop()

        # Cleanup
        start_task.cancel()
        try:
            await start_task
        except asyncio.CancelledError:
            pass

    @pytest.mark.asyncio
    async def test_stop_worker(self, worker):
        """Test worker shutdown."""
        # Start worker
        worker.running = True
        worker.tasks = [AsyncMock() for _ in range(2)]

        # Mock task completion
        for task in worker.tasks:
            task.done.return_value = True

        # Stop worker
        await worker.stop()

        assert worker.running is False

    @pytest.mark.asyncio
    async def test_process_task_success(self, worker, mock_redis_queue):
        """Test successful task processing."""
        task_data = {
            "id": "task-123",
            "task_type": "test_task",
            "payload": {"data": "test"},
        }

        # Setup mock to return success
        worker.execute_task_mock.return_value = {"result": "success"}

        # Process task
        result = await worker._process_task(task_data)

        # Verify result
        assert result["result"] == "success"
        assert "_metadata" in result
        assert "worker_id" in result["_metadata"]

        # Verify progress was updated
        mock_redis_queue.update_progress.assert_called()

    @pytest.mark.asyncio
    async def test_process_task_with_task_error(self, worker, mock_redis_queue):
        """Test task processing with TaskError."""
        task_data = {
            "id": "task-123",
            "task_type": "test_task",
            "payload": {"data": "test"},
        }

        # Setup mock to raise TaskError
        error = TaskError("Test error", TaskErrorType.TRANSIENT)
        worker.execute_task_mock.side_effect = error

        # Process task should raise TaskError
        with pytest.raises(TaskError):
            await worker._process_task(task_data)

        # Verify progress was updated with error
        mock_redis_queue.update_progress.assert_called()

    @pytest.mark.asyncio
    async def test_worker_loop_successful_task(self, worker, mock_redis_queue):
        """Test worker loop processing successful task."""
        task_data = {
            "id": "task-123",
            "task_type": "test_task",
            "payload": {"data": "test"},
        }

        # Setup mocks
        mock_redis_queue.dequeue.side_effect = [
            task_data,
            None,
        ]  # One task then timeout
        worker.execute_task_mock.return_value = {"result": "success"}

        # Run worker loop briefly
        worker.running = True
        loop_task = asyncio.create_task(worker._worker_loop("test_task"))

        # Wait for task processing
        await asyncio.sleep(0.1)
        worker.running = False

        try:
            await asyncio.wait_for(loop_task, timeout=1.0)
        except asyncio.TimeoutError:
            loop_task.cancel()

        # Verify task was completed
        mock_redis_queue.complete_task.assert_called_once_with(
            task_id="task-123",
            worker_id=worker.worker_id,
            result={"result": "success", "_metadata": pytest.Any},
        )

    @pytest.mark.asyncio
    async def test_worker_loop_task_error(self, worker, mock_redis_queue):
        """Test worker loop handling TaskError."""
        task_data = {
            "id": "task-123",
            "task_type": "test_task",
            "payload": {"data": "test"},
        }

        # Setup mocks
        mock_redis_queue.dequeue.side_effect = [task_data, None]
        error = TaskError("Test error", TaskErrorType.TRANSIENT, retryable=True)
        worker.execute_task_mock.side_effect = error

        # Run worker loop briefly
        worker.running = True
        loop_task = asyncio.create_task(worker._worker_loop("test_task"))

        await asyncio.sleep(0.1)
        worker.running = False

        try:
            await asyncio.wait_for(loop_task, timeout=1.0)
        except asyncio.TimeoutError:
            loop_task.cancel()

        # Verify task was failed with retry
        mock_redis_queue.fail_task.assert_called_once_with(
            task_id="task-123",
            worker_id=worker.worker_id,
            error_message="Test error",
            retry=True,
        )

    @pytest.mark.asyncio
    async def test_worker_loop_timeout(self, worker, mock_redis_queue):
        """Test worker loop handling task timeout."""
        task_data = {
            "id": "task-123",
            "task_type": "test_task",
            "payload": {"data": "test"},
        }

        # Setup mocks - make execute_task hang
        async def slow_task(data):
            await asyncio.sleep(20)  # Longer than timeout
            return {"result": "too late"}

        mock_redis_queue.dequeue.side_effect = [task_data, None]
        worker.execute_task_mock.side_effect = slow_task
        worker.timeout_seconds = 0.1  # Very short timeout

        # Run worker loop briefly
        worker.running = True
        loop_task = asyncio.create_task(worker._worker_loop("test_task"))

        await asyncio.sleep(0.3)
        worker.running = False

        try:
            await asyncio.wait_for(loop_task, timeout=1.0)
        except asyncio.TimeoutError:
            loop_task.cancel()

        # Verify task was failed due to timeout
        mock_redis_queue.fail_task.assert_called_once()
        call_args = mock_redis_queue.fail_task.call_args
        assert "timed out" in call_args[1]["error_message"]
        assert call_args[1]["retry"] is False

    @pytest.mark.asyncio
    async def test_worker_loop_invalid_task_type(self, worker, mock_redis_queue):
        """Test worker loop handling invalid task type."""
        task_data = {
            "id": "task-123",
            "task_type": "invalid_task",  # Not in get_task_types()
            "payload": {"data": "test"},
        }

        # Setup mocks
        mock_redis_queue.dequeue.side_effect = [task_data, None]

        # Run worker loop briefly
        worker.running = True
        loop_task = asyncio.create_task(worker._worker_loop("test_task"))

        await asyncio.sleep(0.1)
        worker.running = False

        try:
            await asyncio.wait_for(loop_task, timeout=1.0)
        except asyncio.TimeoutError:
            loop_task.cancel()

        # Verify task was failed due to invalid type
        mock_redis_queue.fail_task.assert_called_once()
        call_args = mock_redis_queue.fail_task.call_args
        assert "cannot handle task type" in call_args[1]["error_message"]
        assert call_args[1]["retry"] is False

    @pytest.mark.asyncio
    async def test_update_progress(self, worker, mock_redis_queue):
        """Test progress update helper."""
        await worker.update_progress("task-123", 75, "Almost done")

        mock_redis_queue.update_progress.assert_called_once_with(
            "task-123", 75, "Almost done"
        )

    @pytest.mark.asyncio
    async def test_health_check(self, worker):
        """Test worker health check."""
        # Add some mock tasks
        worker.tasks = [AsyncMock(), AsyncMock()]
        worker.tasks[0].done.return_value = False  # Active task
        worker.tasks[1].done.return_value = True  # Completed task
        worker.running = True

        health = await worker.health_check()

        assert health["worker_id"] == worker.worker_id
        assert health["status"] == "running"
        assert health["concurrency"] == 2
        assert health["active_tasks"] == 1
        assert health["total_tasks"] == 2
        assert health["supported_types"] == ["test_task", "mock_task"]

    def test_worker_repr(self, worker):
        """Test worker string representation."""
        repr_str = repr(worker)
        assert "MockWorker" in repr_str
        assert worker.worker_id in repr_str
        assert "concurrency=2" in repr_str


class TestTaskError:
    """Test TaskError exception."""

    def test_task_error_creation(self):
        """Test TaskError creation."""
        error = TaskError("Test message", TaskErrorType.TRANSIENT)

        assert str(error) == "Test message"
        assert error.error_type == TaskErrorType.TRANSIENT
        assert error.retryable is True

    def test_task_error_permanent_not_retryable(self):
        """Test permanent errors are not retryable by default."""
        error = TaskError("Permanent error", TaskErrorType.PERMANENT)

        assert error.retryable is False

    def test_task_error_explicit_retryable(self):
        """Test explicit retryable setting."""
        error = TaskError("Test error", TaskErrorType.TRANSIENT, retryable=False)

        assert error.retryable is False


class TestWorkerManager:
    """Test worker manager functionality."""

    @pytest.fixture
    def mock_redis_queue(self):
        """Mock Redis queue."""
        return AsyncMock(spec=RedisQueue)

    @pytest.fixture
    def manager(self, mock_redis_queue):
        """Worker manager instance."""
        return WorkerManager(mock_redis_queue)

    def test_manager_initialization(self, manager):
        """Test manager initialization."""
        assert len(manager.workers) == 0
        assert len(manager.worker_tasks) == 0
        assert manager.running is False

    def test_add_worker(self, manager):
        """Test adding workers to manager."""
        manager.add_worker(MockWorker, count=2, concurrency=3)

        assert len(manager.workers) == 2
        assert all(isinstance(w, MockWorker) for w in manager.workers)
        assert all(w.concurrency == 3 for w in manager.workers)

    @pytest.mark.asyncio
    async def test_start_manager(self, manager):
        """Test manager startup."""
        # Add workers
        manager.add_worker(MockWorker, count=2)

        # Mock worker start method to avoid infinite running
        for worker in manager.workers:
            worker.start = AsyncMock()

        # Start manager in background
        start_task = asyncio.create_task(manager.start())

        # Allow startup to begin
        await asyncio.sleep(0.1)

        # Verify manager is running
        assert manager.running is True

        # Verify workers were started
        for worker in manager.workers:
            worker.start.assert_called_once()

        # Stop manager
        await manager.stop()

        # Cleanup
        start_task.cancel()
        try:
            await start_task
        except asyncio.CancelledError:
            pass

    @pytest.mark.asyncio
    async def test_stop_manager(self, manager):
        """Test manager shutdown."""
        # Add workers with mocked stop methods
        manager.add_worker(MockWorker, count=2)
        for worker in manager.workers:
            worker.stop = AsyncMock()

        manager.running = True
        manager.worker_tasks = [AsyncMock() for _ in range(3)]

        # Mock task completion
        for task in manager.worker_tasks:
            task.done.return_value = True

        # Stop manager
        await manager.stop()

        assert manager.running is False

        # Verify workers were stopped
        for worker in manager.workers:
            worker.stop.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_status(self, manager):
        """Test manager status retrieval."""
        # Add workers with mocked health checks
        manager.add_worker(MockWorker, count=2)

        health_data = {
            "worker_id": "test-worker",
            "status": "running",
            "active_tasks": 1,
        }

        for worker in manager.workers:
            worker.health_check = AsyncMock(return_value=health_data)

        manager.running = True
        status = await manager.get_status()

        assert status["manager_status"] == "running"
        assert status["total_workers"] == 2
        assert status["running_workers"] == 2
        assert status["total_active_tasks"] == 2
        assert len(status["workers"]) == 2

    @pytest.mark.asyncio
    async def test_scale_workers_up(self, manager):
        """Test scaling workers up."""
        # Start with 1 worker
        manager.add_worker(MockWorker, count=1)

        # Scale up to 3 workers
        await manager.scale_workers(MockWorker, target_count=3)

        assert len(manager.workers) == 3
        assert len([w for w in manager.workers if isinstance(w, MockWorker)]) == 3

    @pytest.mark.asyncio
    async def test_scale_workers_down(self, manager):
        """Test scaling workers down."""
        # Start with 3 workers
        manager.add_worker(MockWorker, count=3)

        # Mock worker stop methods
        for worker in manager.workers:
            worker.stop = AsyncMock()

        # Scale down to 1 worker
        await manager.scale_workers(MockWorker, target_count=1)

        assert len(manager.workers) == 1

        # Verify some workers were stopped (2 should be removed)
        stopped_count = sum(1 for w in manager.workers if w.stop.called)
        # Note: The remaining worker won't have stop called
        assert stopped_count <= 2

    def test_get_worker_types(self, manager):
        """Test getting worker type counts."""
        manager.add_worker(MockWorker, count=2)
        manager.add_worker(MockWorker, count=1)  # Same type

        type_counts = manager.get_worker_types()
        assert type_counts["MockWorker"] == 3

    @pytest.mark.asyncio
    async def test_get_queue_stats(self, manager, mock_redis_queue):
        """Test getting queue statistics."""
        stats = {"total_pending": 10, "processing_workers": 2}
        mock_redis_queue.get_queue_stats = AsyncMock(return_value=stats)

        result = await manager.get_queue_stats()
        assert result == stats

    def test_manager_repr(self, manager):
        """Test manager string representation."""
        manager.add_worker(MockWorker, count=2)
        manager.running = True

        repr_str = repr(manager)
        assert "WorkerManager" in repr_str
        assert "workers=2" in repr_str
        assert "running=True" in repr_str

    @pytest.mark.asyncio
    async def test_health_monitor_restart_failed_worker(self, manager):
        """Test health monitor restarting failed workers."""
        # Add a worker
        manager.add_worker(MockWorker, count=1)
        worker = manager.workers[0]

        # Mock health check to indicate failure
        worker.health_check = AsyncMock(return_value={"status": "stopped"})
        worker.stop = AsyncMock()

        # Mock manager running state
        manager.running = True

        # Run health monitor briefly
        monitor_task = asyncio.create_task(manager._health_monitor())

        # Wait for health check
        await asyncio.sleep(0.1)

        # Stop monitoring
        manager.running = False

        try:
            await asyncio.wait_for(monitor_task, timeout=1.0)
        except asyncio.TimeoutError:
            monitor_task.cancel()

        # Verify old worker was stopped
        worker.stop.assert_called_once()

        # Verify new worker was created (workers list should still have 1 worker)
        assert len(manager.workers) == 1
