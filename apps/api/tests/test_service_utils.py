"""Tests for service utilities including timeout, retry, and circuit breaker functionality."""

import asyncio
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock

from app.services.utils import (
    # Exception types
    ServiceTimeoutError,
    ProcessingTimeoutError,
    NetworkTimeoutError,
    CircuitBreakerOpenError,
    # Decorators
    with_timeout,
    with_retry,
    # Circuit breaker
    CircuitBreaker,
    CircuitBreakerState,
    # Pre-configured utilities
    database_circuit_breaker,
    external_api_circuit_breaker,
    standard_timeout,
    network_timeout,
    standard_retry,
    aggressive_retry,
)


class TestTimeoutDecorator:
    """Test timeout decorator functionality."""

    @pytest.mark.asyncio
    async def test_timeout_success_within_limit(self):
        """Test that successful operations within timeout work normally."""

        @with_timeout(2.0)
        async def fast_operation():
            await asyncio.sleep(0.1)
            return "success"

        result = await fast_operation()
        assert result == "success"

    @pytest.mark.asyncio
    async def test_timeout_failure_exceeds_limit(self):
        """Test that operations exceeding timeout raise ServiceTimeoutError."""

        @with_timeout(0.1)
        async def slow_operation():
            await asyncio.sleep(0.5)
            return "should_not_reach"

        with pytest.raises(ServiceTimeoutError) as exc_info:
            await slow_operation()

        assert exc_info.value.timeout_duration == 0.1
        assert exc_info.value.operation == "slow_operation"

    @pytest.mark.asyncio
    async def test_timeout_custom_exception_type(self):
        """Test timeout with custom exception type."""

        @with_timeout(0.1, ProcessingTimeoutError, "custom_processing")
        async def processing_operation():
            await asyncio.sleep(0.5)
            return "should_not_reach"

        with pytest.raises(ProcessingTimeoutError) as exc_info:
            await processing_operation()

        assert exc_info.value.timeout_duration == 0.1
        assert exc_info.value.operation == "custom_processing"

    @pytest.mark.asyncio
    async def test_timeout_preserves_other_exceptions(self):
        """Test that timeout doesn't interfere with other exceptions."""

        @with_timeout(2.0)
        async def error_operation():
            await asyncio.sleep(0.1)
            raise ValueError("Original error")

        with pytest.raises(ValueError, match="Original error"):
            await error_operation()


class TestRetryDecorator:
    """Test retry decorator functionality."""

    @pytest.mark.asyncio
    async def test_retry_success_first_attempt(self):
        """Test that successful operations on first attempt work normally."""
        call_count = 0

        @with_retry(max_attempts=3)
        async def successful_operation():
            nonlocal call_count
            call_count += 1
            return "success"

        result = await successful_operation()
        assert result == "success"
        assert call_count == 1

    @pytest.mark.asyncio
    async def test_retry_success_after_failures(self):
        """Test retry succeeds after some failures."""
        call_count = 0

        @with_retry(max_attempts=3, initial_delay=0.01)
        async def flaky_operation():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Network error")
            return "success"

        result = await flaky_operation()
        assert result == "success"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_retry_exhausted_attempts(self):
        """Test retry gives up after max attempts."""
        call_count = 0

        @with_retry(max_attempts=2, initial_delay=0.01)
        async def always_fails():
            nonlocal call_count
            call_count += 1
            raise ConnectionError("Always fails")

        with pytest.raises(ConnectionError, match="Always fails"):
            await always_fails()

        assert call_count == 2

    @pytest.mark.asyncio
    async def test_retry_permanent_exception_no_retry(self):
        """Test that permanent exceptions are not retried."""
        call_count = 0

        @with_retry(max_attempts=3, permanent_exceptions=[ValueError])
        async def permanent_error():
            nonlocal call_count
            call_count += 1
            raise ValueError("Permanent error")

        with pytest.raises(ValueError, match="Permanent error"):
            await permanent_error()

        assert call_count == 1

    @pytest.mark.asyncio
    async def test_retry_specific_exceptions_only(self):
        """Test retry only on specific exceptions."""
        call_count = 0

        @with_retry(
            max_attempts=3, retry_exceptions=[ConnectionError], initial_delay=0.01
        )
        async def specific_error():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise OSError("Should not retry")
            return "success"

        with pytest.raises(OSError, match="Should not retry"):
            await specific_error()

        assert call_count == 1

    @pytest.mark.asyncio
    async def test_retry_exponential_backoff(self):
        """Test exponential backoff timing (basic verification)."""
        call_times = []

        @with_retry(max_attempts=3, initial_delay=0.01, backoff_multiplier=2.0)
        async def timing_test():
            call_times.append(datetime.now())
            if len(call_times) < 3:
                raise ConnectionError("Test error")
            return "success"

        start_time = datetime.now()
        result = await timing_test()

        assert result == "success"
        assert len(call_times) == 3

        # Verify delays increased (with some tolerance for timing)
        delay1 = (call_times[1] - call_times[0]).total_seconds()
        delay2 = (call_times[2] - call_times[1]).total_seconds()

        assert delay1 >= 0.01  # At least initial delay
        assert delay2 >= delay1 * 1.8  # Roughly doubled with tolerance


