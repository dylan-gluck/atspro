"""Database connection management for PostgreSQL only."""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from ..config import settings

logger = logging.getLogger(__name__)

# Global connection instance
_postgres_pool: Optional[AsyncConnectionPool] = None


async def init_postgres() -> AsyncConnectionPool:
    """Initialize PostgreSQL connection pool with optimized settings."""
    global _postgres_pool

    if _postgres_pool is not None:
        return _postgres_pool

    try:
        _postgres_pool = AsyncConnectionPool(
            settings.database_url,
            min_size=5,  # Increased from 2
            max_size=20,  # Increased from 10
            timeout=30.0,
            max_idle=600.0,  # Increased from 300
            max_lifetime=3600.0,
            kwargs={
                "autocommit": False,
                "prepare_threshold": 5,  # Enable prepared statements
            },
        )

        # Wait for pool to initialize
        await _postgres_pool.wait()
        
        # Warm up the pool with minimum connections
        async with _postgres_pool.connection() as conn:
            await conn.execute("SELECT 1")
            
        logger.info("PostgreSQL connection pool initialized with optimized settings")
        return _postgres_pool

    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL pool: {e}")
        # Clean up global reference on failure
        _postgres_pool = None
        raise


async def init_databases():
    """Initialize database connections (PostgreSQL only)."""
    logger.info("Initializing PostgreSQL database connection...")
    await init_postgres()
    logger.info("PostgreSQL database connection initialized")


async def close_databases():
    """Close database connections."""
    global _postgres_pool

    logger.info("Closing PostgreSQL database connection...")

    # Close PostgreSQL pool
    if _postgres_pool is not None:
        await _postgres_pool.close()
        _postgres_pool = None
        logger.info("PostgreSQL pool closed")


def get_postgres_pool() -> AsyncConnectionPool:
    """Get the PostgreSQL connection pool."""
    if _postgres_pool is None:
        raise RuntimeError(
            "PostgreSQL pool not initialized. Call init_databases() first."
        )
    return _postgres_pool


@asynccontextmanager
async def get_postgres_connection():
    """Get a PostgreSQL connection from the pool."""
    pool = get_postgres_pool()
    async with pool.connection() as conn:
        yield conn


@asynccontextmanager
async def get_postgres_transaction():
    """Get a PostgreSQL transaction."""
    async with get_postgres_connection() as conn:
        async with conn.transaction():
            yield conn


# =======================
# DOCUMENT UTILITIES
# =======================

async def store_document(
    table: str,
    user_id: str,
    data: dict,
    metadata: dict = None,
    document_type: str = None
) -> str:
    """Store a document in PostgreSQL JSONB column.
    
    Args:
        table: Table name (e.g., 'resume_documents', 'job_documents')
        user_id: User ID who owns the document
        data: Document data to store as JSONB
        metadata: Optional metadata to store
        document_type: Optional document type for specialized tables
    
    Returns:
        Document ID (UUID) of the stored document
    """
    async with get_postgres_transaction() as conn:
        doc_id = str(uuid4())
        
        # Build the INSERT query based on table type
        if table == "resume_documents":
            query = """
                INSERT INTO resume_documents (
                    id, user_id, filename, content_type, file_size,
                    parsed_data, metadata
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
            """
            params = (
                doc_id,
                user_id,
                data.get("filename", "unknown"),
                data.get("content_type", "text/plain"),
                data.get("file_size", 0),
                json.dumps(data.get("parsed_data", data)),
                json.dumps(metadata or {})
            )
            
        elif table == "job_documents":
            query = """
                INSERT INTO job_documents (
                    id, user_id, company_name, job_title, location,
                    remote_type, job_url, is_active,
                    parsed_data, metadata
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
            """
            params = (
                doc_id,
                user_id,
                data.get("company_name", ""),
                data.get("job_title", ""),
                data.get("location", ""),
                data.get("remote_type"),
                data.get("job_url"),
                data.get("is_active", True),
                json.dumps(data.get("parsed_data", data)),
                json.dumps(metadata or {})
            )
            
        elif table == "optimization_results":
            query = """
                INSERT INTO optimization_results (
                    id, user_id, resume_id, job_id, optimization_type,
                    optimized_content, metadata
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
            """
            params = (
                doc_id,
                user_id,
                data.get("resume_id"),
                data.get("job_id"),
                data.get("optimization_type", "general"),
                json.dumps(data.get("optimized_content", data)),
                json.dumps(metadata or {})
            )
            
        else:
            # Generic document storage (for backward compatibility)
            query = f"""
                INSERT INTO {table} (
                    id, user_id, data, metadata, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s
                )
                RETURNING id
            """
            params = (
                doc_id,
                user_id,
                json.dumps(data),
                json.dumps(metadata or {}),
                datetime.utcnow()
            )
        
        cursor = conn.cursor()
        await cursor.execute(query, params)
        result = await cursor.fetchone()
        return str(result[0]) if result else doc_id


