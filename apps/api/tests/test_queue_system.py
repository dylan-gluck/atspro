"""Comprehensive tests for queue system in ATSPro API."""

import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
import redis.asyncio as redis

from app.queue.redis_queue import RedisQueue, TaskPriority
from app.queue.task_queue import TaskQueue


class TestRedisQueue:
    """Test Redis queue implementation."""

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        mock_client = AsyncMock(spec=redis.Redis)
        return mock_client

    @pytest.fixture
    def redis_queue(self, mock_redis):
        """Redis queue instance with mocked client."""
        return RedisQueue(mock_redis, queue_prefix="test")

    @pytest.mark.asyncio
    async def test_queue_key_properties(self, redis_queue):
        """Test queue key generation."""
        assert redis_queue.high_queue_key == "test:queue:high"
        assert redis_queue.normal_queue_key == "test:queue:normal"
        assert redis_queue.low_queue_key == "test:queue:low"
        assert redis_queue.dlq_key == "test:dlq"
        assert redis_queue.task_key("123") == "test:task:123"
        assert redis_queue.result_key("123") == "test:result:123"

    @pytest.mark.asyncio
    async def test_enqueue_task(self, redis_queue, mock_redis):
        """Test task enqueueing."""
        # Setup mocks
        mock_redis.set = AsyncMock()
        mock_redis.lpush = AsyncMock()

        # Enqueue task
        task_id = await redis_queue.enqueue(
            task_type="test_task",
            payload={"data": "test"},
            priority=TaskPriority.HIGH,
            user_id="user123",
        )

        # Verify task ID format
        assert isinstance(task_id, str)
        assert len(task_id) == 36  # UUID format

        # Verify Redis calls
        mock_redis.set.assert_called_once()
        mock_redis.lpush.assert_called_once_with("test:queue:high", task_id)

        # Verify task data structure
        call_args = mock_redis.set.call_args[0]
        task_key = call_args[0]
        task_data_json = call_args[1]

        assert task_key == f"test:task:{task_id}"
        task_data = json.loads(task_data_json)
        assert task_data["id"] == task_id
        assert task_data["task_type"] == "test_task"
        assert task_data["user_id"] == "user123"
        assert task_data["priority"] == TaskPriority.HIGH.value
        assert task_data["status"] == "pending"

    @pytest.mark.asyncio
    async def test_enqueue_different_priorities(self, redis_queue, mock_redis):
        """Test enqueueing tasks with different priorities."""
        mock_redis.set = AsyncMock()
        mock_redis.lpush = AsyncMock()

        # Test all priority levels
        priorities_and_queues = [
            (TaskPriority.HIGH, "test:queue:high"),
            (TaskPriority.NORMAL, "test:queue:normal"),
            (TaskPriority.LOW, "test:queue:low"),
        ]

        for priority, expected_queue in priorities_and_queues:
            task_id = await redis_queue.enqueue(
                task_type="test_task", payload={"data": "test"}, priority=priority
            )

            # Check that task was added to correct queue
            mock_redis.lpush.assert_called_with(expected_queue, task_id)

    @pytest.mark.asyncio
    async def test_dequeue_task(self, redis_queue, mock_redis):
        """Test task dequeueing."""
        task_id = "test-task-123"
        task_data = {
            "id": task_id,
            "task_type": "test_task",
            "status": "pending",
            "payload": {"data": "test"},
        }

        # Setup mocks
        mock_redis.brpop = AsyncMock(return_value=("test:queue:high", task_id.encode()))
        mock_redis.get = AsyncMock(return_value=json.dumps(task_data))
        mock_redis.lpush = AsyncMock()
        mock_redis.set = AsyncMock()

        # Dequeue task
        result = await redis_queue.dequeue(worker_id="worker123")

        # Verify result
        assert result is not None
        assert result["id"] == task_id
        assert result["status"] == "running"
        assert "worker_id" in result
        assert "started_at" in result

        # Verify Redis calls
        mock_redis.brpop.assert_called_once()
        mock_redis.lpush.assert_called_once_with("test:processing:worker123", task_id)

    @pytest.mark.asyncio
    async def test_dequeue_timeout(self, redis_queue, mock_redis):
        """Test dequeue timeout handling."""
        mock_redis.brpop = AsyncMock(return_value=None)

        result = await redis_queue.dequeue(worker_id="worker123", timeout=1)
        assert result is None

    @pytest.mark.asyncio
    async def test_complete_task(self, redis_queue, mock_redis):
        """Test task completion."""
        task_id = "test-task-123"
        task_data = {"id": task_id, "status": "running"}
        result = {"output": "success"}

        # Setup mocks
        mock_redis.lrem = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps(task_data))
        mock_redis.set = AsyncMock()

        # Complete task
        await redis_queue.complete_task(
            task_id=task_id, worker_id="worker123", result=result
        )

        # Verify Redis calls
        mock_redis.lrem.assert_called_with("test:processing:worker123", 0, task_id)
        assert mock_redis.set.call_count == 2  # Task update + result storage

    @pytest.mark.asyncio
    async def test_fail_task_with_retry(self, redis_queue, mock_redis):
        """Test task failure with retry."""
        task_id = "test-task-123"
        task_data = {
            "id": task_id,
            "retry_count": 0,
            "max_retries": 3,
            "status": "running",
        }

        # Setup mocks
        mock_redis.lrem = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps(task_data))
        mock_redis.set = AsyncMock()
        mock_redis.lpush = AsyncMock()

        # Fail task
        should_retry = await redis_queue.fail_task(
            task_id=task_id,
            worker_id="worker123",
            error_message="Test error",
            retry=True,
        )

        # Verify retry
        assert should_retry is True
        mock_redis.lpush.assert_called_with("test:queue:low", task_id)

    @pytest.mark.asyncio
    async def test_fail_task_max_retries_exceeded(self, redis_queue, mock_redis):
        """Test task failure when max retries exceeded."""
        task_id = "test-task-123"
        task_data = {
            "id": task_id,
            "retry_count": 3,
            "max_retries": 3,
            "status": "running",
        }

        # Setup mocks
        mock_redis.lrem = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps(task_data))
        mock_redis.set = AsyncMock()
        mock_redis.lpush = AsyncMock()

        # Fail task
        should_retry = await redis_queue.fail_task(
            task_id=task_id,
            worker_id="worker123",
            error_message="Test error",
            retry=True,
        )

        # Verify no retry
        assert should_retry is False
        mock_redis.lpush.assert_called_with("test:dlq", task_id)

    @pytest.mark.asyncio
    async def test_update_progress(self, redis_queue, mock_redis):
        """Test progress updates."""
        task_id = "test-task-123"
        task_data = {"id": task_id, "progress": 0}

        # Setup mocks
        mock_redis.get = AsyncMock(return_value=json.dumps(task_data))
        mock_redis.set = AsyncMock()

        # Update progress
        await redis_queue.update_progress(task_id, 50, "Half complete")

        # Verify update
        mock_redis.set.assert_called_once()
        call_args = mock_redis.set.call_args[0]
        updated_data = json.loads(call_args[1])
        assert updated_data["progress"] == 50
        assert updated_data["status_message"] == "Half complete"

    @pytest.mark.asyncio
    async def test_get_task(self, redis_queue, mock_redis):
        """Test getting task metadata."""
        task_id = "test-task-123"
        task_data = {"id": task_id, "status": "pending"}

        mock_redis.get = AsyncMock(return_value=json.dumps(task_data))

        result = await redis_queue.get_task(task_id)
        assert result == task_data

    @pytest.mark.asyncio
    async def test_get_task_not_found(self, redis_queue, mock_redis):
        """Test getting non-existent task."""
        mock_redis.get = AsyncMock(return_value=None)

        result = await redis_queue.get_task("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_result(self, redis_queue, mock_redis):
        """Test getting task result."""
        task_id = "test-task-123"
        result_data = {"output": "success"}

        mock_redis.get = AsyncMock(return_value=json.dumps(result_data))

        result = await redis_queue.get_result(task_id)
        assert result == result_data

    @pytest.mark.asyncio
    async def test_get_queue_stats(self, redis_queue, mock_redis):
        """Test queue statistics."""
        # Setup mocks
        mock_redis.llen = AsyncMock(
            side_effect=lambda key: {
                "test:queue:high": 5,
                "test:queue:normal": 10,
                "test:queue:low": 2,
                "test:dlq": 1,
                "test:processing:worker1": 3,
            }.get(key, 0)
        )

        mock_redis.keys = AsyncMock(return_value=[b"test:processing:worker1"])

        stats = await redis_queue.get_queue_stats()

        # Verify statistics
        assert stats["high_queue"] == 5
        assert stats["normal_queue"] == 10
        assert stats["low_queue"] == 2
        assert stats["dead_letter_queue"] == 1
        assert stats["total_pending"] == 17
        assert stats["processing_workers"] == 1
        assert stats["total_processing"] == 3

    @pytest.mark.asyncio
    async def test_cleanup_expired_tasks(self, redis_queue, mock_redis):
        """Test cleanup of expired tasks."""
        expired_task_data = {
            "id": "expired-task",
            "expires_at": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
        }

        # Setup mocks
        mock_redis.keys = AsyncMock(return_value=[b"test:processing:worker1"])
        mock_redis.lrange = AsyncMock(return_value=[b"expired-task"])
        mock_redis.get = AsyncMock(return_value=json.dumps(expired_task_data))
        mock_redis.lrem = AsyncMock()
        mock_redis.lpush = AsyncMock()
        mock_redis.set = AsyncMock()

        # Run cleanup
        cleanup_count = await redis_queue.cleanup_expired_tasks()

        # Verify cleanup
        assert cleanup_count == 1
        mock_redis.lrem.assert_called_once()
        mock_redis.lpush.assert_called_with("test:dlq", "expired-task")


class TestTaskQueue:
    """Test high-level task queue operations."""

    @pytest.fixture
    def mock_redis_queue(self):
        """Mock Redis queue."""
        return AsyncMock(spec=RedisQueue)

    @pytest.fixture
    def task_queue(self, mock_redis_queue):
        """Task queue instance with mocked Redis queue."""
        return TaskQueue(mock_redis_queue)

    @pytest.mark.asyncio
    async def test_submit_task(self, task_queue, mock_redis_queue):
        """Test task submission."""
        mock_redis_queue.enqueue = AsyncMock(return_value="task-123")

        task_id = await task_queue.submit_task(
            task_type="test_task",
            payload={"data": "test"},
            user_id="user123",
            priority=TaskPriority.HIGH,
        )

        assert task_id == "task-123"
        mock_redis_queue.enqueue.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_task_status(self, task_queue, mock_redis_queue):
        """Test getting task status."""
        task_data = {"id": "task-123", "status": "running"}
        mock_redis_queue.get_task = AsyncMock(return_value=task_data)

        result = await task_queue.get_task_status("task-123")
        assert result == task_data

    @pytest.mark.asyncio
    async def test_get_task_status_with_result(self, task_queue, mock_redis_queue):
        """Test getting completed task status with result."""
        task_data = {"id": "task-123", "status": "completed"}
        result_data = {"output": "success"}

        mock_redis_queue.get_task = AsyncMock(return_value=task_data)
        mock_redis_queue.get_result = AsyncMock(return_value=result_data)

        result = await task_queue.get_task_status("task-123")
        assert result["status"] == "completed"
        assert result["result"] == result_data

    @pytest.mark.asyncio
    async def test_cancel_pending_task(self, task_queue, mock_redis_queue):
        """Test cancelling a pending task."""
        task_data = {"id": "task-123", "status": "pending"}

        mock_redis_queue.get_task = AsyncMock(return_value=task_data)
        mock_redis_queue.redis = AsyncMock()
        mock_redis_queue.redis.lrem = AsyncMock()
        mock_redis_queue.redis.set = AsyncMock()
        mock_redis_queue.redis.json = MagicMock()
        mock_redis_queue.redis.json.return_value.dumps = json.dumps
        mock_redis_queue.task_key = MagicMock(return_value="test:task:task-123")

        success = await task_queue.cancel_task("task-123")
        assert success is True

    @pytest.mark.asyncio
    async def test_cancel_nonexistent_task(self, task_queue, mock_redis_queue):
        """Test cancelling a non-existent task."""
        mock_redis_queue.get_task = AsyncMock(return_value=None)

        success = await task_queue.cancel_task("nonexistent")
        assert success is False

    @pytest.mark.asyncio
    async def test_get_queue_health(self, task_queue, mock_redis_queue):
        """Test queue health monitoring."""
        stats = {
            "high_queue": 5,
            "normal_queue": 10,
            "low_queue": 2,
            "dead_letter_queue": 1,
            "total_pending": 17,
            "processing_workers": 2,
            "total_processing": 5,
        }

        mock_redis_queue.get_queue_stats = AsyncMock(return_value=stats)

        health = await task_queue.get_queue_health()

        assert health["status"] == "healthy"
        assert health["queues"]["high_priority"] == 5
        assert health["totals"]["pending"] == 17

    @pytest.mark.asyncio
    async def test_get_queue_health_degraded(self, task_queue, mock_redis_queue):
        """Test queue health when degraded."""
        stats = {
            "high_queue": 5,
            "normal_queue": 10,
            "low_queue": 2,
            "dead_letter_queue": 15,  # High DLQ count
            "total_pending": 17,
            "processing_workers": 2,
            "total_processing": 5,
        }

        mock_redis_queue.get_queue_stats = AsyncMock(return_value=stats)

        health = await task_queue.get_queue_health()

        assert health["status"] == "degraded"
        assert "warnings" in health

    @pytest.mark.asyncio
    async def test_start_cleanup_task(self, task_queue, mock_redis_queue):
        """Test starting cleanup background task."""
        mock_redis_queue.cleanup_expired_tasks = AsyncMock(return_value=0)

        # Start cleanup with short interval for testing
        await task_queue.start_cleanup_task(interval_seconds=0.1)

        # Wait briefly to allow cleanup to run
        await asyncio.sleep(0.2)

        # Stop cleanup
        await task_queue.stop_cleanup_task()

        # Verify cleanup was called
        assert mock_redis_queue.cleanup_expired_tasks.called

    @pytest.mark.asyncio
    async def test_requeue_failed_tasks(self, task_queue, mock_redis_queue):
        """Test requeuing failed tasks."""
        # Setup mocks
        mock_redis_queue.redis = AsyncMock()
        mock_redis_queue.redis.rpop = AsyncMock(
            side_effect=[b"task-1", b"task-2", None]  # Two tasks then empty
        )
        mock_redis_queue.get_task = AsyncMock(
            return_value={"id": "task-1", "status": "failed", "retry_count": 1}
        )
        mock_redis_queue.redis.set = AsyncMock()
        mock_redis_queue.redis.lpush = AsyncMock()
        mock_redis_queue.redis.json = MagicMock()
        mock_redis_queue.redis.json.return_value.dumps = json.dumps
        mock_redis_queue.task_key = MagicMock(return_value="test:task:task-1")
        mock_redis_queue.low_queue_key = "test:queue:low"
        mock_redis_queue.dlq_key = "test:dlq"

        # Requeue failed tasks
        requeued_count = await task_queue.requeue_failed_tasks(max_tasks=10)

        # Should requeue 2 tasks (first two mock responses)
        assert requeued_count == 2
