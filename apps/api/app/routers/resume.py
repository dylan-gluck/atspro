"""Resume router for ATSPro API resume management operations."""

import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from ..database import get_document, store_document, update_document
from ..dependencies import get_current_user
from ..schema.resume import Resume
from ..schema.responses import (
    ApiResponse,
    ResumeCreationApiResponse,
    ResumeCreationResponse,
    ResumeDataApiResponse,
    ResumeDataResponse,
    ResumeUpdateApiResponse,
    ResumeUpdateResponse,
)
from ..services.resume_service import ResumeService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/resume/manual", response_model=ResumeCreationApiResponse)
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
        user_id = current_user["id"]
        logger.info(f"Creating manual resume for user {user_id}")

        # Initialize resume service
        resume_service = ResumeService()

        # Validate resume data
        is_valid, error_message = await resume_service.validate_resume_data(
            resume_data.model_dump()
        )
        if not is_valid:
            raise HTTPException(status_code=422, detail=error_message)

        # Store resume document in PostgreSQL
        document_data = {
            "filename": "manual_entry.json",
            "content_type": "application/json",
            "file_size": len(str(resume_data.model_dump())),
            "parsed_data": resume_data.model_dump(),
        }

        resume_id = await store_document(
            collection="resumes",
            user_id=user_id,
            document_type="resume",
            document_data=document_data,
        )

        if not resume_id:
            raise HTTPException(
                status_code=500, detail="Failed to store resume document"
            )

        # Update user profile with resume_id (similar to what parsing does)
        try:
            from ..database.connections import get_postgres_pool
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor() as cursor:
                        # Check if user profile exists
                        await cursor.execute(
                            "SELECT user_id FROM user_profiles WHERE user_id = %s",
                            (user_id,),
                        )
                        profile_exists = await cursor.fetchone()

                        if not profile_exists:
                            # Create new profile with resume_id
                            await cursor.execute(
                                "INSERT INTO user_profiles (user_id, resume_id) VALUES (%s, %s)",
                                (user_id, resume_id),
                            )
                            logger.info(f"Created user profile for user {user_id} with resume {resume_id}")
                        else:
                            # Update existing profile
                            await cursor.execute(
                                "UPDATE user_profiles SET resume_id = %s WHERE user_id = %s",
                                (resume_id, user_id),
                            )
                            logger.info(f"Updated user profile for user {user_id} with resume {resume_id}")
        except Exception as e:
            # Log error but don't fail the entire operation
            logger.warning(f"User profile update failed for user {user_id}: {str(e)}")

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
        logger.error(f"Error creating manual resume: {e}")
        raise HTTPException(status_code=500, detail="Failed to create resume")


@router.get("/resume/{resume_id}", response_model=ResumeDataApiResponse)
async def get_resume(
    resume_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get resume data by ID.

    Args:
        resume_id: Resume document ID
        current_user: Current authenticated user

    Returns:
        Resume data and metadata
    """
    try:
        user_id = current_user["id"]

        # Get resume document from PostgreSQL
        resume_doc = await get_document(
            table="resume_documents",
            doc_id=resume_id,
            user_id=user_id,
        )

        if not resume_doc:
            raise HTTPException(status_code=404, detail="Resume not found")

        # Transform to expected response format
        response_data = {
            "resume_id": str(resume_doc["id"]),
            "resume_data": resume_doc.get("parsed_data", {}),
            "status": resume_doc.get("metadata", {}).get("status", "completed"),
            "source": resume_doc.get("metadata", {}).get("source", "unknown"),
            "created_at": resume_doc.get("created_at"),
            "updated_at": resume_doc.get("updated_at"),
            "file_metadata": {
                "filename": resume_doc.get("filename"),
                "content_type": resume_doc.get("content_type"),
                "file_size": resume_doc.get("file_size"),
            },
        }

        return ApiResponse(
            success=True,
            data=response_data,
            message="Resume retrieved successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving resume {resume_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve resume")


@router.put("/resume/{resume_id}", response_model=ResumeUpdateApiResponse)
async def update_resume(
    resume_id: str,
    resume_data: Resume,
    current_user: dict = Depends(get_current_user),
):
    """
    Update an existing resume.

    Args:
        resume_id: Resume document ID to update
        resume_data: Updated resume data
        current_user: Current authenticated user

    Returns:
        Update status and resume ID
    """
    try:
        user_id = current_user["id"]
        logger.info(f"Updating resume {resume_id} for user {user_id}")

        # Initialize resume service
        resume_service = ResumeService()

        # Validate resume data
        is_valid, error_message = await resume_service.validate_resume_data(
            resume_data.model_dump()
        )
        if not is_valid:
            raise HTTPException(status_code=422, detail=error_message)

        # Check if resume exists and user has access
        existing_resume = await get_document(
            table="resume_documents",
            doc_id=resume_id,
            user_id=user_id,
        )

        if not existing_resume:
            raise HTTPException(
                status_code=404,
                detail="Resume not found or you don't have permission to update it",
            )

        # Update resume document
        updates = {
            "parsed_data": resume_data.model_dump(),
            "file_size": len(str(resume_data.model_dump())),
        }

        # Update metadata
        metadata = existing_resume.get("metadata", {})
        metadata["last_modified_by"] = user_id
        updates["metadata"] = metadata

        success = await update_document(
            table="resume_documents",
            doc_id=resume_id,
            updates=updates,
            user_id=user_id,
        )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to update resume")

        logger.info(f"Successfully updated resume {resume_id} for user {user_id}")

        return ApiResponse(
            success=True,
            data={
                "resume_id": resume_id,
                "status": "updated",
                "updated_at": datetime.utcnow().isoformat(),
            },
            message="Resume updated successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating resume {resume_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update resume")