async def get_document(
    table: str,
    doc_id: str,
    user_id: str = None
) -> Optional[Dict[str, Any]]:
    """Retrieve a document from PostgreSQL.
    
    Args:
        table: Table name
        doc_id: Document ID (UUID)
        user_id: Optional user ID for access control
    
    Returns:
        Document data or None if not found
    """
    async with get_postgres_connection() as conn:
        conn.row_factory = dict_row
        cursor = conn.cursor()
        
        if user_id:
            query = f"SELECT * FROM {table} WHERE id = %s AND user_id = %s"
            params = (doc_id, user_id)
        else:
            query = f"SELECT * FROM {table} WHERE id = %s"
            params = (doc_id,)
        
        await cursor.execute(query, params)
        result = await cursor.fetchone()
        return result


async def update_document(
    table: str,
    doc_id: str,
    updates: dict,
    user_id: str = None
) -> bool:
    """Update a document in PostgreSQL.
    
    Args:
        table: Table name
        doc_id: Document ID
        updates: Dictionary of updates to apply
        user_id: Optional user ID for access control
    
    Returns:
        True if document was updated, False otherwise
    """
    async with get_postgres_transaction() as conn:
        # Build UPDATE query dynamically
        set_clauses = []
        params = []
        
        for key, value in updates.items():
            if key not in ["id", "user_id", "created_at"]:
                if isinstance(value, (dict, list)):
                    set_clauses.append(f"{key} = %s::jsonb")
                    params.append(json.dumps(value))
                else:
                    set_clauses.append(f"{key} = %s")
                    params.append(value)
        
        # Add updated_at
        set_clauses.append("updated_at = NOW()")
        
        # Add document ID to params
        params.append(doc_id)
        
        # Add user_id if provided
        where_clause = "WHERE id = %s"
        if user_id:
            where_clause += " AND user_id = %s"
            params.append(user_id)
        
        query = f"""
            UPDATE {table}
            SET {', '.join(set_clauses)}
            {where_clause}
            RETURNING id
        """
        
        cursor = conn.cursor()
        await cursor.execute(query, params)
        result = await cursor.fetchone()
        return result is not None


async def delete_document(
    table: str,
    doc_id: str,
    user_id: str = None
) -> bool:
    """Delete a document from PostgreSQL.
    
    Args:
        table: Table name
        doc_id: Document ID
        user_id: Optional user ID for access control
    
    Returns:
        True if document was deleted, False otherwise
    """
    async with get_postgres_transaction() as conn:
        if user_id:
            query = f"DELETE FROM {table} WHERE id = %s AND user_id = %s RETURNING id"
            params = (doc_id, user_id)
        else:
            query = f"DELETE FROM {table} WHERE id = %s RETURNING id"
            params = (doc_id,)
        
        cursor = conn.cursor()
        await cursor.execute(query, params)
        result = await cursor.fetchone()
        return result is not None


