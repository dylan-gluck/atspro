"""Job-specific service operations for ATSPro API."""

import logging
from typing import Dict, Any, Optional
from uuid import uuid4
from datetime import datetime

from ..queue.redis_queue import TaskPriority
from ..services.task_service import TaskService

logger = logging.getLogger(__name__)


class JobService:
    """Service layer for job-related operations."""

    def __init__(self, task_service: TaskService):
        """Initialize job service.

        Args:
            task_service: Task service instance for queue operations
        """
        self.task_service = task_service

    async def create_parse_task(
        self,
        user_id: str,
        url: str,
        job_id: str,
        priority: TaskPriority = TaskPriority.NORMAL,
    ) -> str:
        """Create a job parsing task.

        Args:
            user_id: ID of user creating the task
            url: URL to parse for job information
            job_id: Pre-generated job ID for the result
            priority: Task priority level

        Returns:
            Task ID

        Raises:
            ValueError: If URL is invalid
            Exception: If task creation fails
        """
        # Validate URL
        if not url or not url.startswith(("http://", "https://")):
            raise ValueError("Invalid URL format")

        # Create task payload
        payload = {
            "url": url,
            "job_id": job_id,
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
        }

        try:
            # Submit task to queue
            task_id = await self.task_service.create_task(
                task_type="parse_job",
                payload=payload,
                user_id=user_id,
                priority=priority,
                max_retries=3,
                estimated_duration_ms=30000,  # Estimate 30 seconds
            )

            # Create placeholder job document in ArangoDB
            await self._create_job_placeholder(job_id, user_id, url)

            logger.info(f"Created job parse task {task_id} for job {job_id}")
            return task_id

        except Exception as e:
            logger.error(f"Error creating job parse task: {e}")
            raise

    async def store_job_result(
        self,
        task_id: str,
        job_id: str,
        job_data: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> str:
        """Store parsed job data in ArangoDB.

        Args:
            task_id: Task ID that generated this result
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
                "task_id": task_id,
                "user_id": user_id,
                "type": "job",
                "status": "completed",
                "parsed_data": job_data,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            # Store in ArangoDB jobs collection
            collection = self.task_service.arango_db.collection("jobs")
            collection.replace(job_doc, overwrite=True)

            # Also store the result in the task_results collection for consistency
            await self.task_service.store_task_result(
                task_id=task_id,
                result=job_data,
                result_id=job_id,
            )

            logger.info(f"Stored job result for task {task_id} as job {job_id}")
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
            collection = self.task_service.arango_db.collection("jobs")
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
            collection = self.task_service.arango_db.collection("jobs")

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

            cursor = self.task_service.arango_db.aql.execute(query, bind_vars=bind_vars)
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
            collection = self.task_service.arango_db.collection("jobs")

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
            job_doc = {
                "_key": job_id,
                "user_id": user_id,
                "type": "job",
                "status": "pending",
                "source_url": url,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            collection = self.task_service.arango_db.collection("jobs")
            collection.insert(job_doc)

            logger.debug(f"Created job placeholder {job_id}")

        except Exception as e:
            logger.error(f"Error creating job placeholder: {e}")
            raise
