from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, Form, Header, HTTPException
from pydantic import BaseModel

from ..logger.logger import logger
from ..queue.redis_queue import TaskPriority
from ..schema.job import Job
from ..services.job_service import JobService

router = APIRouter()


# Pydantic models for request/response
class JobParseRequest(BaseModel):
    url: str


class TaskResponse(BaseModel):
    success: bool
    data: dict


# Auth dependency (following existing pattern from optimize.py)
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Extract user from better-auth session"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # TODO: Implement actual auth logic with better-auth
    # For now, return mock user for interface compatibility
    return {"id": "user_123", "email": "user@example.com"}


# Job service dependency
async def get_job_service():
    """Get job service instance"""
    # TODO: This will be properly injected via dependency injection in main.py
    from ..services.task_service import TaskService

    task_service = TaskService()
    if not task_service.postgres_pool:
        await task_service.startup()

    return JobService(task_service)


@router.post("/job", response_model=TaskResponse)
async def parse_job_async(
    request: JobParseRequest,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """
    Parse job posting from URL asynchronously.
    Returns task_id and job_id immediately for background processing.

    Args:
        request: Contains URL to parse

    Returns:
        Task ID and job ID for tracking the parsing result
    """
    try:
        # Validate URL format
        if not request.url or not request.url.startswith(("http://", "https://")):
            raise HTTPException(status_code=422, detail="Invalid URL format")

        # Create job placeholder ID
        job_id = str(uuid4())

        # Create async task for job parsing
        task_id = await job_service.create_parse_task(
            user_id=current_user["id"],
            url=request.url,
            job_id=job_id,
            priority=TaskPriority.NORMAL,
        )

        logger.info(f"Created job parse task {task_id} for user {current_user['id']}")

        return TaskResponse(
            success=True,
            data={
                "task_id": task_id,
                "job_id": job_id,
                "url": request.url,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating job parse task: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating job parse task")


# Legacy endpoint for backward compatibility
@router.put("/job")
async def job_info_legacy(url: str = Form(...)):
    """
    Legacy synchronous job parsing endpoint.
    Maintained for backward compatibility.

    Args:
        url: String of the job posting from form data

    Returns:
        status: HTTPStatus code
        data: JSON dictionary of parsed Job info
    """
    from agents import Runner
    from ..lib.agent import job_agent
    from ..lib.httpx import fetch

    # Fetch html from url using httpx
    html = await fetch(url)

    # Format extracted text to Job schema
    try:
        result = await Runner.run(job_agent, html)
    except Exception as e:
        logger.error(f"Error calling OpenAI API: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error processing job with OpenAI API"
        )

    # Validate
    job_data = result.final_output
    parsed_data = Job.model_validate(job_data)

    return {"status": 200, "data": {"job": parsed_data}}
