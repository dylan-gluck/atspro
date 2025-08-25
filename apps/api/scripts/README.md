# Data Migration Scripts

This directory contains utilities for migrating data from ArangoDB to PostgreSQL.

## Overview

The migration process safely transfers all document collections from ArangoDB to PostgreSQL JSONB tables while preserving data integrity, relationships, and providing rollback capabilities.

## Scripts

### 1. `check_arango_data.py`
Quick check to see if ArangoDB contains any data that needs migration.

```bash
# Check if migration is needed
python scripts/check_arango_data.py
```

### 2. `migrate_data.py`
Main migration utility with export, import, validation, and rollback capabilities.

```bash
# Full migration (export + import + validate)
python scripts/migrate_data.py migrate

# Export only (creates JSON backups)
python scripts/migrate_data.py export

# Import only (from existing JSON exports)
python scripts/migrate_data.py import

# Validate migrated data
python scripts/migrate_data.py validate

# Rollback to previous state
python scripts/migrate_data.py rollback
python scripts/migrate_data.py rollback --backup-date 20250124
```

### 3. `verify_postgres_migration.py`
Comprehensive verification of migrated data in PostgreSQL.

```bash
# Full verification with statistics
python scripts/verify_postgres_migration.py

# Quick health check only
python scripts/verify_postgres_migration.py --health
```

## Migration Process

### Step 1: Pre-Migration Check
```bash
# Ensure both databases are running
docker-compose up -d postgres arangodb

# Check if ArangoDB has data
python scripts/check_arango_data.py
```

### Step 2: Run Migration
```bash
# Perform full migration with automatic backup
python scripts/migrate_data.py migrate
```

### Step 3: Verify Migration
```bash
# Verify data integrity and statistics
python scripts/verify_postgres_migration.py
```

### Step 4: Clean Up (Optional)
After confirming successful migration:
```bash
# Stop ArangoDB if no longer needed
docker-compose stop arangodb

# Remove ArangoDB from docker-compose.yml
# Update environment variables to remove ARANGO_* settings
```

## Migration Features

### Data Transformation
- **User IDs**: Automatically converted to TEXT format for better-auth compatibility
- **Document IDs**: ArangoDB keys preserved in metadata, new UUIDs generated
- **Timestamps**: Properly formatted for PostgreSQL TIMESTAMP WITH TIME ZONE
- **JSONB Storage**: Complex nested data stored efficiently in JSONB columns

### Collection Mappings
| ArangoDB Collection | PostgreSQL Table | Description |
|-------------------|------------------|-------------|
| resumes | resume_documents | User resume data and parsed content |
| jobs | job_documents | Job listings and requirements |
| optimizations | optimization_results | Resume optimization results |

### Safety Features
- **Automatic Backups**: All exports are backed up with timestamps
- **Transaction Safety**: Imports use database transactions
- **Validation Checks**: Automatic validation after migration
- **Rollback Support**: Can restore from any backup point
- **Error Tracking**: Detailed error logs and migration reports

### Migration Reports
Reports are saved in `migration_data/logs/` with:
- Document counts per collection
- Error details with document IDs
- Validation results
- Migration duration and timestamps

## Data Validation

The migration validates:
1. **Document Counts**: Ensures all documents are migrated
2. **Sample Data**: Spot-checks random documents
3. **Relationships**: Verifies foreign key integrity
4. **JSONB Content**: Ensures data is properly formatted
5. **User Mappings**: Confirms user IDs are preserved

## Troubleshooting

### Connection Issues
```bash
# Check database status
docker-compose ps

# View logs
docker-compose logs postgres
docker-compose logs arangodb

# Test connections
python scripts/verify_postgres_migration.py --health
```

### Migration Failures
1. Check migration reports in `migration_data/logs/`
2. Review error details for specific document IDs
3. Use rollback if needed: `python scripts/migrate_data.py rollback`
4. Fix issues and retry migration

### Performance Considerations
- Large datasets are processed in batches
- Indexes are preserved for query performance
- GIN indexes on JSONB columns for efficient searches
- Connection pooling for optimal throughput

## Post-Migration

After successful migration:

1. **Update Application Code**:
   - Remove ArangoDB dependencies if applicable
   - Update connection configurations
   - Test application functionality

2. **Monitor Performance**:
   ```sql
   -- Check table sizes
   SELECT table_name, 
          pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size 
   FROM (VALUES 
     ('resume_documents'), 
     ('job_documents'), 
     ('optimization_results')
   ) as tables(table_name);
   ```

3. **Backup PostgreSQL**:
   ```bash
   pg_dump -U atspro_user -d atspro > backup_$(date +%Y%m%d).sql
   ```

## Requirements

- Python 3.11+
- Dependencies: `python-arango`, `asyncpg`, `pydantic`
- Running PostgreSQL and ArangoDB instances
- Proper environment variables or configuration

## Notes

- Migration is idempotent - can be run multiple times safely
- Original ArangoDB IDs are preserved in metadata for reference
- All timestamps are converted to UTC
- JSONB indexes are automatically created for performance