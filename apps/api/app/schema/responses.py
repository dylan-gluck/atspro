from typing import Dict, Generic, List, Optional, TypeVar, Any

from pydantic import BaseModel
from .resume import Resume
from .job import Job

# Generic type variable for ApiResponse data
T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """
    Standardized API response format for all ATSPro endpoints.

    This ensures consistent response structure across the entire API:
    - success: Boolean indicating if the operation succeeded
    - data: The actual response data (typed with Generic[T])
    - message: Optional human-readable message
    - errors: Optional list of error messages
    - meta: Optional metadata (pagination, etc.)
    """

    success: bool
    data: Optional[T] = None
    message: Optional[str] = None
    errors: Optional[List[str]] = None
    meta: Optional[Dict[str, Any]] = None

    class Config:
        # Allow arbitrary types for Generic support
        arbitrary_types_allowed = True


class PaginationMeta(BaseModel):
    """Pagination metadata for list responses"""

    page: int
    page_size: int
    total: int
    total_pages: int
    has_more: bool


# Synchronous Response Models for ATSPro API

class ParsedResumeResponse(BaseModel):
    """Response model for parsed resume data"""
    
    resume_id: str
    user_id: str
    resume_data: Dict[str, Any]  # Resume data as dict from AI parsing
    file_metadata: Dict[str, Any]
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ParsedJobResponse(BaseModel):
    """Response model for parsed job data"""
    
    job_id: str
    job_data: Dict[str, Any]  # Job data as dict from AI parsing
    status: str
    url: Optional[str] = None
    filename: Optional[str] = None
    content_type: Optional[str] = None
    size: Optional[int] = None
    created_at: Optional[str] = None


class ResumeDataResponse(BaseModel):
    """Response model for resume data retrieval"""
    
    id: str
    user_id: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    parsed_data: Optional[Resume] = None
    content: Optional[str] = None
    file_metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ResumeCreationResponse(BaseModel):
    """Response model for resume creation"""
    
    resume_id: str
    status: str
    created_at: Optional[str] = None


class ResumeUpdateResponse(BaseModel):
    """Response model for resume updates"""
    
    id: str
    resume_data: Resume
    status: str
    updated_at: str


class OptimizationResultResponse(BaseModel):
    """Response model for resume optimization results"""
    
    optimization_id: str
    resume_id: str
    job_id: str
    optimized_resume: Resume
    improvements: List[str]
    score_improvement: Optional[float] = None
    created_at: str


class ScoringResultResponse(BaseModel):
    """Response model for resume scoring results"""
    
    score_id: str
    resume_id: str
    job_id: str
    overall_score: float
    skill_match: float
    experience_match: float
    keyword_match: float
    missing_skills: List[str]
    recommendations: List[str]
    created_at: str


class ResearchResultResponse(BaseModel):
    """Response model for company research results"""
    
    research_id: str
    job_id: str
    company_name: str
    company_info: Dict[str, Any]
    questions: List[str]
    insights: List[str]
    created_at: str


# Convenience type aliases for specific response patterns
ApiSuccessResponse = ApiResponse[T]
ApiErrorResponse = ApiResponse[None]
ApiListResponse = ApiResponse[List[T]]

# Typed response aliases for common endpoints
ParseResumeApiResponse = ApiResponse[ParsedResumeResponse]
ParseJobApiResponse = ApiResponse[ParsedJobResponse]
ResumeDataApiResponse = ApiResponse[ResumeDataResponse]
ResumeCreationApiResponse = ApiResponse[ResumeCreationResponse]
ResumeUpdateApiResponse = ApiResponse[ResumeUpdateResponse]
OptimizationApiResponse = ApiResponse[OptimizationResultResponse]
ScoringApiResponse = ApiResponse[ScoringResultResponse]
ResearchApiResponse = ApiResponse[ResearchResultResponse]
