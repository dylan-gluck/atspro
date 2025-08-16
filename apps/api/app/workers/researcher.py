"""Company research worker for generating comprehensive research reports."""

import logging
from typing import Any, Dict, List

from agents import Agent

from ..queue.redis_queue import RedisQueue
from ..schema.job import Job
from ..schema.resume import Resume
from .base import BaseWorker, TaskError, TaskErrorType

logger = logging.getLogger(__name__)

# Create research agent
research_agent = Agent(
    name="Company Research Agent",
    instructions=(
        """
        Generate a comprehensive company research report based on the provided job posting and candidate resume.
        This report should help the candidate prepare for interviews and understand the company culture.
        
        Create a detailed research report with the following sections:
        
        1. **Company Overview**
           - Company mission, vision, and values
           - Industry position and competitive landscape
           - Recent company news and developments
           - Company size, founding year, and key leadership
        
        2. **Culture & Work Environment**
           - Company culture and work environment insights
           - Employee satisfaction and reviews
           - Remote work policies and flexibility
           - Diversity and inclusion initiatives
        
        3. **Role-Specific Research**
           - Department structure and team dynamics
           - Career growth opportunities in this role
           - Typical day-to-day responsibilities
           - Skills and technologies commonly used
        
        4. **Interview Preparation**
           - Common interview questions for this type of role
           - Company-specific interview process insights
           - What to expect during different interview rounds
           - Key topics to research further
        
        5. **Thoughtful Questions to Ask**
           Generate 8-10 thoughtful, specific questions the candidate could ask during the interview, covering:
           - Role expectations and success metrics
           - Team dynamics and collaboration
           - Growth opportunities and career path
           - Company direction and strategic goals
           - Work-life balance and company culture
        
        6. **Red Flags to Watch For**
           - Potential warning signs during the interview process
           - Questions that might indicate company issues
           - What to listen for in responses
        
        Format the response as a well-structured markdown document with clear headings and bullet points.
        Make the research actionable and specific to both the company and the role.
        """
    ),
    model="gpt-4o",
    output_type=str,
)


