"""Worker management endpoints for ATSPro API."""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from ..dependencies import get_current_user
from ..workers.startup import get_worker_status, scale_resume_workers, get_worker_manager
from ..logger.logger import logger

router = APIRouter(prefix="/workers", tags=["workers"])


@router.get("/status")
async def get_workers_status(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get status of all workers.
    
    Returns:
        Dictionary with worker status information
    """
    try:
        status = await get_worker_status()
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        logger.error(f"Error getting worker status: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving worker status")


@router.get("/queue/stats")
async def get_queue_stats(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get queue statistics.
    
    Returns:
        Queue statistics and health information
    """
    try:
        worker_manager = get_worker_manager()
        if not worker_manager:
            raise HTTPException(status_code=503, detail="Workers not started")
        
        stats = await worker_manager.get_queue_stats()
        return {
            "success": True,
            "data": stats
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting queue stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving queue statistics")


@router.post("/resume-workers/scale/{target_count}")
async def scale_resume_parsing_workers(
    target_count: int,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Scale resume parsing workers to target count.
    
    Args:
        target_count: Target number of resume parsing workers (1-10)
    
    Returns:
        Success confirmation with new worker count
    """
    if target_count < 1 or target_count > 10:
        raise HTTPException(
            status_code=422, 
            detail="Target count must be between 1 and 10"
        )
    
    try:
        await scale_resume_workers(target_count)
        
        # Get updated status
        status = await get_worker_status()
        
        return {
            "success": True,
            "message": f"Scaled resume workers to {target_count}",
            "data": {
                "target_count": target_count,
                "current_status": status
            }
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Error scaling resume workers: {str(e)}")
        raise HTTPException(status_code=500, detail="Error scaling workers")