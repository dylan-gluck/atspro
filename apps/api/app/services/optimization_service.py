"""Optimization service layer for data validation and business logic."""

import logging
from typing import Any, Dict, List, Optional
from uuid import uuid4

from ..config import settings

logger = logging.getLogger(__name__)


class OptimizationService:
    """Service layer for optimization-specific operations and validation."""

    def __init__(self, arango_db, task_service):
        """Initialize optimization service.

        Args:
            arango_db: ArangoDB database instance
            task_service: Task service instance
        """
        self.arango_db = arango_db
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
            resumes_collection = self.arango_db.collection("resumes")
            resume_doc = resumes_collection.get(resume_id)

            if not resume_doc:
                logger.warning(f"Resume {resume_id} not found")
                return False

            # Check ownership
            if resume_doc.get("user_id") != user_id:
                logger.warning(f"User {user_id} unauthorized for resume {resume_id}")
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
            jobs_collection = self.arango_db.collection("jobs")
            job_doc = jobs_collection.get(job_id)

            if not job_doc:
                logger.warning(f"Job {job_id} not found")
                return False

            # Check ownership
            if job_doc.get("user_id") != user_id:
                logger.warning(f"User {user_id} unauthorized for job {job_id}")
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
            user_id: User ID

        Returns:
            Task creation result with task_id and document_id

        Raises:
            ValueError: If validation fails
        """
        # Validate the request
        validation = await self.validate_optimization_request(
            resume_id, job_id, user_id
        )

        if not validation["valid"]:
            error_msg = "; ".join(validation["errors"])
            raise ValueError(f"Optimization request validation failed: {error_msg}")

        # Create document ID for result
        document_id = await self.create_document_id()

        # Create task
        task_id = await self.task_service.create_task(
            task_type="optimize",
            payload={"resume_id": resume_id, "job_id": job_id},
            user_id=user_id,
        )

        logger.info(f"Created optimization task {task_id} for user {user_id}")

        return {
            "task_id": task_id,
            "document_id": document_id,
            "resume_id": resume_id,
            "job_id": job_id,
        }

    async def create_scoring_task(
        self, resume_id: str, job_id: str, user_id: str
    ) -> Dict[str, str]:
        """Create a scoring task with validation.

        Args:
            resume_id: Resume document ID
            job_id: Job document ID
            user_id: User ID

        Returns:
            Task creation result with task_id

        Raises:
            ValueError: If validation fails
        """
        # Validate the request
        validation = await self.validate_optimization_request(
            resume_id, job_id, user_id
        )

        if not validation["valid"]:
            error_msg = "; ".join(validation["errors"])
            raise ValueError(f"Scoring request validation failed: {error_msg}")

        # Create task
        task_id = await self.task_service.create_task(
            task_type="score",
            payload={"resume_id": resume_id, "job_id": job_id},
            user_id=user_id,
        )

        logger.info(f"Created scoring task {task_id} for user {user_id}")

        return {
            "task_id": task_id,
            "resume_id": resume_id,
            "job_id": job_id,
        }

    async def create_research_task(
        self, resume_id: str, job_id: str, user_id: str
    ) -> Dict[str, str]:
        """Create a research task with validation.

        Args:
            resume_id: Resume document ID
            job_id: Job document ID
            user_id: User ID

        Returns:
            Task creation result with task_id and document_id

        Raises:
            ValueError: If validation fails
        """
        # Validate the request
        validation = await self.validate_optimization_request(
            resume_id, job_id, user_id
        )

        if not validation["valid"]:
            error_msg = "; ".join(validation["errors"])
            raise ValueError(f"Research request validation failed: {error_msg}")

        # Create document ID for result
        document_id = await self.create_document_id()

        # Create task
        task_id = await self.task_service.create_task(
            task_type="research",
            payload={"resume_id": resume_id, "job_id": job_id},
            user_id=user_id,
        )

        logger.info(f"Created research task {task_id} for user {user_id}")

        return {
            "task_id": task_id,
            "document_id": document_id,
            "resume_id": resume_id,
            "job_id": job_id,
        }

    async def get_optimization_result(
        self, document_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get optimization result by document ID.

        Args:
            document_id: Document ID
            user_id: User ID for authorization

        Returns:
            Optimization result or None if not found
        """
        try:
            documents_collection = self.arango_db.collection("documents")
            doc = documents_collection.get(document_id)

            if not doc:
                return None

            # Verify ownership
            if doc.get("user_id") != user_id:
                logger.warning(
                    f"User {user_id} unauthorized for document {document_id}"
                )
                return None

            return doc

        except Exception as e:
            logger.error(f"Error retrieving optimization result: {e}")
            return None

    async def get_job_scores(
        self, job_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get all scores for a job.

        Args:
            job_id: Job document ID
            user_id: User ID for authorization

        Returns:
            Job scores or None if not found
        """
        try:
            # Validate job access first
            if not await self.validate_job_access(job_id, user_id):
                return None

            jobs_collection = self.arango_db.collection("jobs")
            job_doc = jobs_collection.get(job_id)

            if not job_doc:
                return None

            return job_doc.get("scores", {})

        except Exception as e:
            logger.error(f"Error retrieving job scores: {e}")
            return None

    async def get_user_research_reports(
        self, user_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get research reports for a user.

        Args:
            user_id: User ID
            limit: Maximum number of reports to return

        Returns:
            List of research report documents
        """
        try:
            # Query documents collection for research reports
            aql = """
            FOR doc IN documents
            FILTER doc.user_id == @user_id AND doc.type == "research"
            SORT doc.created_at DESC
            LIMIT @limit
            RETURN doc
            """

            cursor = self.arango_db.aql.execute(
                aql, bind_vars={"user_id": user_id, "limit": limit}
            )

            return list(cursor)

        except Exception as e:
            logger.error(f"Error retrieving research reports: {e}")
            return []

    async def health_check(self) -> Dict[str, Any]:
        """Check service health.

        Returns:
            Health status information
        """
        health_status = {
            "service": "optimization_service",
            "status": "healthy",
            "arango_db": False,
            "task_service": False,
        }

        try:
            # Check ArangoDB connection
            self.arango_db.collections()
            health_status["arango_db"] = True
        except Exception as e:
            health_status["status"] = "degraded"
            health_status["arango_error"] = str(e)

        try:
            # Check task service
            if hasattr(self.task_service, "health_check"):
                task_health = await self.task_service.health_check()
                health_status["task_service"] = task_health.get("status") == "healthy"
            else:
                health_status["task_service"] = True
        except Exception as e:
            health_status["status"] = "degraded"
            health_status["task_service_error"] = str(e)

        return health_status
