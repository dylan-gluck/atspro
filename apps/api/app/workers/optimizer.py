"""Resume optimization worker using existing agent logic."""

import logging
from typing import Any, Dict, List

from ..lib.agent import optimize_agent
from ..queue.redis_queue import RedisQueue
from ..schema.job import Job
from ..schema.resume import Resume
from .base import BaseWorker, TaskError, TaskErrorType

logger = logging.getLogger(__name__)


class OptimizeWorker(BaseWorker):
    """Worker for optimizing resumes based on job descriptions."""

    def __init__(
        self,
        redis_queue: RedisQueue,
        arango_db,
        concurrency: int = 1,
        timeout_seconds: int = 300,
    ):
        """Initialize optimize worker.

        Args:
            redis_queue: Redis queue instance
            arango_db: ArangoDB database instance
            concurrency: Number of concurrent tasks
            timeout_seconds: Task timeout in seconds
        """
        super().__init__(redis_queue, concurrency, timeout_seconds)
        self.arango_db = arango_db

    def get_queue_names(self) -> List[str]:
        """Return queue names this worker processes."""
        return [
            f"{self.redis_queue.queue_prefix}:queue:high",
            f"{self.redis_queue.queue_prefix}:queue:normal",
            f"{self.redis_queue.queue_prefix}:queue:low",
        ]

    def get_task_types(self) -> List[str]:
        """Return task types this worker handles."""
        return ["optimize"]

    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute resume optimization task.

        Args:
            task_data: Task data containing payload and metadata

        Returns:
            Optimization result with markdown content

        Raises:
            TaskError: For expected optimization failures
        """
        task_id = task_data["id"]
        payload = task_data["payload"]
        user_id = task_data.get("user_id")

        resume_id = payload.get("resume_id")
        job_id = payload.get("job_id")

        if not resume_id or not job_id:
            raise TaskError(
                "Missing resume_id or job_id in task payload",
                TaskErrorType.PERMANENT,
            )

        logger.info(f"Optimizing resume {resume_id} for job {job_id}")

        try:
            # Update progress
            await self.update_progress(task_id, 10, "Fetching resume and job data")

            # Fetch resume and job data from ArangoDB
            resume_data = await self._get_resume_data(resume_id, user_id)
            job_data = await self._get_job_data(job_id, user_id)

            await self.update_progress(task_id, 30, "Preparing optimization data")

            # Convert to Pydantic models for validation
            resume = Resume(**resume_data)
            job = Job(**job_data)

            await self.update_progress(task_id, 50, "Running AI optimization")

            # Run optimization using existing agent
            optimized_resume = optimize_agent.run(
                f"Resume: {resume.model_dump_json()}\n\nJob Description: {job.model_dump_json()}"
            )

            await self.update_progress(task_id, 80, "Formatting optimization result")

            # Convert optimized resume to markdown format
            markdown_content = self._format_resume_as_markdown(optimized_resume)

            await self.update_progress(task_id, 90, "Storing optimization result")

            # Store result in ArangoDB documents collection
            result_doc_id = await self._store_optimization_result(
                task_id=task_id,
                user_id=user_id,
                resume_id=resume_id,
                job_id=job_id,
                markdown_content=markdown_content,
                optimized_resume=optimized_resume,
            )

            await self.update_progress(task_id, 100, "Optimization completed")

            logger.info(f"Optimization completed for task {task_id}")

            return {
                "type": "optimization",
                "resume_id": resume_id,
                "job_id": job_id,
                "document_id": result_doc_id,
                "status": "completed",
                "message": "Resume optimization completed successfully",
            }

        except TaskError:
            # Re-raise TaskError without modification to preserve error type
            raise
        except Exception as e:
            logger.error(f"Error in optimization task {task_id}: {e}")
            if "rate limit" in str(e).lower() or "quota" in str(e).lower():
                raise TaskError(
                    f"AI service rate limited: {e}", TaskErrorType.RATE_LIMITED
                )
            elif "authentication" in str(e).lower() or "unauthorized" in str(e).lower():
                raise TaskError(
                    f"AI service authentication error: {e}", TaskErrorType.PERMANENT
                )
            else:
                raise TaskError(f"Optimization failed: {e}", TaskErrorType.TRANSIENT)

    async def _get_resume_data(self, resume_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch resume data from ArangoDB.

        Args:
            resume_id: Resume document ID
            user_id: User ID for authorization

        Returns:
            Resume data dictionary

        Raises:
            TaskError: If resume not found or unauthorized
        """
        try:
            resumes_collection = self.arango_db.collection("resumes")
            resume_doc = resumes_collection.get(resume_id)

            if not resume_doc:
                raise TaskError(
                    f"Resume {resume_id} not found", TaskErrorType.PERMANENT
                )

            # Verify ownership
            if resume_doc.get("user_id") != user_id:
                raise TaskError(
                    f"Unauthorized access to resume {resume_id}",
                    TaskErrorType.PERMANENT,
                )

            return resume_doc.get("data", {})

        except Exception as e:
            if isinstance(e, TaskError):
                raise
            raise TaskError(f"Error fetching resume data: {e}", TaskErrorType.TRANSIENT)

    async def _get_job_data(self, job_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch job data from ArangoDB.

        Args:
            job_id: Job document ID
            user_id: User ID for authorization

        Returns:
            Job data dictionary

        Raises:
            TaskError: If job not found or unauthorized
        """
        try:
            jobs_collection = self.arango_db.collection("jobs")
            job_doc = jobs_collection.get(job_id)

            if not job_doc:
                raise TaskError(f"Job {job_id} not found", TaskErrorType.PERMANENT)

            # Verify ownership
            if job_doc.get("user_id") != user_id:
                raise TaskError(
                    f"Unauthorized access to job {job_id}", TaskErrorType.PERMANENT
                )

            return job_doc.get("data", {})

        except Exception as e:
            if isinstance(e, TaskError):
                raise
            raise TaskError(f"Error fetching job data: {e}", TaskErrorType.TRANSIENT)

    def _format_resume_as_markdown(self, resume: Resume) -> str:
        """Format optimized resume as markdown content.

        Args:
            resume: Optimized resume data

        Returns:
            Markdown formatted resume
        """
        markdown_lines = []

        # Header
        contact = resume.contact_info
        markdown_lines.append(f"# {contact.full_name}")
        markdown_lines.append("")

        # Contact Information
        if contact.email or contact.phone or contact.address:
            markdown_lines.append("## Contact Information")
            if contact.email:
                markdown_lines.append(f"**Email:** {contact.email}")
            if contact.phone:
                markdown_lines.append(f"**Phone:** {contact.phone}")
            if contact.address:
                markdown_lines.append(f"**Address:** {contact.address}")

            # Links
            if contact.links:
                for link in contact.links:
                    markdown_lines.append(f"**{link.name}:** {link.url}")
            markdown_lines.append("")

        # Professional Summary
        if resume.summary:
            markdown_lines.append("## Professional Summary")
            markdown_lines.append(resume.summary)
            markdown_lines.append("")

        # Work Experience
        if resume.work_experience:
            markdown_lines.append("## Work Experience")
            for exp in resume.work_experience:
                markdown_lines.append(f"### {exp.position} - {exp.company}")

                # Date range
                if exp.start_date:
                    date_range = exp.start_date
                    if exp.end_date:
                        date_range += f" to {exp.end_date}"
                    elif exp.is_current:
                        date_range += " to Present"
                    markdown_lines.append(f"*{date_range}*")

                if exp.description:
                    markdown_lines.append("")
                    markdown_lines.append(exp.description)

                if exp.responsibilities:
                    markdown_lines.append("")
                    markdown_lines.append("**Key Responsibilities:**")
                    for resp in exp.responsibilities:
                        markdown_lines.append(f"- {resp}")

                if exp.skills:
                    markdown_lines.append("")
                    markdown_lines.append(
                        f"**Technologies Used:** {', '.join(exp.skills)}"
                    )

                markdown_lines.append("")

        # Education
        if resume.education:
            markdown_lines.append("## Education")
            for edu in resume.education:
                title = edu.degree
                if edu.field_of_study:
                    title += f" in {edu.field_of_study}"
                markdown_lines.append(f"### {title}")
                markdown_lines.append(f"**{edu.institution}**")

                if edu.graduation_date:
                    markdown_lines.append(f"*Graduated: {edu.graduation_date}*")

                if edu.gpa:
                    markdown_lines.append(f"*GPA: {edu.gpa}*")

                if edu.honors:
                    markdown_lines.append("")
                    markdown_lines.append("**Honors:**")
                    for honor in edu.honors:
                        markdown_lines.append(f"- {honor}")

                if edu.relevant_courses:
                    markdown_lines.append("")
                    markdown_lines.append("**Relevant Coursework:**")
                    markdown_lines.append(", ".join(edu.relevant_courses))

                markdown_lines.append("")

        # Certifications
        if resume.certifications:
            markdown_lines.append("## Certifications")
            for cert in resume.certifications:
                markdown_lines.append(f"### {cert.name}")
                markdown_lines.append(f"**Issuer:** {cert.issuer}")

                if cert.date_obtained:
                    markdown_lines.append(f"**Date Obtained:** {cert.date_obtained}")

                if cert.expiration_date:
                    markdown_lines.append(f"**Expires:** {cert.expiration_date}")

                if cert.credential_id:
                    markdown_lines.append(f"**Credential ID:** {cert.credential_id}")

                markdown_lines.append("")

        # Skills
        if resume.skills:
            markdown_lines.append("## Skills")
            markdown_lines.append(", ".join(resume.skills))
            markdown_lines.append("")

        return "\n".join(markdown_lines)

    async def _store_optimization_result(
        self,
        task_id: str,
        user_id: str,
        resume_id: str,
        job_id: str,
        markdown_content: str,
        optimized_resume: Resume,
    ) -> str:
        """Store optimization result in ArangoDB documents collection.

        Args:
            task_id: Task ID
            user_id: User ID
            resume_id: Source resume ID
            job_id: Target job ID
            markdown_content: Formatted markdown content
            optimized_resume: Optimized resume data

        Returns:
            Document ID of stored result

        Raises:
            TaskError: If storage fails
        """
        try:
            # Create document for the optimization result
            from datetime import datetime

            result_doc = {
                "type": "optimization",
                "task_id": task_id,
                "user_id": user_id,
                "resume_id": resume_id,
                "job_id": job_id,
                "content": markdown_content,
                "optimized_data": optimized_resume.model_dump(),
                "created_at": datetime.utcnow().isoformat(),
                "status": "completed",
            }

            # Store in documents collection
            documents_collection = self.arango_db.collection("documents")
            result = documents_collection.insert(result_doc)

            logger.info(f"Stored optimization result as document {result['_key']}")
            return result["_key"]

        except Exception as e:
            raise TaskError(
                f"Error storing optimization result: {e}", TaskErrorType.TRANSIENT
            )
