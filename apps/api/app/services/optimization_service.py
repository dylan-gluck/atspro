"""Optimization service layer for data validation and business logic."""

import json
import logging
from typing import Any, Dict, List, Optional
from uuid import uuid4

from ..config import settings
from ..database import (
    get_document,
    query_documents,
    search_jsonb_field,
    store_document,
    get_postgres_connection,
)

logger = logging.getLogger(__name__)


class OptimizationService:
    """Service layer for optimization-specific operations and validation."""

    def __init__(self, task_service=None):
        """Initialize optimization service.

        Args:
            task_service: Task service instance (optional, for legacy support)
        """
        self.task_service = task_service

    async def validate_resume_access(self, resume_id: str, user_id: str) -> bool:
        """Validate that user has access to the specified resume.

        Args:
            resume_id: Resume document ID
            user_id: User ID for authorization

        Returns:
            True if user has access, False otherwise
        """
        try:
            resume_doc = await get_document(
                table="resume_documents",
                doc_id=resume_id,
                user_id=user_id,
            )

            if not resume_doc:
                logger.warning(f"Resume {resume_id} not found or unauthorized")
                return False

            return True

        except Exception as e:
            logger.error(f"Error validating resume access: {e}")
            return False

    async def validate_job_access(self, job_id: str, user_id: str) -> bool:
        """Validate that user has access to the specified job.

        Args:
            job_id: Job document ID
            user_id: User ID for authorization

        Returns:
            True if user has access, False otherwise
        """
        try:
            job_doc = await get_document(
                table="job_documents",
                doc_id=job_id,
                user_id=user_id,
            )

            if not job_doc:
                logger.warning(f"Job {job_id} not found or unauthorized")
                return False

            return True

        except Exception as e:
            logger.error(f"Error validating job access: {e}")
            return False

    async def validate_optimization_request(
        self, resume_id: str, job_id: str, user_id: str
    ) -> Dict[str, Any]:
        """Validate an optimization request.

        Args:
            resume_id: Resume document ID
            job_id: Job document ID
            user_id: User ID for authorization

        Returns:
            Validation result with success status and details

        Raises:
            Exception: For validation errors
        """
        result = {
            "valid": False,
            "resume_exists": False,
            "job_exists": False,
            "resume_authorized": False,
            "job_authorized": False,
            "errors": [],
        }

        try:
            # Validate resume access
            resume_valid = await self.validate_resume_access(resume_id, user_id)
            result["resume_exists"] = resume_valid
            result["resume_authorized"] = resume_valid

            if not resume_valid:
                result["errors"].append(f"Resume {resume_id} not found or unauthorized")

            # Validate job access
            job_valid = await self.validate_job_access(job_id, user_id)
            result["job_exists"] = job_valid
            result["job_authorized"] = job_valid

            if not job_valid:
                result["errors"].append(f"Job {job_id} not found or unauthorized")

            # Overall validation
            result["valid"] = resume_valid and job_valid

            return result

        except Exception as e:
            logger.error(f"Error in optimization validation: {e}")
            result["errors"].append(f"Validation error: {e}")
            return result

    async def create_document_id(self) -> str:
        """Create a new document ID for optimization results.

        Returns:
            New document ID
        """
        return str(uuid4())

    async def create_optimization_task(
        self, resume_id: str, job_id: str, user_id: str
    ) -> Dict[str, str]:
        """Create an optimization task with validation.

        Args:
            resume_id: Resume document ID
            job_id: Job document ID
            user_id: User ID for authorization

        Returns:
            Task information including task_id and document_id

        Raises:
            ValueError: If validation fails
        """
        # Validate request
        validation = await self.validate_optimization_request(
            resume_id, job_id, user_id
        )

        if not validation["valid"]:
            error_msg = "; ".join(validation["errors"])
            raise ValueError(f"Validation failed: {error_msg}")

        # Create document ID for results
        document_id = await self.create_document_id()

        # Create task (if task service is available)
        task_id = None
        if self.task_service:
            task_id = await self.task_service.create_task(
                task_type="optimize_resume",
                user_id=user_id,
                payload={
                    "resume_id": resume_id,
                    "job_id": job_id,
                    "document_id": document_id,
                },
            )
        else:
            # For direct processing without queue
            task_id = document_id

        return {"task_id": task_id, "document_id": document_id}

    async def create_scoring_task(
        self, resume_id: str, job_id: str, user_id: str
    ) -> Dict[str, str]:
        """Create an ATS scoring task.

        Args:
            resume_id: Resume document ID
            job_id: Job document ID
            user_id: User ID for authorization

        Returns:
            Task information including task_id and document_id

        Raises:
            ValueError: If validation fails
        """
        # Validate request
        validation = await self.validate_optimization_request(
            resume_id, job_id, user_id
        )

        if not validation["valid"]:
            error_msg = "; ".join(validation["errors"])
            raise ValueError(f"Validation failed: {error_msg}")

        # Create document ID for results
        document_id = await self.create_document_id()

        # Create task (if task service is available)
        task_id = None
        if self.task_service:
            task_id = await self.task_service.create_task(
                task_type="score_resume",
                user_id=user_id,
                payload={
                    "resume_id": resume_id,
                    "job_id": job_id,
                    "document_id": document_id,
                },
            )
        else:
            task_id = document_id

        return {"task_id": task_id, "document_id": document_id}

    async def create_research_task(
        self, resume_id: str, job_id: str, user_id: str
    ) -> Dict[str, str]:
        """Create a company research task.

        Args:
            resume_id: Resume document ID
            job_id: Job document ID
            user_id: User ID for authorization

        Returns:
            Task information including task_id and document_id
            
        Raises:
            ValueError: If validation fails
        """
        # Validate request
        validation = await self.validate_optimization_request(
            resume_id, job_id, user_id
        )

        if not validation["valid"]:
            error_msg = "; ".join(validation["errors"])
            raise ValueError(f"Validation failed: {error_msg}")
            
        # Create document ID for results
        document_id = await self.create_document_id()

        # Create task (if task service is available)
        task_id = None
        if self.task_service:
            task_id = await self.task_service.create_task(
                task_type="research_company",
                user_id=user_id,
                payload={
                    "resume_id": resume_id,
                    "job_id": job_id,
                    "document_id": document_id,
                },
            )
        else:
            task_id = document_id

        return {"task_id": task_id, "document_id": document_id}

    async def get_optimization_result(
        self, document_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get optimization result by document ID.

        Args:
            document_id: Document ID of the optimization result
            user_id: User ID for authorization

        Returns:
            Optimization result or None if not found/unauthorized
        """
        try:
            doc = await get_document(
                table="optimization_results",
                doc_id=document_id,
                user_id=user_id,
            )

            if doc:
                # Extract optimized content from JSONB
                optimized_content = doc.get("optimized_content", {})
                
                # Handle both new and legacy data structures
                if isinstance(optimized_content, str):
                    # If it's a string, try to parse it as JSON
                    try:
                        import json
                        optimized_content = json.loads(optimized_content)
                    except:
                        pass
                
                # Transform to expected format
                return {
                    "_key": str(doc["id"]),
                    "_id": str(doc["id"]),
                    "user_id": doc.get("user_id"),
                    "type": doc.get("optimization_type", "optimization"),
                    "status": doc.get("status", "completed"),
                    "optimized_content": optimized_content,
                    "markdown": optimized_content.get("markdown", ""),
                    "structured_data": optimized_content.get("structured_data", {}),
                    "analysis": doc.get("metadata", {}).get("analysis", {}),
                    "ats_score": doc.get("ats_score"),
                    "keyword_match_score": doc.get("keyword_match_score"),
                    "version": doc.get("version", 1),
                    "is_active": doc.get("is_active", True),
                    "created_at": doc.get("created_at"),
                    "updated_at": doc.get("updated_at"),
                }

            return None

        except Exception as e:
            logger.error(f"Error retrieving optimization result {document_id}: {e}")
            return None

    async def get_job_scores(
        self, job_id: str, user_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get optimization scores for a specific job.

        Args:
            job_id: Job document ID
            user_id: User ID for authorization
            limit: Maximum number of results

        Returns:
            List of optimization results for the job
        """
        try:
            # First validate job access
            if not await self.validate_job_access(job_id, user_id):
                logger.warning(f"Unauthorized access to job {job_id} by user {user_id}")
                return []

            # Query optimization results for this job with active filter
            results = await query_documents(
                table="optimization_results",
                filters={
                    "job_id": job_id,
                    "is_active": True
                },
                user_id=user_id,
                limit=limit,
                order_by="ats_score DESC NULLS LAST, created_at DESC",
            )

            # Transform results with more details
            return [
                {
                    "document_id": str(result["id"]),
                    "resume_id": result.get("resume_id"),
                    "optimization_type": result.get("optimization_type", "general"),
                    "ats_score": result.get("ats_score"),
                    "keyword_match_score": result.get("keyword_match_score"),
                    "version": result.get("version", 1),
                    "created_at": result.get("created_at"),
                }
                for result in results
            ]

        except Exception as e:
            logger.error(f"Error retrieving job scores for {job_id}: {e}")
            return []

    async def get_user_research_reports(
        self, user_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get research reports for a user.

        Args:
            user_id: User ID
            limit: Maximum number of results

        Returns:
            List of research reports
        """
        try:
            # Query research results
            results = await query_documents(
                table="research_results",
                user_id=user_id,
                limit=limit,
                order_by="created_at DESC",
            )

            # Transform results
            return [
                {
                    "document_id": str(result["id"]),
                    "company_name": result.get("company_name"),
                    "research_type": result.get("research_type"),
                    "key_insights": result.get("key_insights", []),
                    "created_at": result.get("created_at"),
                }
                for result in results
            ]

        except Exception as e:
            logger.error(f"Error retrieving research reports for user {user_id}: {e}")
            return []

    async def get_optimization_history(
        self, user_id: str, resume_id: str = None, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get optimization history for a user, optionally filtered by resume.

        Args:
            user_id: User ID
            resume_id: Optional resume ID to filter by
            limit: Maximum number of results

        Returns:
            List of optimization history entries
        """
        try:
            filters = {"is_active": True}
            if resume_id:
                filters["resume_id"] = resume_id

            results = await query_documents(
                table="optimization_results",
                filters=filters,
                user_id=user_id,
                limit=limit,
                order_by="created_at DESC",
            )

            # Transform and enrich results
            history = []
            for result in results:
                optimized_content = result.get("optimized_content", {})
                if isinstance(optimized_content, str):
                    try:
                        import json
                        optimized_content = json.loads(optimized_content)
                    except:
                        optimized_content = {}
                
                history.append({
                    "id": str(result["id"]),
                    "resume_id": result.get("resume_id"),
                    "job_id": result.get("job_id"),
                    "optimization_type": result.get("optimization_type", "general"),
                    "ats_score": result.get("ats_score"),
                    "keyword_match_score": result.get("keyword_match_score"),
                    "version": result.get("version", 1),
                    "has_markdown": bool(optimized_content.get("markdown")),
                    "created_at": result.get("created_at"),
                })

            return history

        except Exception as e:
            logger.error(f"Error retrieving optimization history: {e}")
            return []

    async def get_cross_document_optimizations(
        self, user_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get optimizations across multiple resumes and jobs using JOINs.

        Args:
            user_id: User ID
            limit: Maximum number of results

        Returns:
            List of cross-document optimization data
        """
        try:
            async with get_postgres_connection() as conn:
                conn.row_factory = lambda cursor, row: dict(
                    zip([col.name for col in cursor.description], row)
                )
                cursor = conn.cursor()
                
                # Complex JOIN query for cross-document analysis
                await cursor.execute(
                    """
                    SELECT 
                        o.id,
                        o.optimization_type,
                        o.ats_score,
                        o.keyword_match_score,
                        o.version,
                        o.created_at,
                        r.filename as resume_filename,
                        r.parsed_data->>'name' as candidate_name,
                        j.job_title,
                        j.company_name,
                        j.location
                    FROM optimization_results o
                    LEFT JOIN resume_documents r ON o.resume_id = r.id
                    LEFT JOIN job_documents j ON o.job_id = j.id
                    WHERE o.user_id = %s AND o.is_active = true
                    ORDER BY o.created_at DESC
                    LIMIT %s
                    """,
                    (user_id, limit)
                )
                
                results = await cursor.fetchall()
                
                # Transform results
                return [
                    {
                        "optimization_id": str(row["id"]),
                        "optimization_type": row["optimization_type"],
                        "ats_score": float(row["ats_score"]) if row["ats_score"] else None,
                        "keyword_match_score": float(row["keyword_match_score"]) if row["keyword_match_score"] else None,
                        "version": row["version"],
                        "resume_info": {
                            "filename": row["resume_filename"],
                            "candidate_name": row["candidate_name"],
                        },
                        "job_info": {
                            "title": row["job_title"],
                            "company": row["company_name"],
                            "location": row["location"],
                        },
                        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    }
                    for row in results
                ]

        except Exception as e:
            logger.error(f"Error retrieving cross-document optimizations: {e}")
            return []

    async def get_optimization_statistics(
        self, user_id: str
    ) -> Dict[str, Any]:
        """Get optimization statistics for a user using JSONB operators.

        Args:
            user_id: User ID

        Returns:
            Dictionary of optimization statistics
        """
        try:
            async with get_postgres_connection() as conn:
                conn.row_factory = lambda cursor, row: dict(
                    zip([col.name for col in cursor.description], row)
                )
                cursor = conn.cursor()
                
                # Use the PostgreSQL function we created
                await cursor.execute(
                    "SELECT * FROM get_optimization_stats(%s)",
                    (user_id,)
                )
                
                stats = await cursor.fetchone()
                
                if stats:
                    return {
                        "total_optimizations": stats["total_optimizations"],
                        "avg_ats_score": float(stats["avg_ats_score"]) if stats["avg_ats_score"] else 0,
                        "max_ats_score": float(stats["max_ats_score"]) if stats["max_ats_score"] else 0,
                        "avg_keyword_score": float(stats["avg_keyword_score"]) if stats["avg_keyword_score"] else 0,
                        "max_keyword_score": float(stats["max_keyword_score"]) if stats["max_keyword_score"] else 0,
                        "unique_resumes": stats["unique_resumes"],
                        "unique_jobs": stats["unique_jobs"],
                    }
                
                return {
                    "total_optimizations": 0,
                    "avg_ats_score": 0,
                    "max_ats_score": 0,
                    "avg_keyword_score": 0,
                    "max_keyword_score": 0,
                    "unique_resumes": 0,
                    "unique_jobs": 0,
                }

        except Exception as e:
            logger.error(f"Error retrieving optimization statistics: {e}")
            return {}

    async def search_optimizations_by_skills(
        self, user_id: str, skills: List[str], limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Search optimizations by skills using JSONB containment.

        Args:
            user_id: User ID
            skills: List of skills to search for
            limit: Maximum number of results

        Returns:
            List of optimizations matching the skills
        """
        try:
            async with get_postgres_connection() as conn:
                conn.row_factory = lambda cursor, row: dict(
                    zip([col.name for col in cursor.description], row)
                )
                cursor = conn.cursor()
                
                # Use JSONB containment operator to find matching skills
                await cursor.execute(
                    """
                    SELECT 
                        id,
                        resume_id,
                        job_id,
                        optimization_type,
                        ats_score,
                        keyword_match_score,
                        optimized_content->'structured_data'->'skills' as skills,
                        created_at
                    FROM optimization_results
                    WHERE 
                        user_id = %s 
                        AND is_active = true
                        AND optimized_content->'structured_data'->'skills' ?| %s
                    ORDER BY 
                        ats_score DESC NULLS LAST,
                        created_at DESC
                    LIMIT %s
                    """,
                    (user_id, skills, limit)
                )
                
                results = await cursor.fetchall()
                
                # Transform results
                return [
                    {
                        "id": str(row["id"]),
                        "resume_id": row["resume_id"],
                        "job_id": row["job_id"],
                        "optimization_type": row["optimization_type"],
                        "ats_score": float(row["ats_score"]) if row["ats_score"] else None,
                        "keyword_match_score": float(row["keyword_match_score"]) if row["keyword_match_score"] else None,
                        "matching_skills": [s for s in (row["skills"] or []) if s in skills],
                        "all_skills": row["skills"] or [],
                        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    }
                    for row in results
                ]

        except Exception as e:
            logger.error(f"Error searching optimizations by skills: {e}")
            return []

    async def health_check(self) -> Dict[str, Any]:
        """Check the health of the optimization service.

        Returns:
            Health status dictionary
        """
        health_status = {
            "service": "optimization_service",
            "status": "healthy",
            "database": False,
            "task_service": False,
        }

        try:
            # Check database connection by attempting a simple query
            test_results = await query_documents(
                table="optimization_results",
                limit=1,
            )
            health_status["database"] = True
        except Exception as e:
            health_status["status"] = "degraded"
            health_status["database_error"] = str(e)

        try:
            # Check task service if available
            if self.task_service and hasattr(self.task_service, "health_check"):
                task_health = await self.task_service.health_check()
                health_status["task_service"] = task_health.get("healthy", False)
        except Exception as e:
            health_status["task_error"] = str(e)

        return health_status