class ResearchWorker(BaseWorker):
    """Worker for generating company research reports."""

    def __init__(
        self,
        redis_queue: RedisQueue,
        arango_db,
        concurrency: int = 1,
        timeout_seconds: int = 300,
    ):
        """Initialize research worker.

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
        return ["research"]

    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute company research task.

        Args:
            task_data: Task data containing payload and metadata

        Returns:
            Research result with markdown report

        Raises:
            TaskError: For expected research failures
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

        logger.info(f"Researching company for resume {resume_id} and job {job_id}")

        try:
            # Update progress
            await self.update_progress(task_id, 10, "Fetching resume and job data")

            # Fetch resume and job data from ArangoDB
            resume_data = await self._get_resume_data(resume_id, user_id)
            job_data = await self._get_job_data(job_id, user_id)

            await self.update_progress(task_id, 30, "Preparing research context")

            # Convert to Pydantic models for validation
            resume = Resume(**resume_data)
            job = Job(**job_data)

            await self.update_progress(task_id, 50, "Generating company research")

            # Run research using AI agent
            research_input = self._prepare_research_input(resume, job)
            research_report = research_agent.run(research_input)

            await self.update_progress(task_id, 80, "Processing research report")

            # Enhance the report with additional structure
            enhanced_report = self._enhance_research_report(research_report, job)

            await self.update_progress(task_id, 90, "Storing research report")

            # Store result in ArangoDB documents collection
            result_doc_id = await self._store_research_result(
                task_id=task_id,
                user_id=user_id,
                resume_id=resume_id,
                job_id=job_id,
                report_content=enhanced_report,
                company_name=job.company,
                job_title=job.title,
            )

            await self.update_progress(task_id, 100, "Research completed")

            logger.info(f"Company research completed for task {task_id}")

            return {
                "type": "research",
                "resume_id": resume_id,
                "job_id": job_id,
                "document_id": result_doc_id,
                "company": job.company,
                "status": "completed",
                "message": f"Company research completed for {job.company}",
            }

        except TaskError:
            # Re-raise TaskError without modification to preserve error type
            raise
        except Exception as e:
            logger.error(f"Error in research task {task_id}: {e}")
            if "rate limit" in str(e).lower() or "quota" in str(e).lower():
                raise TaskError(
                    f"AI service rate limited: {e}", TaskErrorType.RATE_LIMITED
                )
            elif "authentication" in str(e).lower() or "unauthorized" in str(e).lower():
                raise TaskError(
                    f"AI service authentication error: {e}", TaskErrorType.PERMANENT
                )
            else:
                raise TaskError(f"Research failed: {e}", TaskErrorType.TRANSIENT)

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

    def _prepare_research_input(self, resume: Resume, job: Job) -> str:
        """Prepare input text for research agent.

        Args:
            resume: Resume data
            job: Job data

        Returns:
            Formatted input string for AI agent
        """
        # Create comprehensive context for research
        research_context = []

        # Job information
        research_context.append("JOB POSTING DETAILS:")
        research_context.append(f"Company: {job.company}")
        research_context.append(f"Position: {job.title}")
        research_context.append(f"Description: {job.description}")

        if job.responsibilities:
            research_context.append(
                f"Key Responsibilities: {'; '.join(job.responsibilities)}"
            )
        if job.qualifications:
            research_context.append(
                f"Required Qualifications: {'; '.join(job.qualifications)}"
            )
        if job.location:
            research_context.append(f"Location: {', '.join(job.location)}")
        if job.salary:
            research_context.append(f"Salary Range: {job.salary}")
        if job.link:
            research_context.append(f"Job Posting URL: {job.link}")

        # Candidate context
        research_context.append("\nCANDIDATE BACKGROUND:")
        research_context.append(f"Name: {resume.contact_info.full_name}")

        if resume.summary:
            research_context.append(f"Professional Summary: {resume.summary}")

        # Current/most recent role
        if resume.work_experience:
            current_role = resume.work_experience[0]  # Assuming most recent first
            research_context.append(
                f"Current/Recent Role: {current_role.position} at {current_role.company}"
            )

        # Key skills
        if resume.skills:
            research_context.append(
                f"Key Skills: {', '.join(resume.skills[:10])}"
            )  # Top 10 skills

        # Education level
        if resume.education:
            highest_education = resume.education[0]  # Assuming first is highest
            research_context.append(
                f"Education: {highest_education.degree} from {highest_education.institution}"
            )

        research_context.append(
            "\nPlease generate a comprehensive company research report that will help this candidate prepare for interviews and understand the opportunity."
        )

        return "\n".join(research_context)

    def _enhance_research_report(self, research_report: str, job: Job) -> str:
        """Enhance the research report with additional metadata and structure.

        Args:
            research_report: Raw research report from AI
            job: Job data for context

        Returns:
            Enhanced markdown report
        """
        # Add header with metadata
        header_lines = [
            f"# Company Research Report: {job.company}",
            f"**Position:** {job.title}",
            f"**Generated:** {self._get_current_timestamp()}",
            "",
            "---",
            "",
        ]

        # Ensure the report starts with proper markdown structure
        if not research_report.startswith("#"):
            # If the AI didn't provide proper markdown headers, add a basic structure
            enhanced_lines = header_lines + [
                "## Research Summary",
                "",
                research_report,
                "",
                "---",
                "",
                "**Note:** This research report was generated using AI analysis. Please verify information through official company sources and recent news.",
            ]
        else:
            # Merge with existing structure
            enhanced_lines = header_lines + [research_report]

        return "\n".join(enhanced_lines)

    async def _store_research_result(
        self,
        task_id: str,
        user_id: str,
        resume_id: str,
        job_id: str,
        report_content: str,
        company_name: str,
        job_title: str,
    ) -> str:
        """Store research result in ArangoDB documents collection.

        Args:
            task_id: Task ID
            user_id: User ID
            resume_id: Source resume ID
            job_id: Target job ID
            report_content: Research report content
            company_name: Company name
            job_title: Job title

        Returns:
            Document ID of stored result

        Raises:
            TaskError: If storage fails
        """
        try:
            # Create document for the research result
            result_doc = {
                "type": "research",
                "task_id": task_id,
                "user_id": user_id,
                "resume_id": resume_id,
                "job_id": job_id,
                "content": report_content,
                "company": company_name,
                "job_title": job_title,
                "created_at": self._get_current_timestamp(),
                "status": "completed",
                "metadata": {
                    "content_type": "markdown",
                    "report_type": "company_research",
                    "word_count": len(report_content.split()),
                },
            }

            # Store in documents collection
            documents_collection = self.arango_db.collection("documents")
            result = documents_collection.insert(result_doc)

            # Create relationship edge from job to research document
            await self._create_research_relationship(job_id, result["_key"])

            logger.info(f"Stored research result as document {result['_key']}")
            return result["_key"]

        except Exception as e:
            raise TaskError(
                f"Error storing research result: {e}", TaskErrorType.TRANSIENT
            )

    async def _create_research_relationship(
        self, job_id: str, document_id: str
    ) -> None:
        """Create relationship edge between job and research document.

        Args:
            job_id: Job document ID
            document_id: Research document ID
        """
        try:
            # Check if edge collection exists, create if not
            if not self.arango_db.has_collection("job_research"):
                self.arango_db.create_collection("job_research", edge=True)

            edge_collection = self.arango_db.collection("job_research")

            # Create edge from job to research document
            edge_doc = {
                "_from": f"jobs/{job_id}",
                "_to": f"documents/{document_id}",
                "relationship": "has_research",
                "created_at": self._get_current_timestamp(),
            }

            edge_collection.insert(edge_doc)
            logger.info(
                f"Created research relationship: job {job_id} -> document {document_id}"
            )

        except Exception as e:
            # Log error but don't fail the task for relationship creation
            logger.warning(f"Error creating research relationship: {e}")

    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format.

        Returns:
            ISO formatted timestamp string
        """
        from datetime import datetime

        return datetime.utcnow().isoformat()
