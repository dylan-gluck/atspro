-- Migration 007: Rollback procedures and utilities
-- ATSPro API - Safe rollback procedures for migration reversal

-- =======================
-- ROLLBACK PROCEDURES
-- =======================

-- Create schema for rollback procedures
CREATE SCHEMA IF NOT EXISTS rollback;

-- Procedure to safely drop document tables
CREATE OR REPLACE FUNCTION rollback.drop_document_tables()
RETURNS void AS $$
BEGIN
    -- Drop dependent objects first
    DROP MATERIALIZED VIEW IF EXISTS recent_activity_view CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS top_skills_view CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS user_document_stats CASCADE;
    
    -- Drop tables with CASCADE to remove dependent objects
    DROP TABLE IF EXISTS document_audit_log CASCADE;
    DROP TABLE IF EXISTS research_results CASCADE;
    DROP TABLE IF EXISTS optimization_results CASCADE;
    DROP TABLE IF EXISTS job_documents CASCADE;
    DROP TABLE IF EXISTS resume_documents CASCADE;
    
    RAISE NOTICE 'Document tables dropped successfully';
END;
$$ LANGUAGE plpgsql;

-- Procedure to drop helper functions
CREATE OR REPLACE FUNCTION rollback.drop_helper_functions()
RETURNS void AS $$
BEGIN
    -- Drop helper functions
    DROP FUNCTION IF EXISTS jsonb_merge_deep(JSONB, JSONB) CASCADE;
    DROP FUNCTION IF EXISTS extract_skills(JSONB) CASCADE;
    DROP FUNCTION IF EXISTS calculate_keyword_match(JSONB, JSONB) CASCADE;
    DROP FUNCTION IF EXISTS search_documents(TEXT, TEXT) CASCADE;
    DROP FUNCTION IF EXISTS calculate_similarity(JSONB, JSONB) CASCADE;
    DROP FUNCTION IF EXISTS get_user_documents(TEXT, TEXT, INTEGER, INTEGER) CASCADE;
    DROP FUNCTION IF EXISTS cleanup_old_documents() CASCADE;
    DROP FUNCTION IF EXISTS check_duplicate_resume(TEXT, VARCHAR) CASCADE;
    DROP FUNCTION IF EXISTS calculate_ats_score(JSONB, JSONB) CASCADE;
    DROP FUNCTION IF EXISTS refresh_materialized_views() CASCADE;
    DROP FUNCTION IF EXISTS analyze_index_usage() CASCADE;
    
    RAISE NOTICE 'Helper functions dropped successfully';
END;
$$ LANGUAGE plpgsql;

-- Procedure to drop validation functions and triggers
CREATE OR REPLACE FUNCTION rollback.drop_validation_objects()
RETURNS void AS $$
BEGIN
    -- Drop validation functions
    DROP FUNCTION IF EXISTS validate_resume_jsonb() CASCADE;
    DROP FUNCTION IF EXISTS validate_job_jsonb() CASCADE;
    DROP FUNCTION IF EXISTS validate_optimization_jsonb() CASCADE;
    DROP FUNCTION IF EXISTS check_user_exists() CASCADE;
    DROP FUNCTION IF EXISTS prevent_duplicate_resume() CASCADE;
    DROP FUNCTION IF EXISTS limit_active_resumes() CASCADE;
    DROP FUNCTION IF EXISTS validate_optimization_parent() CASCADE;
    DROP FUNCTION IF EXISTS audit_document_changes() CASCADE;
    DROP FUNCTION IF EXISTS default_metadata() CASCADE;
    
    -- Drop domain types
    DROP DOMAIN IF EXISTS email_address CASCADE;
    DROP DOMAIN IF EXISTS url_address CASCADE;
    DROP DOMAIN IF EXISTS percentage CASCADE;
    
    RAISE NOTICE 'Validation objects dropped successfully';
END;
$$ LANGUAGE plpgsql;

-- Master rollback procedure
CREATE OR REPLACE FUNCTION rollback.rollback_all_migrations()
RETURNS void AS $$
BEGIN
    -- Rollback in reverse order of creation
    PERFORM rollback.drop_validation_objects();
    PERFORM rollback.drop_helper_functions();
    PERFORM rollback.drop_document_tables();
    
    -- Drop text search configuration
    DROP TEXT SEARCH CONFIGURATION IF EXISTS resume_search CASCADE;
    
    -- Update migration history
    UPDATE migration_history 
    SET success = false,
        error_message = 'Rolled back'
    WHERE filename LIKE '003_%' 
       OR filename LIKE '004_%' 
       OR filename LIKE '005_%' 
       OR filename LIKE '006_%';
    
    RAISE NOTICE 'All document migrations rolled back successfully';
END;
$$ LANGUAGE plpgsql;

-- =======================
-- BACKUP PROCEDURES
-- =======================

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup;

-- Procedure to backup document data before migration
CREATE OR REPLACE FUNCTION backup.backup_document_data()
RETURNS TABLE(
    table_name TEXT,
    record_count BIGINT
) AS $$
BEGIN
    -- This would be implemented to backup data to backup schema
    -- before any major migration or schema change
    RAISE NOTICE 'Backup functionality placeholder - implement based on specific needs';
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- MIGRATION STATUS CHECK
-- =======================

