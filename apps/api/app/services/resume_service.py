"""Resume service layer for ATSPro API resume operations."""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ..database.connections import get_postgres_pool
from ..schema.resume import Resume

logger = logging.getLogger(__name__)


class ResumeService:
    """Service layer for resume-specific operations and data management."""

    def __init__(self):
        """Initialize resume service."""
        pass

    async def create_resume_placeholder(
        self, resume_id: str, user_id: str, task_id: str
    ) -> str:
        """Create a placeholder resume document in PostgreSQL.

        Args:
            resume_id: Unique resume identifier
            user_id: User who owns the resume
            task_id: Associated parsing task ID

        Returns:
            Resume document ID
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor() as cursor:
                        # Create placeholder document
                        await cursor.execute(
                            """
                            INSERT INTO resume_documents (
                                id, user_id, task_id, status, filename,
                                parsed_data, file_metadata,
                                created_at, updated_at
                            ) VALUES (
                                %s::uuid, %s, %s, %s, %s,
                                %s::jsonb, %s::jsonb,
                                %s, %s
                            )
                            RETURNING id
                            """,
                            (
                                resume_id,
                                user_id,
                                task_id,
                                "parsing",
                                "pending",  # Default filename
                                json.dumps({}),
                                json.dumps({}),
                                datetime.now(timezone.utc),
                                datetime.now(timezone.utc),
                            ),
                        )
                        result = await cursor.fetchone()
                        logger.info(f"Created resume placeholder {resume_id} for user {user_id}")
                        return str(result[0])

        except Exception as e:
            logger.error(f"Error creating resume placeholder: {str(e)}")
            raise

    async def get_resume(
        self, resume_id: str, user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get resume by ID with optional user verification.

        Args:
            resume_id: Resume identifier
            user_id: Optional user ID for ownership verification

        Returns:
            Resume document or None if not found
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.cursor() as cursor:
                    query = """
                        SELECT id, user_id, filename, content_type, file_size,
                               status, source, parsed_data, file_metadata,
                               task_id, error_message, created_at, updated_at
                        FROM resume_documents
                        WHERE id = %s::uuid
                    """
                    
                    params = [resume_id]
                    
                    # Add user verification if provided
                    if user_id:
                        query += " AND user_id = %s"
                        params.append(user_id)
                    
                    await cursor.execute(query, params)
                    row = await cursor.fetchone()
                    
                    if not row:
                        if user_id:
                            logger.warning(
                                f"User {user_id} attempted to access resume {resume_id} without permission"
                            )
                        return None
                    
                    # Convert row to dictionary
                    doc = {
                        "id": str(row[0]),
                        "user_id": row[1],
                        "filename": row[2],
                        "content_type": row[3],
                        "file_size": row[4],
                        "status": row[5],
                        "source": row[6],
                        "resume_data": row[7] if row[7] else {},
                        "file_metadata": row[8] if row[8] else {},
                        "task_id": row[9],
                        "error_message": row[10],
                        "created_at": row[11].isoformat() if row[11] else None,
                        "updated_at": row[12].isoformat() if row[12] else None,
                    }
                    
                    return doc

        except Exception as e:
            logger.error(f"Error retrieving resume {resume_id}: {str(e)}")
            return None

    async def update_resume_data(
        self,
        resume_id: str,
        resume_data: Dict[str, Any],
        file_metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Update resume with parsed data.

        Args:
            resume_id: Resume identifier
            resume_data: Parsed resume data
            file_metadata: Optional file metadata

        Returns:
            True if update successful, False otherwise
        """
        try:
            logger.info(f"=== RESUME UPDATE: {resume_id} ===")
            
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor() as cursor:
                        # Check if document exists
                        logger.info(f"Checking if document exists...")
                        await cursor.execute(
                            "SELECT id FROM resume_documents WHERE id = %s::uuid",
                            (resume_id,)
                        )
                        existing = await cursor.fetchone()
                        
                        if not existing:
                            logger.error(f"Resume {resume_id} not found")
                            return False
                        
                        # Prepare update query
                        logger.info(f"Preparing update data...")
                        if file_metadata:
                            await cursor.execute(
                                """
                                UPDATE resume_documents 
                                SET parsed_data = %s::jsonb,
                                    file_metadata = %s::jsonb,
                                    status = %s,
                                    updated_at = %s
                                WHERE id = %s::uuid
                                """,
                                (
                                    json.dumps(resume_data),
                                    json.dumps(file_metadata),
                                    "manual",
                                    datetime.now(timezone.utc),
                                    resume_id,
                                )
                            )
                        else:
                            await cursor.execute(
                                """
                                UPDATE resume_documents 
                                SET parsed_data = %s::jsonb,
                                    status = %s,
                                    updated_at = %s
                                WHERE id = %s::uuid
                                """,
                                (
                                    json.dumps(resume_data),
                                    "manual",
                                    datetime.now(timezone.utc),
                                    resume_id,
                                )
                            )
                        
                        logger.info(f"Update completed")
                        logger.info(f"✅ Success")
                        return True

        except Exception as e:
            logger.error(f"❌ Update error: {str(e)}")
            return False

    async def update_resume_status(
        self, resume_id: str, status: str, error_message: Optional[str] = None
    ) -> bool:
        """Update resume status.

        Args:
            resume_id: Resume identifier
            status: New status (parsing, parsed, failed)
            error_message: Optional error message for failed status

        Returns:
            True if update successful, False otherwise
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor() as cursor:
                        if error_message:
                            await cursor.execute(
                                """
                                UPDATE resume_documents 
                                SET status = %s,
                                    error_message = %s,
                                    updated_at = %s
                                WHERE id = %s::uuid
                                """,
                                (status, error_message, datetime.now(timezone.utc), resume_id)
                            )
                        else:
                            await cursor.execute(
                                """
                                UPDATE resume_documents 
                                SET status = %s,
                                    updated_at = %s
                                WHERE id = %s::uuid
                                """,
                                (status, datetime.now(timezone.utc), resume_id)
                            )
                        
                        logger.info(f"Updated resume {resume_id} status to {status}")
                        return True

        except Exception as e:
            logger.error(f"Error updating resume status for {resume_id}: {str(e)}")
            return False

    async def get_user_resumes(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get resumes for a specific user.

        Args:
            user_id: User identifier
            status: Optional status filter
            limit: Maximum number of resumes to return
            offset: Number of resumes to skip

        Returns:
            List of resume documents
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.cursor() as cursor:
                    query = """
                        SELECT id, user_id, filename, content_type, file_size,
                               status, source, parsed_data, file_metadata,
                               task_id, error_message, created_at, updated_at
                        FROM resume_documents
                        WHERE user_id = %s
                    """
                    
                    params = [user_id]
                    
                    if status:
                        query += " AND status = %s"
                        params.append(status)
                    
                    query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
                    params.extend([limit, offset])
                    
                    await cursor.execute(query, params)
                    rows = await cursor.fetchall()
                    
                    resumes = []
                    for row in rows:
                        resumes.append({
                            "id": str(row[0]),
                            "user_id": row[1],
                            "filename": row[2],
                            "content_type": row[3],
                            "file_size": row[4],
                            "status": row[5],
                            "source": row[6],
                            "resume_data": row[7] if row[7] else {},
                            "file_metadata": row[8] if row[8] else {},
                            "task_id": row[9],
                            "error_message": row[10],
                            "created_at": row[11].isoformat() if row[11] else None,
                            "updated_at": row[12].isoformat() if row[12] else None,
                        })
                    
                    logger.info(f"Retrieved {len(resumes)} resumes for user {user_id}")
                    return resumes

        except Exception as e:
            logger.error(f"Error retrieving resumes for user {user_id}: {str(e)}")
            return []

    async def delete_resume(
        self, resume_id: str, user_id: Optional[str] = None
    ) -> bool:
        """Delete a resume document.

        Args:
            resume_id: Resume identifier
            user_id: Optional user ID for ownership verification

        Returns:
            True if deletion successful, False otherwise
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor() as cursor:
                        # Check ownership if user_id provided
                        if user_id:
                            await cursor.execute(
                                "SELECT user_id FROM resume_documents WHERE id = %s::uuid",
                                (resume_id,)
                            )
                            row = await cursor.fetchone()
                            if not row or row[0] != user_id:
                                logger.warning(
                                    f"User {user_id} attempted to delete resume {resume_id} without permission"
                                )
                                return False
                        
                        # Delete the document
                        await cursor.execute(
                            "DELETE FROM resume_documents WHERE id = %s::uuid",
                            (resume_id,)
                        )
                        
                        logger.info(f"Deleted resume {resume_id}")
                        return True

        except Exception as e:
            logger.error(f"Error deleting resume {resume_id}: {str(e)}")
            return False

    async def search_resumes(
        self, user_id: str, search_term: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Search resumes by content.

        Args:
            user_id: User identifier
            search_term: Search term to match against resume content
            limit: Maximum number of results

        Returns:
            List of matching resume documents
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.cursor() as cursor:
                    # PostgreSQL JSONB search query
                    query = """
                        SELECT id, user_id, filename, content_type, file_size,
                               status, source, parsed_data, file_metadata,
                               task_id, error_message, created_at, updated_at
                        FROM resume_documents
                        WHERE user_id = %s
                          AND status IN ('parsed', 'manual')
                          AND (
                            -- Search in contact info, summary, and skills
                            LOWER(parsed_data->>'summary') LIKE LOWER(%s) OR
                            LOWER(parsed_data->>'skills') LIKE LOWER(%s) OR
                            LOWER(parsed_data->'contact_info'->>'full_name') LIKE LOWER(%s) OR
                            -- Search in work experience array
                            EXISTS (
                                SELECT 1 FROM jsonb_array_elements(parsed_data->'work_experience') AS exp
                                WHERE LOWER(exp->>'company') LIKE LOWER(%s) OR
                                      LOWER(exp->>'position') LIKE LOWER(%s) OR
                                      LOWER(exp->>'description') LIKE LOWER(%s) OR
                                      LOWER(exp->>'skills') LIKE LOWER(%s)
                            ) OR
                            -- Search in education array
                            EXISTS (
                                SELECT 1 FROM jsonb_array_elements(parsed_data->'education') AS edu
                                WHERE LOWER(edu->>'institution') LIKE LOWER(%s) OR
                                      LOWER(edu->>'degree') LIKE LOWER(%s) OR
                                      LOWER(edu->>'field_of_study') LIKE LOWER(%s)
                            )
                          )
                        ORDER BY created_at DESC
                        LIMIT %s
                    """
                    
                    # Create search pattern with wildcards
                    search_pattern = f"%{search_term}%"
                    
                    await cursor.execute(query, (
                        user_id,
                        search_pattern, search_pattern, search_pattern,  # Basic fields
                        search_pattern, search_pattern, search_pattern, search_pattern,  # Work experience
                        search_pattern, search_pattern, search_pattern,  # Education
                        limit
                    ))
                    
                    rows = await cursor.fetchall()
                    
                    results = []
                    for row in rows:
                        results.append({
                            "id": str(row[0]),
                            "user_id": row[1],
                            "filename": row[2],
                            "content_type": row[3],
                            "file_size": row[4],
                            "status": row[5],
                            "source": row[6],
                            "resume_data": row[7] if row[7] else {},
                            "file_metadata": row[8] if row[8] else {},
                            "task_id": row[9],
                            "error_message": row[10],
                            "created_at": row[11].isoformat() if row[11] else None,
                            "updated_at": row[12].isoformat() if row[12] else None,
                        })
                    
                    logger.info(
                        f"Found {len(results)} resumes matching '{search_term}' for user {user_id}"
                    )
                    return results

        except Exception as e:
            logger.error(f"Error searching resumes for user {user_id}: {str(e)}")
            return []

    async def get_resume_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get resume statistics for a user.

        Args:
            user_id: User identifier

        Returns:
            Statistics dictionary
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.cursor() as cursor:
                    # PostgreSQL query for statistics
                    await cursor.execute(
                        """
                        SELECT status, COUNT(*) as count
                        FROM resume_documents
                        WHERE user_id = %s
                        GROUP BY status
                        """,
                        (user_id,)
                    )
                    
                    rows = await cursor.fetchall()
                    
                    # Process results
                    stats = {
                        "total": 0,
                        "by_status": {},
                    }
                    
                    for row in rows:
                        status = row[0]
                        count = row[1]
                        stats["by_status"][status] = count
                        stats["total"] += count
                    
                    logger.info(f"Generated statistics for user {user_id}: {stats}")
                    return stats

        except Exception as e:
            logger.error(f"Error generating statistics for user {user_id}: {str(e)}")
            return {"total": 0, "by_status": {}}

    async def validate_resume_data(
        self, resume_data: Dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """Validate resume data against schema.

        Args:
            resume_data: Resume data to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            Resume.model_validate(resume_data)
            return True, None
        except Exception as e:
            error_msg = f"Resume validation failed: {str(e)}"
            logger.warning(error_msg)
            return False, error_msg

    async def create_manual_resume(
        self, resume_id: str, user_id: str, resume_data: Dict[str, Any]
    ) -> str:
        """Create a resume document from manual entry.

        Args:
            resume_id: Unique resume identifier
            user_id: User who owns the resume
            resume_data: Structured resume data from manual entry

        Returns:
            Resume document ID
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor() as cursor:
                        # Create manual resume document
                        file_metadata = {
                            "source": "manual_entry",
                            "created_by": user_id,
                            "entry_method": "manual_form",
                        }
                        
                        await cursor.execute(
                            """
                            INSERT INTO resume_documents (
                                id, user_id, filename, status, source,
                                parsed_data, file_metadata,
                                created_at, updated_at
                            ) VALUES (
                                %s::uuid, %s, %s, %s, %s,
                                %s::jsonb, %s::jsonb,
                                %s, %s
                            )
                            RETURNING id
                            """,
                            (
                                resume_id,
                                user_id,
                                "manual_entry",
                                "manual",
                                "manual",
                                json.dumps(resume_data),
                                json.dumps(file_metadata),
                                datetime.now(timezone.utc),
                                datetime.now(timezone.utc),
                            ),
                        )
                        
                        result = await cursor.fetchone()
                        logger.info(f"Created manual resume {resume_id} for user {user_id}")
                        return str(result[0])

        except Exception as e:
            logger.error(f"Error creating manual resume: {str(e)}")
            raise

    async def search_by_skill(self, user_id: str, skill: str) -> List[Dict[str, Any]]:
        """Search resumes by skill using JSONB containment.
        
        Args:
            user_id: User identifier
            skill: Skill to search for
            
        Returns:
            List of resumes containing the skill
        """
        from ..database.connections import search_jsonb_field
        
        return await search_jsonb_field(
            table="resume_documents",
            field="parsed_data",
            search_value={"skills": [skill]},
            user_id=user_id
        )
    
    async def find_by_email(self, user_id: str, email: str) -> List[Dict[str, Any]]:
        """Find resumes by email address.
        
        Args:
            user_id: User identifier
            email: Email address to search for
            
        Returns:
            List of resumes with matching email
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.cursor() as cursor:
                    query = """
                        SELECT id, user_id, filename, content_type, file_size,
                               status, source, parsed_data, file_metadata,
                               task_id, error_message, created_at, updated_at
                        FROM resume_documents
                        WHERE user_id = %s
                        AND parsed_data->'contact_info'->>'email' = %s
                    """
                    
                    await cursor.execute(query, (user_id, email))
                    rows = await cursor.fetchall()
                    
                    resumes = []
                    for row in rows:
                        doc = {
                            "id": str(row[0]),
                            "user_id": row[1],
                            "filename": row[2],
                            "content_type": row[3],
                            "file_size": row[4],
                            "status": row[5],
                            "source": row[6],
                            "parsed_data": row[7] if row[7] else {},
                            "file_metadata": row[8] if row[8] else {},
                            "task_id": row[9],
                            "error_message": row[10],
                            "created_at": row[11].isoformat() if row[11] else None,
                            "updated_at": row[12].isoformat() if row[12] else None,
                        }
                        resumes.append(doc)
                    
                    return resumes
                    
        except Exception as e:
            logger.error(f"Error finding resumes by email: {str(e)}")
            return []
    
    async def find_by_multiple_skills(self, user_id: str, skills: List[str]) -> List[Dict[str, Any]]:
        """Find resumes containing multiple skills.
        
        Args:
            user_id: User identifier
            skills: List of skills to search for
            
        Returns:
            List of resumes containing all specified skills
        """
        try:
            postgres_pool = get_postgres_pool()
            async with postgres_pool.connection() as conn:
                async with conn.cursor() as cursor:
                    query = """
                        SELECT id, user_id, filename, content_type, file_size,
                               status, source, parsed_data, file_metadata,
                               task_id, error_message, created_at, updated_at
                        FROM resume_documents
                        WHERE user_id = %s
                        AND parsed_data->'skills' @> %s::jsonb
                    """
                    
                    await cursor.execute(query, (user_id, json.dumps(skills)))
                    rows = await cursor.fetchall()
                    
                    resumes = []
                    for row in rows:
                        doc = {
                            "id": str(row[0]),
                            "user_id": row[1],
                            "filename": row[2],
                            "content_type": row[3],
                            "file_size": row[4],
                            "status": row[5],
                            "source": row[6],
                            "parsed_data": row[7] if row[7] else {},
                            "file_metadata": row[8] if row[8] else {},
                            "task_id": row[9],
                            "error_message": row[10],
                            "created_at": row[11].isoformat() if row[11] else None,
                            "updated_at": row[12].isoformat() if row[12] else None,
                        }
                        resumes.append(doc)
                    
                    return resumes
                    
        except Exception as e:
            logger.error(f"Error finding resumes by multiple skills: {str(e)}")
            return []