class TestCircuitBreaker:
    """Test circuit breaker functionality."""

    def test_circuit_breaker_initialization(self):
        """Test circuit breaker initializes correctly."""
        cb = CircuitBreaker(
            failure_threshold=3, recovery_timeout=30.0, name="test_breaker"
        )

        assert cb.state == CircuitBreakerState.CLOSED
        assert cb.failure_count == 0
        assert cb.success_count == 0
        assert cb.name == "test_breaker"

    @pytest.mark.asyncio
    async def test_circuit_breaker_success_flow(self):
        """Test circuit breaker with successful operations."""
        cb = CircuitBreaker(failure_threshold=3, name="success_test")

        @cb.call
        async def successful_operation():
            return "success"

        # Multiple successful calls
        for i in range(5):
            result = await successful_operation()
            assert result == "success"

        assert cb.state == CircuitBreakerState.CLOSED
        assert cb.success_count == 5
        assert cb.failure_count == 0

    @pytest.mark.asyncio
    async def test_circuit_breaker_failure_threshold(self):
        """Test circuit breaker opens after failure threshold."""
        cb = CircuitBreaker(failure_threshold=2, name="failure_test")

        @cb.call
        async def failing_operation():
            raise ConnectionError("Test failure")

        # First failure
        with pytest.raises(ConnectionError):
            await failing_operation()
        assert cb.state == CircuitBreakerState.CLOSED
        assert cb.failure_count == 1

        # Second failure - should open circuit
        with pytest.raises(ConnectionError):
            await failing_operation()
        assert cb.state == CircuitBreakerState.OPEN
        assert cb.failure_count == 2

        # Third call should fail fast
        with pytest.raises(CircuitBreakerOpenError) as exc_info:
            await failing_operation()

        assert "test failure" not in str(
            exc_info.value
        )  # Should be circuit breaker error
        assert cb.failure_count == 2  # No additional failure recorded

    @pytest.mark.asyncio
    async def test_circuit_breaker_recovery(self):
        """Test circuit breaker recovery after timeout."""
        cb = CircuitBreaker(
            failure_threshold=1, recovery_timeout=0.1, name="recovery_test"
        )

        call_count = 0

        @cb.call
        async def recovery_operation():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ConnectionError("Initial failure")
            return "recovered"

        # Initial failure opens circuit
        with pytest.raises(ConnectionError):
            await recovery_operation()
        assert cb.state == CircuitBreakerState.OPEN

        # Immediate retry should fail fast
        with pytest.raises(CircuitBreakerOpenError):
            await recovery_operation()

        # Wait for recovery timeout
        await asyncio.sleep(0.15)

        # Should now allow attempt and succeed
        result = await recovery_operation()
        assert result == "recovered"
        assert cb.state == CircuitBreakerState.CLOSED
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_circuit_breaker_half_open_failure(self):
        """Test circuit breaker behavior when half-open attempt fails."""
        cb = CircuitBreaker(
            failure_threshold=1, recovery_timeout=0.1, name="half_open_failure_test"
        )

        @cb.call
        async def half_open_fail():
            raise ConnectionError("Still failing")

        # Initial failure
        with pytest.raises(ConnectionError):
            await half_open_fail()
        assert cb.state == CircuitBreakerState.OPEN

        # Wait for recovery timeout
        await asyncio.sleep(0.15)

        # Half-open attempt fails
        with pytest.raises(ConnectionError):
            await half_open_fail()
        assert cb.state == CircuitBreakerState.OPEN  # Back to open

    @pytest.mark.asyncio
    async def test_circuit_breaker_context_manager(self):
        """Test circuit breaker as async context manager."""
        cb = CircuitBreaker(failure_threshold=2, name="context_test")

        # Successful context usage
        async with cb:
            result = "context_success"

        assert cb.success_count == 1
        assert cb.state == CircuitBreakerState.CLOSED

        # Failure in context
        with pytest.raises(ValueError):
            async with cb:
                raise ValueError("Context error")

        assert cb.failure_count == 1
        assert cb.state == CircuitBreakerState.CLOSED

        # Second failure opens circuit
        with pytest.raises(ValueError):
            async with cb:
                raise ValueError("Second error")

        assert cb.failure_count == 2
        assert cb.state == CircuitBreakerState.OPEN

        # Context manager should now reject
        with pytest.raises(CircuitBreakerOpenError):
            async with cb:
                pass


