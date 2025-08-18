from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from ..logger.logger import logger
from ..schema.responses import ApiResponse, TaskData
from ..services.optimization_service import OptimizationService
from ..services.task_service import TaskService
from ..dependencies import get_current_user, get_task_service

router = APIRouter()


# Pydantic models for request/response
class OptimizeRequest(BaseModel):
    resume_id: str
    job_id: str


class ScoreRequest(BaseModel):
    resume_id: str
    job_id: str


class ResearchRequest(BaseModel):
    resume_id: str
    job_id: str


# Legacy TaskResponse for backward compatibility - use ApiResponse for new endpoints
class TaskResponse(BaseModel):
    success: bool
    data: dict


# Auth and service dependencies are now imported from dependencies module


# Service dependencies
async def get_optimization_service():
    """Get optimization service instance"""
    task_service = await get_task_service()

    # Get ArangoDB from the task service
    arango_db = task_service.arango_db

    return OptimizationService(arango_db, task_service)


@router.post("/optimize", response_model=ApiResponse[dict])
async def optimize_resume(
    request: OptimizeRequest,
    current_user=Depends(get_current_user),
    optimization_service=Depends(get_optimization_service),
):
    """
    Optimizes a resume based on the provided job description.
    Returns task_id and document_id immediately for async processing.

    Args:
        request: Contains resume_id and job_id for optimization

    Returns:
        Task ID and document ID for tracking the optimization result
    """
    try:
        # Create optimization task with validation
        result = await optimization_service.create_optimization_task(
            resume_id=request.resume_id,
            job_id=request.job_id,
            user_id=current_user["id"],
        )

        logger.info(
            f"Created optimization task {result['task_id']} for user {current_user['id']}"
        )

        return ApiResponse(
            success=True, data=result, message="Optimization task created successfully"
        )

    except ValueError as e:
        # Validation errors (400 Bad Request)
        logger.warning(f"Optimization validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating optimization task: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating optimization task")


@router.post("/score", response_model=ApiResponse[dict])
async def score_resume(
    request: ScoreRequest,
    current_user=Depends(get_current_user),
    optimization_service=Depends(get_optimization_service),
):
    """
    Calculate match percentage between resume and job description.
    Returns task_id immediately for async processing.

    Args:
        request: Contains resume_id and job_id for scoring

    Returns:
        Task ID for tracking the scoring result
    """
    try:
        # Create scoring task with validation
        result = await optimization_service.create_scoring_task(
            resume_id=request.resume_id,
            job_id=request.job_id,
            user_id=current_user["id"],
        )

        logger.info(
            f"Created scoring task {result['task_id']} for user {current_user['id']}"
        )

        return ApiResponse(
            success=True, data=result, message="Scoring task created successfully"
        )

    except ValueError as e:
        # Validation errors (400 Bad Request)
        logger.warning(f"Scoring validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating scoring task: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating scoring task")


@router.post("/research", response_model=ApiResponse[dict])
async def research_company(
    request: ResearchRequest,
    current_user=Depends(get_current_user),
    optimization_service=Depends(get_optimization_service),
):
    """
    Research company and generate comprehensive report with thoughtful questions.
    Returns task_id and document_id immediately for async processing.

    Args:
        request: Contains resume_id and job_id for research context

    Returns:
        Task ID and document ID for tracking the research result
    """
    try:
        # Create research task with validation
        result = await optimization_service.create_research_task(
            resume_id=request.resume_id,
            job_id=request.job_id,
            user_id=current_user["id"],
        )

        logger.info(
            f"Created research task {result['task_id']} for user {current_user['id']}"
        )

        return ApiResponse(
            success=True, data=result, message="Research task created successfully"
        )

    except ValueError as e:
        # Validation errors (400 Bad Request)
        logger.warning(f"Research validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating research task: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating research task")
