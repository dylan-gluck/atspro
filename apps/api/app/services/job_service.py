"""Job-specific service operations for ATSPro API."""

import base64
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from ..database import (
    delete_document,
    get_document,
    query_documents,
    search_jsonb_field,
    store_document,
    update_document,
)

logger = logging.getLogger(__name__)


class JobService:
    """Service layer for job-related operations."""

    def __init__(self):
        """Initialize job service."""
        # No need to store database connection - we use utility functions
        pass

    async def store_job_result(
        self,
        task_id: str,
        job_id: str,
        job_data: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> str:
        """Store parsed job data in PostgreSQL with JSONB.

        Args:
            task_id: Task ID for tracking
            job_id: Job document ID
            job_data: Parsed job information
            user_id: User ID for ownership

        Returns:
            Job document ID
        """
        try:
            # Extract key fields from parsed data
            company_name = job_data.get("company", job_data.get("company_name", "Unknown"))
            job_title = job_data.get("title", job_data.get("job_title", "Unknown"))
            location = job_data.get("location", "")
            
            # Prepare job document data with JSONB structure
            document_data = {
                "company_name": company_name,
                "job_title": job_title,
                "location": location,
                "remote_type": job_data.get("remote_type"),
                "job_url": job_data.get("source_url", job_data.get("url", "")),
                "parsed_data": job_data,  # Store complete data in JSONB
            }

            # Store metadata separately for efficient querying
            metadata = {
                "task_id": task_id,
                "source_id": job_id,
                "status": "completed",
                "type": "job",
                "skills": job_data.get("skills", []),
                "requirements": job_data.get("requirements", []),
                "keywords": job_data.get("keywords", []),
                "salary_range": job_data.get("salary_range"),
                "experience_level": job_data.get("experience_level"),
                "employment_type": job_data.get("employment_type"),
            }

            # Store in PostgreSQL job_documents table
            stored_id = await store_document(
                table="job_documents",
                user_id=user_id or "system",
                data=document_data,
                metadata=metadata,
            )

            logger.info(f"Stored job result with ID {stored_id} for task {task_id}")
            return stored_id

        except Exception as e:
            logger.error(f"Error storing job result: {e}")
            raise

    async def get_job(
        self, job_id: str, user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get job information by ID.

        Args:
            job_id: Job document ID (UUID)
            user_id: Optional user ID for ownership validation

        Returns:
            Job information or None if not found
        """
        try:
            job_doc = await get_document(
                table="job_documents",
                doc_id=job_id,
                user_id=user_id,
            )

            if not job_doc:
                return None

            # Transform to expected format
            result = {
                "_key": str(job_doc["id"]),
                "_id": str(job_doc["id"]),
                "user_id": job_doc.get("user_id"),
                "type": "job",
                "status": job_doc.get("metadata", {}).get("status", "completed"),
                "parsed_data": job_doc.get("parsed_data", {}),
                "company_name": job_doc.get("company_name"),
                "job_title": job_doc.get("job_title"),
                "location": job_doc.get("location"),
                "created_at": job_doc.get("created_at", datetime.utcnow()).isoformat(),
                "updated_at": job_doc.get("updated_at", datetime.utcnow()).isoformat(),
            }

            return result

        except Exception as e:
            logger.error(f"Error retrieving job {job_id}: {e}")
            return None

    async def get_user_jobs(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
        company_name: Optional[str] = None,
        search_query: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get jobs for a specific user with advanced filtering.

        Args:
            user_id: User ID
            limit: Maximum number of jobs to return
            offset: Number of jobs to skip
            status: Optional status filter
            company_name: Optional company name filter
            search_query: Optional search query for full-text search

        Returns:
            List of job documents
        """
        try:
            # Build filters using PostgreSQL JSONB operators
            filters = {}
            
            # Status filter using JSONB containment
            if status:
                filters["metadata"] = {"$contains": {"status": status}}
            
            # Company name filter
            if company_name:
                filters["company_name"] = company_name
            
            # Active jobs filter
            filters["is_active"] = True

            jobs = await query_documents(
                table="job_documents",
                user_id=user_id,
                filters=filters,
                limit=limit,
                offset=offset,
                order_by="created_at DESC",
            )

            # Transform to expected format with JSONB data extraction
            result = []
            for job in jobs:
                # Extract metadata from JSONB
                metadata = job.get("metadata", {})
                parsed_data = job.get("parsed_data", {})
                
                result.append({
                    "_key": str(job["id"]),
                    "_id": str(job["id"]),
                    "user_id": job.get("user_id"),
                    "type": "job",
                    "status": metadata.get("status", "completed"),
                    "parsed_data": parsed_data,
                    "company_name": job.get("company_name"),
                    "job_title": job.get("job_title"),
                    "location": job.get("location"),
                    "remote_type": job.get("remote_type"),
                    "job_url": job.get("job_url"),
                    "skills": metadata.get("skills", parsed_data.get("skills", [])),
                    "requirements": metadata.get("requirements", parsed_data.get("requirements", [])),
                    "keywords": metadata.get("keywords", parsed_data.get("keywords", [])),
                    "salary_range": metadata.get("salary_range", parsed_data.get("salary_range")),
                    "created_at": job.get("created_at", datetime.utcnow()).isoformat(),
                    "updated_at": job.get("updated_at", datetime.utcnow()).isoformat(),
                })

            return result

        except Exception as e:
            logger.error(f"Error retrieving jobs for user {user_id}: {e}")
            return []

    async def validate_job_access(self, job_id: str, user_id: str) -> bool:
        """Validate that a user has access to a job.

        Args:
            job_id: Job document ID
            user_id: User ID

        Returns:
            True if user has access, False otherwise
        """
        job = await self.get_job(job_id, user_id)
        return job is not None

    async def update_job_status(
        self,
        job_id: str,
        status: str,
        error_message: Optional[str] = None,
    ) -> None:
        """Update job status.

        Args:
            job_id: Job document ID
            status: New status
            error_message: Optional error message
        """
        try:
            # Get current metadata
            job_doc = await get_document("job_documents", job_id)
            if not job_doc:
                raise ValueError(f"Job {job_id} not found")

            metadata = job_doc.get("metadata", {})
            metadata["status"] = status
            if error_message:
                metadata["error_message"] = error_message

            updates = {"metadata": metadata}

            await update_document(
                table="job_documents",
                doc_id=job_id,
                updates=updates,
            )

            logger.info(f"Updated job {job_id} status to {status}")

        except Exception as e:
            logger.error(f"Error updating job {job_id} status: {e}")
            raise

    async def _create_job_placeholder(
        self, job_id: str, user_id: str, url: str
    ) -> str:
        """Create placeholder job document.

        Args:
            job_id: Job document ID (will be stored in metadata)
            user_id: User ID
            url: Source URL

        Returns:
            Created document ID
        """
        try:
            document_data = {
                "company_name": "Pending",
                "job_title": "Pending",
                "location": "",
                "job_url": url,
                "parsed_data": {},
            }

            doc_id = await store_document(
                table="job_documents",
                user_id=user_id,
                data=document_data,
                metadata={
                    "source_id": job_id,
                    "status": "pending",
                    "type": "job",
                    "source_url": url,
                },
            )

            logger.debug(f"Created job placeholder with ID {doc_id}")
            return doc_id

        except Exception as e:
            logger.error(f"Error creating job placeholder: {e}")
            raise

    async def _create_job_document_placeholder(
        self, job_id: str, user_id: str, filename: str
    ) -> str:
        """Create placeholder job document for file upload.

        Args:
            job_id: Job document ID (will be stored in metadata)
            user_id: User ID
            filename: Original filename

        Returns:
            Created document ID
        """
        try:
            document_data = {
                "company_name": "Pending",
                "job_title": "Pending",
                "location": "",
                "parsed_data": {},
            }

            doc_id = await store_document(
                table="job_documents",
                user_id=user_id,
                data=document_data,
                metadata={
                    "source_id": job_id,
                    "status": "pending",
                    "type": "job",
                    "source_type": "document",
                    "source_filename": filename,
                },
            )

            logger.debug(f"Created job document placeholder with ID {doc_id}")
            return doc_id

        except Exception as e:
            logger.error(f"Error creating job document placeholder: {e}")
            raise

    async def update_job(
        self,
        job_id: str,
        updates: Dict[str, Any],
    ) -> None:
        """Update job with provided fields.

        Args:
            job_id: Job document ID
            updates: Dictionary of fields to update
        """
        try:
            await update_document(
                table="job_documents",
                doc_id=job_id,
                updates=updates,
            )

            logger.info(f"Updated job {job_id}")

        except Exception as e:
            logger.error(f"Error updating job {job_id}: {e}")
            raise

    async def delete_job(self, job_id: str) -> None:
        """Delete a job.

        Args:
            job_id: Job document ID
        """
        try:
            await delete_document(
                table="job_documents",
                doc_id=job_id,
            )

            logger.info(f"Deleted job {job_id}")

        except Exception as e:
            logger.error(f"Error deleting job {job_id}: {e}")
            raise

    async def search_jobs_by_skills(
        self,
        user_id: str,
        skills: List[str],
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Search jobs by required skills using JSONB operators.

        Args:
            user_id: User ID
            skills: List of skills to search for
            limit: Maximum number of results

        Returns:
            List of matching job documents
        """
        try:
            # Search for jobs containing any of the specified skills
            jobs = await search_jsonb_field(
                table="job_documents",
                field="metadata",
                search_value={"skills": skills},
                user_id=user_id,
                limit=limit,
            )

            # Transform results
            result = []
            for job in jobs:
                metadata = job.get("metadata", {})
                parsed_data = job.get("parsed_data", {})
                
                result.append({
                    "_id": str(job["id"]),
                    "company_name": job.get("company_name"),
                    "job_title": job.get("job_title"),
                    "location": job.get("location"),
                    "skills": metadata.get("skills", parsed_data.get("skills", [])),
                    "match_score": len(set(skills) & set(metadata.get("skills", []))),
                    "created_at": job.get("created_at", datetime.utcnow()).isoformat(),
                })

            # Sort by match score
            result.sort(key=lambda x: x["match_score"], reverse=True)
            return result

        except Exception as e:
            logger.error(f"Error searching jobs by skills: {e}")
            return []

    async def search_jobs_by_location(
        self,
        user_id: str,
        location: str,
        include_remote: bool = True,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Search jobs by location using JSONB text search.

        Args:
            user_id: User ID
            location: Location to search for
            include_remote: Whether to include remote jobs
            limit: Maximum number of results

        Returns:
            List of matching job documents
        """
        try:
            filters = {}
            
            # Add location filter
            if location:
                # Use ILIKE for partial matching on location field
                filters["location"] = location
            
            if include_remote:
                filters["remote_type"] = {"$in": ["remote", "hybrid", location]}

            jobs = await query_documents(
                table="job_documents",
                user_id=user_id,
                filters=filters,
                limit=limit,
                order_by="created_at DESC",
            )

            # Transform results
            result = []
            for job in jobs:
                result.append({
                    "_id": str(job["id"]),
                    "company_name": job.get("company_name"),
                    "job_title": job.get("job_title"),
                    "location": job.get("location"),
                    "remote_type": job.get("remote_type"),
                    "created_at": job.get("created_at", datetime.utcnow()).isoformat(),
                })

            return result

        except Exception as e:
            logger.error(f"Error searching jobs by location: {e}")
            return []

    async def get_job_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get statistics about user's jobs using JSONB aggregation.

        Args:
            user_id: User ID

        Returns:
            Dictionary with job statistics
        """
        try:
            # Get all user jobs
            jobs = await query_documents(
                table="job_documents",
                user_id=user_id,
                limit=1000,
            )

            # Calculate statistics
            stats = {
                "total_jobs": len(jobs),
                "companies": set(),
                "locations": set(),
                "skills": [],
                "remote_types": {},
                "status_counts": {},
            }

            all_skills = []
            for job in jobs:
                metadata = job.get("metadata", {})
                
                # Count by company
                if job.get("company_name"):
                    stats["companies"].add(job["company_name"])
                
                # Count by location
                if job.get("location"):
                    stats["locations"].add(job["location"])
                
                # Collect skills
                skills = metadata.get("skills", [])
                all_skills.extend(skills)
                
                # Count by remote type
                remote_type = job.get("remote_type", "onsite")
                stats["remote_types"][remote_type] = stats["remote_types"].get(remote_type, 0) + 1
                
                # Count by status
                status = metadata.get("status", "completed")
                stats["status_counts"][status] = stats["status_counts"].get(status, 0) + 1

            # Get top skills
            from collections import Counter
            skill_counts = Counter(all_skills)
            stats["top_skills"] = [
                {"skill": skill, "count": count}
                for skill, count in skill_counts.most_common(10)
            ]

            # Convert sets to lists for JSON serialization
            stats["companies"] = list(stats["companies"])
            stats["locations"] = list(stats["locations"])

            return stats

        except Exception as e:
            logger.error(f"Error getting job statistics: {e}")
            return {}

    async def get_resume(
        self, resume_id: str, user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get resume information by ID.

        Args:
            resume_id: Resume document ID
            user_id: Optional user ID for ownership validation

        Returns:
            Resume information or None if not found
        """
        try:
            resume_doc = await get_document(
                table="resume_documents",
                doc_id=resume_id,
                user_id=user_id,
            )

            if not resume_doc:
                return None

            # Transform to expected format
            result = {
                "_key": str(resume_doc["id"]),
                "_id": str(resume_doc["id"]),
                "user_id": resume_doc.get("user_id"),
                "type": "resume",
                "status": resume_doc.get("metadata", {}).get("status", "completed"),
                "parsed_data": resume_doc.get("parsed_data", {}),
                "filename": resume_doc.get("filename"),
                "content_type": resume_doc.get("content_type"),
                "file_size": resume_doc.get("file_size"),
                "created_at": resume_doc.get("created_at", datetime.utcnow()).isoformat(),
                "updated_at": resume_doc.get("updated_at", datetime.utcnow()).isoformat(),
            }

            # Add resume_data for backward compatibility
            if "parsed_data" in resume_doc:
                result["resume_data"] = resume_doc["parsed_data"]

            return result

        except Exception as e:
            logger.error(f"Error retrieving resume {resume_id}: {e}")
            return None

    async def validate_resume_access(self, resume_id: str, user_id: str) -> bool:
        """Validate that a user has access to a resume.

        Args:
            resume_id: Resume document ID
            user_id: User ID

        Returns:
            True if user has access, False otherwise
        """
        resume = await self.get_resume(resume_id, user_id)
        return resume is not None

    async def update_resume(
        self,
        resume_id: str,
        updates: Dict[str, Any],
    ) -> None:
        """Update resume with provided fields.

        Args:
            resume_id: Resume document ID
            updates: Dictionary of fields to update
        """
        try:
            await update_document(
                table="resume_documents",
                doc_id=resume_id,
                updates=updates,
            )

            logger.info(f"Updated resume {resume_id}")

        except Exception as e:
            logger.error(f"Error updating resume {resume_id}: {e}")
            raise
