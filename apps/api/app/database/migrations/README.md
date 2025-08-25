# PostgreSQL Migration Guide

## Overview

This directory contains PostgreSQL migration scripts to migrate ATSPro from a multi-database architecture (PostgreSQL + ArangoDB + Redis) to a PostgreSQL-only solution using JSONB for document storage.

## Migration Files

### Core Migrations

1. **001_create_tasks_tables.sql** ✅
   - Task tracking and management tables
   - Already applied to production

2. **002_create_user_profiles_table.sql** ✅
   - User profile data storage
   - Already applied to production

3. **003_create_documents_tables.sql** 🆕
   - Main document storage tables replacing ArangoDB:
     - `resume_documents` - Parsed resumes with JSONB storage
     - `job_documents` - Job postings and requirements
     - `optimization_results` - Resume optimization results
     - `research_results` - Company/industry research data
     - `document_audit_log` - Comprehensive audit trail
   - Includes all necessary indexes for performance

4. **004_create_jsonb_helper_functions.sql** 🆕
   - JSONB manipulation functions:
     - `jsonb_merge_deep()` - Deep merge JSONB objects
     - `extract_skills()` - Extract skills from documents
     - `calculate_keyword_match()` - ATS keyword matching
     - `calculate_ats_score()` - Comprehensive ATS scoring
     - `search_documents()` - Full-text search
     - `get_user_documents()` - Retrieve user documents
   - Utility functions for maintenance

5. **005_create_performance_indexes.sql** 🆕
   - Advanced performance optimizations:
     - GIN indexes for JSONB queries
     - Full-text search indexes
     - Partial indexes for active documents
     - Composite indexes for common queries
     - Bloom filter indexes for multi-column searches
   - Materialized views:
     - `user_document_stats` - User statistics dashboard
     - `top_skills_view` - Popular skills analysis
     - `recent_activity_view` - Recent user activity
   - Query optimization statistics

6. **006_create_data_validation_constraints.sql** 🆕
   - Data integrity and validation:
     - JSONB structure validation triggers
     - Referential integrity checks
     - Business logic constraints
     - Audit logging triggers
     - Domain types for email, URL, percentage
   - Prevents invalid data entry

7. **007_rollback_procedures.sql** 🆕
   - Safe rollback procedures
   - Migration status checking
   - Schema integrity verification
   - Data migration helpers from ArangoDB

## Running Migrations

### Automatic Migration

```bash
# From the API directory
cd apps/api
python app/database/migrations/run_migrations.py
```

### Manual Migration

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U atspro_user -d atspro

# Run migration files in order
\i /path/to/003_create_documents_tables.sql
\i /path/to/004_create_jsonb_helper_functions.sql
\i /path/to/005_create_performance_indexes.sql
\i /path/to/006_create_data_validation_constraints.sql
\i /path/to/007_rollback_procedures.sql
```

### Using Docker

```bash
# Copy migrations to container
docker cp apps/api/app/database/migrations postgres:/tmp/migrations/

# Execute migrations
docker-compose exec postgres psql -U atspro_user -d atspro -f /tmp/migrations/003_create_documents_tables.sql
```

## Schema Overview

### Document Storage Pattern

All documents use JSONB for flexible schema storage with extracted fields for indexing:

```sql
-- Example: Resume Document
{
  "id": "uuid",
  "user_id": "text (references better-auth user)",
  "parsed_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "experience": [...],
    "skills": [...],
    "education": [...]
  },
  "metadata": {
    "source": "upload",
    "parser_version": "1.0"
  }
}
```

### Index Strategy

1. **Primary Indexes**: User lookups, active documents
2. **GIN Indexes**: JSONB field searches
3. **Full-Text Indexes**: Content search
4. **Partial Indexes**: Filtered queries (active, unexpired)
5. **Composite Indexes**: Multi-field queries

### Performance Features

- Materialized views for expensive aggregations
- Automatic statistics refresh
- Query plan optimization
- Bloom filters for multi-column equality
- Trigram indexes for similarity search

## Verification

### Check Migration Status

```sql
SELECT * FROM check_migration_status();
```

### Verify Schema Integrity

```sql
SELECT * FROM verify_schema_integrity();
```

### Check Table Structure

```sql
-- List all document tables
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN (
  'resume_documents',
  'job_documents',
  'optimization_results',
  'research_results'
)
ORDER BY table_name, ordinal_position;
```

### Index Usage Analysis

```sql
SELECT * FROM analyze_index_usage();
```

## Rollback Procedures

If needed, migrations can be rolled back:

```sql
-- Rollback all document-related migrations
SELECT rollback.rollback_all_migrations();

-- Or rollback specific components
SELECT rollback.drop_validation_objects();
SELECT rollback.drop_helper_functions();
SELECT rollback.drop_document_tables();
```

## Data Migration from ArangoDB

Use the migration helper function:

```sql
-- Migrate a document from ArangoDB format
SELECT migrate_arango_document(
  'user_123',
  'resume',
  '{"name": "John Doe", "skills": ["Python", "SQL"]}'::JSONB
);
```

## Maintenance

### Refresh Materialized Views

```sql
-- Refresh all views (run periodically)
SELECT refresh_materialized_views();
```

### Clean Up Old Documents

```sql
-- Remove expired documents
SELECT cleanup_old_documents();
```

### Update Statistics

```sql
-- Update table statistics for query planner
ANALYZE resume_documents;
ANALYZE job_documents;
ANALYZE optimization_results;
```

## Production Considerations

1. **Backup Before Migration**: Always backup the database before running migrations
2. **Test First**: Run migrations on a staging environment first
3. **Monitor Performance**: Watch query performance after migration
4. **Index Maintenance**: Run `REINDEX` periodically for optimal performance
5. **Vacuum Schedule**: Ensure autovacuum is properly configured
6. **Connection Pooling**: Use connection pooling for better performance

## Compatibility Notes

- Compatible with better-auth schema (TEXT user IDs)
- PostgreSQL 14+ required for all features
- Extensions required: uuid-ossp, pg_trgm, bloom
- Supports concurrent operations with proper locking

## Support

For issues or questions about migrations:
1. Check migration history: `SELECT * FROM migration_history;`
2. Review error messages in logs
3. Verify prerequisites (extensions, permissions)
4. Test rollback procedures if needed