-- Migration 005: Advanced performance indexes and materialized views
-- ATSPro API - Performance optimization for PostgreSQL JSONB queries

-- =======================
-- ADVANCED JSONB INDEXES
-- =======================

-- Create functional indexes for frequently queried JSONB paths
-- Resume documents - commonly searched fields
CREATE INDEX IF NOT EXISTS idx_resume_name_lower 
    ON resume_documents (LOWER(parsed_data->>'name'));

CREATE INDEX IF NOT EXISTS idx_resume_skills_gin 
    ON resume_documents USING GIN ((parsed_data->'skills'));

CREATE INDEX IF NOT EXISTS idx_resume_experience_gin 
    ON resume_documents USING GIN ((parsed_data->'experience'));

CREATE INDEX IF NOT EXISTS idx_resume_education_gin 
    ON resume_documents USING GIN ((parsed_data->'education'));

-- Job documents - frequently filtered fields
CREATE INDEX IF NOT EXISTS idx_job_seniority 
    ON job_documents ((parsed_data->>'seniority_level'));

CREATE INDEX IF NOT EXISTS idx_job_department_lower 
    ON job_documents (LOWER(parsed_data->>'department'));

CREATE INDEX IF NOT EXISTS idx_job_salary_range 
    ON job_documents ((parsed_data->'salary'));

-- Optimization results - scoring and filtering
CREATE INDEX IF NOT EXISTS idx_optimization_high_scores 
    ON optimization_results (user_id, ats_score DESC) 
    WHERE is_active = true AND ats_score >= 80;

CREATE INDEX IF NOT EXISTS idx_optimization_recent 
    ON optimization_results (user_id, created_at DESC) 
    WHERE is_active = true;

-- =======================
-- FULL TEXT SEARCH INDEXES
-- =======================

-- Create text search configuration for resume content
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS resume_search ( COPY = english );

-- Full text search indexes with custom weights
CREATE INDEX IF NOT EXISTS idx_resume_fts 
    ON resume_documents 
    USING GIN (
        to_tsvector('resume_search',
            COALESCE(parsed_data->>'name', '') || ' ' ||
            COALESCE(parsed_data->>'summary', '') || ' ' ||
            COALESCE(parsed_data->>'skills', '') || ' ' ||
            COALESCE(parsed_data->>'experience', '')
        )
    );

CREATE INDEX IF NOT EXISTS idx_job_fts 
    ON job_documents 
    USING GIN (
        to_tsvector('english',
            job_title || ' ' ||
            company_name || ' ' ||
            COALESCE(parsed_data->>'description', '') || ' ' ||
            COALESCE(parsed_data->>'requirements', '')
        )
    );

-- =======================
-- PARTIAL INDEXES
-- =======================

-- Index only active documents for faster queries
CREATE INDEX IF NOT EXISTS idx_resume_active_recent 
    ON resume_documents (user_id, created_at DESC) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_job_active_unexpired 
    ON job_documents (user_id, expires_at) 
    WHERE is_active = true AND expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_optimization_latest_version 
    ON optimization_results (resume_id, version DESC) 
    WHERE is_active = true;

