
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..dependencies import get_current_user
from ..logger.logger import logger
from ..schema.responses import ApiResponse, ParseResumeApiResponse, ParsedResumeResponse
from ..services.resume_processor import (
    AIProcessingError,
    FileProcessingError,
    ResumeProcessingError,
    ResumeProcessorService,
    StorageError,
    ValidationError,
)

router = APIRouter()


@router.post("/parse", response_model=ParseResumeApiResponse)
async def parse_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Parse resume document synchronously and return parsed data immediately.

    Args:
        file: File object (pdf, md, doc, docx)
        current_user: Current authenticated user

    Returns:
        Parsed resume data with resume ID and user ID
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

    user_id = current_user["id"]

    try:
        # Initialize resume processor service
        processor = ResumeProcessorService()

        # Process resume synchronously
        result = await processor.process_resume_sync(
            file_content=content,
            filename=file.filename,
            user_id=user_id,
            content_type=file.content_type,
        )

        logger.info(f"Resume processing completed successfully for user {user_id}")

        return ApiResponse(
            success=True,
            data=result,
            message="Resume parsed successfully",
        )

    except FileProcessingError as e:
        logger.error(f"File processing error for user {user_id}: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Unable to process file: {str(e)}")

    except AIProcessingError as e:
        logger.error(f"AI processing error for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=503, detail=f"AI processing service unavailable: {str(e)}"
        )

    except ValidationError as e:
        logger.error(f"Resume validation error for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=422, detail=f"Resume data validation failed: {str(e)}"
        )

    except StorageError as e:
        logger.error(f"Storage error for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save resume: {str(e)}")

    except ResumeProcessingError as e:
        logger.error(f"Resume processing error for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Resume processing failed: {str(e)}"
        )

    except Exception as e:
        logger.error(f"Unexpected error processing resume for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during resume processing",
        )
