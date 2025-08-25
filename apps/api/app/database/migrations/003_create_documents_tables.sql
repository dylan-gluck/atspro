-- Create resume_documents table with JSONB storage
-- Compatible with existing better-auth schema (user table uses text id)
CREATE TABLE IF NOT EXISTS resume_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    file_size INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    source VARCHAR(50) DEFAULT 'upload',
    parsed_data JSONB NOT NULL DEFAULT '{}',
    file_metadata JSONB DEFAULT '{}',
    task_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_documents_user_id ON resume_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_documents_status ON resume_documents(status);
CREATE INDEX IF NOT EXISTS idx_resume_documents_created_at ON resume_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_documents_user_status ON resume_documents(user_id, status);

-- GIN index for JSONB columns for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_resume_documents_parsed_data ON resume_documents USING GIN (parsed_data);
CREATE INDEX IF NOT EXISTS idx_resume_documents_file_metadata ON resume_documents USING GIN (file_metadata);

-- Full-text search index on resume content (using extracted text from parsed_data)
CREATE INDEX IF NOT EXISTS idx_resume_documents_fulltext ON resume_documents USING GIN (
    to_tsvector('english', 
        COALESCE(parsed_data->>'summary', '') || ' ' ||
        COALESCE(parsed_data->>'skills', '') || ' ' ||
        COALESCE(parsed_data->'contact_info'->>'full_name', '')
    )
);

-- Create job_documents table
CREATE TABLE IF NOT EXISTS job_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    parsed_data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for job_documents
CREATE INDEX IF NOT EXISTS idx_job_documents_user_id ON job_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_status ON job_documents(status);
CREATE INDEX IF NOT EXISTS idx_job_documents_created_at ON job_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_documents_parsed_data ON job_documents USING GIN (parsed_data);

-- Create optimization_results table
CREATE TABLE IF NOT EXISTS optimization_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resume_documents(id) ON DELETE CASCADE,
    job_id UUID REFERENCES job_documents(id) ON DELETE CASCADE,
    optimization_data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimization_results
CREATE INDEX IF NOT EXISTS idx_optimization_results_user_id ON optimization_results(user_id);
CREATE INDEX IF NOT EXISTS idx_optimization_results_resume_id ON optimization_results(resume_id);
CREATE INDEX IF NOT EXISTS idx_optimization_results_job_id ON optimization_results(job_id);
CREATE INDEX IF NOT EXISTS idx_optimization_results_created_at ON optimization_results(created_at DESC);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to resume_documents
CREATE TRIGGER update_resume_documents_updated_at BEFORE UPDATE ON resume_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply the trigger to job_documents
CREATE TRIGGER update_job_documents_updated_at BEFORE UPDATE ON job_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();