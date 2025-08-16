-- Migration 001: Create tasks tables
-- ATSPro API - Task tracking and management tables

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Task tracking table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- References better-auth user.id
    task_type VARCHAR(50) NOT NULL, -- 'parse_resume', 'parse_job', 'optimize', 'score', 'research'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    priority INTEGER DEFAULT 2, -- 1=high, 2=normal, 3=low
    payload JSONB NOT NULL, -- Input parameters
    result_id TEXT, -- Reference to result in ArangoDB
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    progress INTEGER DEFAULT 0, -- 0-100 percentage
    estimated_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Task performance metrics
CREATE TABLE IF NOT EXISTS task_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type VARCHAR(50) NOT NULL,
    duration_ms INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_type VARCHAR(50),
    worker_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraints for data integrity
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
    CHECK (priority BETWEEN 1 AND 3);

ALTER TABLE tasks ADD CONSTRAINT tasks_progress_check 
    CHECK (progress BETWEEN 0 AND 100);

ALTER TABLE tasks ADD CONSTRAINT tasks_retry_count_check 
    CHECK (retry_count >= 0 AND retry_count <= max_retries);

ALTER TABLE task_metrics ADD CONSTRAINT task_metrics_status_check 
    CHECK (status IN ('completed', 'failed', 'cancelled'));

-- Comments for documentation
COMMENT ON TABLE tasks IS 'Task tracking table for async operations';
COMMENT ON COLUMN tasks.user_id IS 'References better-auth user.id';
COMMENT ON COLUMN tasks.task_type IS 'Type of task: parse_resume, parse_job, optimize, score, research';
COMMENT ON COLUMN tasks.status IS 'Current task status: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN tasks.priority IS 'Task priority: 1=high, 2=normal, 3=low';
COMMENT ON COLUMN tasks.payload IS 'JSON input parameters for the task';
COMMENT ON COLUMN tasks.result_id IS 'Reference to result document in ArangoDB';
COMMENT ON COLUMN tasks.progress IS 'Task completion percentage (0-100)';

COMMENT ON TABLE task_metrics IS 'Performance metrics for completed tasks';
COMMENT ON COLUMN task_metrics.duration_ms IS 'Task execution duration in milliseconds';
COMMENT ON COLUMN task_metrics.worker_id IS 'ID of the worker that processed the task';