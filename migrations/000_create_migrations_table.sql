-- Migration: Create migrations tracking table
-- Description: Creates a table to track which migrations have been applied
-- Author: System
-- Date: 2025-01-26

CREATE TABLE IF NOT EXISTS migrations (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    checksum VARCHAR(64) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    execution_time_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    rolled_back BOOLEAN NOT NULL DEFAULT false,
    rolled_back_at TIMESTAMP WITH TIME ZONE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migrations_filename ON migrations(filename);
CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations(executed_at DESC);

-- Add comment to table
COMMENT ON TABLE migrations IS 'Tracks database migration history';
COMMENT ON COLUMN migrations.id IS 'Migration identifier (usually filename without extension)';
COMMENT ON COLUMN migrations.filename IS 'Full filename of the migration';
COMMENT ON COLUMN migrations.checksum IS 'SHA256 hash of migration file content';
COMMENT ON COLUMN migrations.executed_at IS 'When the migration was executed';
COMMENT ON COLUMN migrations.execution_time_ms IS 'How long the migration took to execute';
COMMENT ON COLUMN migrations.success IS 'Whether the migration completed successfully';
COMMENT ON COLUMN migrations.error_message IS 'Error message if migration failed';
COMMENT ON COLUMN migrations.rolled_back IS 'Whether this migration has been rolled back';
COMMENT ON COLUMN migrations.rolled_back_at IS 'When the migration was rolled back';