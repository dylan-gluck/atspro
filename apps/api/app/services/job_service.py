"""Job-specific service operations for ATSPro API."""

import base64
import logging
from typing import Dict, Any, Optional
from uuid import uuid4
from datetime import datetime

from ..database.connections import get_arango_client

logger = logging.getLogger(__name__)


class JobService:
    """Service layer for job-related operations."""

    def __init__(self):
        """Initialize job service."""
        self.arango_db = get_arango_client()


    async def store_job_result(
        self,
        job_id: str,
        job_data: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> str:
        """Store parsed job data in ArangoDB.

        Args:
            job_id: Job document ID
            job_data: Parsed job information
            user_id: User ID for ownership

        Returns:
            Job document ID
        """
        try:
            # Prepare job document
            job_doc = {
                "_key": job_id,
                "user_id": user_id,
                "type": "job",
                "status": "completed",
                "parsed_data": job_data,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            # Store in ArangoDB jobs collection
            try:
                collection = self.arango_db.collection("jobs")
                if not collection.exists():
                    collection.create()
                    logger.info("Created jobs collection")
            except Exception as e:
                logger.warning(f"Could not create/verify jobs collection: {e}")
                collection = self.arango_db.collection("jobs")

            collection.replace(job_doc, overwrite=True)

            logger.info(f"Stored job result as job {job_id}")
            return job_id

        except Exception as e:
            logger.error(f"Error storing job result: {e}")
            raise

    async def get_job(
        self, job_id: str, user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get job information by ID.

        Args:
            job_id: Job document ID
            user_id: Optional user ID for ownership validation

        Returns:
            Job information or None if not found
        """
        try:
            collection = self.arango_db.collection("jobs")
            job_doc = collection.get(job_id)

            if not job_doc:
                return None

            # Validate ownership if user_id provided
            if user_id and job_doc.get("user_id") != user_id:
                return None

            return job_doc

        except Exception as e:
            logger.error(f"Error retrieving job {job_id}: {e}")
            return None

    async def get_user_jobs(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> list[Dict[str, Any]]:
        """Get jobs for a specific user.

        Args:
            user_id: User ID
            limit: Maximum number of jobs to return
            offset: Number of jobs to skip
            status: Optional status filter

        Returns:
            List of job documents
        """
        try:
            collection = self.arango_db.collection("jobs")

            # Build AQL query
            query = """
                FOR job IN jobs
                FILTER job.user_id == @user_id
            """
            bind_vars = {"user_id": user_id}

            if status:
                query += " FILTER job.status == @status"
                bind_vars["status"] = status

            query += """
                SORT job.created_at DESC
                LIMIT @offset, @limit
                RETURN job
            """
            bind_vars.update({"offset": offset, "limit": limit})

            cursor = self.arango_db.aql.execute(query, bind_vars=bind_vars)
            return list(cursor)

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
            collection = self.arango_db.collection("jobs")

            update_data = {
                "status": status,
                "updated_at": datetime.utcnow().isoformat(),
            }

            if error_message:
                update_data["error_message"] = error_message

            collection.update({"_key": job_id}, update_data)

            logger.info(f"Updated job {job_id} status to {status}")

        except Exception as e:
            logger.error(f"Error updating job {job_id} status: {e}")
            raise

    async def _create_job_placeholder(
        self, job_id: str, user_id: str, url: str
    ) -> None:
        """Create placeholder job document.

        Args:
            job_id: Job document ID
            user_id: User ID
            url: Source URL
        """
        try:
            # Ensure jobs collection exists
            try:
                collection = self.arango_db.collection("jobs")
                if not collection.exists():
                    collection.create()
                    logger.info("Created jobs collection")
            except Exception as e:
                logger.warning(f"Could not create/verify jobs collection: {e}")
                # Try to get collection anyway
                collection = self.arango_db.collection("jobs")

            job_doc = {
                "_key": job_id,
                "user_id": user_id,
                "type": "job",
                "status": "pending",
                "source_url": url,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            collection.insert(job_doc)

            logger.debug(f"Created job placeholder {job_id}")

        except Exception as e:
            logger.error(f"Error creating job placeholder: {e}")
            raise

    async def _create_job_document_placeholder(
        self, job_id: str, user_id: str, filename: str
    ) -> None:
        """Create placeholder job document for file upload.

        Args:
            job_id: Job document ID
            user_id: User ID
            filename: Original filename
        """
        try:
            job_doc = {
                "_key": job_id,
                "user_id": user_id,
                "type": "job",
                "status": "pending",
                "source_type": "document",
                "source_filename": filename,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            collection = self.arango_db.collection("jobs")
            collection.insert(job_doc)

            logger.debug(f"Created job document placeholder {job_id}")

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
            # Add updated timestamp
            updates["updated_at"] = datetime.utcnow().isoformat()

            collection = self.arango_db.collection("jobs")
            collection.update({"_key": job_id}, updates)

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
            collection = self.arango_db.collection("jobs")
            collection.delete({"_key": job_id})

            logger.info(f"Deleted job {job_id}")

        except Exception as e:
            logger.error(f"Error deleting job {job_id}: {e}")
            raise

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
            collection = self.arango_db.collection("resumes")
            resume_doc = collection.get(resume_id)

            if not resume_doc:
                return None

            # Fix missing timestamps for older documents
            if resume_doc.get("created_at") is None:
                from datetime import datetime

                timestamp = datetime.utcnow().isoformat()
                resume_doc["created_at"] = timestamp
                resume_doc["updated_at"] = timestamp

                # Update document in ArangoDB with timestamps
                try:
                    collection.update(
                        {"_key": resume_id},
                        {"created_at": timestamp, "updated_at": timestamp},
                    )
                    logger.info(f"Added missing timestamps to resume {resume_id}")
                except Exception as e:
                    logger.warning(
                        f"Could not update timestamps for resume {resume_id}: {e}"
                    )

            # Validate ownership if user_id provided
            if user_id and resume_doc.get("user_id") != user_id:
                return None

            return resume_doc

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
            # Add updated timestamp
            updates["updated_at"] = datetime.utcnow().isoformat()

            collection = self.arango_db.collection("resumes")
            collection.update({"_key": resume_id}, updates)

            logger.info(f"Updated resume {resume_id}")

        except Exception as e:
            logger.error(f"Error updating resume {resume_id}: {e}")
            raise
