"""Synchronous resume processing service for ATSPro API."""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, Optional

from agents import Runner
from unstructured.partition.auto import partition

from ..database.connections import get_postgres_pool
from ..lib.agent import resume_agent
from ..schema.resume import Resume

logger = logging.getLogger(__name__)


class ResumeProcessingError(Exception):
    """Base exception for resume processing errors."""

    pass


class FileProcessingError(ResumeProcessingError):
    """Raised when file cannot be processed or text extracted."""

    pass


class AIProcessingError(ResumeProcessingError):
    """Raised when AI agent processing fails."""

    pass


class ValidationError(ResumeProcessingError):
    """Raised when parsed data validation fails."""

    pass


class StorageError(ResumeProcessingError):
    """Raised when data storage operations fail."""

    pass


class ResumeProcessorService:
    """Service for processing resume files synchronously without queue dependencies."""

    def __init__(self):
        """Initialize resume processor service with database connections."""
        self.timeout_seconds = 60  # AI processing timeout
        self.max_retries = 3
        self.base_delay = 1.0  # Base delay for exponential backoff

    async def process_resume_sync(
        self,
        file_content: bytes,
        filename: str,
        user_id: str,
        content_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process a resume file synchronously and return parsed data.

        Args:
            file_content: Raw file content as bytes
            filename: Original filename
            user_id: User ID for ownership
            content_type: MIME type of the file (optional)

        Returns:
            Dictionary containing:
            - resume_id: Generated unique ID
            - user_id: User ID
            - resume_data: Parsed resume data
            - file_metadata: File information
            - status: Processing status

        Raises:
            FileProcessingError: When file cannot be processed
            AIProcessingError: When AI processing fails
            ValidationError: When data validation fails
            StorageError: When database operations fail
            ResumeProcessingError: For other processing errors
        """
        resume_id = str(uuid.uuid4())
        file_size = len(file_content)

        logger.info(
            f"Starting synchronous resume processing for user {user_id}, resume {resume_id}"
        )

        try:
            # Step 1: Extract text from file
            text_content = await self._extract_text_from_file(file_content, filename)
            logger.info(f"Extracted {len(text_content)} characters from {filename}")

            # Step 2: Process with AI agent (with timeout and retry)
            resume_data = await self._process_with_ai_agent(text_content, resume_id)
            logger.info(f"AI agent processing completed for resume {resume_id}")

            # Step 3: Validate parsed data
            parsed_resume = self._validate_resume_data(resume_data, resume_id)
            logger.info(f"Resume data validation successful for resume {resume_id}")

            # Step 4: Store in PostgreSQL
            await self._store_resume_data(
                resume_id=resume_id,
                user_id=user_id,
                parsed_resume=parsed_resume,
                filename=filename,
                content_type=content_type,
                file_size=file_size,
            )
            logger.info(f"Resume data stored in PostgreSQL for resume {resume_id}")

            # Step 5: Update user profile in PostgreSQL
            await self._update_user_profile(user_id, resume_id)
            logger.info(f"User profile updated for user {user_id}")

            # Return successful result
            result = {
                "resume_id": resume_id,
                "user_id": user_id,
                "resume_data": parsed_resume.model_dump(),
                "file_metadata": {
                    "filename": filename,
                    "content_type": content_type,
                    "size": file_size,
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                },
                "status": "completed",
            }

            logger.info(f"Resume processing completed successfully for user {user_id}")
            return result

        except Exception as e:
            logger.error(f"Resume processing failed for user {user_id}: {str(e)}")
            raise

    async def _extract_text_from_file(self, file_content: bytes, filename: str) -> str:
        """Extract text content from file using unstructured library.

        Args:
            file_content: Raw file content as bytes
            filename: Original filename for context

        Returns:
            Extracted text content

        Raises:
            FileProcessingError: When text extraction fails
        """
        try:
            content_stream = BytesIO(file_content)

            # Process document using unstructured
            elements = await asyncio.to_thread(partition, file=content_stream)
            text_elements = [str(element) for element in elements]
            text_content = "\\n".join(text_elements)

            if not text_content.strip():
                raise FileProcessingError(
                    f"No text content could be extracted from file: {filename}"
                )

            return text_content

        except FileProcessingError:
            raise
        except Exception as e:
            raise FileProcessingError(
                f"Failed to extract text from file {filename}: {str(e)}"
            )

    async def _process_with_ai_agent(
        self, text_content: str, resume_id: str
    ) -> Dict[str, Any]:
        """Process text content with AI agent using timeout and retry logic.

        Args:
            text_content: Extracted text content
            resume_id: Resume ID for logging context

        Returns:
            Parsed resume data from AI agent

        Raises:
            AIProcessingError: When AI processing fails after retries
        """
        for attempt in range(self.max_retries):
            try:
                logger.info(
                    f"AI processing attempt {attempt + 1}/{self.max_retries} for resume {resume_id}"
                )

                # Run AI agent with timeout
                result = await asyncio.wait_for(
                    Runner.run(resume_agent, text_content), timeout=self.timeout_seconds
                )

                if not result or not hasattr(result, "final_output"):
                    raise AIProcessingError("AI agent returned empty or invalid result")

                return result.final_output

            except asyncio.TimeoutError:
                logger.warning(
                    f"AI processing timeout (attempt {attempt + 1}) for resume {resume_id}"
                )
                if attempt == self.max_retries - 1:
                    raise AIProcessingError(
                        f"AI processing timed out after {self.timeout_seconds} seconds (max {self.max_retries} attempts)"
                    )

            except Exception as e:
                error_str = str(e).lower()

                # Check if this is a rate limit or temporary API error
                if any(
                    term in error_str
                    for term in ["rate limit", "timeout", "503", "502", "429"]
                ):
                    logger.warning(
                        f"Temporary AI processing error (attempt {attempt + 1}) for resume {resume_id}: {e}"
                    )
                    if attempt == self.max_retries - 1:
                        raise AIProcessingError(
                            f"AI processing temporarily unavailable after {self.max_retries} attempts: {str(e)}"
                        )
                else:
                    # Permanent error, don't retry
                    logger.error(
                        f"Permanent AI processing error for resume {resume_id}: {e}"
                    )
                    raise AIProcessingError(f"AI processing failed: {str(e)}")

            # Exponential backoff before retry
            if attempt < self.max_retries - 1:
                delay = self.base_delay * (2**attempt)
                logger.info(f"Waiting {delay}s before retry for resume {resume_id}")
                await asyncio.sleep(delay)

        # This should not be reached due to the exception handling above
        raise AIProcessingError("Unexpected error in AI processing retry logic")

    def _validate_resume_data(
        self, resume_data: Dict[str, Any], resume_id: str
    ) -> Resume:
        """Validate parsed resume data using Pydantic model.

        Args:
            resume_data: Raw resume data from AI agent
            resume_id: Resume ID for logging context

        Returns:
            Validated Resume model instance

        Raises:
            ValidationError: When data validation fails
        """
        try:
            return Resume.model_validate(resume_data)
        except Exception as e:
            logger.error(f"Resume validation failed for resume {resume_id}: {str(e)}")
            raise ValidationError(f"Parsed resume data validation failed: {str(e)}")

    async def _store_resume_data(
        self,
        resume_id: str,
        user_id: str,
        parsed_resume: Resume,
        filename: str,
        content_type: Optional[str],
        file_size: int,
    ) -> None:
        """Store resume data in PostgreSQL with JSONB.

        Args:
            resume_id: Unique resume identifier
            user_id: User identifier
            parsed_resume: Validated resume data
            filename: Original filename
            content_type: MIME type
            file_size: File size in bytes

        Raises:
            StorageError: When PostgreSQL storage fails
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor() as cursor:
                        # Prepare file metadata
                        file_metadata = {
                            "filename": filename,
                            "content_type": content_type,
                            "size": file_size,
                            "processed_at": datetime.now(timezone.utc).isoformat(),
                        }

                        # Insert resume document into PostgreSQL
                        await cursor.execute(
                            """
                            INSERT INTO resume_documents (
                                id, user_id, filename, content_type, file_size, 
                                status, source, parsed_data, file_metadata,
                                created_at, updated_at
                            ) VALUES (
                                %s::uuid, %s, %s, %s, %s, 
                                %s, %s, %s::jsonb, %s::jsonb,
                                %s, %s
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                parsed_data = EXCLUDED.parsed_data,
                                file_metadata = EXCLUDED.file_metadata,
                                status = EXCLUDED.status,
                                updated_at = EXCLUDED.updated_at
                            """,
                            (
                                resume_id,
                                user_id,
                                filename,
                                content_type,
                                file_size,
                                "parsed",
                                "upload",
                                json.dumps(parsed_resume.model_dump()),
                                json.dumps(file_metadata),
                                datetime.now(timezone.utc),
                                datetime.now(timezone.utc),
                            ),
                        )

        except Exception as e:
            logger.error(f"PostgreSQL storage failed for resume {resume_id}: {str(e)}")
            raise StorageError(f"Failed to store resume data: {str(e)}")

    async def _update_user_profile(self, user_id: str, resume_id: str) -> None:
        """Update user profile in PostgreSQL with resume ID.

        Args:
            user_id: User identifier
            resume_id: Resume identifier to associate with user

        Raises:
            StorageError: When PostgreSQL update fails (logged but not raised)
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor() as cursor:
                        # Check if user profile exists
                        await cursor.execute(
                            "SELECT user_id FROM user_profiles WHERE user_id = %s",
                            (user_id,),
                        )
                        profile_exists = await cursor.fetchone()

                        if not profile_exists:
                            # Create new profile
                            await cursor.execute(
                                "INSERT INTO user_profiles (user_id, resume_id) VALUES (%s, %s)",
                                (user_id, resume_id),
                            )
                            logger.info(
                                f"Created user profile for user {user_id} with resume {resume_id}"
                            )
                        else:
                            # Update existing profile
                            await cursor.execute(
                                "UPDATE user_profiles SET resume_id = %s WHERE user_id = %s",
                                (resume_id, user_id),
                            )
                            logger.info(
                                f"Updated user profile for user {user_id} with resume {resume_id}"
                            )

        except Exception as e:
            # Log error but don't fail the entire operation for profile update issues
            logger.warning(f"User profile update failed for user {user_id}: {str(e)}")
            # Could optionally raise StorageError here if profile updates are critical


# Convenience function for easy import and usage
async def process_resume_synchronously(
    file_content: bytes, filename: str, user_id: str, content_type: Optional[str] = None
) -> Dict[str, Any]:
    """Process a resume file synchronously.

    This is a convenience function that creates a ResumeProcessorService instance
    and processes the resume. Use this for simple one-off processing.

    Args:
        file_content: Raw file content as bytes
        filename: Original filename
        user_id: User ID for ownership
        content_type: MIME type of the file (optional)

    Returns:
        Processing result dictionary

    Raises:
        ResumeProcessingError: For any processing failures
    """
    processor = ResumeProcessorService()
    return await processor.process_resume_sync(
        file_content, filename, user_id, content_type
    )
