"""Service layer module for ATSPro API.

This module provides service layer abstractions for task management
and database operations, along with shared utilities for timeout,
retry, and circuit breaker patterns.
"""

from .resume_processor import ResumeProcessorService, process_resume_synchronously
from .utils import (
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
    # Factory functions
    create_processing_timeout_decorator,
    create_network_timeout_decorator,
    create_standard_retry_decorator,
)

__all__ = [
    "ResumeProcessorService", 
    "process_resume_synchronously",
    # Exception types
    "ServiceTimeoutError",
    "ProcessingTimeoutError", 
    "NetworkTimeoutError",
    "CircuitBreakerOpenError",
    # Decorators
    "with_timeout",
    "with_retry", 
    # Circuit breaker
    "CircuitBreaker",
    "CircuitBreakerState",
    # Pre-configured utilities
    "database_circuit_breaker",
    "external_api_circuit_breaker", 
    "standard_timeout",
    "network_timeout",
    "standard_retry",
    "aggressive_retry",
    # Factory functions
    "create_processing_timeout_decorator",
    "create_network_timeout_decorator",
    "create_standard_retry_decorator",
]
