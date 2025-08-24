"""Shared utilities for timeout, retry handling, and circuit breaker across all services.

This module provides reusable decorators and utilities for:
- Timeout handling with configurable durations
- Retry logic with exponential backoff
- Circuit breaker pattern for service resilience
- Custom exception types for different failure scenarios

Usage Examples:

    @with_timeout(30.0)
    @with_retry(max_attempts=3, backoff_multiplier=2.0)
    async def process_document(document_id: str) -> ProcessedDocument:
        # Service logic here
        pass

    circuit_breaker = CircuitBreaker(
        failure_threshold=5,
        recovery_timeout=60.0,
        name="external_api"
    )

    @circuit_breaker.call
    async def call_external_api() -> dict:
        # External API call logic
        pass
"""

import asyncio
import logging
import time
from enum import Enum
from functools import wraps
from typing import Any, Awaitable, Callable, Dict, List, Optional, Type, TypeVar, Union
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Type variables for generic decorator support
F = TypeVar("F", bound=Callable[..., Any])
AsyncF = TypeVar("AsyncF", bound=Callable[..., Awaitable[Any]])


class ServiceTimeoutError(Exception):
    """Base timeout exception for service operations."""

    def __init__(
        self, timeout_duration: float, operation: str = "", message: str = None
    ):
        self.timeout_duration = timeout_duration
        self.operation = operation
        if message is None:
            message = f"Operation '{operation}' timed out after {timeout_duration}s"
        super().__init__(message)


class ProcessingTimeoutError(ServiceTimeoutError):
    """Timeout exception for processing operations like document parsing."""

    def __init__(self, timeout_duration: float, operation: str = "processing"):
        message = (
            f"Processing operation '{operation}' timed out after {timeout_duration}s"
        )
        super().__init__(timeout_duration, operation, message)


class NetworkTimeoutError(ServiceTimeoutError):
    """Timeout exception for network operations like API calls."""

    def __init__(self, timeout_duration: float, operation: str = "network"):
        message = f"Network operation '{operation}' timed out after {timeout_duration}s"
        super().__init__(timeout_duration, operation, message)


class CircuitBreakerState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing fast
    HALF_OPEN = "half_open"  # Testing recovery


class CircuitBreakerOpenError(Exception):
    """Exception raised when circuit breaker is in open state."""

    def __init__(self, name: str, failure_count: int, last_failure_time: datetime):
        self.name = name
        self.failure_count = failure_count
        self.last_failure_time = last_failure_time
        message = f"Circuit breaker '{name}' is open. Failures: {failure_count}, Last failure: {last_failure_time}"
        super().__init__(message)


def with_timeout(
    timeout_seconds: float,
    timeout_error_type: Type[ServiceTimeoutError] = ServiceTimeoutError,
    operation_name: Optional[str] = None,
) -> Callable[[AsyncF], AsyncF]:
    """Decorator to add timeout handling to async functions.

    Args:
        timeout_seconds: Maximum time to wait before timing out
        timeout_error_type: Type of timeout exception to raise
        operation_name: Name of the operation for logging and error messages

    Returns:
        Decorated function with timeout handling

    Usage:
        @with_timeout(30.0, ProcessingTimeoutError, "document_parsing")
        async def parse_document(file_path: str) -> Document:
            # Processing logic here
            pass
    """

    def decorator(func: AsyncF) -> AsyncF:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            operation = operation_name or func.__name__

            try:
                logger.debug(f"Starting {operation} with {timeout_seconds}s timeout")
                result = await asyncio.wait_for(
                    func(*args, **kwargs), timeout=timeout_seconds
                )
                logger.debug(f"Completed {operation} within timeout")
                return result

            except asyncio.TimeoutError:
                logger.warning(f"Timeout in {operation} after {timeout_seconds}s")
                raise timeout_error_type(timeout_seconds, operation)

            except Exception as e:
                logger.error(f"Error in {operation}: {e}")
                raise

        return wrapper

    return decorator


