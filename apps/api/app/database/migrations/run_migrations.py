#!/usr/bin/env python3
"""
Migration runner script for ATSPro PostgreSQL migrations
Executes SQL migration files in sequence
"""

import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from pathlib import Path
from typing import List, Tuple
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_connection():
    """Create database connection using environment variables"""
    return psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', 'localhost'),
        port=os.getenv('POSTGRES_PORT', '5432'),
        database=os.getenv('POSTGRES_DB', 'atspro'),
        user=os.getenv('POSTGRES_USER', 'atspro_user'),
        password=os.getenv('POSTGRES_PASSWORD', 'atspro_password')
    )


def create_migrations_table(conn):
    """Create migrations tracking table if it doesn't exist"""
    with conn.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS migration_history (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                execution_time_ms INTEGER,
                success BOOLEAN DEFAULT true,
                error_message TEXT
            );
        """)
        conn.commit()
        logger.info("Migration history table ready")


def get_executed_migrations(conn) -> List[str]:
    """Get list of already executed migrations"""
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT filename 
            FROM migration_history 
            WHERE success = true
            ORDER BY filename;
        """)
        return [row[0] for row in cursor.fetchall()]


def get_migration_files() -> List[Tuple[str, Path]]:
    """Get all SQL migration files in order"""
    migrations_dir = Path(__file__).parent
    migration_files = []
    
    for file_path in sorted(migrations_dir.glob("*.sql")):
        if file_path.name.startswith(('001_', '002_', '003_', '004_', '005_', '006_')):
            migration_files.append((file_path.name, file_path))
    
    return migration_files


def run_migration(conn, filename: str, file_path: Path) -> bool:
    """Execute a single migration file"""
    logger.info(f"Running migration: {filename}")
    
    try:
        # Read migration file
        with open(file_path, 'r') as f:
            sql_content = f.read()
        
        # Execute migration
        import time
        start_time = time.time()
        
        with conn.cursor() as cursor:
            cursor.execute(sql_content)
            conn.commit()
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        # Record successful migration
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO migration_history (filename, execution_time_ms, success)
                VALUES (%s, %s, %s)
                ON CONFLICT (filename) DO UPDATE
                SET executed_at = NOW(),
                    execution_time_ms = EXCLUDED.execution_time_ms,
                    success = EXCLUDED.success;
            """, (filename, execution_time_ms, True))
            conn.commit()
        
        logger.info(f"✓ Migration {filename} completed in {execution_time_ms}ms")
        return True
        
    except Exception as e:
        # Rollback on error
        conn.rollback()
        
        # Record failed migration
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO migration_history (filename, success, error_message)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (filename) DO UPDATE
                    SET executed_at = NOW(),
                        success = EXCLUDED.success,
                        error_message = EXCLUDED.error_message;
                """, (filename, False, str(e)))
                conn.commit()
        except:
            pass
        
        logger.error(f"✗ Migration {filename} failed: {e}")
        return False


def verify_schema(conn):
    """Verify that all expected tables exist"""
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
                AND table_name IN (
                    'resume_documents',
                    'job_documents',
                    'optimization_results',
                    'research_results',
                    'document_audit_log',
                    'user_document_stats',
                    'top_skills_view',
                    'recent_activity_view'
                )
            ORDER BY table_name;
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        
        logger.info("\n=== Schema Verification ===")
        logger.info(f"Found {len(tables)} document tables:")
        for table in tables:
            logger.info(f"  ✓ {table}")
        
        # Check indexes
        cursor.execute("""
            SELECT 
                tablename,
                COUNT(*) as index_count
            FROM pg_indexes
            WHERE schemaname = 'public'
                AND tablename IN (
                    'resume_documents',
                    'job_documents',
                    'optimization_results',
                    'research_results'
                )
            GROUP BY tablename
            ORDER BY tablename;
        """)
        
        logger.info("\n=== Index Summary ===")
        for row in cursor.fetchall():
            logger.info(f"  {row[0]}: {row[1]} indexes")
        
        # Check functions
        cursor.execute("""
            SELECT 
                routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
                AND routine_type = 'FUNCTION'
                AND routine_name IN (
                    'jsonb_merge_deep',
                    'extract_skills',
                    'calculate_keyword_match',
                    'calculate_ats_score',
                    'get_user_documents'
                )
            ORDER BY routine_name;
        """)
        
        functions = [row[0] for row in cursor.fetchall()]
        logger.info(f"\n=== Helper Functions ({len(functions)}) ===")
        for func in functions:
            logger.info(f"  ✓ {func}")


def main():
    """Main migration runner"""
    logger.info("Starting ATSPro PostgreSQL migration runner")
    
    conn = None
    try:
        # Connect to database
        conn = get_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        logger.info("Connected to PostgreSQL database")
        
        # Create migrations table
        create_migrations_table(conn)
        
        # Get executed migrations
        executed = get_executed_migrations(conn)
        logger.info(f"Found {len(executed)} executed migrations")
        
        # Get migration files
        migration_files = get_migration_files()
        logger.info(f"Found {len(migration_files)} migration files")
        
        # Run pending migrations
        pending_count = 0
        success_count = 0
        
        for filename, file_path in migration_files:
            if filename not in executed:
                pending_count += 1
                if run_migration(conn, filename, file_path):
                    success_count += 1
                else:
                    logger.error(f"Migration {filename} failed, stopping execution")
                    break
        
        if pending_count == 0:
            logger.info("No pending migrations to run")
        else:
            logger.info(f"\n=== Migration Summary ===")
            logger.info(f"Executed: {success_count}/{pending_count} migrations")
        
        # Verify schema
        if success_count > 0:
            verify_schema(conn)
        
    except Exception as e:
        logger.error(f"Migration runner failed: {e}")
        return 1
    
    finally:
        if conn:
            conn.close()
            logger.info("Database connection closed")
    
    return 0


if __name__ == "__main__":
    exit(main())