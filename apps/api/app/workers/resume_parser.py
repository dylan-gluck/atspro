"""Resume parsing worker using existing agent logic for ATSPro API."""

import base64
import logging
from io import BytesIO
from typing import Any, Dict, List

from agents import Runner
from unstructured.partition.auto import partition

from ..database.connections import get_arango_client, get_postgres_pool
from ..lib.agent import resume_agent
from ..queue.redis_queue import RedisQueue
from ..schema.resume import Resume
from .base import BaseWorker, TaskError, TaskErrorType

logger = logging.getLogger(__name__)


class ResumeParseWorker(BaseWorker):
    """Worker for processing resume parsing tasks asynchronously."""

    def __init__(
        self,
        redis_queue: RedisQueue,
        task_service=None,
        concurrency: int = 1,
        timeout_seconds: int = 300,
        graceful_shutdown_timeout: int = 30,
    ):
        """Initialize resume parse worker.

        Args:
            redis_queue: Redis queue instance for task operations
            task_service: Task service for PostgreSQL synchronization (optional)
            concurrency: Number of concurrent tasks to process
            timeout_seconds: Task timeout in seconds
            graceful_shutdown_timeout: Shutdown timeout in seconds
        """
        super().__init__(
            redis_queue, task_service, concurrency, timeout_seconds, graceful_shutdown_timeout
        )

    def get_queue_names(self) -> List[str]:
        """Return list of queue names this worker processes."""
        return [
            self.redis_queue.high_queue_key,
            self.redis_queue.normal_queue_key,
            self.redis_queue.low_queue_key,
        ]

    def get_task_types(self) -> List[str]:
        """Return list of task types this worker can handle."""
        return ["parse_resume"]

    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute resume parsing task.

        Args:
            task_data: Task data containing payload and metadata

        Returns:
            Parsed resume data and metadata

        Raises:
            TaskError: For expected task failures
            Exception: For unexpected errors
        """
        task_id = task_data["id"]
        payload = task_data["payload"]

        logger.info(f"Starting resume parsing for task {task_id}")

        try:
            # Extract task data
            resume_id = payload["resume_id"]
            user_id = payload["user_id"]
            file_data = payload["file_data"]

            await self.update_progress(task_id, 10, "Extracting file content")

            # Decode file content
            try:
                content = base64.b64decode(file_data["content"])
                content_stream = BytesIO(content)
                filename = file_data["filename"]
                content_type = file_data["content_type"]

            except Exception as e:
                raise TaskError(
                    f"Failed to decode file content: {str(e)}", TaskErrorType.PERMANENT
                )

            await self.update_progress(
                task_id, 20, "Processing document with unstructured"
            )

            # Parse document using unstructured
            try:
                elements = partition(file=content_stream)
                text_elements = [str(element) for element in elements]
                text_content = "\\n".join(text_elements)

                if not text_content.strip():
                    raise TaskError(
                        "No text content could be extracted from the document",
                        TaskErrorType.PERMANENT,
                    )

            except Exception as e:
                logger.error(
                    f"Unstructured parsing failed for task {task_id}: {str(e)}"
                )
                raise TaskError(
                    f"Failed to extract text from document: {str(e)}",
                    TaskErrorType.PERMANENT,
                )

            await self.update_progress(task_id, 50, "Processing with AI agent")

            # Parse with resume agent
            try:
                result = await Runner.run(resume_agent, text_content)
                if not result or not hasattr(result, "final_output"):
                    raise TaskError(
                        "AI agent returned empty or invalid result",
                        TaskErrorType.TRANSIENT,
                    )

                resume_data = result.final_output

            except Exception as e:
                logger.error(f"AI agent processing failed for task {task_id}: {str(e)}")

                # Check if this is a rate limit or API error (transient)
                error_str = str(e).lower()
                if any(
                    term in error_str
                    for term in ["rate limit", "timeout", "503", "502", "429"]
                ):
                    raise TaskError(
                        f"AI processing temporarily unavailable: {str(e)}",
                        TaskErrorType.RATE_LIMITED,
                    )
                else:
                    raise TaskError(
                        f"AI processing failed: {str(e)}", TaskErrorType.TRANSIENT
                    )

            await self.update_progress(task_id, 70, "Validating parsed data")

            # Validate parsed data
            try:
                parsed_resume = Resume.model_validate(resume_data)

            except Exception as e:
                logger.error(f"Resume validation failed for task {task_id}: {str(e)}")
                raise TaskError(
                    f"Parsed resume data validation failed: {str(e)}",
                    TaskErrorType.TRANSIENT,  # Might be fixable with retry
                )

            await self.update_progress(task_id, 80, "Storing resume data")

            # Store in ArangoDB
            try:
                arango_db = get_arango_client()
                resume_collection = arango_db.collection("resumes")

                # Prepare resume document for ArangoDB
                resume_doc = {
                    "_key": resume_id,
                    "user_id": user_id,
                    "file_metadata": {
                        "filename": filename,
                        "content_type": content_type,
                        "size": file_data["size"],
                        "processed_at": task_data.get("started_at"),
                    },
                    "resume_data": parsed_resume.model_dump(),
                    "status": "parsed",
                    "task_id": task_id,
                }

                # Insert or update the resume document
                resume_collection.insert(resume_doc, overwrite=True)

                logger.info(f"Stored resume {resume_id} for user {user_id}")

            except Exception as e:
                logger.error(f"ArangoDB storage failed for task {task_id}: {str(e)}")
                raise TaskError(
                    f"Failed to store resume data: {str(e)}", TaskErrorType.TRANSIENT
                )

            await self.update_progress(task_id, 90, "Updating user profile")

            # Update user profile with resume_id
            try:
                postgres_pool = get_postgres_pool()
                async with postgres_pool.connection() as conn:
                    async with conn.transaction():
                        # Check if user profile exists, create if not
                        async with conn.cursor() as cursor:
                            await cursor.execute(
                                "SELECT user_id FROM user_profiles WHERE user_id = %s",
                                (user_id,),
                            )
                            profile_exists = await cursor.fetchone()

                            if not profile_exists:
                                await cursor.execute(
                                    "INSERT INTO user_profiles (user_id, resume_id) VALUES (%s, %s)",
                                    (user_id, resume_id),
                                )
                                logger.info(f"Created user profile for user {user_id} with resume {resume_id}")
                            else:
                                await cursor.execute(
                                    "UPDATE user_profiles SET resume_id = %s WHERE user_id = %s",
                                    (resume_id, user_id),
                                )
                                logger.info(f"Updated user profile for user {user_id} with resume {resume_id}")

            except Exception as e:
                logger.error(f"User profile update failed for task {task_id}: {str(e)}")
                # Don't fail the task for profile update issues, log warning instead
                logger.warning(f"Resume {resume_id} stored but user profile update failed: {str(e)}")

            await self.update_progress(task_id, 100, "Resume parsing completed")

            # Return result
            result = {
                "resume_id": resume_id,
                "user_id": user_id,
                "resume_data": parsed_resume.model_dump(),
                "file_metadata": {
                    "filename": filename,
                    "content_type": content_type,
                    "size": file_data["size"],
                },
                "status": "completed",
            }

            logger.info(f"Resume parsing completed for task {task_id}")
            return result

        except TaskError:
            # Re-raise TaskErrors as-is
            raise
        except Exception as e:
            # Log unexpected errors and wrap them
            logger.error(f"Unexpected error in resume parsing task {task_id}: {str(e)}")
            raise TaskError(
                f"Unexpected error during resume parsing: {str(e)}",
                TaskErrorType.TRANSIENT,
            )
