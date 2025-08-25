-- Migration 004: Create JSONB helper functions and utilities
-- ATSPro API - Helper functions for JSONB operations and search

-- =======================
-- JSONB MERGE FUNCTION
-- =======================
-- Deeply merges two JSONB objects
CREATE OR REPLACE FUNCTION jsonb_merge_deep(target JSONB, source JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    key TEXT;
BEGIN
    result := target;
    
    FOR key IN SELECT jsonb_object_keys(source)
    LOOP
        IF result ? key AND jsonb_typeof(result->key) = 'object' AND jsonb_typeof(source->key) = 'object' THEN
            result := jsonb_set(result, ARRAY[key], jsonb_merge_deep(result->key, source->key));
        ELSE
            result := jsonb_set(result, ARRAY[key], source->key);
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =======================
-- SKILLS EXTRACTION FUNCTION
-- =======================
-- Extracts unique skills from resume or job data
CREATE OR REPLACE FUNCTION extract_skills(document JSONB)
RETURNS TEXT[] AS $$
DECLARE
    skills TEXT[];
    technical_skills TEXT[];
    soft_skills TEXT[];
BEGIN
    -- Extract technical skills
    IF document ? 'technical_skills' THEN
        SELECT ARRAY_AGG(DISTINCT skill)
        INTO technical_skills
        FROM jsonb_array_elements_text(document->'technical_skills') AS skill;
    END IF;
    
    -- Extract soft skills
    IF document ? 'soft_skills' THEN
        SELECT ARRAY_AGG(DISTINCT skill)
        INTO soft_skills
        FROM jsonb_array_elements_text(document->'soft_skills') AS skill;
    END IF;
    
    -- Combine and return unique skills
    skills := ARRAY(
        SELECT DISTINCT unnest(
            COALESCE(technical_skills, ARRAY[]::TEXT[]) || 
            COALESCE(soft_skills, ARRAY[]::TEXT[])
        )
    );
    
    RETURN skills;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =======================
-- KEYWORD MATCHING FUNCTION
-- =======================
-- Calculates keyword match percentage between resume and job
CREATE OR REPLACE FUNCTION calculate_keyword_match(
    resume_keywords JSONB,
    job_keywords JSONB
)
RETURNS DECIMAL AS $$
DECLARE
    resume_words TEXT[];
    job_words TEXT[];
    matched_count INTEGER := 0;
    total_job_keywords INTEGER;
    match_percentage DECIMAL;
BEGIN
    -- Convert JSONB arrays to text arrays
    SELECT ARRAY_AGG(LOWER(keyword))
    INTO resume_words
    FROM jsonb_array_elements_text(resume_keywords) AS keyword;
    
    SELECT ARRAY_AGG(LOWER(keyword))
    INTO job_words
    FROM jsonb_array_elements_text(job_keywords) AS keyword;
    
    -- Count total job keywords
    total_job_keywords := COALESCE(array_length(job_words, 1), 0);
    
    IF total_job_keywords = 0 THEN
        RETURN 0;
    END IF;
    
    -- Count matches
    SELECT COUNT(*)
    INTO matched_count
    FROM unnest(job_words) AS job_word
    WHERE job_word = ANY(resume_words);
    
    -- Calculate percentage
    match_percentage := (matched_count::DECIMAL / total_job_keywords) * 100;
    
    RETURN ROUND(match_percentage, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =======================
-- SEARCH FUNCTION
-- =======================
-- Full-text search across JSONB documents
CREATE OR REPLACE FUNCTION search_documents(
    search_query TEXT,
    document_type TEXT DEFAULT 'resume'
)
RETURNS TABLE(
    id UUID,
    user_id TEXT,
    relevance REAL,
    snippet TEXT
) AS $$
BEGIN
    search_query := LOWER(search_query);
    
    IF document_type = 'resume' THEN
        RETURN QUERY
        SELECT 
            rd.id,
            rd.user_id,
            ts_rank(
                to_tsvector('english', rd.parsed_data::TEXT),
                plainto_tsquery('english', search_query)
            ) AS relevance,
            ts_headline(
                'english',
                rd.parsed_data::TEXT,
                plainto_tsquery('english', search_query),
                'MaxWords=50, MinWords=15, ShortWord=3, HighlightAll=FALSE'
            ) AS snippet
        FROM resume_documents rd
        WHERE rd.is_active = true
            AND to_tsvector('english', rd.parsed_data::TEXT) @@ plainto_tsquery('english', search_query)
        ORDER BY relevance DESC;
        
    ELSIF document_type = 'job' THEN
        RETURN QUERY
        SELECT 
            jd.id,
            jd.user_id,
            ts_rank(
                to_tsvector('english', jd.parsed_data::TEXT),
                plainto_tsquery('english', search_query)
            ) AS relevance,
            ts_headline(
                'english',
                jd.parsed_data::TEXT,
                plainto_tsquery('english', search_query),
                'MaxWords=50, MinWords=15, ShortWord=3, HighlightAll=FALSE'
            ) AS snippet
        FROM job_documents jd
        WHERE jd.is_active = true
            AND to_tsvector('english', jd.parsed_data::TEXT) @@ plainto_tsquery('english', search_query)
        ORDER BY relevance DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- SIMILARITY SCORING FUNCTION
-- =======================
-- Calculate similarity between two resumes or job descriptions
CREATE OR REPLACE FUNCTION calculate_similarity(
    doc1 JSONB,
    doc2 JSONB
)
RETURNS DECIMAL AS $$
DECLARE
    doc1_text TEXT;
    doc2_text TEXT;
    similarity_score DECIMAL;
BEGIN
    -- Convert JSONB to text for comparison
    doc1_text := doc1::TEXT;
    doc2_text := doc2::TEXT;
    
    -- Use pg_trgm similarity function
    similarity_score := similarity(doc1_text, doc2_text) * 100;
    
    RETURN ROUND(similarity_score, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =======================
-- GET USER DOCUMENTS FUNCTION
-- =======================
-- Retrieve all documents for a user with optional filtering
CREATE OR REPLACE FUNCTION get_user_documents(
    p_user_id TEXT,
    p_document_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    document_id UUID,
    document_type TEXT,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        -- Resume documents
        SELECT 
            id AS document_id,
            'resume'::TEXT AS document_type,
            COALESCE(parsed_data->>'name', filename) AS title,
            rd.created_at,
            rd.metadata
        FROM resume_documents rd
        WHERE rd.user_id = p_user_id 
            AND rd.is_active = true
            AND (p_document_type IS NULL OR p_document_type = 'resume')
        
        UNION ALL
        
        -- Job documents
        SELECT 
            id AS document_id,
            'job'::TEXT AS document_type,
            job_title || ' at ' || company_name AS title,
            jd.created_at,
            jd.metadata
        FROM job_documents jd
        WHERE jd.user_id = p_user_id 
            AND jd.is_active = true
            AND (p_document_type IS NULL OR p_document_type = 'job')
        
        UNION ALL
        
        -- Optimization results
        SELECT 
            id AS document_id,
            'optimization'::TEXT AS document_type,
            'Optimization: ' || optimization_type AS title,
            o.created_at,
            o.metadata
        FROM optimization_results o
        WHERE o.user_id = p_user_id 
            AND o.is_active = true
            AND (p_document_type IS NULL OR p_document_type = 'optimization')
        
        UNION ALL
        
        -- Research results
        SELECT 
            id AS document_id,
            'research'::TEXT AS document_type,
            company_name || ' (' || research_type || ')' AS title,
            r.created_at,
            r.metadata
        FROM research_results r
        WHERE r.user_id = p_user_id 
            AND r.is_active = true
            AND (p_document_type IS NULL OR p_document_type = 'research')
    ) AS all_docs
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- CLEANUP OLD DOCUMENTS FUNCTION
-- =======================
-- Remove expired documents and old versions
CREATE OR REPLACE FUNCTION cleanup_old_documents()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Delete expired job documents
    DELETE FROM job_documents
    WHERE expires_at < NOW() AND is_active = true;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Delete expired research results
    DELETE FROM research_results
    WHERE expires_at < NOW() AND is_active = true;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Delete old optimization versions (keep last 5 per resume)
    DELETE FROM optimization_results o1
    WHERE o1.id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY resume_id 
                ORDER BY created_at DESC
            ) AS rn
            FROM optimization_results
        ) o2
        WHERE rn > 5
    );
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Delete audit logs older than 90 days
    DELETE FROM document_audit_log
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- DUPLICATE DETECTION FUNCTION
-- =======================
-- Check if a document already exists based on hash
CREATE OR REPLACE FUNCTION check_duplicate_resume(
    p_user_id TEXT,
    p_file_hash VARCHAR(64)
)
RETURNS BOOLEAN AS $$
DECLARE
    duplicate_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM resume_documents
        WHERE user_id = p_user_id
            AND file_hash = p_file_hash
            AND is_active = true
    ) INTO duplicate_exists;
    
    RETURN duplicate_exists;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- ATS SCORE CALCULATION FUNCTION
