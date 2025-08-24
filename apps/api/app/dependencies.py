"""Dependency injection container for ATSPro API services."""

import logging
from typing import Optional
from fastapi import Header, HTTPException, Depends

from .services.job_service import JobService
from .auth import validate_bearer_token, User

logger = logging.getLogger(__name__)

# Global service instances
_job_service: Optional[JobService] = None


async def get_job_service() -> JobService:
    """Get the job service instance."""
    global _job_service

    if _job_service is None:
        try:
            _job_service = JobService()
            logger.info("JobService initialized via dependency injection")
        except Exception as e:
            logger.error(f"Failed to initialize JobService: {e}")
            # Clean up global reference on failure
            _job_service = None
            raise

    return _job_service


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Extract user from better-auth session.

    This is a shared auth dependency that can be used across all routers.
    Validates the session token against the better-auth database.
    Returns a dict for backward compatibility with existing code.

    Args:
        authorization: Authorization header from request

    Returns:
        dict: User dictionary with id, email, name, session_id

    Raises:
        HTTPException: If authorization is invalid, missing, or expired
    """
    user = await validate_bearer_token(authorization)
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "session_id": user.session_id,
    }


async def get_current_user_typed(authorization: Optional[str] = Header(None)) -> User:
    """Extract user from better-auth session, returning a typed User object.

    Args:
        authorization: Authorization header from request

    Returns:
        User: Authenticated user object with validated session

    Raises:
        HTTPException: If authorization is invalid, missing, or expired
    """
    return await validate_bearer_token(authorization)


async def shutdown_services():
    """Shutdown all services and clean up resources."""
    global _job_service

    _job_service = None
    logger.info("All services shutdown completed")




# Alias for WebSocket usage with typed User object
get_user_from_websocket_token = get_current_user_typed
