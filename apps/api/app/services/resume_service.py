"""Resume service layer for ATSPro API resume operations."""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..database.connections import get_arango_client, get_postgres_connection
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
        """Create a placeholder resume document in ArangoDB.

        Args:
            resume_id: Unique resume identifier
            user_id: User who owns the resume
            task_id: Associated parsing task ID

        Returns:
            Resume document ID
        """
        try:
            arango_db = get_arango_client()
            resume_collection = arango_db.collection("resumes")

            # Create placeholder document
            placeholder_doc = {
                "_key": resume_id,
                "user_id": user_id,
                "task_id": task_id,
                "status": "parsing",
                "created_at": datetime.utcnow().isoformat(),
                "resume_data": None,
                "file_metadata": None,
            }

            result = resume_collection.insert(placeholder_doc)
            logger.info(f"Created resume placeholder {resume_id} for user {user_id}")
            return result["_key"]

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
            arango_db = get_arango_client()
            resume_collection = arango_db.collection("resumes")

            doc = resume_collection.get(resume_id)
            if not doc:
                return None

            # Verify user ownership if user_id provided
            if user_id and doc.get("user_id") != user_id:
                logger.warning(
                    f"User {user_id} attempted to access resume {resume_id} owned by {doc.get('user_id')}"
                )
                return None

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
            arango_db = get_arango_client()
            resume_collection = arango_db.collection("resumes")

            # Prepare update data
            update_data = {
                "resume_data": resume_data,
                "status": "parsed",
                "parsed_at": datetime.utcnow().isoformat(),
            }

            if file_metadata:
                update_data["file_metadata"] = file_metadata

            # Update the document
            resume_collection.update(resume_id, update_data)
            logger.info(f"Updated resume data for {resume_id}")
            return True

        except Exception as e:
            logger.error(f"Error updating resume {resume_id}: {str(e)}")
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
            arango_db = get_arango_client()
            resume_collection = arango_db.collection("resumes")

            update_data = {
                "status": status,
                "updated_at": datetime.utcnow().isoformat(),
            }

            if error_message:
                update_data["error_message"] = error_message

            resume_collection.update(resume_id, update_data)
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
            arango_db = get_arango_client()

            # Build AQL query
            bind_vars = {
                "user_id": user_id,
                "limit": limit,
                "offset": offset,
            }

            aql_query = """
                FOR resume IN resumes
                    FILTER resume.user_id == @user_id
            """

            if status:
                aql_query += " FILTER resume.status == @status"
                bind_vars["status"] = status

            aql_query += """
                    SORT resume.created_at DESC
                    LIMIT @offset, @limit
                    RETURN resume
            """

            cursor = arango_db.aql.execute(aql_query, bind_vars=bind_vars)
            resumes = list(cursor)

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
            arango_db = get_arango_client()
            resume_collection = arango_db.collection("resumes")

            # Check ownership if user_id provided
            if user_id:
                doc = resume_collection.get(resume_id)
                if not doc or doc.get("user_id") != user_id:
                    logger.warning(
                        f"User {user_id} attempted to delete resume {resume_id} without permission"
                    )
                    return False

            # Delete the document
            resume_collection.delete(resume_id)
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
            arango_db = get_arango_client()

            # AQL query for full-text search
            aql_query = """
                FOR resume IN resumes
                    FILTER resume.user_id == @user_id
                    FILTER resume.status == "parsed"
                    FILTER (
                        CONTAINS(LOWER(CONCAT_SEPARATOR(" ", 
                            resume.resume_data.contact_info.full_name,
                            resume.resume_data.summary,
                            resume.resume_data.skills
                        )), LOWER(@search_term)) OR
                        (
                            FOR exp IN resume.resume_data.work_experience
                                FILTER CONTAINS(LOWER(CONCAT_SEPARATOR(" ",
                                    exp.company,
                                    exp.position,
                                    exp.description,
                                    exp.skills
                                )), LOWER(@search_term))
                                LIMIT 1
                                RETURN 1
                        )[0] == 1 OR
                        (
                            FOR edu IN resume.resume_data.education
                                FILTER CONTAINS(LOWER(CONCAT_SEPARATOR(" ",
                                    edu.institution,
                                    edu.degree,
                                    edu.field_of_study
                                )), LOWER(@search_term))
                                LIMIT 1
                                RETURN 1
                        )[0] == 1
                    )
                    SORT resume.created_at DESC
                    LIMIT @limit
                    RETURN resume
            """

            bind_vars = {
                "user_id": user_id,
                "search_term": search_term,
                "limit": limit,
            }

            cursor = arango_db.aql.execute(aql_query, bind_vars=bind_vars)
            results = list(cursor)

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
            arango_db = get_arango_client()

            # AQL query for statistics
            aql_query = """
                FOR resume IN resumes
                    FILTER resume.user_id == @user_id
                    COLLECT status = resume.status WITH COUNT INTO count
                    RETURN { status: status, count: count }
            """

            cursor = arango_db.aql.execute(aql_query, bind_vars={"user_id": user_id})
            status_counts = list(cursor)

            # Process results
            stats = {
                "total": 0,
                "by_status": {},
            }

            for item in status_counts:
                status = item["status"]
                count = item["count"]
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
