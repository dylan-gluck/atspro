from typing import Dict, Generic, List, Optional, TypeVar, Any

from pydantic import BaseModel

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


class TaskData(BaseModel):
    """Standard data structure for async task responses"""
    task_id: str
    status: Optional[str] = None
    progress: Optional[int] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# Convenience type aliases for common response patterns
ApiSuccessResponse = ApiResponse[T]
ApiErrorResponse = ApiResponse[None]
ApiTaskResponse = ApiResponse[TaskData]
ApiListResponse = ApiResponse[List[T]]