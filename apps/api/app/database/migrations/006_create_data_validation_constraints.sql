-- Migration 006: Data validation constraints and integrity rules
-- ATSPro API - Comprehensive data validation for JSONB documents

-- =======================
-- JSONB SCHEMA VALIDATION FUNCTIONS
-- =======================

-- Validate resume JSONB structure
CREATE OR REPLACE FUNCTION validate_resume_jsonb()
RETURNS TRIGGER AS $$
BEGIN
    -- Check required fields
    IF NOT (NEW.parsed_data ? 'name') THEN
        RAISE EXCEPTION 'Resume must contain name field';
    END IF;
    
    IF NOT (NEW.parsed_data ? 'contact') THEN
        RAISE EXCEPTION 'Resume must contain contact information';
    END IF;
    
    -- Validate contact structure
    IF NEW.parsed_data->'contact' IS NOT NULL THEN
        IF NOT (NEW.parsed_data->'contact' ? 'email' OR 
                NEW.parsed_data->'contact' ? 'phone') THEN
            RAISE EXCEPTION 'Contact must contain email or phone';
        END IF;
    END IF;
    
    -- Validate email format if present
    IF NEW.parsed_data->'contact'->>'email' IS NOT NULL THEN
        IF NOT (NEW.parsed_data->'contact'->>'email' ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
            RAISE EXCEPTION 'Invalid email format in contact';
        END IF;
    END IF;
    
    -- Validate experience array structure
    IF NEW.parsed_data ? 'experience' THEN
        IF jsonb_typeof(NEW.parsed_data->'experience') != 'array' THEN
            RAISE EXCEPTION 'Experience must be an array';
        END IF;
    END IF;
    
    -- Validate education array structure
    IF NEW.parsed_data ? 'education' THEN
        IF jsonb_typeof(NEW.parsed_data->'education') != 'array' THEN
            RAISE EXCEPTION 'Education must be an array';
        END IF;
    END IF;
    
    -- Validate skills array structure
    IF NEW.parsed_data ? 'skills' THEN
        IF jsonb_typeof(NEW.parsed_data->'skills') != 'array' THEN
            RAISE EXCEPTION 'Skills must be an array';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate job JSONB structure
CREATE OR REPLACE FUNCTION validate_job_jsonb()
RETURNS TRIGGER AS $$
BEGIN
    -- Check required fields
    IF NOT (NEW.parsed_data ? 'description') THEN
        RAISE EXCEPTION 'Job must contain description field';
    END IF;
    
    -- Validate requirements array
    IF NEW.requirements IS NOT NULL THEN
        IF jsonb_typeof(NEW.requirements) != 'array' THEN
            RAISE EXCEPTION 'Requirements must be an array';
        END IF;
    END IF;
    
    -- Validate skills array
    IF NEW.skills IS NOT NULL THEN
        IF jsonb_typeof(NEW.skills) != 'array' THEN
            RAISE EXCEPTION 'Skills must be an array';
        END IF;
    END IF;
    
    -- Validate keywords array
    IF NEW.keywords IS NOT NULL THEN
        IF jsonb_typeof(NEW.keywords) != 'array' THEN
            RAISE EXCEPTION 'Keywords must be an array';
        END IF;
    END IF;
    
    -- Validate salary range format if present
    IF NEW.parsed_data->'salary' IS NOT NULL THEN
        IF NEW.parsed_data->'salary' ? 'min' AND 
           NEW.parsed_data->'salary' ? 'max' THEN
            IF (NEW.parsed_data->'salary'->>'min')::DECIMAL > 
               (NEW.parsed_data->'salary'->>'max')::DECIMAL THEN
                RAISE EXCEPTION 'Salary min cannot be greater than max';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate optimization JSONB structure
CREATE OR REPLACE FUNCTION validate_optimization_jsonb()
RETURNS TRIGGER AS $$
BEGIN
    -- Check required fields in optimized content
    IF NOT (NEW.optimized_content ? 'content') THEN
        RAISE EXCEPTION 'Optimization must contain content field';
    END IF;
    
    -- Validate suggestions array
    IF NEW.suggestions IS NOT NULL THEN
        IF jsonb_typeof(NEW.suggestions) != 'array' THEN
            RAISE EXCEPTION 'Suggestions must be an array';
        END IF;
    END IF;
    
    -- Validate keyword arrays
    IF NEW.matched_keywords IS NOT NULL THEN
        IF jsonb_typeof(NEW.matched_keywords) != 'array' THEN
            RAISE EXCEPTION 'Matched keywords must be an array';
        END IF;
    END IF;
    
    IF NEW.missing_keywords IS NOT NULL THEN
        IF jsonb_typeof(NEW.missing_keywords) != 'array' THEN
            RAISE EXCEPTION 'Missing keywords must be an array';
        END IF;
    END IF;
    
    -- Ensure scores are logical
    IF NEW.ats_score IS NOT NULL AND NEW.keyword_match_score IS NOT NULL THEN
        IF NEW.keyword_match_score > 100 OR NEW.ats_score > 100 THEN
            RAISE EXCEPTION 'Scores cannot exceed 100';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- APPLY VALIDATION TRIGGERS
-- =======================

-- Resume validation trigger
CREATE TRIGGER validate_resume_data
    BEFORE INSERT OR UPDATE ON resume_documents
    FOR EACH ROW
    EXECUTE FUNCTION validate_resume_jsonb();

-- Job validation trigger
CREATE TRIGGER validate_job_data
    BEFORE INSERT OR UPDATE ON job_documents
    FOR EACH ROW
    EXECUTE FUNCTION validate_job_jsonb();

-- Optimization validation trigger
CREATE TRIGGER validate_optimization_data
    BEFORE INSERT OR UPDATE ON optimization_results
    FOR EACH ROW
    EXECUTE FUNCTION validate_optimization_jsonb();

-- =======================
-- REFERENTIAL INTEGRITY CONSTRAINTS
-- =======================

-- Ensure user exists in better-auth before document creation
CREATE OR REPLACE FUNCTION check_user_exists()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "user" WHERE id = NEW.user_id) THEN
        RAISE EXCEPTION 'User % does not exist', NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply user existence check to all document tables
