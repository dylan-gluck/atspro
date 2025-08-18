"""Resume router for ATSPro API resume management operations."""

import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from ..database.connections import get_arango_client
from ..dependencies import get_current_user
from ..schema.resume import Resume
from ..schema.responses import ApiResponse
from ..services.resume_service import ResumeService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/resume/manual", response_model=ApiResponse[dict])
async def create_manual_resume(
    resume_data: Resume,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new resume from manually entered data.

    Args:
        resume_data: Structured resume data from manual entry form
        current_user: Current authenticated user

    Returns:
        Resume ID and success status
    """
    try:
        # Generate unique resume ID
        resume_id = str(uuid4())
        user_id = current_user["id"]

        logger.info(f"Creating manual resume {resume_id} for user {user_id}")

        # Initialize resume service
        resume_service = ResumeService()

        # Validate resume data
        is_valid, error_message = await resume_service.validate_resume_data(
            resume_data.model_dump()
        )
        if not is_valid:
            raise HTTPException(status_code=422, detail=error_message)

        # Create resume document in ArangoDB
        arango_db = get_arango_client()
        resume_collection = arango_db.collection("resumes")

        # Create resume document with manual source
        resume_doc = {
            "_key": resume_id,
            "user_id": user_id,
            "status": "manual",
            "source": "manual",
            "created_at": arango_db.std_datetime().isoformat(),
            "resume_data": resume_data.model_dump(),
            "file_metadata": {
                "source": "manual_entry",
                "created_by": user_id,
            },
        }

        # Insert the document
        result = resume_collection.insert(resume_doc)

        if not result:
            raise HTTPException(
                status_code=500, detail="Failed to create resume document"
            )

        logger.info(f"Created manual resume {resume_id} for user {user_id}")

        return ApiResponse(
            success=True,
            data={
                "resume_id": resume_id,
                "status": "created",
            },
            message="Resume created successfully from manual entry",
        )

    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error creating manual resume: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error creating resume from manual entry"
        )


@router.get("/resume", response_model=ApiResponse[dict])
async def get_current_resume(
    current_user: dict = Depends(get_current_user),
):
    """
    Get the current user's resume.

    Args:
        current_user: Current authenticated user

    Returns:
        Resume data and metadata
    """
    try:
        user_id = current_user["id"]
        logger.info(f"=== RESUME GET REQUEST ===")
        logger.info(f"User ID: {user_id}")
        
        resume_service = ResumeService()

        # Get user's resumes (most recent first)
        logger.info(f"Fetching resumes for user {user_id}...")
        resumes = await resume_service.get_user_resumes(user_id, limit=1)

        if not resumes:
            logger.warning(f"No resumes found for user {user_id}")
            raise HTTPException(status_code=404, detail="No resume found")

        resume = resumes[0]
        resume_id = resume["_key"]
        logger.info(f"Found resume: {resume_id}")
        logger.info(f"Resume status: {resume.get('status')}")
        logger.info(f"Resume source: {resume.get('source', 'unknown')}")
        logger.info(f"Created at: {resume.get('created_at')}")
        logger.info(f"Updated at: {resume.get('updated_at', 'N/A')}")
        
        # Log details about the resume data
        resume_data = resume.get("resume_data")
        if resume_data:
            logger.info(f"Resume data exists: True")
            contact_info = resume_data.get('contact_info', {})
            logger.info(f"Retrieved contact name: {contact_info.get('full_name', 'N/A')}")
            logger.info(f"Retrieved summary length: {len(resume_data.get('summary', ''))}")
            logger.info(f"Retrieved work experience count: {len(resume_data.get('work_experience', []))}")
        else:
            logger.warning(f"No resume_data found in document!")

        response_data = {
            "id": resume["_key"],
            "status": resume.get("status"),
            "source": resume.get("source", "unknown"),
            "created_at": resume.get("created_at"),
            "parsed_data": resume.get("resume_data"),
            "file_metadata": resume.get("file_metadata"),
        }
        
        logger.info(f"Returning resume data for {resume_id}")
        logger.info(f"=== RESUME GET REQUEST COMPLETED ===")

        return ApiResponse(
            success=True,
            data=response_data,
            message="Resume retrieved successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving resume for user {user_id}: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"=== RESUME GET REQUEST FAILED ===")
        raise HTTPException(status_code=500, detail="Error retrieving resume")


@router.put("/resume", response_model=ApiResponse[dict])
async def update_resume(
    resume_data: Resume,
    current_user: dict = Depends(get_current_user),
):
    """
    Update the current user's resume.

    Args:
        resume_data: Updated resume data
        current_user: Current authenticated user

    Returns:
        Updated resume information
    """
    try:
        user_id = current_user["id"]
        logger.info(f"=== RESUME UPDATE REQUEST ===")
        logger.info(f"User ID: {user_id}")
        logger.info(f"Request data size: {len(str(resume_data.model_dump()))} characters")
        
        # Log some key fields from the incoming data
        data_dict = resume_data.model_dump()
        contact_info = data_dict.get('contact_info', {})
        logger.info(f"Incoming contact name: {contact_info.get('full_name', 'N/A')}")
        logger.info(f"Incoming summary length: {len(data_dict.get('summary', ''))}")
        logger.info(f"Incoming work experience count: {len(data_dict.get('work_experience', []))}")
        
        resume_service = ResumeService()

        # Get user's current resume
        logger.info(f"Fetching current resume for user {user_id}...")
        resumes = await resume_service.get_user_resumes(user_id, limit=1)

        if not resumes:
            logger.error(f"No resume found for user {user_id}")
            raise HTTPException(status_code=404, detail="No resume found to update")

        resume = resumes[0]
        resume_id = resume["_key"]
        logger.info(f"Found resume to update: {resume_id}")

        # Validate resume data
        logger.info(f"Validating resume data...")
        is_valid, error_message = await resume_service.validate_resume_data(
            resume_data.model_dump()
        )
        if not is_valid:
            logger.error(f"Resume validation failed: {error_message}")
            raise HTTPException(status_code=422, detail=error_message)
        
        logger.info(f"Resume data validation passed")

        # Update resume data
        logger.info(f"Calling update_resume_data service...")
        success = await resume_service.update_resume_data(
            resume_id, resume_data.model_dump()
        )

        if not success:
            logger.error(f"Resume service update failed for {resume_id}")
            raise HTTPException(status_code=500, detail="Failed to update resume")

        logger.info(f"Resume service update successful for {resume_id}")

        # Verify data persistence by re-fetching
        logger.info(f"Verifying persistence by re-fetching resume...")
        verification_resumes = await resume_service.get_user_resumes(user_id, limit=1)
        if verification_resumes:
            verified_resume = verification_resumes[0]
            verified_data = verified_resume.get('resume_data', {})
            verified_contact = verified_data.get('contact_info', {})
            logger.info(f"Verification: Persisted contact name: {verified_contact.get('full_name', 'N/A')}")
            logger.info(f"Verification: Persisted summary length: {len(verified_data.get('summary', ''))}")
            logger.info(f"Verification: Persisted work experience count: {len(verified_data.get('work_experience', []))}")
        else:
            logger.error(f"Verification FAILED: Could not re-fetch resume after update")

        logger.info(f"Updated resume {resume_id} for user {user_id}")

        # Return the updated resume data to match frontend expectations
        response_data = {
            "id": resume_id,
            "resume_data": resume_data.model_dump(),
            "status": "updated",
            "updated_at": datetime.utcnow().isoformat(),
        }
        logger.info(f"Returning response with resume_id: {resume_id}")
        logger.info(f"=== RESUME UPDATE REQUEST COMPLETED ===")
        
        return ApiResponse(
            success=True,
            data=response_data,
            message="Resume updated successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating resume: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"=== RESUME UPDATE REQUEST FAILED ===")
        raise HTTPException(status_code=500, detail="Error updating resume")


@router.delete("/resume", response_model=ApiResponse[None])
async def delete_resume(
    current_user: dict = Depends(get_current_user),
):
    """
    Delete the current user's resume.

    Args:
        current_user: Current authenticated user

    Returns:
        Deletion confirmation
    """
    try:
        user_id = current_user["id"]
        resume_service = ResumeService()

        # Get user's current resume
        resumes = await resume_service.get_user_resumes(user_id, limit=1)

        if not resumes:
            raise HTTPException(status_code=404, detail="No resume found to delete")

        resume = resumes[0]
        resume_id = resume["_key"]

        # Delete resume
        success = await resume_service.delete_resume(resume_id, user_id)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete resume")

        logger.info(f"Deleted resume {resume_id} for user {user_id}")

        return ApiResponse(
            success=True,
            data=None,
            message="Resume deleted successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting resume: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting resume")
