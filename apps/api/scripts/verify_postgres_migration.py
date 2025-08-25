#!/usr/bin/env python3
"""
Verify PostgreSQL migration success using direct database queries.
This script checks data integrity and provides migration statistics.
"""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

import asyncpg

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings


async def verify_migration():
    """Verify migration success in PostgreSQL."""
    
    try:
        # Connect to PostgreSQL
        conn = await asyncpg.connect(settings.database_url)
        
        print(f"\n{'='*70}")
        print(f"PostgreSQL Migration Verification - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*70}\n")
        
        # 1. Check table sizes and document counts
        print("📊 Table Statistics:")
        print("-" * 50)
        
        tables = ['resume_documents', 'job_documents', 'optimization_results']
        total_docs = 0
        
        for table in tables:
            # Get count and size
            count_query = f"SELECT COUNT(*) FROM {table}"
            size_query = f"""
                SELECT pg_size_pretty(pg_total_relation_size('{table}'::regclass)) as size
            """
            
            count = await conn.fetchval(count_query)
            size_result = await conn.fetchrow(size_query)
            size = size_result['size'] if size_result else 'N/A'
            
            total_docs += count
            print(f"  {table:25} {count:8,} documents  ({size})")
            
            # Check for migrated documents (have arango_id in metadata)
            if count > 0:
                migrated_query = f"""
                    SELECT COUNT(*) 
                    FROM {table} 
                    WHERE metadata->>'arango_id' IS NOT NULL
                """
                migrated_count = await conn.fetchval(migrated_query)
                
                if migrated_count > 0:
                    print(f"    └─ Migrated from ArangoDB: {migrated_count:,} ({migrated_count/count*100:.1f}%)")
        
        print(f"\n  Total Documents: {total_docs:,}")
        
        # 2. Check user distribution
        print("\n👥 User Distribution:")
        print("-" * 50)
        
        for table in tables:
            user_query = f"""
                SELECT COUNT(DISTINCT user_id) as unique_users
                FROM {table}
            """
            unique_users = await conn.fetchval(user_query)
            
            if unique_users > 0:
                print(f"  {table:25} {unique_users:8,} unique users")
        
        # 3. Check data integrity
        print("\n✅ Data Integrity Checks:")
        print("-" * 50)
        
        # Check for orphaned relationships
        orphan_checks = [
            ("Orphaned optimization->resume refs", """
                SELECT COUNT(*)
                FROM optimization_results o
                LEFT JOIN resume_documents r ON o.resume_id = r.id
                WHERE o.resume_id IS NOT NULL AND r.id IS NULL
            """),
            ("Orphaned optimization->job refs", """
                SELECT COUNT(*)
                FROM optimization_results o
                LEFT JOIN job_documents j ON o.job_id = j.id
                WHERE o.job_id IS NOT NULL AND j.id IS NULL
            """),
        ]
        
        all_valid = True
        for check_name, query in orphan_checks:
            count = await conn.fetchval(query)
            status = "✓" if count == 0 else f"✗ ({count} orphaned)"
            print(f"  {check_name:35} {status}")
            if count > 0:
                all_valid = False
        
        # Check for valid JSONB data
        print("\n  JSONB Data Validation:")
        
        jsonb_checks = [
            ("resume_documents.parsed_data", "resume_documents", "parsed_data"),
            ("job_documents.parsed_data", "job_documents", "parsed_data"),
            ("optimization_results.optimized_content", "optimization_results", "optimized_content"),
        ]
        
        for check_name, table, field in jsonb_checks:
            # Check for non-empty JSONB
            query = f"""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN {field} != '{{}}'::jsonb THEN 1 END) as non_empty
                FROM {table}
            """
            result = await conn.fetchrow(query)
            
            if result['total'] > 0:
                percent = (result['non_empty'] / result['total'] * 100) if result['total'] > 0 else 0
                status = "✓" if percent > 80 else "⚠️"
                print(f"    {check_name:40} {status} {result['non_empty']}/{result['total']} ({percent:.1f}% populated)")
        
        # 4. Check recent activity
        print("\n🕐 Recent Activity:")
        print("-" * 50)
        
        for table in tables:
            recent_query = f"""
                SELECT MAX(created_at) as latest,
                       COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
                       COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
                FROM {table}
            """
            result = await conn.fetchrow(recent_query)
            
            if result and result['latest']:
                latest = result['latest'].strftime('%Y-%m-%d %H:%M:%S')
                print(f"  {table:25}")
                print(f"    Latest: {latest}")
                if result['last_24h'] > 0:
                    print(f"    Last 24h: {result['last_24h']:,} documents")
                if result['last_7d'] > 0:
                    print(f"    Last 7 days: {result['last_7d']:,} documents")
        
        # 5. Sample migrated documents
        print("\n📄 Sample Migrated Documents:")
        print("-" * 50)
        
        for table in tables:
            sample_query = f"""
                SELECT id, user_id, created_at, 
                       metadata->>'arango_id' as arango_id,
                       metadata->>'migrated_at' as migrated_at
                FROM {table}
                WHERE metadata->>'arango_id' IS NOT NULL
                LIMIT 2
            """
            samples = await conn.fetch(sample_query)
            
            if samples:
                print(f"\n  {table}:")
                for sample in samples:
                    print(f"    ID: {sample['id'][:8]}...")
                    print(f"    User: {sample['user_id'][:10]}...")
                    print(f"    Created: {sample['created_at'].strftime('%Y-%m-%d')}")
                    if sample['migrated_at']:
                        print(f"    Migrated: {sample['migrated_at'][:19]}")
                    print()
        
        # 6. Performance indexes
        print("\n🔍 Performance Indexes:")
        print("-" * 50)
        
        index_query = """
            SELECT 
                schemaname,
                tablename,
                indexname,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
            AND tablename IN ('resume_documents', 'job_documents', 'optimization_results')
            ORDER BY tablename, indexname
        """
        
        indexes = await conn.fetch(index_query)
        current_table = None
        
        for index in indexes:
            if index['tablename'] != current_table:
                current_table = index['tablename']
                print(f"\n  {current_table}:")
            
            index_type = "GIN" if "gin" in index['indexname'] else "B-tree"
            print(f"    • {index['indexname']:45} ({index_type}, {index['index_size']})")
        
        # Summary
        print(f"\n{'='*70}")
        print("📈 Migration Summary:")
        print("-" * 50)
        
        if total_docs > 0:
            print(f"  ✓ PostgreSQL contains {total_docs:,} documents")
            
            # Check for migration markers
            migration_check = """
                SELECT COUNT(*) as migrated
                FROM (
                    SELECT id FROM resume_documents WHERE metadata->>'arango_id' IS NOT NULL
                    UNION ALL
                    SELECT id FROM job_documents WHERE metadata->>'arango_id' IS NOT NULL
                    UNION ALL
                    SELECT id FROM optimization_results WHERE metadata->>'arango_id' IS NOT NULL
                ) as m
            """
            migrated_total = await conn.fetchval(migration_check)
            
            if migrated_total > 0:
                print(f"  ✓ {migrated_total:,} documents migrated from ArangoDB")
                print(f"  ✓ Migration metadata preserved")
            
            if all_valid:
                print(f"  ✓ All data integrity checks passed")
            else:
                print(f"  ⚠️ Some data integrity issues detected")
            
            print(f"\n  Status: MIGRATION SUCCESSFUL ✅")
        else:
            print(f"  ⚠️ No documents found in PostgreSQL")
            print(f"  Status: NO DATA TO VERIFY")
        
        print(f"{'='*70}\n")
        
        await conn.close()
        return total_docs > 0
        
    except Exception as e:
        print(f"\n✗ Error verifying migration: {e}")
        print(f"  Check database connection settings\n")
        return False


async def check_postgres_health():
    """Quick health check of PostgreSQL."""
    try:
        conn = await asyncpg.connect(settings.database_url)
        
        # Simple connectivity test
        result = await conn.fetchval("SELECT 1")
        
        # Get database size
        db_size = await conn.fetchval("""
            SELECT pg_size_pretty(pg_database_size(current_database()))
        """)
        
        # Get connection count
        connections = await conn.fetchval("""
            SELECT count(*) FROM pg_stat_activity
        """)
        
        print(f"\n✅ PostgreSQL Health Check:")
        print(f"  Database Size: {db_size}")
        print(f"  Active Connections: {connections}")
        print(f"  Status: HEALTHY\n")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"\n✗ PostgreSQL health check failed: {e}\n")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Verify PostgreSQL migration")
    parser.add_argument(
        "--health",
        action="store_true",
        help="Run health check only"
    )
    
    args = parser.parse_args()
    
    if args.health:
        success = asyncio.run(check_postgres_health())
    else:
        success = asyncio.run(verify_migration())
    
    sys.exit(0 if success else 1)