CREATE TRIGGER check_resume_user
    BEFORE INSERT ON resume_documents
    FOR EACH ROW
    EXECUTE FUNCTION check_user_exists();

CREATE TRIGGER check_job_user
    BEFORE INSERT ON job_documents
    FOR EACH ROW
    EXECUTE FUNCTION check_user_exists();

CREATE TRIGGER check_optimization_user
    BEFORE INSERT ON optimization_results
    FOR EACH ROW
    EXECUTE FUNCTION check_user_exists();

CREATE TRIGGER check_research_user
    BEFORE INSERT ON research_results
    FOR EACH ROW
    EXECUTE FUNCTION check_user_exists();

-- =======================
-- BUSINESS LOGIC CONSTRAINTS
-- =======================

-- Prevent duplicate active resumes with same hash
CREATE OR REPLACE FUNCTION prevent_duplicate_resume()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.file_hash IS NOT NULL AND NEW.is_active = true THEN
        IF EXISTS (
            SELECT 1 FROM resume_documents 
            WHERE user_id = NEW.user_id 
                AND file_hash = NEW.file_hash 
                AND is_active = true
                AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        ) THEN
            RAISE EXCEPTION 'Duplicate resume already exists for this user';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_resume_trigger
    BEFORE INSERT OR UPDATE ON resume_documents
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_resume();

-- Limit active resumes per user
CREATE OR REPLACE FUNCTION limit_active_resumes()
RETURNS TRIGGER AS $$
DECLARE
    active_count INTEGER;
    max_resumes INTEGER := 10; -- Configurable limit
BEGIN
    IF NEW.is_active = true THEN
        SELECT COUNT(*) INTO active_count
        FROM resume_documents
        WHERE user_id = NEW.user_id 
            AND is_active = true
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
        
        IF active_count >= max_resumes THEN
            RAISE EXCEPTION 'User has reached maximum number of active resumes (%)' , max_resumes;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER limit_active_resumes_trigger
    BEFORE INSERT OR UPDATE ON resume_documents
    FOR EACH ROW
    EXECUTE FUNCTION limit_active_resumes();

-- Validate optimization parent chain
CREATE OR REPLACE FUNCTION validate_optimization_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_optimization_id IS NOT NULL THEN
        -- Check parent exists and belongs to same user
        IF NOT EXISTS (
            SELECT 1 FROM optimization_results
            WHERE id = NEW.parent_optimization_id
                AND user_id = NEW.user_id
                AND resume_id = NEW.resume_id
        ) THEN
            RAISE EXCEPTION 'Invalid parent optimization reference';
        END IF;
        
        -- Prevent circular references
        IF NEW.parent_optimization_id = NEW.id THEN
            RAISE EXCEPTION 'Optimization cannot be its own parent';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_optimization_parent_trigger
    BEFORE INSERT OR UPDATE ON optimization_results
    FOR EACH ROW
    EXECUTE FUNCTION validate_optimization_parent();

-- =======================
-- AUDIT LOGGING TRIGGERS
-- =======================

-- Comprehensive audit logging function
CREATE OR REPLACE FUNCTION audit_document_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_document_type TEXT;
    v_changes JSONB;
