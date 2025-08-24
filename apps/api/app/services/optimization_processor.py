"""Synchronous optimization processor service for direct resume optimization."""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from ..lib.agent import optimize_agent
from ..schema.job import Job
from ..schema.resume import Resume

logger = logging.getLogger(__name__)


class OptimizationError(Exception):
    """Custom exception for optimization processor errors."""
    
    def __init__(self, message: str, error_type: str = "processing_error"):
        """Initialize optimization error.
        
        Args:
            message: Error description
            error_type: Type of error for categorization
        """
        super().__init__(message)
        self.error_type = error_type


class OptimizationProcessorService:
    """Synchronous service for processing resume optimizations without queues."""
    
    def __init__(self, arango_db):
        """Initialize optimization processor service.
        
        Args:
            arango_db: ArangoDB database instance
        """
        self.arango_db = arango_db
        self.timeout_seconds = 90  # 90-second timeout for complex documents
    
    async def optimize_resume_sync(
        self, 
        resume_id: str, 
        job_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """Synchronously optimize a resume for a specific job.
        
        This method performs the complete optimization process including:
        - Data fetching and validation
        - AI-powered optimization
        - Markdown formatting
        - Result storage
        
        Args:
            resume_id: Resume document ID in ArangoDB
            job_id: Job document ID in ArangoDB  
            user_id: User ID for authorization
            
        Returns:
            Dictionary containing optimization result with document_id and status
            
        Raises:
            OptimizationError: For all optimization-related failures
        """
        logger.info(f"Starting synchronous optimization for resume {resume_id}, job {job_id}")
        
        try:
            # Apply timeout to the entire optimization process
            result = await asyncio.wait_for(
                self._execute_optimization_process(resume_id, job_id, user_id),
                timeout=self.timeout_seconds
            )
            
            logger.info(f"Successfully completed optimization for resume {resume_id}")
            return result
            
        except asyncio.TimeoutError:
            logger.error(f"Optimization timed out after {self.timeout_seconds} seconds")
            raise OptimizationError(
                f"Optimization process timed out after {self.timeout_seconds} seconds",
                "timeout_error"
            )
        except OptimizationError:
            # Re-raise optimization errors without modification
            raise
        except Exception as e:
            logger.error(f"Unexpected error during optimization: {e}")
            raise OptimizationError(
                f"Optimization failed due to unexpected error: {str(e)}",
                "unexpected_error"
            )
    
    async def _execute_optimization_process(
        self,
        resume_id: str,
        job_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """Execute the complete optimization process.
        
        Args:
            resume_id: Resume document ID
            job_id: Job document ID
            user_id: User ID for authorization
            
        Returns:
            Optimization result dictionary
            
        Raises:
            OptimizationError: For processing failures
        """
        try:
            logger.debug("Fetching resume and job data")
            # Fetch resume and job data from ArangoDB
            resume_data = await self._get_resume_data(resume_id, user_id)
            job_data = await self._get_job_data(job_id, user_id)
            
            logger.debug("Validating and converting data to Pydantic models")
            # Convert to Pydantic models for validation
            resume = Resume(**resume_data)
            job = Job(**job_data)
            
            # Handle very large resumes by chunking if necessary
            if self._is_resume_oversized(resume):
                logger.info("Resume is oversized, processing with chunking strategy")
                optimized_resume = await self._optimize_with_chunking(resume, job)
            else:
                logger.debug("Processing resume with standard optimization")
                optimized_resume = await self._optimize_standard(resume, job)
            
            logger.debug("Formatting optimization result as markdown")
            # Convert optimized resume to markdown format
            markdown_content = self._format_resume_as_markdown(optimized_resume)
            
            logger.debug("Storing optimization result")
            # Store result in ArangoDB documents collection
            document_id = await self._store_optimization_result(
                user_id=user_id,
                resume_id=resume_id,
                job_id=job_id,
                markdown_content=markdown_content,
                optimized_resume=optimized_resume
            )
            
            return {
                "type": "optimization",
                "resume_id": resume_id,
                "job_id": job_id,
                "document_id": document_id,
                "status": "completed",
                "message": "Resume optimization completed successfully"
            }
            
        except OptimizationError:
            raise
        except Exception as e:
            logger.error(f"Error in optimization process: {e}")
            raise OptimizationError(f"Optimization process failed: {str(e)}")
    
    async def _get_resume_data(self, resume_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch resume data from ArangoDB with authorization check.
        
        Args:
            resume_id: Resume document ID
            user_id: User ID for authorization
            
        Returns:
            Resume data dictionary
            
        Raises:
            OptimizationError: If resume not found or unauthorized
        """
        try:
            resumes_collection = self.arango_db.collection("resumes")
            resume_doc = resumes_collection.get(resume_id)
            
            if not resume_doc:
                raise OptimizationError(
                    f"Resume {resume_id} not found",
                    "not_found_error"
                )
            
            # Verify ownership
            if resume_doc.get("user_id") != user_id:
                raise OptimizationError(
                    f"Unauthorized access to resume {resume_id}",
                    "authorization_error"
                )
            
            resume_data = resume_doc.get("data", {})
            if not resume_data:
                raise OptimizationError(
                    f"Resume {resume_id} contains no data",
                    "data_error"
                )
            
            return resume_data
            
        except OptimizationError:
            raise
        except Exception as e:
            logger.error(f"Error fetching resume data: {e}")
            raise OptimizationError(f"Failed to fetch resume data: {str(e)}", "data_fetch_error")
    
    async def _get_job_data(self, job_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch job data from ArangoDB with authorization check.
        
        Args:
            job_id: Job document ID
            user_id: User ID for authorization
            
        Returns:
            Job data dictionary
            
        Raises:
            OptimizationError: If job not found or unauthorized
        """
        try:
            jobs_collection = self.arango_db.collection("jobs")
            job_doc = jobs_collection.get(job_id)
            
            if not job_doc:
                raise OptimizationError(
                    f"Job {job_id} not found",
                    "not_found_error"
                )
            
            # Verify ownership
            if job_doc.get("user_id") != user_id:
                raise OptimizationError(
                    f"Unauthorized access to job {job_id}",
                    "authorization_error"
                )
            
            job_data = job_doc.get("data", {})
            if not job_data:
                raise OptimizationError(
                    f"Job {job_id} contains no data",
                    "data_error"
                )
            
            return job_data
            
        except OptimizationError:
            raise
        except Exception as e:
            logger.error(f"Error fetching job data: {e}")
            raise OptimizationError(f"Failed to fetch job data: {str(e)}", "data_fetch_error")
    
    def _is_resume_oversized(self, resume: Resume) -> bool:
        """Check if resume is too large and needs chunking.
        
        Args:
            resume: Resume object to check
            
        Returns:
            True if resume needs chunking, False otherwise
        """
        # Convert to JSON to estimate size
        resume_json = resume.model_dump_json()
        
        # Consider oversized if JSON is longer than 50KB
        # This accounts for OpenAI token limits and processing efficiency
        return len(resume_json.encode('utf-8')) > 50 * 1024
    
    async def _optimize_standard(self, resume: Resume, job: Job) -> Resume:
        """Perform standard optimization for normal-sized resumes.
        
        Args:
            resume: Resume to optimize
            job: Target job for optimization
            
        Returns:
            Optimized Resume object
            
        Raises:
            OptimizationError: For AI service failures
        """
        try:
            input_text = (
                f"Resume: {resume.model_dump_json()}\n\n"
                f"Job Description: {job.model_dump_json()}"
            )
            
            # Call the OpenAI agent for optimization
            optimized_resume = optimize_agent.run(input_text)
            
            if not isinstance(optimized_resume, Resume):
                raise OptimizationError(
                    "AI service returned invalid response format",
                    "ai_service_error"
                )
            
            return optimized_resume
            
        except Exception as e:
            logger.error(f"AI optimization failed: {e}")
            
            # Categorize AI service errors
            error_msg = str(e).lower()
            if "rate limit" in error_msg or "quota" in error_msg:
                raise OptimizationError(
                    f"AI service rate limited: {e}",
                    "rate_limit_error"
                )
            elif "authentication" in error_msg or "unauthorized" in error_msg:
                raise OptimizationError(
                    f"AI service authentication error: {e}",
                    "authentication_error"
                )
            else:
                raise OptimizationError(
                    f"AI optimization failed: {e}",
                    "ai_service_error"
                )
    
    async def _optimize_with_chunking(self, resume: Resume, job: Job) -> Resume:
        """Optimize very large resumes using a chunking strategy.
        
        For oversized resumes, this method breaks the resume into sections
        and optimizes each section separately, then recombines them.
        
        Args:
            resume: Large resume to optimize
            job: Target job for optimization
            
        Returns:
            Optimized Resume object
            
        Raises:
            OptimizationError: For processing failures
        """
        try:
            logger.info("Processing resume with chunking strategy")
            
            # Create a copy of the resume to modify
            optimized_data = resume.model_dump()
            
            # Optimize work experience in chunks
            if resume.work_experience and len(resume.work_experience) > 3:
                logger.debug("Chunking work experience for optimization")
                optimized_work_exp = []
                
                # Process work experience in groups of 3
                for i in range(0, len(resume.work_experience), 3):
                    chunk_exp = resume.work_experience[i:i+3]
                    
                    # Create a temporary resume with just this chunk
                    temp_resume_data = resume.model_dump()
                    temp_resume_data['work_experience'] = [exp.model_dump() for exp in chunk_exp]
                    temp_resume = Resume(**temp_resume_data)
                    
                    # Optimize this chunk
                    optimized_chunk = await self._optimize_standard(temp_resume, job)
                    optimized_work_exp.extend(optimized_chunk.work_experience)
                
                optimized_data['work_experience'] = [exp.model_dump() for exp in optimized_work_exp]
            
            # For other sections, optimize the summary and skills separately if they're large
            if resume.summary and len(resume.summary) > 1000:
                logger.debug("Optimizing summary separately due to size")
                temp_resume_data = {
                    'contact_info': resume.contact_info.model_dump(),
                    'summary': resume.summary,
                    'work_experience': [],
                    'education': [],
                    'skills': []
                }
                temp_resume = Resume(**temp_resume_data)
                optimized_temp = await self._optimize_standard(temp_resume, job)
                optimized_data['summary'] = optimized_temp.summary
            
            return Resume(**optimized_data)
            
        except Exception as e:
            logger.error(f"Chunked optimization failed: {e}")
            raise OptimizationError(f"Chunked optimization failed: {str(e)}")
    
    def _format_resume_as_markdown(self, resume: Resume) -> str:
        """Format optimized resume as markdown content.
        
        Args:
            resume: Optimized resume data
            
        Returns:
            Markdown formatted resume string
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
                    markdown_lines.append(f"**Technologies Used:** {', '.join(exp.skills)}")
                
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
        user_id: str,
        resume_id: str,
        job_id: str,
        markdown_content: str,
        optimized_resume: Resume
    ) -> str:
        """Store optimization result in ArangoDB documents collection.
        
        Args:
            user_id: User ID
            resume_id: Source resume ID
            job_id: Target job ID
            markdown_content: Formatted markdown content
            optimized_resume: Optimized resume data
            
        Returns:
            Document ID of stored result
            
        Raises:
            OptimizationError: If storage fails
        """
        try:
            # Create document for the optimization result
            result_doc = {
                "type": "optimization",
                "user_id": user_id,
                "resume_id": resume_id,
                "job_id": job_id,
                "content": markdown_content,
                "optimized_data": optimized_resume.model_dump(),
                "created_at": datetime.utcnow().isoformat(),
                "status": "completed"
            }
            
            # Store in documents collection
            documents_collection = self.arango_db.collection("documents")
            result = documents_collection.insert(result_doc)
            
            document_id = result["_key"]
            logger.info(f"Stored optimization result as document {document_id}")
            return document_id
            
        except Exception as e:
            logger.error(f"Error storing optimization result: {e}")
            raise OptimizationError(f"Failed to store optimization result: {str(e)}", "storage_error")