def with_retry(
    max_attempts: int = 3,
    backoff_multiplier: float = 2.0,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    retry_exceptions: Optional[List[Type[Exception]]] = None,
    permanent_exceptions: Optional[List[Type[Exception]]] = None,
) -> Callable[[AsyncF], AsyncF]:
    """Decorator to add retry logic with exponential backoff to async functions.

    Args:
        max_attempts: Maximum number of retry attempts (including initial)
        backoff_multiplier: Factor to multiply delay by on each retry
        initial_delay: Initial delay between retries in seconds
        max_delay: Maximum delay between retries in seconds
        retry_exceptions: Specific exceptions to retry on (None = retry all except permanent)
        permanent_exceptions: Exceptions that should not be retried

    Returns:
        Decorated function with retry logic

    Usage:
        @with_retry(
            max_attempts=5,
            backoff_multiplier=1.5,
            retry_exceptions=[httpx.ConnectTimeout, httpx.ReadTimeout],
            permanent_exceptions=[ValueError, TypeError]
        )
        async def call_external_api() -> dict:
            # API call logic here
            pass
    """
    if permanent_exceptions is None:
        permanent_exceptions = [TypeError, ValueError, KeyError, AttributeError]

    def decorator(func: AsyncF) -> AsyncF:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            last_exception = None
            delay = initial_delay

            for attempt in range(1, max_attempts + 1):
                try:
                    if attempt > 1:
                        logger.info(
                            f"Retrying {func.__name__} (attempt {attempt}/{max_attempts})"
                        )

                    result = await func(*args, **kwargs)

                    if attempt > 1:
                        logger.info(
                            f"Retry successful for {func.__name__} on attempt {attempt}"
                        )

                    return result

                except Exception as e:
                    last_exception = e

                    # Check if this is a permanent exception that shouldn't be retried
                    if any(
                        isinstance(e, exc_type) for exc_type in permanent_exceptions
                    ):
                        logger.error(f"Permanent exception in {func.__name__}: {e}")
                        raise e

                    # Check if this exception should be retried
                    if retry_exceptions and not any(
                        isinstance(e, exc_type) for exc_type in retry_exceptions
                    ):
                        logger.error(f"Non-retryable exception in {func.__name__}: {e}")
                        raise e

                    # Don't wait after the last attempt
                    if attempt < max_attempts:
                        logger.warning(
                            f"Attempt {attempt}/{max_attempts} failed for {func.__name__}: {e}. Retrying in {delay}s"
                        )
                        await asyncio.sleep(delay)
                        delay = min(delay * backoff_multiplier, max_delay)
                    else:
                        logger.error(
                            f"All {max_attempts} attempts failed for {func.__name__}"
                        )

            # If we get here, all attempts failed
            raise last_exception

        return wrapper

    return decorator


