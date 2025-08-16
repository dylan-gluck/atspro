import base64
from io import BytesIO
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from unstructured.partition.auto import partition

from ..database.connections import (
    get_arango_client,
    get_postgres_pool,
    get_redis_client,
)
from ..logger.logger import logger
from ..queue.redis_queue import TaskPriority
from ..schema.resume import Resume
from ..services.task_service import TaskService

router = APIRouter()


# Mock authentication for now - replace with better-auth integration
async def get_current_user() -> dict:
    """Mock current user - replace with actual better-auth integration."""
    return {"id": "mock_user_123", "email": "user@example.com"}


# Global task service instance
task_service = None


async def get_task_service() -> TaskService:
    """Get or create task service instance."""
    global task_service
    if task_service is None:
        task_service = TaskService()
        await task_service.startup()
    return task_service


@router.post("/parse")
async def parse_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    task_svc: TaskService = Depends(get_task_service),
):
    """
    Submit resume document for async parsing and return task/resume IDs immediately.

    Args:
        file: File object (pdf, md, doc, docx)
        current_user: Current authenticated user
        task_svc: Task service dependency

    Returns:
        Task ID and resume placeholder ID for tracking the parsing job
    """
    supported_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
        "application/msword",  # .doc
        "text/markdown",
        "text/plain",
    ]

    if not file:
        logger.error("No file provided")
        raise HTTPException(status_code=422, detail="No file provided")

    if file.content_type not in supported_types:
        logger.error(f"Unsupported file type: {file.content_type}")
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type: {file.content_type}. Supported types: {supported_types}",
        )

    # Read file content
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=422, detail="Empty file provided")

        # Validate file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(content) > max_size:
            raise HTTPException(
                status_code=422,
                detail=f"File too large. Maximum size: {max_size / (1024 * 1024):.1f}MB",
            )

    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error reading file: {str(e)}")
        raise HTTPException(status_code=422, detail="Error reading uploaded file")

    # Generate IDs
    resume_id = str(uuid4())
    user_id = current_user["id"]

    # Encode file content for task payload
    file_data = {
        "content": base64.b64encode(content).decode("utf-8"),
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
    }

    # Create task payload
    task_payload = {
        "resume_id": resume_id,
        "user_id": user_id,
        "file_data": file_data,
    }

    try:
        # Submit task to queue
        task_id = await task_svc.create_task(
            task_type="parse_resume",
            payload=task_payload,
            user_id=user_id,
            priority=TaskPriority.NORMAL,
            max_retries=3,
            estimated_duration_ms=30000,  # 30 seconds estimate
        )

        logger.info(f"Created resume parse task {task_id} for user {user_id}")

        return {
            "success": True,
            "data": {
                "task_id": task_id,
                "resume_id": resume_id,
            },
        }

    except Exception as e:
        logger.error(f"Error creating parse task: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error submitting resume for processing"
        )


@router.get("/parse/{task_id}")
async def get_parse_task_status(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    task_svc: TaskService = Depends(get_task_service),
):
    """
    Get the status and result of a parse task.

    Args:
        task_id: Task ID to check
        current_user: Current authenticated user
        task_svc: Task service dependency

    Returns:
        Task status and result if completed
    """
    try:
        task = await task_svc.get_task(task_id)

        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Verify task ownership
        if task.get("user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get result if completed
        result = None
        if task.get("status") == "completed":
            result = await task_svc.get_task_result(task_id)

        return {
            "success": True,
            "data": {
                "id": task["id"],
                "status": task["status"],
                "progress": task.get("progress", 0),
                "created_at": task["created_at"],
                "started_at": task.get("started_at"),
                "completed_at": task.get("completed_at"),
                "task_type": task["task_type"],
                "result": result,
                "error": task.get("error_message"),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving task status")