class TestPreConfiguredUtilities:
    """Test pre-configured utility instances."""

    @pytest.mark.asyncio
    async def test_standard_timeout_decorator(self):
        """Test pre-configured timeout decorator."""

        @standard_timeout
        async def quick_operation():
            await asyncio.sleep(0.1)
            return "quick"

        result = await quick_operation()
        assert result == "quick"

    @pytest.mark.asyncio
    async def test_network_timeout_decorator(self):
        """Test pre-configured network timeout decorator."""

        @network_timeout
        async def network_operation():
            await asyncio.sleep(0.1)
            return "network"

        result = await network_operation()
        assert result == "network"

    @pytest.mark.asyncio
    async def test_standard_retry_decorator(self):
        """Test pre-configured retry decorator."""
        call_count = 0

        @standard_retry
        async def retry_operation():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ConnectionError("Retry test")
            return "retried"

        result = await retry_operation()
        assert result == "retried"
        assert call_count == 2

    def test_database_circuit_breaker_exists(self):
        """Test pre-configured database circuit breaker exists."""
        assert database_circuit_breaker.name == "database_service"
        assert database_circuit_breaker.failure_threshold == 3
        assert database_circuit_breaker.state == CircuitBreakerState.CLOSED

    def test_external_api_circuit_breaker_exists(self):
        """Test pre-configured external API circuit breaker exists."""
        assert external_api_circuit_breaker.name == "external_api_service"
        assert external_api_circuit_breaker.failure_threshold == 5
        assert external_api_circuit_breaker.state == CircuitBreakerState.CLOSED


class TestCombinedDecorators:
    """Test combining multiple decorators."""

    @pytest.mark.asyncio
    async def test_timeout_with_retry(self):
        """Test timeout and retry decorators work together."""
        call_count = 0

        @with_retry(max_attempts=3, initial_delay=0.01)
        @with_timeout(1.0, ProcessingTimeoutError)
        async def combined_operation():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Retry error")
            await asyncio.sleep(0.1)  # Within timeout
            return "combined_success"

        result = await combined_operation()
        assert result == "combined_success"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_circuit_breaker_with_retry_timeout(self):
        """Test circuit breaker with retry and timeout."""
        cb = CircuitBreaker(failure_threshold=5, name="combined_test")
        call_count = 0

        @cb.call
        @with_retry(max_attempts=2, initial_delay=0.01)
        @with_timeout(1.0)
        async def triple_combined():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ConnectionError("Should retry")
            await asyncio.sleep(0.1)
            return "triple_success"

        result = await triple_combined()
        assert result == "triple_success"
        assert call_count == 2
        assert cb.success_count == 1  # Circuit breaker sees final success
        assert cb.failure_count == 0  # Retry handled the failure


class TestExceptionHierarchy:
    """Test custom exception types."""

    def test_service_timeout_error_attributes(self):
        """Test ServiceTimeoutError has correct attributes."""
        error = ServiceTimeoutError(30.0, "test_op", "Test message")
        assert error.timeout_duration == 30.0
        assert error.operation == "test_op"
        assert str(error) == "Test message"

    def test_processing_timeout_error_message(self):
        """Test ProcessingTimeoutError generates correct message."""
        error = ProcessingTimeoutError(45.0, "document_parsing")
        assert "document_parsing" in str(error)
        assert "45.0s" in str(error)
        assert error.timeout_duration == 45.0

    def test_network_timeout_error_message(self):
        """Test NetworkTimeoutError generates correct message."""
        error = NetworkTimeoutError(10.0, "api_call")
        assert "api_call" in str(error)
        assert "10.0s" in str(error)
        assert error.timeout_duration == 10.0

    def test_circuit_breaker_open_error_attributes(self):
        """Test CircuitBreakerOpenError has correct attributes."""
        timestamp = datetime.now()
        error = CircuitBreakerOpenError("test_service", 5, timestamp)
        assert error.name == "test_service"
        assert error.failure_count == 5
        assert error.last_failure_time == timestamp
        assert "test_service" in str(error)
        assert "5" in str(error)
