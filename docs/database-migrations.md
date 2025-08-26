# Database Migration Guide

## Overview

ATSPro uses a SQL-based migration system to manage database schema changes. Migrations are versioned SQL files that are executed in order to bring the database schema up to date.

## Migration System Features

- **Automatic tracking**: Migrations are tracked in a `migrations` table
- **Checksum validation**: Ensures migration files haven't been modified after execution
- **Transaction safety**: Each migration runs in a transaction that rolls back on failure
- **Execution logging**: Records execution time and any errors
- **Status reporting**: Shows which migrations are pending or applied

## Directory Structure

```
migrations/
├── 000_create_migrations_table.sql  # Migration tracking table
├── 000_create_betterauth_tables.sql # Better-Auth authentication tables
├── 001_create_atspro_tables.sql     # Core application tables
├── 002_add_job_added_activity_type.sql # Activity type enum update
└── 003_add_markdown_columns.sql     # Markdown storage columns
```

## Naming Convention

Migration files follow this pattern: `XXX_description.sql`

- `XXX`: Three-digit zero-padded number (000, 001, 002, etc.)
- `description`: Snake_case description of the migration
- `.sql`: SQL file extension

Files are executed in alphabetical order, so the numeric prefix determines execution order.

## Local Development

### Running Migrations

```bash
# Run all pending migrations
bun run migrate

# Check migration status
bun run migrate:status

# Rollback last migration (if supported)
bun run migrate:rollback
```

### Creating a New Migration

1. Create a new SQL file in the `migrations/` directory:

   ```bash
   touch migrations/004_your_migration_name.sql
   ```

2. Add your SQL commands:

   ```sql
   -- Migration: Brief description
   -- Author: Your name
   -- Date: YYYY-MM-DD

   ALTER TABLE your_table ADD COLUMN new_column VARCHAR(255);
   CREATE INDEX idx_your_table_new_column ON your_table(new_column);
   ```

3. Run the migration:
   ```bash
   bun run migrate
   ```

### Best Practices

1. **Always use transactions**: The migration system wraps each file in a transaction automatically
2. **Make migrations idempotent**: Use `IF NOT EXISTS` and `IF EXISTS` clauses
3. **Keep migrations small**: One logical change per migration file
4. **Test rollback**: Consider how to undo the migration if needed
5. **Document changes**: Include comments explaining the migration purpose

## Production Deployment

### Environment Setup

Ensure the production database connection is configured:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Deployment Process

1. **Before deployment**: Check migration status

   ```bash
   bun run migrate:status
   ```

2. **Run migrations**: Execute pending migrations

   ```bash
   bun run migrate
   ```

3. **Verify**: Confirm all migrations succeeded
   ```bash
   bun run migrate:status
   ```

### CI/CD Integration

Add migration step to your deployment pipeline:

```yaml
# GitHub Actions example
- name: Run database migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: bun run migrate
```

### Docker Deployment

```dockerfile
# In your Dockerfile or docker-compose
RUN bun run migrate
```

Or as a separate migration service:

```yaml
# docker-compose.yml
services:
  migrate:
    build: .
    command: bun run migrate
    environment:
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - postgres
```

## Troubleshooting

### Migration Failed

If a migration fails:

1. Check the error message in the console output
2. The migration system automatically rolls back the failed migration
3. Fix the SQL in the migration file
4. Run `bun run migrate` again

### Checksum Mismatch

If you see a checksum error:

- This means a migration file was modified after it was applied
- Never modify migration files after they've been run in production
- Create a new migration file for additional changes

### Manual Recovery

If the automatic rollback fails:

1. Connect to the database directly
2. Check the `migrations` table for the failed migration
3. Manually undo any partial changes
4. Update the `migrations` table to mark the migration as rolled back

```sql
UPDATE migrations
SET rolled_back = true, rolled_back_at = NOW()
WHERE filename = 'XXX_failed_migration.sql';
```

## Migration Table Schema

The `migrations` table tracks all executed migrations:

| Column            | Type         | Description                          |
| ----------------- | ------------ | ------------------------------------ |
| id                | VARCHAR(255) | Migration ID (filename without .sql) |
| filename          | VARCHAR(255) | Full filename of the migration       |
| checksum          | VARCHAR(64)  | SHA256 hash of file content          |
| executed_at       | TIMESTAMP    | When the migration was executed      |
| execution_time_ms | INTEGER      | Execution duration in milliseconds   |
| success           | BOOLEAN      | Whether migration succeeded          |
| error_message     | TEXT         | Error details if failed              |
| rolled_back       | BOOLEAN      | Whether migration was rolled back    |
| rolled_back_at    | TIMESTAMP    | When the rollback occurred           |

## Security Considerations

1. **Never commit sensitive data**: Don't include passwords or API keys in migrations
2. **Review migrations**: Always review migration SQL before running
3. **Backup before major changes**: Take a database backup before running destructive migrations
4. **Use least privilege**: Migration user should only have necessary permissions

## Examples

### Adding a Column

```sql
-- Migration: Add user preferences
-- Author: Team
-- Date: 2025-01-26

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

COMMENT ON COLUMN "user".preferences IS 'User preference settings';
```

### Creating an Index

```sql
-- Migration: Add performance indexes
-- Author: Team
-- Date: 2025-01-26

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_jobs_status
ON "userJobs"(status)
WHERE status IN ('applied', 'interview', 'offer');
```

### Adding an Enum Value

```sql
-- Migration: Add new job status
-- Author: Team
-- Date: 2025-01-26

ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'on_hold';
```

## Related Documentation

- [Database Schema](./data-model.md)
- [Development Setup](../README.md)
- [API Documentation](./api-spec.md)
