"""Task management endpoints for ATSPro API."""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field

from ..services.task_service import TaskService
from ..websocket.task_updates import broadcast_task_update

logger = logging.getLogger(__name__)

router = APIRouter(tags=["tasks"])

# Global task service instance
task_service = TaskService()


# Request/Response Models
class TaskResponse(BaseModel):
    """Single task response model."""

    id: str
    status: str
    progress: int = Field(ge=0, le=100)
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    task_type: str
    user_id: str
    priority: int
    error_message: Optional[str] = None
    result_id: Optional[str] = None
    estimated_duration_ms: Optional[int] = None
    max_retries: int
    retry_count: int


class TaskListResponse(BaseModel):
    """Paginated task list response model."""

    tasks: List[TaskResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool


class TaskResultResponse(BaseModel):
    """Task result response model."""

    task_id: str
    status: str
    result: Optional[dict] = None
    error: Optional[str] = None


# Auth dependency (placeholder - will integrate with better-auth)
async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Extract user from better-auth session.

    This is a placeholder implementation that should be replaced with
    actual better-auth integration.

    Args:
        authorization: Authorization header from request

    Returns:
        User dictionary with id and other info

    Raises:
        HTTPException: If authorization is invalid or missing
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # TODO: Replace with actual better-auth token validation
    # For now, we'll use a mock implementation
    try:
        # This would normally validate the token with better-auth
        # and return the actual user information
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
            raise HTTPException(status_code=401, detail="Invalid authorization format")
    except Exception as e:
        logger.error(f"Authorization validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authorization token")


def _convert_task_to_response(task_data: dict) -> TaskResponse:
    """Convert task dictionary to TaskResponse model."""
    return TaskResponse(
        id=task_data["id"],
        status=task_data["status"],
        progress=task_data.get("progress", 0),
        created_at=task_data["created_at"],
        started_at=task_data.get("started_at"),
        completed_at=task_data.get("completed_at"),
        task_type=task_data["task_type"],
        user_id=task_data["user_id"],
        priority=task_data["priority"],
        error_message=task_data.get("error_message"),
        result_id=task_data.get("result_id"),
        estimated_duration_ms=task_data.get("estimated_duration_ms"),
        max_retries=task_data["max_retries"],
        retry_count=task_data.get("retry_count", 0),
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_status(
    task_id: str, user: dict = Depends(get_current_user)
) -> TaskResponse:
    """Get detailed status and information for a specific task.

    Returns comprehensive task information including status, progress,
    results (if completed), and error details (if failed).

    Args:
        task_id: Unique identifier of the task
        user: Current authenticated user

    Returns:
        Task status and details

    Raises:
        HTTPException: If task not found or access denied
    """
    try:
        task_data = await task_service.get_task(task_id)

        if not task_data:
            raise HTTPException(status_code=404, detail="Task not found")

        # Verify task ownership
        if task_data.get("user_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        logger.info(f"Retrieved task {task_id} for user {user['id']}")
        return _convert_task_to_response(task_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=TaskListResponse)
async def list_user_tasks(
    user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None, description="Filter by task status"),
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    start_date: Optional[str] = Query(
        None, description="Filter by start date (ISO format)"
    ),
    end_date: Optional[str] = Query(
        None, description="Filter by end date (ISO format)"
    ),
) -> TaskListResponse:
    """Get paginated list of user's tasks with optional filtering.

    Supports filtering by status, task type, and date range.
    Results are ordered by creation date (newest first).

    Args:
        user: Current authenticated user
        status: Optional status filter (pending, running, completed, failed, cancelled)
        task_type: Optional task type filter
        page: Page number (1-based)
        per_page: Number of items per page (1-100)
        start_date: Optional start date filter (ISO format)
        end_date: Optional end date filter (ISO format)

    Returns:
        Paginated list of tasks with metadata

    Raises:
        HTTPException: If invalid parameters or server error
    """
    try:
        # Validate status filter
        valid_statuses = ["pending", "running", "completed", "failed", "cancelled"]
        if status and status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
            )

        # Calculate offset
        offset = (page - 1) * per_page

        # Get tasks from service
        tasks = await task_service.get_user_tasks(
            user_id=user["id"],
            status=status,
            task_type=task_type,
            limit=per_page + 1,  # Get one extra to check if there's a next page
            offset=offset,
        )

        # Check if there are more pages
        has_next = len(tasks) > per_page
        if has_next:
            tasks = tasks[:per_page]  # Remove the extra item

        has_prev = page > 1

        # Convert to response models
        task_responses = [_convert_task_to_response(task) for task in tasks]

        # Get total count (this could be optimized with a separate count query)
        # For now, we'll use the current page info
        total = offset + len(task_responses)
        if has_next:
            total += 1  # We know there's at least one more

        logger.info(f"Retrieved {len(task_responses)} tasks for user {user['id']}")

        return TaskListResponse(
            tasks=task_responses,
            total=total,
            page=page,
            per_page=per_page,
            has_next=has_next,
            has_prev=has_prev,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing tasks for user {user['id']}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{task_id}")
async def cancel_task(task_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Cancel a pending or running task.

    Attempts to gracefully cancel a task. Pending tasks are removed from
    the queue, while running tasks are marked for cancellation.

    Args:
        task_id: Unique identifier of the task to cancel
        user: Current authenticated user

    Returns:
        Cancellation status message

    Raises:
        HTTPException: If task not found, access denied, or cannot be cancelled
    """
    try:
        # First check if task exists and user has access
        task_data = await task_service.get_task(task_id)

        if not task_data:
            raise HTTPException(status_code=404, detail="Task not found")

        # Verify task ownership
        if task_data.get("user_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if task can be cancelled
        current_status = task_data.get("status")
        if current_status in ["completed", "failed", "cancelled"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel task with status: {current_status}",
            )

        # Attempt to cancel the task
        success = await task_service.cancel_task(task_id, user["id"])

        if not success:
            raise HTTPException(status_code=400, detail="Task could not be cancelled")

        # Broadcast cancellation to WebSocket clients
        try:
            await broadcast_task_update(
                task_id=task_id,
                user_id=user["id"],
                update_data={
                    "status": "cancelled",
                    "progress": task_data.get("progress", 0),
                    "completed_at": datetime.utcnow().isoformat(),
                },
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast task cancellation: {e}")

        logger.info(f"Cancelled task {task_id} for user {user['id']}")

        return {
            "success": True,
            "message": "Task cancelled successfully",
            "task_id": task_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{task_id}/result", response_model=TaskResultResponse)
async def get_task_result(
    task_id: str, user: dict = Depends(get_current_user)
) -> TaskResultResponse:
    """Get the result of a completed task.

    Returns the processed result data for completed tasks, or error
    information for failed tasks.

    Args:
        task_id: Unique identifier of the task
        user: Current authenticated user

    Returns:
        Task result data or error information

    Raises:
        HTTPException: If task not found, access denied, or not completed
    """
    try:
        # Get task information
        task_data = await task_service.get_task(task_id)

        if not task_data:
            raise HTTPException(status_code=404, detail="Task not found")

        # Verify task ownership
        if task_data.get("user_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        current_status = task_data.get("status")

        # Handle different task statuses
        if current_status == "pending":
            raise HTTPException(status_code=400, detail="Task is still pending")
        elif current_status == "running":
            raise HTTPException(status_code=400, detail="Task is still running")
        elif current_status == "cancelled":
            raise HTTPException(status_code=400, detail="Task was cancelled")
        elif current_status == "failed":
            return TaskResultResponse(
                task_id=task_id,
                status=current_status,
                result=None,
                error=task_data.get("error_message", "Task failed"),
            )
        elif current_status == "completed":
            # Get result from storage
            result_data = await task_service.get_task_result(task_id)

            return TaskResultResponse(
                task_id=task_id, status=current_status, result=result_data, error=None
            )
        else:
            raise HTTPException(
                status_code=400, detail=f"Unknown task status: {current_status}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving result for task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Note: Task service startup/shutdown is handled in main.py
# to avoid multiple initialization attempts
