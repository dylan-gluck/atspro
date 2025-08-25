from typing import List, Optional
from uuid import uuid4

import base64
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
)
from pydantic import BaseModel

from ..logger.logger import logger
from ..schema.job import Job
from ..schema.responses import ApiResponse, PaginationMeta, ParseJobApiResponse, ParsedJobResponse
from ..services.job_service import JobService
from ..services.job_processor import JobProcessorService, CircuitBreakerException
from ..dependencies import get_current_user, get_job_service

router = APIRouter()


# Pydantic models for request/response
class JobParseRequest(BaseModel):
    url: str


class JobCreateRequest(BaseModel):
    job_url: str


class JobUpdateRequest(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    archived: Optional[bool] = None


class JobStatusRequest(BaseModel):
    status: str


class BulkStatusRequest(BaseModel):
    job_ids: List[str]
    status: str


class BulkArchiveRequest(BaseModel):
    job_ids: List[str]
    archived: bool


class JobFilterRequest(BaseModel):
    status: Optional[List[str]] = None
    company: Optional[List[str]] = None
    location: Optional[List[str]] = None
    salary_range: Optional[List[int]] = None
    date_range: Optional[List[str]] = None


# Legacy TaskResponse removed - all endpoints now use ApiResponse with specific models


class JobEntity(BaseModel):
    id: str
    title: str
    company: str
    location: Optional[str] = None
    url: str
    status: str = "applied"
    archived: bool = False
    created_at: str
    updated_at: str


class PaginatedResponse(BaseModel):
    data: List[JobEntity]
    total: int
    page: int
    page_size: int
    total_pages: int


# Dependencies are now imported from dependencies module


@router.post("/job", response_model=ParseJobApiResponse)
async def parse_job_sync(
    request: JobParseRequest,
    current_user=Depends(get_current_user),
):
    """
    Parse job posting from URL synchronously.
    Returns job data directly after processing.

    Args:
        request: Contains URL to parse

    Returns:
        Parsed job data
    """
    try:
        # Initialize job processor service
        job_processor = JobProcessorService()
        
        # Process job URL synchronously
        result = await job_processor.process_job_url_sync(
            url=request.url,
            user_id=current_user["id"]
        )

        logger.info(f"Successfully parsed job for user {current_user['id']}: {result['job_data'].get('title', 'Unknown')}") 

        return ApiResponse(
            success=True,
            data={
                "job_id": result["job_id"],
                "url": result["url"],
                "job_data": result["job_data"],
                "status": result["status"],
            },
            message="Job parsed successfully",
        )

    except ValueError as e:
        logger.error(f"Validation error parsing job: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except CircuitBreakerException as e:
        logger.error(f"Circuit breaker error parsing job: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Error parsing job: {str(e)}")
        raise HTTPException(status_code=500, detail="Error parsing job posting")


# Legacy endpoint for backward compatibility with direct HTML parsing
@router.put("/job", response_model=ParseJobApiResponse)
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

    return ApiResponse(
        success=True, data={"job": parsed_data}, message="Job parsed successfully"
    )


# New RESTful endpoints that match frontend expectations


@router.get("/jobs", response_model=ApiResponse[List[JobEntity]])
async def list_jobs(
    status: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    archived: Optional[bool] = Query(None),
    page: int = Query(1),
    page_size: int = Query(20),
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """List jobs with filtering and pagination"""
    try:
        # Calculate offset for pagination
        offset = (page - 1) * page_size

        # Get user's jobs from database
        user_jobs = await job_service.get_user_jobs(
            user_id=current_user["id"],
            limit=page_size,
            offset=offset,
            status=status,
        )

        # Convert database jobs to JobEntity format
        job_entities = []
        for job in user_jobs:
            # Handle parsed job data structure
            parsed_data = job.get("parsed_data", {})

            job_entity = JobEntity(
                id=job.get("_key", job.get("id", "")),
                title=parsed_data.get("title", "Unknown Title"),
                company=parsed_data.get("company", "Unknown Company"),
                location=parsed_data.get("location"),
                url=job.get("source_url", parsed_data.get("url", "")),
                status=job.get("status", "pending"),
                archived=job.get("archived", False),
                created_at=job.get("created_at", ""),
                updated_at=job.get("updated_at", ""),
            )

            # Apply additional filters (company, archived) that aren't handled by the service
            if company and parsed_data.get("company", "").lower() != company.lower():
                continue
            if archived is not None and job.get("archived", False) != archived:
                continue

            job_entities.append(job_entity)

        # For now, estimate total as len(job_entities) since we don't have a count query
        # In production, you'd want a separate count query for accurate pagination
        total = len(job_entities)
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return ApiResponse(
            success=True,
            data=job_entities,
            meta={
                "pagination": PaginationMeta(
                    page=page,
                    page_size=page_size,
                    total=total,
                    total_pages=total_pages,
                    has_more=page < total_pages,
                ).dict()
            },
        )
    except Exception as e:
        logger.error(f"Error listing jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Error listing jobs")


@router.post("/jobs", response_model=ParseJobApiResponse)
async def create_job(
    request: JobCreateRequest,
    current_user=Depends(get_current_user),
):
    """Create a new job from URL synchronously - matches frontend expectation"""
    try:
        # Initialize job processor service
        job_processor = JobProcessorService()
        
        # Process job URL synchronously
        result = await job_processor.process_job_url_sync(
            url=request.job_url,
            user_id=current_user["id"]
        )

        logger.info(f"Successfully created job for user {current_user['id']}: {result['job_data'].get('title', 'Unknown')}") 

        return ApiResponse(
            success=True,
            data={
                "job_id": result["job_id"],
                "url": result["url"],
                "job_data": result["job_data"],
                "status": result["status"],
            },
            message="Job created and parsed successfully",
        )

    except ValueError as e:
        logger.error(f"Validation error creating job: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except CircuitBreakerException as e:
        logger.error(f"Circuit breaker error creating job: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating job: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating job")


@router.post("/job/parse-document", response_model=ParseJobApiResponse)
async def parse_job_from_document(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    Parse job posting from uploaded document (PDF, DOCX, TXT, etc.) synchronously.
    Returns parsed job data directly after processing.

    Args:
        file: Job document file (PDF, DOCX, TXT, etc.)
        current_user: Current authenticated user

    Returns:
        Parsed job data
    """
    supported_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
        "application/msword",  # .doc
        "text/plain",
        "text/markdown",
    ]

    # Validate file
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

    try:
        # Initialize job processor service
        job_processor = JobProcessorService()
        
        # Process job document synchronously
        result = await job_processor.process_job_document_sync(
            file_content=content,
            filename=file.filename or "unknown",
            user_id=current_user["id"]
        )

        logger.info(
            f"Successfully parsed job document for user {current_user['id']}: {result['job_data'].get('title', 'Unknown')}"
        )

        return ApiResponse(
            success=True,
            data={
                "job_id": result["job_id"],
                "filename": result["filename"],
                "job_data": result["job_data"],
                "status": result["status"],
                "content_type": file.content_type,
                "size": len(content),
            },
            message="Job document parsed successfully",
        )

    except ValueError as e:
        logger.error(f"Validation error parsing document: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error parsing job document: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error parsing job document"
        )


@router.get("/jobs/{job_id}", response_model=ApiResponse[JobEntity])
async def get_job(
    job_id: str,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Get a specific job by ID"""
    try:
        # Get job from database with user validation
        job = await job_service.get_job(job_id, current_user["id"])

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Convert database job to JobEntity format
        parsed_data = job.get("parsed_data", {})

        job_entity = JobEntity(
            id=job.get("_key", job.get("id", "")),
            title=parsed_data.get("title", "Unknown Title"),
            company=parsed_data.get("company", "Unknown Company"),
            location=parsed_data.get("location"),
            url=job.get("source_url", parsed_data.get("url", "")),
            status=job.get("status", "pending"),
            archived=job.get("archived", False),
            created_at=job.get("created_at", ""),
            updated_at=job.get("updated_at", ""),
        )

        return ApiResponse(success=True, data=job_entity)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error getting job")


@router.patch("/jobs/{job_id}", response_model=ApiResponse[JobEntity])
async def update_job(
    job_id: str,
    request: JobUpdateRequest,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Update a job"""
    try:
        # Verify job exists and user has access
        if not await job_service.validate_job_access(job_id, current_user["id"]):
            raise HTTPException(status_code=404, detail="Job not found")

        # Build update data
        updates = {}
        if request.title is not None:
            updates["parsed_data.title"] = request.title
        if request.company is not None:
            updates["parsed_data.company"] = request.company
        if request.location is not None:
            updates["parsed_data.location"] = request.location
        if request.status is not None:
            updates["status"] = request.status
        if request.archived is not None:
            updates["archived"] = request.archived

        # Update job in database
        if updates:
            await job_service.update_job(job_id, updates)

        # Return updated job
        job = await job_service.get_job(job_id, current_user["id"])
        parsed_data = job.get("parsed_data", {})

        job_entity = JobEntity(
            id=job.get("_key", job.get("id", "")),
            title=parsed_data.get("title", "Unknown Title"),
            company=parsed_data.get("company", "Unknown Company"),
            location=parsed_data.get("location"),
            url=job.get("source_url", parsed_data.get("url", "")),
            status=job.get("status", "pending"),
            archived=job.get("archived", False),
            created_at=job.get("created_at", ""),
            updated_at=job.get("updated_at", ""),
        )

        return ApiResponse(
            success=True, data=job_entity, message="Job updated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating job")


@router.delete("/jobs/{job_id}", response_model=ApiResponse[None])
async def delete_job(
    job_id: str,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Delete a job"""
    try:
        # Verify job exists and user has access
        if not await job_service.validate_job_access(job_id, current_user["id"]):
            raise HTTPException(status_code=404, detail="Job not found")

        # Delete job from database
        await job_service.delete_job(job_id)

        logger.info(f"Deleted job {job_id} for user {current_user['id']}")
        return ApiResponse(success=True, message="Job deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting job")


@router.patch("/jobs/{job_id}/status", response_model=ApiResponse[JobEntity])
async def update_job_status(
    job_id: str,
    request: JobStatusRequest,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Update job status"""
    try:
        # TODO: Implement actual database update
        job_entity = JobEntity(
            id=job_id,
            title="Software Engineer",
            company="Tech Corp",
            location="San Francisco, CA",
            url="https://example.com/job",
            status=request.status,
            archived=False,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z",
        )

        return ApiResponse(
            success=True, data=job_entity, message="Job status updated successfully"
        )
    except Exception as e:
        logger.error(f"Error updating job status {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating job status")


@router.patch("/jobs/bulk-status", response_model=ApiResponse[None])
async def bulk_update_status(
    request: BulkStatusRequest,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Bulk update job statuses"""
    try:
        # TODO: Implement actual bulk database update
        logger.info(f"Bulk updating status for {len(request.job_ids)} jobs")
        return ApiResponse(success=True, message=f"Updated {len(request.job_ids)} jobs")
    except Exception as e:
        logger.error(f"Error bulk updating job status: {str(e)}")
        raise HTTPException(status_code=500, detail="Error bulk updating job status")


@router.patch("/jobs/bulk-archive", response_model=ApiResponse[None])
async def bulk_archive_jobs(
    request: BulkArchiveRequest,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Bulk archive/unarchive jobs"""
    try:
        # TODO: Implement actual bulk database update
        action = "archived" if request.archived else "unarchived"
        logger.info(f"Bulk {action} {len(request.job_ids)} jobs")
        return ApiResponse(
            success=True, message=f"{action.capitalize()} {len(request.job_ids)} jobs"
        )
    except Exception as e:
        logger.error(f"Error bulk archiving jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Error bulk archiving jobs")


@router.get("/jobs/search", response_model=List[JobEntity])
async def search_jobs(
    q: str = Query(...),
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Search jobs by query"""
    try:
        # TODO: Implement actual search functionality
        return []
    except Exception as e:
        logger.error(f"Error searching jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Error searching jobs")


@router.post("/jobs/filter", response_model=List[JobEntity])
async def filter_jobs(
    request: JobFilterRequest,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Filter jobs by criteria"""
    try:
        # TODO: Implement actual filtering functionality
        return []
    except Exception as e:
        logger.error(f"Error filtering jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Error filtering jobs")


@router.post("/jobs/analyze", response_model=Job)
async def analyze_job(
    request: JobCreateRequest,
    current_user=Depends(get_current_user),
):
    """Analyze job posting (legacy endpoint)"""
    try:
        from agents import Runner
        from ..lib.agent import job_agent
        from ..lib.httpx import fetch

        # Fetch html from url using httpx
        html = await fetch(request.job_url)

        # Format extracted text to Job schema
        result = await Runner.run(job_agent, html)
        job_data = result.final_output
        parsed_data = Job.model_validate(job_data)

        return parsed_data
    except Exception as e:
        logger.error(f"Error analyzing job: {str(e)}")
        raise HTTPException(status_code=500, detail="Error analyzing job")


@router.get("/jobs/{job_id}/insights", response_model=ApiResponse[dict])
async def get_job_insights(
    job_id: str,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Get job insights and recommendations"""
    try:
        # TODO: Implement actual insights generation
        insights_data = {
            "skill_match": 85,
            "experience_match": 90,
            "missing_skills": ["Docker", "Kubernetes"],
            "recommendations": [
                "Consider highlighting your cloud experience",
                "Add more details about your team leadership skills",
            ],
        }

        return ApiResponse(
            success=True,
            data=insights_data,
            message="Job insights generated successfully",
        )
    except Exception as e:
        logger.error(f"Error getting job insights {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error getting job insights")


# Document endpoints
@router.get("/jobs/{job_id}/documents", response_model=ApiResponse[list])
async def get_job_documents(
    job_id: str,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Get documents associated with a job"""
    try:
        # TODO: Implement actual document retrieval
        return ApiResponse(
            success=True, data=[], message="Job documents retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting job documents {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error getting job documents")


@router.post("/jobs/{job_id}/documents", response_model=ApiResponse[dict])
async def create_job_document(
    job_id: str,
    content: str = Form(...),
    type: str = Form(...),
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """Create a document for a job"""
    try:
        # TODO: Implement actual document creation
        document_data = {
            "id": str(uuid4()),
            "job_id": job_id,
            "type": type,
            "content": content,
            "created_at": "2024-01-01T00:00:00Z",
        }

        return ApiResponse(
            success=True,
            data=document_data,
            message="Job document created successfully",
        )
    except Exception as e:
        logger.error(f"Error creating job document {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating job document")


# Resume management endpoints


@router.get("/resume")
async def get_current_user_resume(
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """
    Get the current user's resume by looking up their resume_id from their profile.

    Returns:
        Resume content for the authenticated user
    """
    try:
        user_id = current_user["id"]
        logger.info(f"Getting resume for user: {user_id}")

        # Get user's profile to extract resume_id
        from ..database import get_postgres_connection
        async with get_postgres_connection() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    SELECT resume_id FROM user_profiles 
                    WHERE user_id = %s
                    """,
                    (user_id,),
                )
                row = await cursor.fetchone()

        if not row or not row[0]:
            raise HTTPException(status_code=404, detail="No resume found")

        resume_id = row[0]
        logger.info(f"Found resume_id: {resume_id}")

        # Get resume from PostgreSQL
        resume = await job_service.get_resume(resume_id, user_id)

        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        # Debug logging
        logger.info(f"Resume document keys: {list(resume.keys())}")
        logger.info(f"Resume _key: {resume.get('_key')}")
        logger.info(f"Resume created_at: {resume.get('created_at')}")
        logger.info(f"Resume updated_at: {resume.get('updated_at')}")

        return ApiResponse(
            success=True,
            data={
                "id": resume["_key"],
                "user_id": resume["user_id"],
                "content": resume.get("content"),
                "parsed_data": resume.get(
                    "resume_data"
                ),  # Using resume data from PostgreSQL
                "created_at": resume.get("created_at"),
                "updated_at": resume.get("updated_at"),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving current user's resume: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving resume")


@router.get("/resume/{resume_id}")
async def get_resume(
    resume_id: str,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """
    Get resume content for editing.

    Args:
        resume_id: Resume document ID

    Returns:
        Resume content
    """
    try:
        resume = await job_service.get_resume(resume_id, current_user["id"])

        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        return ApiResponse(
            success=True,
            data={
                "id": resume["_key"],
                "user_id": resume["user_id"],
                "content": resume.get("content"),
                "parsed_data": resume.get(
                    "resume_data"
                ),  # Using resume data from PostgreSQL
                "created_at": resume.get("created_at"),
                "updated_at": resume.get("updated_at"),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving resume {resume_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving resume")


@router.patch("/resume/{resume_id}")
async def update_resume(
    resume_id: str,
    request: dict,
    current_user=Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    """
    Update resume content.

    Args:
        resume_id: Resume document ID
        request: Resume updates

    Returns:
        Updated resume
    """
    try:
        # Verify resume exists and user has access
        if not await job_service.validate_resume_access(resume_id, current_user["id"]):
            raise HTTPException(status_code=404, detail="Resume not found")

        # Update resume
        await job_service.update_resume(
            resume_id=resume_id,
            updates=request,
        )

        # Return updated resume
        resume = await job_service.get_resume(resume_id, current_user["id"])

        return ApiResponse(
            success=True,
            data={
                "id": resume["_key"],
                "user_id": resume["user_id"],
                "content": resume.get("content"),
                "parsed_data": resume.get(
                    "resume_data"
                ),  # Using resume data from PostgreSQL
                "created_at": resume.get("created_at"),
                "updated_at": resume.get("updated_at"),
            },
            message="Resume updated successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating resume {resume_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating resume")
