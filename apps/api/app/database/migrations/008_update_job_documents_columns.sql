-- Update job_documents table to add missing columns for compatibility
-- These columns were referenced in the code but missing from the schema

-- Add missing columns to job_documents table
ALTER TABLE job_documents 
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS remote_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS job_url TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migrate existing data from old columns to new columns
UPDATE job_documents 
SET company_name = COALESCE(company, parsed_data->>'company', parsed_data->>'company_name', ''),
    job_title = COALESCE(title, parsed_data->>'title', parsed_data->>'job_title', ''),
    location = COALESCE(parsed_data->>'location', ''),
    remote_type = parsed_data->>'remote_type',
    job_url = COALESCE(url, parsed_data->>'source_url', metadata->>'source_url');

-- Drop old columns that are being replaced
ALTER TABLE job_documents 
DROP COLUMN IF EXISTS title CASCADE,
DROP COLUMN IF EXISTS company CASCADE,
DROP COLUMN IF EXISTS url CASCADE;

-- Add new indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_documents_company_name ON job_documents(company_name);
CREATE INDEX IF NOT EXISTS idx_job_documents_job_title ON job_documents(job_title);
CREATE INDEX IF NOT EXISTS idx_job_documents_location ON job_documents(location);
CREATE INDEX IF NOT EXISTS idx_job_documents_remote_type ON job_documents(remote_type);
CREATE INDEX IF NOT EXISTS idx_job_documents_expires_at ON job_documents(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_documents_is_active ON job_documents(is_active);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_job_documents_user_company_title 
    ON job_documents(user_id, company_name, job_title);

CREATE INDEX IF NOT EXISTS idx_job_documents_user_active_created 
    ON job_documents(user_id, is_active, created_at DESC);

-- Add indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_job_documents_skills 
    ON job_documents USING GIN ((parsed_data->'skills'));

CREATE INDEX IF NOT EXISTS idx_job_documents_requirements 
    ON job_documents USING GIN ((parsed_data->'requirements'));

CREATE INDEX IF NOT EXISTS idx_job_documents_keywords 
    ON job_documents USING GIN ((parsed_data->'keywords'));

-- Full-text search index for job content
CREATE INDEX IF NOT EXISTS idx_job_documents_fulltext ON job_documents USING GIN (
    to_tsvector('english', 
        COALESCE(job_title, '') || ' ' ||
        COALESCE(company_name, '') || ' ' ||
        COALESCE(location, '') || ' ' ||
        COALESCE(parsed_data->>'description', '') || ' ' ||
        COALESCE(parsed_data->>'requirements', '')
    )
);