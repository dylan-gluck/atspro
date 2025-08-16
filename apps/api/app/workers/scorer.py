"""Resume scoring worker for calculating match percentages."""

import logging
from typing import Any, Dict, List

from agents import Agent

from ..queue.redis_queue import RedisQueue
from ..schema.job import Job
from ..schema.resume import Resume
from .base import BaseWorker, TaskError, TaskErrorType

logger = logging.getLogger(__name__)

# Create scoring agent
score_agent = Agent(
    name="Resume Scoring Agent",
    instructions=(
        """
        Calculate a match percentage between a resume and job description.
        
        Analyze the following factors and provide a detailed scoring breakdown:
        1. Skills alignment (30% weight) - How well do the candidate's skills match required skills
        2. Experience relevance (25% weight) - How relevant is their work experience
        3. Education fit (20% weight) - Does their education align with requirements
        4. Keyword optimization (15% weight) - How well does the resume match job keywords
        5. Career progression (10% weight) - Does their career show appropriate growth
        
        Return a JSON object with:
        - overall_score: Number between 0-100 representing match percentage
        - skills_score: Number between 0-100 for skills alignment
        - experience_score: Number between 0-100 for experience relevance
        - education_score: Number between 0-100 for education fit
        - keywords_score: Number between 0-100 for keyword optimization
        - career_score: Number between 0-100 for career progression
        - strengths: Array of strings highlighting candidate's strengths for this role
        - gaps: Array of strings identifying areas where candidate may be lacking
        - recommendations: Array of strings with specific improvement suggestions
        - rationale: String explaining the overall scoring decision
        """
    ),
    model="gpt-4o-mini",
    output_type=dict,
)


