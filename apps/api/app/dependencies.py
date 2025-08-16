"""Dependency injection container for ATSPro API services."""

import logging
from typing import Optional
from fastapi import Header, HTTPException

from .services.task_service import TaskService
from .services.job_service import JobService

logger = logging.getLogger(__name__)

# Global service instances
_task_service: Optional[TaskService] = None
_job_service: Optional[JobService] = None


async def get_task_service() -> TaskService:
    """Get the global task service instance."""
    global _task_service
    
    if _task_service is None:
        _task_service = TaskService()
        await _task_service.startup()
        logger.info("TaskService initialized via dependency injection")
    
    return _task_service


async def get_job_service() -> JobService:
    """Get the job service instance with proper task service dependency."""
    global _job_service
    
    if _job_service is None:
        task_service = await get_task_service()
        _job_service = JobService(task_service)
        logger.info("JobService initialized via dependency injection")
    
    return _job_service


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Extract user from better-auth session.
    
    This is a shared auth dependency that can be used across all routers.
    
    Args:
        authorization: Authorization header from request
    
    Returns:
        User dictionary with id and other info
    
    Raises:
        HTTPException: If authorization is invalid or missing
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # TODO: Implement actual auth logic with better-auth
    # For now, return mock user for interface compatibility
    try:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
            if token == "test_token":
                return {"id": "test_user", "email": "test@example.com"}
            else:
                # Parse token and validate (placeholder)
                return {
                    "id": f"user_{token[:8]}",
                    "email": f"user_{token[:8]}@example.com",
                }
        else:
            # For development, allow simple authorization
            return {"id": "user_123", "email": "user@example.com"}
    except Exception as e:
        logger.error(f"Authorization validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authorization token")


async def shutdown_services():
    """Shutdown all services and clean up resources."""
    global _task_service, _job_service
    
    if _task_service:
        await _task_service.shutdown()
        _task_service = None
        logger.info("TaskService shutdown via dependency injection")
    
    _job_service = None
    logger.info("All services shutdown completed")


# Export for backward compatibility
async def get_global_task_service():
    """Get the global task service for backward compatibility."""
    return await get_task_service()