async def query_documents(
    table: str,
    filters: dict = None,
    user_id: str = None,
    limit: int = 100,
    offset: int = 0,
    order_by: str = "created_at DESC"
) -> List[Dict[str, Any]]:
    """Query documents from PostgreSQL with filters.
    
    Args:
        table: Table name
        filters: Dictionary of filters to apply
        user_id: Optional user ID for access control
        limit: Maximum number of results
        offset: Number of results to skip
        order_by: Order by clause
    
    Returns:
        List of matching documents
    """
    async with get_postgres_connection() as conn:
        where_clauses = []
        params = []
        
        # Add user_id filter if provided
        if user_id:
            where_clauses.append("user_id = %s")
            params.append(user_id)
        
        # Add additional filters
        if filters:
            for key, value in filters.items():
                if isinstance(value, dict):
                    # JSONB containment for nested queries
                    if "$contains" in value:
                        where_clauses.append(f"{key} @> %s::jsonb")
                        params.append(json.dumps(value["$contains"]))
                    elif "$exists" in value:
                        where_clauses.append(f"{key} ? %s")
                        params.append(value["$exists"])
                elif value is None:
                    where_clauses.append(f"{key} IS NULL")
                else:
                    where_clauses.append(f"{key} = %s")
                    params.append(value)
        
        # Build the query
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        
        query = f"""
            SELECT *
            FROM {table}
            {where_sql}
            ORDER BY {order_by}
            LIMIT %s OFFSET %s
        """
        
        params.extend([limit, offset])
        
        conn.row_factory = dict_row
        cursor = conn.cursor()
        await cursor.execute(query, params)
        results = await cursor.fetchall()
        return results


# =======================
# JSONB QUERY UTILITIES
# =======================

async def search_jsonb_field(
    table: str,
    field: str,
    search_value: Any,
    user_id: str = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Search within a JSONB field.
    
    Args:
        table: Table name
        field: JSONB field name
        search_value: Value to search for
        user_id: Optional user ID filter
        limit: Maximum results
    
    Returns:
        List of matching documents
    """
    async with get_postgres_connection() as conn:
        if isinstance(search_value, str):
            # Text search within JSONB
            where_clause = f"{field}::text ILIKE %s"
            search_param = f"%{search_value}%"
        elif isinstance(search_value, dict):
            # JSONB containment
            where_clause = f"{field} @> %s::jsonb"
            search_param = json.dumps(search_value)
        else:
            # Direct value search
            where_clause = f"{field} = %s::jsonb"
            search_param = json.dumps(search_value)
        
        if user_id:
            where_clause += " AND user_id = %s"
            params = (search_param, user_id, limit)
        else:
            params = (search_param, limit)
        
        query = f"""
            SELECT *
            FROM {table}
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT %s
        """
        
        conn.row_factory = dict_row
        cursor = conn.cursor()
        await cursor.execute(query, params)
        results = await cursor.fetchall()
        return results


# =======================
# HEALTH CHECK FUNCTIONS
# =======================

async def check_postgres_health() -> dict:
    """Check PostgreSQL connection health with detailed metrics."""
    try:
        if _postgres_pool is None:
            return {"status": "down", "error": "Pool not initialized"}

        async with get_postgres_connection() as conn:
            # Test basic connectivity
            await conn.execute("SELECT 1")
            
            # Get database statistics
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    SELECT 
                        pg_database_size(current_database()) as db_size,
                        (SELECT count(*) FROM pg_stat_activity) as active_connections,
                        (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections
                """)
                stats = await cursor.fetchone()

        pool_stats = _postgres_pool.get_stats()
        
        return {
            "status": "up",
            "pool_size": pool_stats.get("pool_size", 0),
            "pool_available": pool_stats.get("pool_available", 0),
            "pool_waiting": pool_stats.get("requests_waiting", 0),
            "db_size_mb": round(stats[0] / (1024 * 1024), 2) if stats else 0,
            "active_connections": stats[1] if stats else 0,
            "idle_connections": stats[2] if stats else 0,
        }
    except Exception as e:
        return {"status": "down", "error": str(e)}


async def check_database_health() -> dict:
    """Check database connection health (PostgreSQL only)."""
    postgres_health = await check_postgres_health()
    
    return {
        "status": postgres_health["status"],
        "database": "postgresql",
        "details": postgres_health,
    }


# =======================
# MIGRATION HELPERS
# =======================

async def migrate_collection_to_postgres(
    collection_name: str,
    table_name: str,
    transform_func=None
) -> int:
    """Helper to migrate data from ArangoDB collection format to PostgreSQL.
    
    This is a placeholder for migration logic if needed.
    
    Args:
        collection_name: Source collection name (for reference)
        table_name: Target PostgreSQL table
        transform_func: Optional function to transform documents
    
    Returns:
        Number of documents migrated
    """
    # This function would be used during migration from ArangoDB to PostgreSQL
    # Currently returns 0 as there's no migration happening
    logger.info(f"Migration helper called for {collection_name} -> {table_name}")
    return 0