class CircuitBreaker:
    """Circuit breaker implementation for service resilience.

    The circuit breaker prevents cascading failures by:
    - CLOSED: Normal operation, tracking failures
    - OPEN: Fast-failing after threshold reached
    - HALF_OPEN: Testing if service has recovered

    Usage:
        circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60.0,
            name="database_service"
        )

        @circuit_breaker.call
        async def database_operation() -> Any:
            # Database logic here
            pass

        # Or use as context manager
        async with circuit_breaker:
            result = await some_operation()
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        name: str = "unnamed_service",
    ):
        """Initialize circuit breaker.

        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Time in seconds before trying half-open state
            name: Name for logging and identification
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.name = name

        self._state = CircuitBreakerState.CLOSED
        self._failure_count = 0
        self._last_failure_time: Optional[datetime] = None
        self._success_count = 0

        logger.info(
            f"Circuit breaker '{name}' initialized with threshold={failure_threshold}, recovery_timeout={recovery_timeout}s"
        )

    @property
    def state(self) -> CircuitBreakerState:
        """Get current circuit breaker state."""
        return self._state

    @property
    def failure_count(self) -> int:
        """Get current failure count."""
        return self._failure_count

    @property
    def success_count(self) -> int:
        """Get current success count."""
        return self._success_count

    def _should_attempt_call(self) -> bool:
        """Determine if we should attempt the call based on current state."""
        if self._state == CircuitBreakerState.CLOSED:
            return True
        elif self._state == CircuitBreakerState.HALF_OPEN:
            return True
        elif self._state == CircuitBreakerState.OPEN:
            if self._last_failure_time:
                time_since_failure = datetime.now() - self._last_failure_time
                if time_since_failure.total_seconds() >= self.recovery_timeout:
                    logger.info(
                        f"Circuit breaker '{self.name}' attempting recovery (half-open)"
                    )
                    self._state = CircuitBreakerState.HALF_OPEN
                    return True
            return False
        return False

    def _record_success(self) -> None:
        """Record a successful operation."""
        self._success_count += 1

        if self._state == CircuitBreakerState.HALF_OPEN:
            logger.info(f"Circuit breaker '{self.name}' recovered successfully")
            self._state = CircuitBreakerState.CLOSED
            self._failure_count = 0

        logger.debug(
            f"Circuit breaker '{self.name}' success recorded. Total: {self._success_count}"
        )

    def _record_failure(self, exception: Exception) -> None:
        """Record a failed operation."""
        self._failure_count += 1
        self._last_failure_time = datetime.now()

        logger.warning(
            f"Circuit breaker '{self.name}' failure recorded: {exception}. Count: {self._failure_count}"
        )

        if self._failure_count >= self.failure_threshold:
            if self._state != CircuitBreakerState.OPEN:
                logger.error(
                    f"Circuit breaker '{self.name}' opened after {self._failure_count} failures"
                )
                self._state = CircuitBreakerState.OPEN

    def call(self, func: AsyncF) -> AsyncF:
        """Decorator to wrap a function with circuit breaker logic."""

        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            if not self._should_attempt_call():
                raise CircuitBreakerOpenError(
                    self.name, self._failure_count, self._last_failure_time
                )

            try:
                result = await func(*args, **kwargs)
                self._record_success()
                return result
            except Exception as e:
                self._record_failure(e)
                raise e

        return wrapper

    async def __aenter__(self):
        """Context manager entry - check if we should proceed."""
        if not self._should_attempt_call():
            raise CircuitBreakerOpenError(
                self.name, self._failure_count, self._last_failure_time
            )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - record success or failure."""
        if exc_type is None:
            self._record_success()
        else:
            self._record_failure(exc_val)
        return False  # Don't suppress exceptions


# Convenience functions for common patterns
def create_processing_timeout_decorator(
    timeout_seconds: float,
) -> Callable[[AsyncF], AsyncF]:
    """Create a timeout decorator specifically for processing operations."""
    return with_timeout(timeout_seconds, ProcessingTimeoutError, "processing")


def create_network_timeout_decorator(
    timeout_seconds: float,
) -> Callable[[AsyncF], AsyncF]:
    """Create a timeout decorator specifically for network operations."""
    return with_timeout(timeout_seconds, NetworkTimeoutError, "network")


def create_standard_retry_decorator(
    max_attempts: int = 3, include_timeout_errors: bool = True
) -> Callable[[AsyncF], AsyncF]:
    """Create a standard retry decorator with common retry exceptions."""
    import httpx

    retry_exceptions = [
        ConnectionError,
        TimeoutError,
        OSError,  # Network-related OS errors
    ]

    if include_timeout_errors:
        retry_exceptions.extend(
            [ServiceTimeoutError, ProcessingTimeoutError, NetworkTimeoutError]
        )

    # Add httpx exceptions if available
    try:
        retry_exceptions.extend(
            [
                httpx.ConnectTimeout,
                httpx.ReadTimeout,
                httpx.NetworkError,
                httpx.RemoteProtocolError,
            ]
        )
    except (ImportError, AttributeError):
        # httpx not available or missing these exception types
        pass

    return with_retry(max_attempts=max_attempts, retry_exceptions=retry_exceptions)


# Pre-configured utility instances
database_circuit_breaker = CircuitBreaker(
    failure_threshold=3, recovery_timeout=30.0, name="database_service"
)

external_api_circuit_breaker = CircuitBreaker(
    failure_threshold=5, recovery_timeout=60.0, name="external_api_service"
)

# Pre-configured decorators for common use cases
standard_timeout = create_processing_timeout_decorator(30.0)
network_timeout = create_network_timeout_decorator(10.0)
standard_retry = create_standard_retry_decorator(max_attempts=3)
aggressive_retry = create_standard_retry_decorator(max_attempts=5)
