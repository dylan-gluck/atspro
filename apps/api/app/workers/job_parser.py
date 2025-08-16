"""Job parsing worker for ATSPro API."""

import logging
import traceback
from typing import Any, Dict, List, Optional

from agents import Runner

from ..lib.agent import job_agent
from ..lib.httpx import fetch
from ..schema.job import Job
from ..services.job_service import JobService
from ..workers.base import BaseWorker, TaskError, TaskErrorType

logger = logging.getLogger(__name__)


class JobParseWorker(BaseWorker):
    """Worker for parsing job postings from URLs using OpenAI agents."""

    def __init__(self, redis_queue, concurrency: int = 1, timeout_seconds: int = 300):
        """Initialize job parsing worker.

        Args:
            redis_queue: Redis queue instance
            concurrency: Number of concurrent tasks to process
            timeout_seconds: Task timeout in seconds
        """
        super().__init__(redis_queue, concurrency, timeout_seconds)
        self.job_service: Optional[JobService] = None

    def get_queue_names(self) -> List[str]:
        """Return list of queue names this worker processes."""
        return [
            self.redis_queue.high_queue_key,
            self.redis_queue.normal_queue_key,
            self.redis_queue.low_queue_key,
        ]

    def get_task_types(self) -> List[str]:
        """Return list of task types this worker can handle."""
        return ["parse_job"]

    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute job parsing task.

        Args:
            task_data: Task data containing payload and metadata

        Returns:
            Parsed job data

        Raises:
            TaskError: For expected parsing failures
        """
        task_id = task_data["id"]
        payload = task_data["payload"]

        # Extract required fields from payload
        url = payload.get("url")
        job_id = payload.get("job_id")
        user_id = payload.get("user_id")

        if not url:
            raise TaskError("Missing URL in task payload", TaskErrorType.PERMANENT)

        if not job_id:
            raise TaskError("Missing job_id in task payload", TaskErrorType.PERMANENT)

        logger.info(f"Starting job parsing for URL: {url}")

        try:
            # Initialize job service if not already done
            if not self.job_service:
                from ..services.task_service import TaskService

                task_service = TaskService()
                await task_service.startup()
                self.job_service = JobService(task_service)

            # Update progress
            await self.update_progress(task_id, 10, "Fetching HTML content")

            # Fetch HTML content from URL
            try:
                html_content = await fetch(url)
            except Exception as e:
                error_msg = f"Failed to fetch URL {url}: {str(e)}"
                logger.error(error_msg)

                # Update job status to failed
                await self.job_service.update_job_status(job_id, "failed", error_msg)

                # Determine if this is retryable (some HTTP errors are temporary)
                if "timeout" in str(e).lower() or "connection" in str(e).lower():
                    raise TaskError(error_msg, TaskErrorType.TRANSIENT)
                else:
                    raise TaskError(error_msg, TaskErrorType.PERMANENT)

            # Update progress
            await self.update_progress(task_id, 30, "Parsing job content with AI")

            # Parse job information using OpenAI agent
            try:
                result = await Runner.run(job_agent, html_content)
                job_data = result.final_output

                # Validate the parsed data
                parsed_job = Job.model_validate(job_data)

                # Convert back to dict for storage
                validated_job_data = parsed_job.model_dump()

                # Add the source URL to the parsed data
                validated_job_data["source_url"] = url

            except Exception as e:
                error_msg = f"Failed to parse job content: {str(e)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())

                # Update job status to failed
                await self.job_service.update_job_status(job_id, "failed", error_msg)

                # AI parsing failures are usually not retryable
                raise TaskError(error_msg, TaskErrorType.PERMANENT)

            # Update progress
            await self.update_progress(task_id, 80, "Storing parsed job data")

            # Store the parsed job data
            try:
                await self.job_service.store_job_result(
                    task_id=task_id,
                    job_id=job_id,
                    job_data=validated_job_data,
                    user_id=user_id,
                )
            except Exception as e:
                error_msg = f"Failed to store job data: {str(e)}"
                logger.error(error_msg)

                # Storage failures might be retryable
                raise TaskError(error_msg, TaskErrorType.TRANSIENT)

            # Update progress to completion
            await self.update_progress(task_id, 100, "Job parsing completed")

            logger.info(f"Successfully parsed job {job_id} from URL: {url}")

            # Return the parsed data for the task result
            return {
                "job_id": job_id,
                "url": url,
                "job_data": validated_job_data,
                "status": "completed",
            }

        except TaskError:
            # Re-raise TaskErrors as-is
            raise
        except Exception as e:
            # Catch any unexpected errors
            error_msg = f"Unexpected error during job parsing: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())

            # Update job status to failed if possible
            if self.job_service and job_id:
                try:
                    await self.job_service.update_job_status(
                        job_id, "failed", error_msg
                    )
                except Exception as inner_e:
                    logger.error(f"Failed to update job status: {inner_e}")

            # Unexpected errors are retryable
            raise TaskError(error_msg, TaskErrorType.TRANSIENT)

    async def health_check(self) -> Dict[str, Any]:
        """Extended health check for job parsing worker."""
        base_health = await super().health_check()

        # Add job-specific health information
        base_health.update(
            {
                "worker_type": "job_parser",
                "supported_urls": ["http://", "https://"],
                "ai_agent": "job_agent",
                "estimated_duration_ms": 30000,
            }
        )

        return base_health
