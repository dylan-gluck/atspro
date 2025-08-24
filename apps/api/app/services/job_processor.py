"""Synchronous job processing service for ATSPro API."""

import asyncio
import base64
import logging
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from agents import Runner

from ..lib.agent import job_agent
from ..schema.job import Job
from ..services.job_service import JobService

logger = logging.getLogger(__name__)


class CircuitBreakerException(Exception):
    """Exception raised when circuit breaker is open."""

    pass


class JobProcessorService:
    """Synchronous job processing service with circuit breaker pattern."""

    def __init__(self):
        """Initialize job processor service."""
        self._job_service: Optional[JobService] = None
        self._initialized = False

        # Circuit breaker state per domain
        self._circuit_breaker_state: Dict[str, Dict[str, Any]] = {}

        # Circuit breaker configuration
        self.failure_threshold = 5  # Number of failures before opening circuit
        self.recovery_timeout = 300  # 5 minutes before trying again
        self.partial_failure_threshold = 3  # Partial failures before degraded mode

        # Blocked domains (permanent failures)
        self.blocked_domains: set[str] = set()

        # HTTP client configuration
        self.http_timeout = 30.0  # 30 second timeout
        self.max_redirects = 10
        self.max_content_size = 10 * 1024 * 1024  # 10MB limit

    async def _ensure_initialized(self) -> None:
        """Ensure the service is properly initialized."""
        if self._initialized:
            return

        self._job_service = JobService()
        self._initialized = True

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL for circuit breaker tracking."""
        try:
            parsed = urlparse(url)
            return parsed.netloc.lower()
        except Exception:
            return "unknown"

    def _is_circuit_open(self, domain: str) -> bool:
        """Check if circuit breaker is open for a domain."""
        if domain in self.blocked_domains:
            return True

        state = self._circuit_breaker_state.get(domain)
        if not state:
            return False

        # Check if we're in open state and recovery timeout has passed
        if state.get("state") == "open":
            if datetime.utcnow() > state.get("recovery_time", datetime.utcnow()):
                # Try to move to half-open state
                state["state"] = "half_open"
                state["failure_count"] = 0
                logger.info(f"Circuit breaker for {domain} moved to half-open state")
                return False
            return True

        return False

    def _record_success(self, domain: str) -> None:
        """Record successful operation for a domain."""
        if domain in self._circuit_breaker_state:
            # Reset circuit breaker on success
            del self._circuit_breaker_state[domain]
            logger.debug(f"Circuit breaker for {domain} reset after success")

    def _record_failure(self, domain: str, permanent: bool = False) -> None:
        """Record failed operation for a domain."""
        if permanent:
            self.blocked_domains.add(domain)
            logger.warning(
                f"Domain {domain} permanently blocked due to repeated failures"
            )
            return

        state = self._circuit_breaker_state.get(
            domain, {"failure_count": 0, "state": "closed", "last_failure": None}
        )

        state["failure_count"] += 1
        state["last_failure"] = datetime.utcnow()

        # Open circuit if failure threshold exceeded
        if state["failure_count"] >= self.failure_threshold:
            state["state"] = "open"
            state["recovery_time"] = datetime.utcnow() + timedelta(
                seconds=self.recovery_timeout
            )
            logger.warning(
                f"Circuit breaker for {domain} opened after {state['failure_count']} failures"
            )

        self._circuit_breaker_state[domain] = state

    def _validate_url(self, url: str) -> None:
        """Validate URL format and accessibility.

        Args:
            url: URL to validate

        Raises:
            ValueError: If URL is invalid
            CircuitBreakerException: If domain is blocked
        """
        if not url or not isinstance(url, str):
            raise ValueError("URL must be a non-empty string")

        # Basic URL format validation
        if not url.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")

        try:
            parsed = urlparse(url)
            if not parsed.netloc:
                raise ValueError("URL must contain a valid domain")
        except Exception as e:
            raise ValueError(f"Invalid URL format: {e}")

        # Check circuit breaker
        domain = self._get_domain(url)
        if self._is_circuit_open(domain):
            raise CircuitBreakerException(
                f"Domain {domain} is temporarily blocked due to repeated failures"
            )

    async def _fetch_html_content(self, url: str) -> str:
        """Fetch HTML content from URL with proper error handling.

        Args:
            url: URL to fetch

        Returns:
            HTML content as string

        Raises:
            Exception: If fetching fails
        """
        domain = self._get_domain(url)

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(self.http_timeout),
            follow_redirects=True,
            limits=httpx.Limits(max_redirects=self.max_redirects),
        ) as client:
            try:
                logger.info(f"Fetching HTML from: {url}")
                response = await client.get(url)
                response.raise_for_status()

                # Check content size
                content_length = len(response.content)
                if content_length > self.max_content_size:
                    raise ValueError(
                        f"Content too large: {content_length} bytes (max: {self.max_content_size})"
                    )

                html_content = response.text
                self._record_success(domain)
                logger.debug(
                    f"Successfully fetched {len(html_content)} characters from {url}"
                )
                return html_content

            except httpx.TimeoutException:
                error_msg = f"Timeout fetching URL {url}"
                logger.error(error_msg)
                self._record_failure(domain)
                raise Exception(error_msg)

            except httpx.HTTPStatusError as e:
                error_msg = f"HTTP error {e.response.status_code} fetching URL {url}"
                logger.error(error_msg)

                # Permanent failure for client errors (4xx), temporary for server errors (5xx)
                permanent = 400 <= e.response.status_code < 500
                self._record_failure(domain, permanent=permanent)
                raise Exception(error_msg)

            except Exception as e:
                error_msg = f"Failed to fetch URL {url}: {str(e)}"
                logger.error(error_msg)

                # Most network errors are temporary
                permanent = "ssl" in str(e).lower() or "certificate" in str(e).lower()
                self._record_failure(domain, permanent=permanent)
                raise Exception(error_msg)

    async def _parse_job_content(
        self, content: str, source_info: str = ""
    ) -> Dict[str, Any]:
        """Parse job content using AI agent.

        Args:
            content: HTML content or document text to parse
            source_info: Additional source information for logging

        Returns:
            Parsed and validated job data

        Raises:
            Exception: If parsing or validation fails
        """
        try:
            logger.info(
                f"Parsing job content with AI agent{' for ' + source_info if source_info else ''}"
            )

            # Use OpenAI agent to extract job information
            result = await Runner.run(job_agent, content)
            job_data = result.final_output

            # Validate the parsed data using Pydantic model
            parsed_job = Job.model_validate(job_data)
            validated_job_data = parsed_job.model_dump()

            logger.info(
                f"Successfully parsed job: {validated_job_data.get('title', 'Unknown')} at {validated_job_data.get('company', 'Unknown')}"
            )
            return validated_job_data

        except Exception as e:
            error_msg = f"Failed to parse job content: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            raise Exception(error_msg)

    async def _store_job_data(
        self, job_id: str, job_data: Dict[str, Any], user_id: str
    ) -> str:
        """Store parsed job data in database.

        Args:
            job_id: Job document ID
            job_data: Parsed job information
            user_id: User ID for ownership

        Returns:
            Job document ID

        Raises:
            Exception: If storage fails
        """
        try:
            await self._ensure_initialized()

            # Generate a task ID for consistency with existing patterns
            task_id = str(uuid4())

            await self._job_service.store_job_result(
                task_id=task_id,
                job_id=job_id,
                job_data=job_data,
                user_id=user_id,
            )

            logger.info(f"Successfully stored job data for job {job_id}")
            return job_id

        except Exception as e:
            error_msg = f"Failed to store job data: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def process_job_url_sync(self, url: str, user_id: str) -> Dict[str, Any]:
        """Process job URL synchronously.

        Args:
            url: URL to parse for job information
            user_id: ID of user requesting the parsing

        Returns:
            Dictionary containing job_id, parsed job data, and status

        Raises:
            ValueError: If URL is invalid
            CircuitBreakerException: If domain is blocked
            Exception: For other processing failures
        """
        job_id = str(uuid4())

        try:
            # Validate URL and check circuit breaker
            self._validate_url(url)

            logger.info(f"Starting synchronous job processing for URL: {url}")

            # Ensure service is initialized
            await self._ensure_initialized()

            # Create placeholder job document
            await self._job_service._create_job_placeholder(job_id, user_id, url)

            # Fetch HTML content
            html_content = await self._fetch_html_content(url)

            # Parse job information using AI agent
            job_data = await self._parse_job_content(html_content, f"URL: {url}")

            # Add source URL to parsed data
            job_data["source_url"] = url

            # Store the parsed job data
            stored_job_id = await self._store_job_data(job_id, job_data, user_id)

            result = {
                "job_id": stored_job_id,
                "url": url,
                "job_data": job_data,
                "status": "completed",
            }

            logger.info(f"Successfully completed synchronous job processing for {url}")
            return result

        except (ValueError, CircuitBreakerException):
            # Update job status for validation errors
            if self._job_service:
                try:
                    await self._job_service.update_job_status(job_id, "failed", str(e))
                except Exception:
                    pass  # Don't fail on status update errors
            raise

        except Exception as e:
            error_msg = f"Failed to process job URL {url}: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())

            # Update job status to failed
            if self._job_service:
                try:
                    await self._job_service.update_job_status(
                        job_id, "failed", error_msg
                    )
                except Exception as inner_e:
                    logger.error(f"Failed to update job status: {inner_e}")

            raise Exception(error_msg)

    async def process_job_document_sync(
        self, file_content: bytes, filename: str, user_id: str
    ) -> Dict[str, Any]:
        """Process job document synchronously.

        Args:
            file_content: File content as bytes
            filename: Original filename
            user_id: ID of user requesting the parsing

        Returns:
            Dictionary containing job_id, parsed job data, and status

        Raises:
            ValueError: If file data is invalid
            Exception: For processing failures
        """
        job_id = str(uuid4())

        try:
            # Validate file content
            if not file_content:
                raise ValueError("Empty file content")

            # Validate file size (10MB limit)
            max_size = 10 * 1024 * 1024  # 10MB
            if len(file_content) > max_size:
                raise ValueError(
                    f"File too large. Maximum size: {max_size / (1024 * 1024):.1f}MB"
                )

            logger.info(
                f"Starting synchronous job document processing for file: {filename}"
            )

            # Ensure service is initialized
            await self._ensure_initialized()

            # Create placeholder job document
            await self._job_service._create_job_document_placeholder(
                job_id, user_id, filename
            )

            # Convert file content to text (basic implementation)
            # TODO: Add proper document parsing for PDF, DOCX, etc.
            try:
                content = file_content.decode("utf-8")
            except UnicodeDecodeError:
                # Try with common encodings
                for encoding in ["latin-1", "cp1252", "iso-8859-1"]:
                    try:
                        content = file_content.decode(encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    raise ValueError(
                        "Could not decode file content. Please ensure it's a text-based document."
                    )

            # Parse job information using AI agent
            job_data = await self._parse_job_content(content, f"Document: {filename}")

            # Add source information to parsed data
            job_data["source_filename"] = filename
            job_data["source_type"] = "document"

            # Store the parsed job data
            stored_job_id = await self._store_job_data(job_id, job_data, user_id)

            result = {
                "job_id": stored_job_id,
                "filename": filename,
                "job_data": job_data,
                "status": "completed",
            }

            logger.info(
                f"Successfully completed synchronous job document processing for {filename}"
            )
            return result

        except ValueError:
            # Update job status for validation errors
            if self._job_service:
                try:
                    await self._job_service.update_job_status(job_id, "failed", str(e))
                except Exception:
                    pass  # Don't fail on status update errors
            raise

        except Exception as e:
            error_msg = f"Failed to process job document {filename}: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())

            # Update job status to failed
            if self._job_service:
                try:
                    await self._job_service.update_job_status(
                        job_id, "failed", error_msg
                    )
                except Exception as inner_e:
                    logger.error(f"Failed to update job status: {inner_e}")

            raise Exception(error_msg)

    def get_circuit_breaker_status(self) -> Dict[str, Any]:
        """Get current circuit breaker status for all domains.

        Returns:
            Dictionary with circuit breaker status information
        """
        return {
            "blocked_domains": list(self.blocked_domains),
            "circuit_states": {
                domain: {
                    "state": state.get("state", "closed"),
                    "failure_count": state.get("failure_count", 0),
                    "last_failure": state.get("last_failure").isoformat()
                    if state.get("last_failure")
                    else None,
                    "recovery_time": state.get("recovery_time").isoformat()
                    if state.get("recovery_time")
                    else None,
                }
                for domain, state in self._circuit_breaker_state.items()
            },
            "configuration": {
                "failure_threshold": self.failure_threshold,
                "recovery_timeout": self.recovery_timeout,
                "http_timeout": self.http_timeout,
            },
        }

    def reset_circuit_breaker(self, domain: str) -> bool:
        """Reset circuit breaker for a specific domain.

        Args:
            domain: Domain to reset circuit breaker for

        Returns:
            True if reset was successful, False if domain wasn't found
        """
        if domain in self._circuit_breaker_state:
            del self._circuit_breaker_state[domain]
            logger.info(f"Reset circuit breaker for domain: {domain}")
            return True

        if domain in self.blocked_domains:
            self.blocked_domains.remove(domain)
            logger.info(f"Removed domain from blocked list: {domain}")
            return True

        return False
