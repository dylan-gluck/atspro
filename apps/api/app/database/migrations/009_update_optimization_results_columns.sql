-- Migration 009: Update optimization_results table for complete optimization storage
-- ATSPro API - Adding missing columns and improving JSONB structure

-- =======================
-- ADD MISSING COLUMNS
-- =======================

-- Add missing columns to optimization_results table
ALTER TABLE optimization_results 
ADD COLUMN IF NOT EXISTS optimization_type VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS optimized_content JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ats_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS keyword_match_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migrate existing data from optimization_data to optimized_content
UPDATE optimization_results 
SET optimized_content = optimization_data
WHERE optimized_content = '{}'::JSONB AND optimization_data != '{}'::JSONB;

-- =======================
-- ADD CONSTRAINTS
-- =======================

-- Score validation constraints
ALTER TABLE optimization_results
ADD CONSTRAINT check_ats_score_range 
    CHECK (ats_score IS NULL OR (ats_score >= 0 AND ats_score <= 100));

ALTER TABLE optimization_results
ADD CONSTRAINT check_keyword_match_score_range 
    CHECK (keyword_match_score IS NULL OR (keyword_match_score >= 0 AND keyword_match_score <= 100));

-- Version must be positive
ALTER TABLE optimization_results
ADD CONSTRAINT check_version_positive 
    CHECK (version > 0);

-- =======================
-- CREATE INDEXES
-- =======================

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_optimization_results_type 
    ON optimization_results(optimization_type);

CREATE INDEX IF NOT EXISTS idx_optimization_results_ats_score 
    ON optimization_results(ats_score DESC) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_optimization_results_keyword_score 
    ON optimization_results(keyword_match_score DESC) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_optimization_results_version 
    ON optimization_results(resume_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_optimization_results_active 
    ON optimization_results(is_active) 
    WHERE is_active = true;

-- Composite index for user's best scores
CREATE INDEX IF NOT EXISTS idx_optimization_user_best_scores 
    ON optimization_results(user_id, ats_score DESC, keyword_match_score DESC) 
    WHERE is_active = true;

-- JSONB indexes for optimized content
CREATE INDEX IF NOT EXISTS idx_optimization_content_gin 
    ON optimization_results USING GIN (optimized_content);

-- Index for searching by skills in optimized content
CREATE INDEX IF NOT EXISTS idx_optimization_skills 
    ON optimization_results USING GIN ((optimized_content->'skills'));

-- =======================
-- UPDATE TRIGGER
-- =======================

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER update_optimization_results_updated_at 
    BEFORE UPDATE ON optimization_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =======================
-- HELPER FUNCTIONS
-- =======================

-- Function to get the latest optimization for a resume-job pair
CREATE OR REPLACE FUNCTION get_latest_optimization(
    p_resume_id UUID,
    p_job_id UUID
) RETURNS optimization_results AS $$
DECLARE
    result optimization_results;
BEGIN
    SELECT * INTO result
    FROM optimization_results
    WHERE resume_id = p_resume_id 
        AND job_id = p_job_id
        AND is_active = true
    ORDER BY version DESC, created_at DESC
    LIMIT 1;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate optimization history statistics
CREATE OR REPLACE FUNCTION get_optimization_stats(
    p_user_id TEXT
) RETURNS TABLE(
    total_optimizations BIGINT,
    avg_ats_score DECIMAL,
    max_ats_score DECIMAL,
    avg_keyword_score DECIMAL,
    max_keyword_score DECIMAL,
    unique_resumes BIGINT,
    unique_jobs BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_optimizations,
        ROUND(AVG(ats_score), 2) AS avg_ats_score,
        MAX(ats_score) AS max_ats_score,
        ROUND(AVG(keyword_match_score), 2) AS avg_keyword_score,
        MAX(keyword_match_score) AS max_keyword_score,
        COUNT(DISTINCT resume_id)::BIGINT AS unique_resumes,
        COUNT(DISTINCT job_id)::BIGINT AS unique_jobs
    FROM optimization_results
    WHERE user_id = p_user_id
        AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- MATERIALIZED VIEW UPDATE
-- =======================

-- Drop and recreate the user_document_stats view to include new columns
DROP MATERIALIZED VIEW IF EXISTS user_document_stats CASCADE;

CREATE MATERIALIZED VIEW user_document_stats AS
SELECT 
    u.id AS user_id,
    u.email,
    COUNT(DISTINCT rd.id) AS resume_count,
    COUNT(DISTINCT jd.id) AS job_count,
    COUNT(DISTINCT o.id) AS optimization_count,
    COUNT(DISTINCT r.id) AS research_count,
    MAX(rd.created_at) AS last_resume_upload,
    MAX(o.created_at) AS last_optimization,
    AVG(o.ats_score) AS avg_ats_score,
    MAX(o.ats_score) AS best_ats_score,
    AVG(o.keyword_match_score) AS avg_keyword_score,
    MAX(o.keyword_match_score) AS best_keyword_score
FROM "user" u
LEFT JOIN resume_documents rd ON u.id = rd.user_id AND rd.is_active = true
LEFT JOIN job_documents jd ON u.id = jd.user_id AND jd.is_active = true
LEFT JOIN optimization_results o ON u.id = o.user_id AND o.is_active = true
LEFT JOIN research_results r ON u.id = r.user_id AND r.is_active = true
GROUP BY u.id, u.email;

-- Recreate indexes for the materialized view
CREATE UNIQUE INDEX idx_user_stats_user_id 
    ON user_document_stats (user_id);

CREATE INDEX idx_user_stats_best_ats_score 
    ON user_document_stats (best_ats_score DESC NULLS LAST);

CREATE INDEX idx_user_stats_best_keyword_score 
    ON user_document_stats (best_keyword_score DESC NULLS LAST);

-- =======================
-- DATA MIGRATION
-- =======================

-- Populate scores for existing optimization results if they exist in metadata
UPDATE optimization_results 
SET 
    ats_score = (metadata->>'ats_score')::DECIMAL,
    keyword_match_score = (metadata->>'keyword_match_score')::DECIMAL
WHERE 
    ats_score IS NULL 
    AND metadata ? 'ats_score'
    AND metadata->>'ats_score' ~ '^\d+(\.\d+)?$';

-- Set optimization_type based on metadata if available
UPDATE optimization_results 
SET optimization_type = COALESCE(
    metadata->>'optimization_type',
    CASE 
        WHEN metadata->>'type' = 'ats_optimization' THEN 'ats'
        WHEN metadata->>'type' = 'keyword_optimization' THEN 'keyword'
        ELSE 'general'
    END
)
WHERE optimization_type = 'general';

-- =======================
-- COMMENTS
-- =======================

COMMENT ON COLUMN optimization_results.optimization_type IS 'Type of optimization: general, ats, keyword, targeted';
COMMENT ON COLUMN optimization_results.optimized_content IS 'JSONB containing the optimized resume data';
COMMENT ON COLUMN optimization_results.ats_score IS 'ATS compatibility score (0-100)';
COMMENT ON COLUMN optimization_results.keyword_match_score IS 'Keyword match percentage (0-100)';
COMMENT ON COLUMN optimization_results.version IS 'Version number for tracking multiple optimizations';
COMMENT ON COLUMN optimization_results.is_active IS 'Soft delete flag for archiving old optimizations';

COMMENT ON FUNCTION get_latest_optimization IS 'Get the most recent optimization for a resume-job pair';
COMMENT ON FUNCTION get_optimization_stats IS 'Calculate aggregate statistics for user optimizations';