class ScoreWorker(BaseWorker):
    """Worker for calculating resume/job match scores."""

    def __init__(
        self,
        redis_queue: RedisQueue,
        arango_db,
        concurrency: int = 1,
        timeout_seconds: int = 180,
    ):
        """Initialize score worker.

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
        return ["score"]

    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute resume scoring task.

        Args:
            task_data: Task data containing payload and metadata

        Returns:
            Scoring result with detailed breakdown

        Raises:
            TaskError: For expected scoring failures
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

        logger.info(f"Scoring resume {resume_id} against job {job_id}")

        try:
            # Update progress
            await self.update_progress(task_id, 10, "Fetching resume and job data")

            # Fetch resume and job data from ArangoDB
            resume_data = await self._get_resume_data(resume_id, user_id)
            job_data = await self._get_job_data(job_id, user_id)

            await self.update_progress(task_id, 30, "Preparing scoring data")

            # Convert to Pydantic models for validation
            resume = Resume(**resume_data)
            job = Job(**job_data)

            await self.update_progress(task_id, 50, "Running AI scoring analysis")

            # Run scoring using AI agent
            scoring_input = self._prepare_scoring_input(resume, job)
            score_result = score_agent.run(scoring_input)

            await self.update_progress(task_id, 80, "Processing score results")

            # Validate and clean score result
            cleaned_result = self._validate_score_result(score_result)

            await self.update_progress(task_id, 90, "Updating job entity with score")

            # Update job entity in ArangoDB with score
            await self._update_job_with_score(job_id, resume_id, cleaned_result)

            await self.update_progress(task_id, 100, "Scoring completed")

            logger.info(
                f"Scoring completed for task {task_id} - Overall score: {cleaned_result['overall_score']}%"
            )

            return {
                "type": "score",
                "resume_id": resume_id,
                "job_id": job_id,
                "score_data": cleaned_result,
                "status": "completed",
                "message": f"Resume scoring completed - {cleaned_result['overall_score']}% match",
            }

        except TaskError:
            # Re-raise TaskError without modification to preserve error type
            raise
        except Exception as e:
            logger.error(f"Error in scoring task {task_id}: {e}")
            if "rate limit" in str(e).lower() or "quota" in str(e).lower():
                raise TaskError(
                    f"AI service rate limited: {e}", TaskErrorType.RATE_LIMITED
                )
            elif "authentication" in str(e).lower() or "unauthorized" in str(e).lower():
                raise TaskError(
                    f"AI service authentication error: {e}", TaskErrorType.PERMANENT
                )
            else:
                raise TaskError(f"Scoring failed: {e}", TaskErrorType.TRANSIENT)

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

    def _prepare_scoring_input(self, resume: Resume, job: Job) -> str:
        """Prepare input text for scoring agent.

        Args:
            resume: Resume data
            job: Job data

        Returns:
            Formatted input string for AI agent
        """
        # Create comprehensive input for scoring
        resume_summary = []

        # Contact and summary
        resume_summary.append(f"Candidate: {resume.contact_info.full_name}")
        if resume.summary:
            resume_summary.append(f"Summary: {resume.summary}")

        # Work experience
        if resume.work_experience:
            resume_summary.append("\nWork Experience:")
            for exp in resume.work_experience:
                exp_line = f"- {exp.position} at {exp.company}"
                if exp.start_date:
                    exp_line += f" ({exp.start_date}"
                    if exp.end_date:
                        exp_line += f" to {exp.end_date})"
                    elif exp.is_current:
                        exp_line += " to Present)"
                    else:
                        exp_line += ")"
                resume_summary.append(exp_line)

                if exp.description:
                    resume_summary.append(f"  Description: {exp.description}")
                if exp.responsibilities:
                    resume_summary.append(
                        f"  Responsibilities: {'; '.join(exp.responsibilities)}"
                    )
                if exp.skills:
                    resume_summary.append(f"  Technologies: {', '.join(exp.skills)}")

        # Education
        if resume.education:
            resume_summary.append("\nEducation:")
            for edu in resume.education:
                edu_line = f"- {edu.degree}"
                if edu.field_of_study:
                    edu_line += f" in {edu.field_of_study}"
                edu_line += f" from {edu.institution}"
                if edu.graduation_date:
                    edu_line += f" ({edu.graduation_date})"
                resume_summary.append(edu_line)

        # Skills
        if resume.skills:
            resume_summary.append(f"\nSkills: {', '.join(resume.skills)}")

        # Job requirements
        job_summary = []
        job_summary.append(f"Position: {job.title} at {job.company}")
        job_summary.append(f"Description: {job.description}")

        if job.responsibilities:
            job_summary.append(f"Responsibilities: {'; '.join(job.responsibilities)}")
        if job.qualifications:
            job_summary.append(f"Qualifications: {'; '.join(job.qualifications)}")
        if job.location:
            job_summary.append(f"Location: {', '.join(job.location)}")
        if job.salary:
            job_summary.append(f"Salary: {job.salary}")

        return f"RESUME:\n{chr(10).join(resume_summary)}\n\nJOB POSTING:\n{chr(10).join(job_summary)}"

    def _validate_score_result(self, score_result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean the score result from AI agent.

        Args:
            score_result: Raw result from scoring agent

        Returns:
            Validated and cleaned score result

        Raises:
            TaskError: If score result is invalid
        """
        try:
            # Ensure all required fields exist with defaults
            cleaned = {
                "overall_score": max(
                    0, min(100, int(score_result.get("overall_score", 0)))
                ),
                "skills_score": max(
                    0, min(100, int(score_result.get("skills_score", 0)))
                ),
                "experience_score": max(
                    0, min(100, int(score_result.get("experience_score", 0)))
                ),
                "education_score": max(
                    0, min(100, int(score_result.get("education_score", 0)))
                ),
                "keywords_score": max(
                    0, min(100, int(score_result.get("keywords_score", 0)))
                ),
                "career_score": max(
                    0, min(100, int(score_result.get("career_score", 0)))
                ),
                "strengths": score_result.get("strengths", []),
                "gaps": score_result.get("gaps", []),
                "recommendations": score_result.get("recommendations", []),
                "rationale": score_result.get(
                    "rationale", "No detailed rationale provided"
                ),
            }

            # Ensure lists are actually lists
            for field in ["strengths", "gaps", "recommendations"]:
                if not isinstance(cleaned[field], list):
                    cleaned[field] = []

            # Ensure rationale is a string
            if not isinstance(cleaned["rationale"], str):
                cleaned["rationale"] = str(cleaned["rationale"])

            return cleaned

        except Exception as e:
            raise TaskError(
                f"Invalid score result format: {e}", TaskErrorType.PERMANENT
            )

    async def _update_job_with_score(
        self, job_id: str, resume_id: str, score_data: Dict[str, Any]
    ) -> None:
        """Update job entity in ArangoDB with scoring results.

        Args:
            job_id: Job document ID
            resume_id: Resume document ID
            score_data: Scoring results

        Raises:
            TaskError: If update fails
        """
        try:
            jobs_collection = self.arango_db.collection("jobs")

            # Get current job document
            job_doc = jobs_collection.get(job_id)
            if not job_doc:
                raise TaskError(f"Job {job_id} not found", TaskErrorType.PERMANENT)

            # Initialize scores field if it doesn't exist
            if "scores" not in job_doc:
                job_doc["scores"] = {}

            # Add score for this resume
            job_doc["scores"][resume_id] = {
                **score_data,
                "scored_at": self._get_current_timestamp(),
            }

            # Update the document
            jobs_collection.update(job_doc)

            logger.info(f"Updated job {job_id} with score for resume {resume_id}")

        except Exception as e:
            if isinstance(e, TaskError):
                raise
            raise TaskError(
                f"Error updating job with score: {e}", TaskErrorType.TRANSIENT
            )

    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format.

        Returns:
            ISO formatted timestamp string
        """
        from datetime import datetime

        return datetime.utcnow().isoformat()