-- Function to check migration status
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS TABLE(
    migration_file TEXT,
    status TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_time_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mh.filename::TEXT AS migration_file,
        CASE 
            WHEN mh.success THEN 'Completed'
            ELSE 'Failed'
        END::TEXT AS status,
        mh.executed_at,
        mh.execution_time_ms
    FROM migration_history mh
    WHERE mh.filename LIKE '00%'
    ORDER BY mh.filename;
END;
$$ LANGUAGE plpgsql;

-- Function to verify schema integrity
CREATE OR REPLACE FUNCTION verify_schema_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if core tables exist
    RETURN QUERY
    SELECT 
        'Core Tables'::TEXT,
        CASE 
            WHEN COUNT(*) = 5 THEN 'OK'
            ELSE 'Missing'
        END::TEXT,
        'Expected 5 tables, found ' || COUNT(*)::TEXT
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name IN (
            'resume_documents',
            'job_documents',
            'optimization_results',
            'research_results',
            'document_audit_log'
        );
    
    -- Check if indexes exist
    RETURN QUERY
    SELECT 
        'Indexes'::TEXT,
        CASE 
            WHEN COUNT(*) > 50 THEN 'OK'
            ELSE 'Insufficient'
        END::TEXT,
        'Found ' || COUNT(*)::TEXT || ' indexes'
    FROM pg_indexes
    WHERE schemaname = 'public'
        AND tablename IN (
            'resume_documents',
            'job_documents',
            'optimization_results',
            'research_results'
        );
    
    -- Check if functions exist
    RETURN QUERY
    SELECT 
        'Helper Functions'::TEXT,
        CASE 
            WHEN COUNT(*) >= 9 THEN 'OK'
            ELSE 'Missing'
        END::TEXT,
        'Found ' || COUNT(*)::TEXT || ' functions'
    FROM information_schema.routines
    WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        AND routine_name IN (
            'jsonb_merge_deep',
            'extract_skills',
            'calculate_keyword_match',
            'search_documents',
            'calculate_similarity',
            'get_user_documents',
            'cleanup_old_documents',
            'check_duplicate_resume',
            'calculate_ats_score'
        );
    
    -- Check materialized views
    RETURN QUERY
    SELECT 
        'Materialized Views'::TEXT,
        CASE 
            WHEN COUNT(*) = 3 THEN 'OK'
            ELSE 'Missing'
        END::TEXT,
        'Found ' || COUNT(*)::TEXT || ' materialized views'
    FROM pg_matviews
    WHERE schemaname = 'public'
        AND matviewname IN (
            'user_document_stats',
            'top_skills_view',
            'recent_activity_view'
        );
    
    -- Check foreign key constraints
    RETURN QUERY
    SELECT 
        'Foreign Keys'::TEXT,
        CASE 
            WHEN COUNT(*) >= 4 THEN 'OK'
            ELSE 'Missing'
        END::TEXT,
        'Found ' || COUNT(*)::TEXT || ' foreign key constraints'
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
        AND table_name IN (
            'resume_documents',
            'job_documents',
            'optimization_results',
            'research_results'
        );
END;
$$ LANGUAGE plpgsql;

-- =======================
-- DATA MIGRATION HELPERS
-- =======================

-- Function to migrate data from ArangoDB format to PostgreSQL
CREATE OR REPLACE FUNCTION migrate_arango_document(
    p_user_id TEXT,
    p_document_type TEXT,
    p_arango_data JSONB
)
RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
BEGIN
    -- This is a placeholder for actual data migration logic
    -- Would be implemented based on specific ArangoDB structure
    
    IF p_document_type = 'resume' THEN
        INSERT INTO resume_documents (
            user_id,
            filename,
            content_type,
            file_size,
            parsed_data,
            metadata
        ) VALUES (
            p_user_id,
            COALESCE(p_arango_data->>'filename', 'imported_resume.pdf'),
            COALESCE(p_arango_data->>'content_type', 'application/pdf'),
            COALESCE((p_arango_data->>'file_size')::INTEGER, 0),
            p_arango_data,
            jsonb_build_object('imported_from', 'arangodb', 'import_date', NOW())
        )
        RETURNING id INTO v_new_id;
        
    ELSIF p_document_type = 'job' THEN
        INSERT INTO job_documents (
            user_id,
            company_name,
            job_title,
            parsed_data,
            metadata
        ) VALUES (
            p_user_id,
            COALESCE(p_arango_data->>'company', 'Unknown Company'),
            COALESCE(p_arango_data->>'title', 'Unknown Position'),
            p_arango_data,
            jsonb_build_object('imported_from', 'arangodb', 'import_date', NOW())
        )
        RETURNING id INTO v_new_id;
    END IF;
    
    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- COMMENTS FOR DOCUMENTATION
-- =======================

COMMENT ON SCHEMA rollback IS 'Schema containing rollback procedures for migrations';
COMMENT ON SCHEMA backup IS 'Schema for data backup procedures';
COMMENT ON FUNCTION rollback.rollback_all_migrations IS 'Master rollback procedure to revert all document-related migrations';
COMMENT ON FUNCTION check_migration_status IS 'Check status of all migrations';
COMMENT ON FUNCTION verify_schema_integrity IS 'Verify that all expected schema objects exist';
COMMENT ON FUNCTION migrate_arango_document IS 'Helper function to migrate documents from ArangoDB to PostgreSQL';