-- =======================
-- COMPOSITE INDEXES
-- =======================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_resume_user_created 
    ON resume_documents (user_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_job_user_company_title 
    ON job_documents (user_id, company_name, job_title);

CREATE INDEX IF NOT EXISTS idx_optimization_resume_job 
    ON optimization_results (resume_id, job_id, created_at DESC) 
    WHERE job_id IS NOT NULL;

-- =======================
-- BLOOM FILTER INDEXES
-- =======================

-- Enable bloom extension for multi-column equality searches
CREATE EXTENSION IF NOT EXISTS bloom;

-- Create bloom index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_bloom 
    ON document_audit_log 
    USING bloom (user_id, document_type, action)
    WITH (length=80, col1=2, col2=2, col3=2);

-- =======================
-- MATERIALIZED VIEWS
-- =======================

-- User statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_document_stats AS
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
    MAX(o.ats_score) AS best_ats_score
FROM "user" u
LEFT JOIN resume_documents rd ON u.id = rd.user_id AND rd.is_active = true
LEFT JOIN job_documents jd ON u.id = jd.user_id AND jd.is_active = true
LEFT JOIN optimization_results o ON u.id = o.user_id AND o.is_active = true
LEFT JOIN research_results r ON u.id = r.user_id AND r.is_active = true
GROUP BY u.id, u.email;

-- Index the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stats_user_id 
    ON user_document_stats (user_id);

CREATE INDEX IF NOT EXISTS idx_user_stats_resume_count 
    ON user_document_stats (resume_count DESC);

CREATE INDEX IF NOT EXISTS idx_user_stats_best_score 
    ON user_document_stats (best_ats_score DESC NULLS LAST);

-- Top skills materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS top_skills_view AS
SELECT 
    skill,
    COUNT(*) AS frequency,
    COUNT(DISTINCT user_id) AS user_count
FROM (
    SELECT 
        user_id,
        jsonb_array_elements_text(parsed_data->'skills') AS skill
    FROM resume_documents
    WHERE is_active = true
        AND parsed_data ? 'skills'
) AS skills
GROUP BY skill
HAVING COUNT(*) > 5
ORDER BY frequency DESC;

-- Index for top skills view
CREATE INDEX IF NOT EXISTS idx_top_skills_frequency 
    ON top_skills_view (frequency DESC);

CREATE INDEX IF NOT EXISTS idx_top_skills_name 
    ON top_skills_view (skill);

-- Recent activity materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS recent_activity_view AS
SELECT 
    user_id,
    'resume' AS activity_type,
    id AS document_id,
    filename AS title,
    created_at,
    NULL::DECIMAL AS score
FROM resume_documents
WHERE created_at > NOW() - INTERVAL '7 days'
    AND is_active = true

UNION ALL

SELECT 
    user_id,
    'job' AS activity_type,
    id AS document_id,
    job_title || ' at ' || company_name AS title,
    created_at,
    NULL::DECIMAL AS score
FROM job_documents
WHERE created_at > NOW() - INTERVAL '7 days'
    AND is_active = true

UNION ALL

SELECT 
    user_id,
    'optimization' AS activity_type,
    id AS document_id,
    'ATS Score: ' || COALESCE(ats_score::TEXT, 'N/A') AS title,
    created_at,
    ats_score AS score
FROM optimization_results
WHERE created_at > NOW() - INTERVAL '7 days'
    AND is_active = true

ORDER BY created_at DESC;

-- Index for recent activity view
CREATE INDEX IF NOT EXISTS idx_recent_activity_user 
    ON recent_activity_view (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recent_activity_type 
    ON recent_activity_view (activity_type);

-- =======================
-- REFRESH FUNCTIONS
-- =======================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_document_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_skills_view;
    REFRESH MATERIALIZED VIEW CONCURRENTLY recent_activity_view;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- STATISTICS CONFIGURATION
-- =======================

-- Increase statistics targets for JSONB columns
ALTER TABLE resume_documents ALTER COLUMN parsed_data SET STATISTICS 1000;
ALTER TABLE job_documents ALTER COLUMN parsed_data SET STATISTICS 1000;
ALTER TABLE optimization_results ALTER COLUMN optimized_content SET STATISTICS 1000;

-- =======================
-- QUERY OPTIMIZATION HINTS
-- =======================

-- Create custom statistics for correlated columns
CREATE STATISTICS IF NOT EXISTS resume_user_active_stats (dependencies) 
    ON user_id, is_active FROM resume_documents;

CREATE STATISTICS IF NOT EXISTS job_user_company_stats (dependencies, ndistinct) 
    ON user_id, company_name FROM job_documents;

CREATE STATISTICS IF NOT EXISTS optimization_scores_stats (dependencies) 
    ON ats_score, keyword_match_score FROM optimization_results;

-- =======================
-- PARTITIONING PREPARATION
-- =======================

-- Note: For large-scale deployments, consider partitioning these tables
-- Example partition strategy commented below:

-- Partition audit log by month
/*
CREATE TABLE document_audit_log_partitioned (
    LIKE document_audit_log INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for recent months
CREATE TABLE document_audit_log_2024_01 PARTITION OF document_audit_log_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
*/

-- =======================
-- MONITORING QUERIES
-- =======================

-- Create a function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    index_size TEXT,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT,
    usage_ratio DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname::TEXT,
        s.tablename::TEXT,
        s.indexname::TEXT,
        pg_size_pretty(pg_relation_size(s.indexrelid))::TEXT AS index_size,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch,
        CASE 
            WHEN s.idx_scan > 0 
            THEN ROUND((s.idx_tup_fetch::DECIMAL / s.idx_scan), 2)
            ELSE 0
        END AS usage_ratio
    FROM pg_stat_user_indexes s
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- VACUUM AND ANALYZE CONFIGURATION
-- =======================

-- Set aggressive autovacuum for frequently updated tables
ALTER TABLE resume_documents SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE job_documents SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE optimization_results SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- =======================
-- COMMENTS FOR DOCUMENTATION
-- =======================

COMMENT ON MATERIALIZED VIEW user_document_stats IS 'Aggregated statistics per user for dashboard displays';
COMMENT ON MATERIALIZED VIEW top_skills_view IS 'Most common skills across all resumes';
COMMENT ON MATERIALIZED VIEW recent_activity_view IS 'Recent user activity across all document types';
COMMENT ON FUNCTION refresh_materialized_views IS 'Refresh all materialized views concurrently';
COMMENT ON FUNCTION analyze_index_usage IS 'Analyze index usage statistics for optimization';