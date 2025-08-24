#!/usr/bin/env python3
"""
Example usage of service utilities for timeout, retry, and circuit breaker patterns.

This file demonstrates how to use the shared utilities in real service implementations.
Run this file directly to see the utilities in action.
"""

import asyncio
import random
import logging
from typing import Dict, Any

# Import the utilities we created
from app.services.utils import (
    # Decorators
    with_timeout,
    with_retry,
    standard_timeout,
    network_timeout,
    standard_retry,
    aggressive_retry,
    # Circuit breaker
    CircuitBreaker,
    database_circuit_breaker,
    external_api_circuit_breaker,
    # Exception types
    ProcessingTimeoutError,
    NetworkTimeoutError,
    CircuitBreakerOpenError,
)

# Set up logging to see the utilities in action
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ExampleService:
    """Example service demonstrating utility usage patterns."""

    def __init__(self):
        # Create a dedicated circuit breaker for this service
        self.api_circuit_breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=30.0,
            name="example_api_service"
        )

    @standard_timeout  # 30-second timeout for processing
    @standard_retry    # 3 attempts with exponential backoff
    async def process_document(self, document_id: str) -> Dict[str, Any]:
        """Example document processing with timeout and retry."""
        logger.info(f"Processing document {document_id}")
        
        # Simulate processing time
        await asyncio.sleep(0.5)
        
        # Simulate occasional failures
        if random.random() < 0.3:
            raise ConnectionError("Document service temporarily unavailable")
        
        return {
            "document_id": document_id,
            "status": "processed",
            "pages": random.randint(1, 10)
        }

    @network_timeout   # 10-second timeout for network operations
    @with_retry(max_attempts=5, initial_delay=0.5)
    async def fetch_external_data(self, resource_id: str) -> Dict[str, Any]:
        """Example external API call with network-specific handling."""
        logger.info(f"Fetching external data for {resource_id}")
        
        # Simulate network request
        await asyncio.sleep(0.2)
        
        # Simulate network failures
        if random.random() < 0.4:
            raise ConnectionError("External service timeout")
        
        return {
            "resource_id": resource_id,
            "data": f"external_data_{resource_id}",
            "timestamp": "2024-08-24T10:00:00Z"
        }

    @database_circuit_breaker.call
    async def database_operation(self, query: str) -> Dict[str, Any]:
        """Example database operation with circuit breaker protection."""
        logger.info(f"Executing database query: {query}")
        
        # Simulate database operation
        await asyncio.sleep(0.1)
        
        # Simulate database failures
        if random.random() < 0.2:
            raise ConnectionError("Database connection failed")
        
        return {
            "query": query,
            "rows": random.randint(0, 100),
            "execution_time_ms": random.randint(10, 500)
        }

    @with_timeout(5.0, ProcessingTimeoutError, "critical_processing")
    @aggressive_retry  # 5 attempts with exponential backoff
    async def critical_operation(self, data: str) -> str:
        """Example critical operation with custom timeout and aggressive retry."""
        logger.info("Executing critical operation")
        
        # Simulate processing
        await asyncio.sleep(0.3)
        
        # Simulate failures
        if random.random() < 0.5:
            raise ValueError("Processing failed")
        
        return f"processed_{data}"

    async def combined_workflow(self, document_id: str) -> Dict[str, Any]:
        """Example workflow combining multiple utilities."""
        try:
            # Step 1: Process the document
            doc_result = await self.process_document(document_id)
            
            # Step 2: Fetch additional data
            external_data = await self.fetch_external_data(document_id)
            
            # Step 3: Store results in database
            db_result = await self.database_operation(
                f"INSERT INTO processed_docs VALUES ('{document_id}')"
            )
            
            # Step 4: Run critical processing
            critical_result = await self.critical_operation(document_id)
            
            return {
                "document": doc_result,
                "external": external_data,
                "database": db_result,
                "critical": critical_result,
                "workflow_status": "completed"
            }
            
        except ProcessingTimeoutError as e:
            logger.error(f"Processing timeout: {e}")
            return {"error": "processing_timeout", "details": str(e)}
            
        except NetworkTimeoutError as e:
            logger.error(f"Network timeout: {e}")
            return {"error": "network_timeout", "details": str(e)}
            
        except CircuitBreakerOpenError as e:
            logger.error(f"Circuit breaker open: {e}")
            return {"error": "service_unavailable", "details": str(e)}
            
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {"error": "unexpected", "details": str(e)}


async def demonstrate_utilities():
    """Demonstrate the utility functions in action."""
    service = ExampleService()
    
    logger.info("=== Service Utilities Demo ===")
    
    # Run multiple workflow instances to show different behaviors
    document_ids = ["doc_001", "doc_002", "doc_003", "doc_004", "doc_005"]
    
    tasks = []
    for doc_id in document_ids:
        tasks.append(service.combined_workflow(doc_id))
    
    # Run all workflows concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Display results
    for i, result in enumerate(results):
        doc_id = document_ids[i]
        if isinstance(result, Exception):
            logger.error(f"Document {doc_id} failed: {result}")
        else:
            status = result.get("workflow_status", result.get("error", "unknown"))
            logger.info(f"Document {doc_id} result: {status}")
    
    # Demonstrate circuit breaker state
    logger.info(f"Database circuit breaker state: {database_circuit_breaker.state}")
    logger.info(f"Database circuit breaker failures: {database_circuit_breaker.failure_count}")
    logger.info(f"Database circuit breaker successes: {database_circuit_breaker.success_count}")


if __name__ == "__main__":
    # Run the demonstration
    asyncio.run(demonstrate_utilities())