-- =======================
-- Calculate comprehensive ATS score for a resume
CREATE OR REPLACE FUNCTION calculate_ats_score(
    resume_data JSONB,
    job_data JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    score DECIMAL := 0;
    format_score DECIMAL := 0;
    keyword_score DECIMAL := 0;
    readability_score DECIMAL := 0;
    result JSONB;
BEGIN
    -- Format scoring (40% weight)
    -- Check for required sections
    IF resume_data ? 'contact' THEN format_score := format_score + 10; END IF;
    IF resume_data ? 'summary' THEN format_score := format_score + 10; END IF;
    IF resume_data ? 'experience' THEN format_score := format_score + 10; END IF;
    IF resume_data ? 'education' THEN format_score := format_score + 5; END IF;
    IF resume_data ? 'skills' THEN format_score := format_score + 5; END IF;
    
    -- Keyword scoring (40% weight) - if job data provided
    IF job_data IS NOT NULL THEN
        keyword_score := calculate_keyword_match(
            COALESCE(resume_data->'keywords', '[]'::JSONB),
            COALESCE(job_data->'keywords', '[]'::JSONB)
        ) * 0.4;
    ELSE
        -- Generic keyword presence check
        IF jsonb_array_length(COALESCE(resume_data->'keywords', '[]'::JSONB)) > 10 THEN
            keyword_score := 30;
        ELSIF jsonb_array_length(COALESCE(resume_data->'keywords', '[]'::JSONB)) > 5 THEN
            keyword_score := 20;
        ELSE
            keyword_score := 10;
        END IF;
    END IF;
    
    -- Readability scoring (20% weight)
    -- Check for bullet points, action verbs, quantifiable achievements
    IF resume_data->'experience' IS NOT NULL THEN
        readability_score := 20; -- Simplified for this example
    END IF;
    
    -- Calculate total score
    score := format_score + keyword_score + readability_score;
    score := LEAST(score, 100); -- Cap at 100
    
    -- Build result JSON
    result := jsonb_build_object(
        'total_score', ROUND(score, 2),
        'format_score', ROUND(format_score, 2),
        'keyword_score', ROUND(keyword_score, 2),
        'readability_score', ROUND(readability_score, 2),
        'recommendations', jsonb_build_array(
            CASE WHEN format_score < 30 THEN 'Add missing resume sections' END,
            CASE WHEN keyword_score < 30 THEN 'Include more relevant keywords' END,
            CASE WHEN readability_score < 15 THEN 'Improve content readability' END
        ) - NULL
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- COMMENTS FOR DOCUMENTATION
-- =======================

COMMENT ON FUNCTION jsonb_merge_deep IS 'Deeply merges two JSONB objects, preserving nested structure';
COMMENT ON FUNCTION extract_skills IS 'Extracts unique skills from resume or job document JSONB';
COMMENT ON FUNCTION calculate_keyword_match IS 'Calculates percentage of job keywords present in resume';
COMMENT ON FUNCTION search_documents IS 'Full-text search across document JSONB with relevance ranking';
COMMENT ON FUNCTION calculate_similarity IS 'Calculate similarity percentage between two documents';
COMMENT ON FUNCTION get_user_documents IS 'Retrieve all documents for a user with optional type filtering';
COMMENT ON FUNCTION cleanup_old_documents IS 'Remove expired documents and old versions';
COMMENT ON FUNCTION check_duplicate_resume IS 'Check if resume with same hash already exists for user';
COMMENT ON FUNCTION calculate_ats_score IS 'Calculate comprehensive ATS score with breakdown';