BEGIN
    -- Determine document type
    CASE TG_TABLE_NAME
        WHEN 'resume_documents' THEN v_document_type := 'resume';
        WHEN 'job_documents' THEN v_document_type := 'job';
        WHEN 'optimization_results' THEN v_document_type := 'optimization';
        WHEN 'research_results' THEN v_document_type := 'research';
        ELSE v_document_type := TG_TABLE_NAME;
    END CASE;
    
    -- Calculate changes for updates
    IF TG_OP = 'UPDATE' THEN
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD)::JSONB - 'parsed_data' - 'optimized_content',
            'new', row_to_json(NEW)::JSONB - 'parsed_data' - 'optimized_content'
        );
    ELSE
        v_changes := '{}'::JSONB;
    END IF;
    
    -- Insert audit record
    INSERT INTO document_audit_log (
        user_id,
        document_type,
        document_id,
        action,
        changes
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        v_document_type,
        COALESCE(NEW.id, OLD.id),
        LOWER(TG_OP),
        v_changes
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to all document tables
CREATE TRIGGER audit_resume_changes
    AFTER INSERT OR UPDATE OR DELETE ON resume_documents
    FOR EACH ROW
    EXECUTE FUNCTION audit_document_changes();

CREATE TRIGGER audit_job_changes
    AFTER INSERT OR UPDATE OR DELETE ON job_documents
    FOR EACH ROW
    EXECUTE FUNCTION audit_document_changes();

CREATE TRIGGER audit_optimization_changes
    AFTER INSERT OR UPDATE OR DELETE ON optimization_results
    FOR EACH ROW
    EXECUTE FUNCTION audit_document_changes();

CREATE TRIGGER audit_research_changes
    AFTER INSERT OR UPDATE OR DELETE ON research_results
    FOR EACH ROW
    EXECUTE FUNCTION audit_document_changes();

-- =======================
-- DATA QUALITY CONSTRAINTS
-- =======================

-- Ensure dates are logical
ALTER TABLE resume_documents
    ADD CONSTRAINT resume_dates_check 
    CHECK (created_at <= updated_at);

ALTER TABLE job_documents
    ADD CONSTRAINT job_dates_check 
    CHECK (created_at <= updated_at);

ALTER TABLE job_documents
    ADD CONSTRAINT job_expiry_check 
    CHECK (expires_at IS NULL OR expires_at > created_at);

ALTER TABLE optimization_results
    ADD CONSTRAINT optimization_dates_check 
    CHECK (created_at <= updated_at);

ALTER TABLE research_results
    ADD CONSTRAINT research_dates_check 
    CHECK (created_at <= updated_at);

ALTER TABLE research_results
    ADD CONSTRAINT research_expiry_check 
    CHECK (expires_at IS NULL OR expires_at > created_at);

-- =======================
-- DOMAIN TYPES FOR VALIDATION
-- =======================

-- Create domain types for common fields
CREATE DOMAIN email_address AS TEXT
    CHECK (VALUE ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

CREATE DOMAIN url_address AS TEXT
    CHECK (VALUE ~ '^https?://[A-Za-z0-9.-]+\.[A-Za-z]{2,}');

CREATE DOMAIN percentage AS DECIMAL(5,2)
    CHECK (VALUE >= 0 AND VALUE <= 100);

-- =======================
-- CHECK CONSTRAINTS
-- =======================

-- Add additional check constraints
ALTER TABLE resume_documents
    ADD CONSTRAINT resume_version_positive 
    CHECK (version > 0);

ALTER TABLE optimization_results
    ADD CONSTRAINT optimization_version_positive 
    CHECK (version > 0);

ALTER TABLE tasks
    ADD CONSTRAINT tasks_dates_logical 
    CHECK (
        (started_at IS NULL OR started_at >= created_at) AND
        (completed_at IS NULL OR completed_at >= started_at)
    );

-- =======================
-- DEFAULT VALUE FUNCTIONS
-- =======================

-- Function to generate default metadata
CREATE OR REPLACE FUNCTION default_metadata()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'created_by', current_setting('app.current_user', true),
        'ip_address', inet_client_addr(),
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Apply default metadata to new records
ALTER TABLE resume_documents 
    ALTER COLUMN metadata SET DEFAULT default_metadata();

ALTER TABLE job_documents 
    ALTER COLUMN metadata SET DEFAULT default_metadata();

ALTER TABLE optimization_results 
    ALTER COLUMN metadata SET DEFAULT default_metadata();

ALTER TABLE research_results 
    ALTER COLUMN metadata SET DEFAULT default_metadata();

-- =======================
-- COMMENTS FOR DOCUMENTATION
-- =======================

COMMENT ON FUNCTION validate_resume_jsonb IS 'Validates resume JSONB structure and required fields';
COMMENT ON FUNCTION validate_job_jsonb IS 'Validates job posting JSONB structure';
COMMENT ON FUNCTION validate_optimization_jsonb IS 'Validates optimization result JSONB structure';
COMMENT ON FUNCTION check_user_exists IS 'Ensures user exists in better-auth before document creation';
COMMENT ON FUNCTION prevent_duplicate_resume IS 'Prevents duplicate resumes based on file hash';
COMMENT ON FUNCTION limit_active_resumes IS 'Limits number of active resumes per user';
COMMENT ON FUNCTION audit_document_changes IS 'Comprehensive audit logging for all document changes';
COMMENT ON DOMAIN email_address IS 'Validated email address format';
COMMENT ON DOMAIN url_address IS 'Validated URL format';
COMMENT ON DOMAIN percentage IS 'Percentage value between 0 and 100';