# PostgreSQL Migration Schema Design

## Executive Summary

This document outlines the migration plan from ArangoDB to PostgreSQL for the ATSPro application. The migration consolidates all data storage into PostgreSQL while maintaining compatibility with the existing better-auth schema and leveraging JSONB columns for document-oriented data.

## Current ArangoDB Collection Structure

### 1. Resumes Collection
**Purpose**: Stores parsed resume data and metadata
**Key Fields**:
- `_key`: Unique resume identifier (UUID)
- `user_id`: References better-auth user
- `task_id`: Associated parsing task ID
- `status`: "parsing" | "parsed" | "failed" | "manual"
- `source`: "upload" | "manual"
- `resume_data`: Structured resume content (JSON)
- `file_metadata`: Original file information
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp
- `error_message`: Error details if failed

### 2. Jobs Collection
**Purpose**: Stores parsed job descriptions and metadata
**Key Fields**:
- `_key`: Unique job identifier (UUID)
- `user_id`: References better-auth user
- `type`: "job"
- `status`: "pending" | "completed" | "failed"
- `parsed_data`: Structured job information (JSON)
- `source_url`: Original job posting URL
- `source_type`: "url" | "document"
- `source_filename`: If uploaded as document
- `scores`: Scoring results (optional)
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp
- `error_message`: Error details if failed

### 3. Documents Collection
**Purpose**: Stores optimization and research results
**Key Fields**:
- `_key`: Unique document identifier (UUID)
- `user_id`: References better-auth user
- `type`: "optimization" | "research" | "score"
- `resume_id`: Source resume reference
- `job_id`: Source job reference
- `result`: Optimization/research output (JSON)
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp

## Existing PostgreSQL Auth Schema Analysis

### Current Tables (from better-auth):
1. **user** - Authentication users
   - `id` (text): Primary key
   - Core user authentication fields

2. **session** - User sessions
   - References user.id

3. **account** - OAuth/social accounts
   - References user.id

4. **verification** - Email/phone verification

5. **tasks** - Async task tracking (already migrated)
   - References user.id
   - Tracks background processing

6. **user_profiles** - Extended user profiles (already migrated)
   - References user.id
   - Tracks onboarding status with resume_id

## Proposed PostgreSQL Table Structure

### 1. resumes
```sql
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    legacy_id TEXT UNIQUE, -- For migration: stores ArangoDB _key
    task_id UUID REFERENCES tasks(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    source VARCHAR(20) DEFAULT 'upload',
    resume_data JSONB NOT NULL DEFAULT '{}',
    file_metadata JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT resumes_status_check 
        CHECK (status IN ('pending', 'parsing', 'parsed', 'failed', 'manual')),
    CONSTRAINT resumes_source_check 
        CHECK (source IN ('upload', 'manual', 'import'))
);

-- Indexes for performance
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_status ON resumes(status);
CREATE INDEX idx_resumes_created_at ON resumes(created_at DESC);
CREATE INDEX idx_resumes_legacy_id ON resumes(legacy_id) WHERE legacy_id IS NOT NULL;

-- JSONB indexes for common queries
CREATE INDEX idx_resumes_data_full_name ON resumes 
    USING gin ((resume_data -> 'contact_info' -> 'full_name'));
CREATE INDEX idx_resumes_data_skills ON resumes 
    USING gin ((resume_data -> 'skills'));
CREATE INDEX idx_resumes_data_search ON resumes 
    USING gin (resume_data);
```

### 2. jobs
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    legacy_id TEXT UNIQUE, -- For migration: stores ArangoDB _key
    task_id UUID REFERENCES tasks(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    source_type VARCHAR(20) DEFAULT 'url',
    source_url TEXT,
    source_filename TEXT,
    parsed_data JSONB NOT NULL DEFAULT '{}',
    scores JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT jobs_status_check 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT jobs_source_type_check 
        CHECK (source_type IN ('url', 'document', 'manual'))
);

-- Indexes for performance
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_legacy_id ON jobs(legacy_id) WHERE legacy_id IS NOT NULL;

-- JSONB indexes for common queries
CREATE INDEX idx_jobs_data_company ON jobs 
    USING gin ((parsed_data -> 'company'));
CREATE INDEX idx_jobs_data_title ON jobs 
    USING gin ((parsed_data -> 'title'));
CREATE INDEX idx_jobs_data_search ON jobs 
    USING gin (parsed_data);
```

### 3. optimization_results
```sql
CREATE TABLE optimization_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    legacy_id TEXT UNIQUE, -- For migration: stores ArangoDB _key
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id),
    result_type VARCHAR(20) NOT NULL,
    result_data JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT optimization_result_type_check 
        CHECK (result_type IN ('optimization', 'research', 'score', 'analysis'))
);

-- Indexes for performance
CREATE INDEX idx_optimization_results_user_id ON optimization_results(user_id);
CREATE INDEX idx_optimization_results_resume_id ON optimization_results(resume_id);
CREATE INDEX idx_optimization_results_job_id ON optimization_results(job_id);
CREATE INDEX idx_optimization_results_type ON optimization_results(result_type);
CREATE INDEX idx_optimization_results_created_at ON optimization_results(created_at DESC);
CREATE INDEX idx_optimization_results_legacy_id ON optimization_results(legacy_id) WHERE legacy_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_optimization_results_user_type ON optimization_results(user_id, result_type);
CREATE INDEX idx_optimization_results_resume_job ON optimization_results(resume_id, job_id);
```

## JSONB Column Designs

### resume_data Structure
```json
{
  "contact_info": {
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "links": [{"name": "string", "url": "string"}]
  },
  "summary": "string",
  "work_experience": [{
    "company": "string",
    "position": "string",
    "start_date": "string",
    "end_date": "string",
    "is_current": "boolean",
    "description": "string",
    "responsibilities": ["string"],
    "skills": ["string"]
  }],
  "education": [{
    "institution": "string",
    "degree": "string",
    "field_of_study": "string",
    "graduation_date": "string",
    "gpa": "number",
    "honors": ["string"],
    "relevant_courses": ["string"],
    "skills": ["string"]
  }],
  "certifications": [{
    "name": "string",
    "issuer": "string",
    "date_obtained": "string",
    "expiration_date": "string",
    "credential_id": "string"
  }],
  "skills": ["string"]
}
```

### parsed_data Structure (Jobs)
```json
{
  "company": "string",
  "title": "string",
  "description": "string",
  "salary": "string",
  "responsibilities": ["string"],
  "qualifications": ["string"],
  "logistics": ["string"],
  "location": ["string"],
  "additional_info": ["string"],
  "link": "string"
}
```

## Index Strategy for Performance

### Primary Indexes
1. **Foreign Keys**: All foreign key columns automatically indexed
2. **Status Columns**: For filtering active/completed items
3. **Timestamps**: For sorting and time-based queries
4. **Legacy IDs**: For migration lookups (partial index, only non-null values)

### JSONB Indexes
1. **GIN Indexes**: For full-text search within JSON documents
2. **Path-specific Indexes**: For frequently queried JSON fields
3. **Composite Indexes**: For common multi-column queries

### Query Optimization
- Use `jsonb_path_query` for complex JSON queries
- Leverage partial indexes for status-based queries
- Consider materialized views for complex aggregations

## Migration Complexity Assessment

### Low Complexity
1. **Schema Creation**: Straightforward table creation with proper constraints
2. **Better-auth Compatibility**: Foreign keys properly reference existing user table
3. **Index Creation**: Standard PostgreSQL indexing patterns

### Medium Complexity
1. **Data Migration**: Need to preserve document IDs during migration
2. **JSONB Queries**: Rewrite AQL queries to PostgreSQL JSON operators
3. **Application Code**: Update service layers to use PostgreSQL

### High Complexity
1. **Full-text Search**: Migrate ArangoDB's CONTAINS searches to PostgreSQL FTS
2. **Complex AQL Queries**: Some multi-collection joins need redesign
3. **Performance Tuning**: JSONB query optimization may require iteration

## Performance Optimization Strategy

### 1. Query Optimization
- Use prepared statements for all queries
- Implement connection pooling (already in place)
- Add query result caching for frequently accessed data

### 2. Index Optimization
- Monitor slow query logs
- Add indexes based on actual query patterns
- Use EXPLAIN ANALYZE for query planning

### 3. JSONB Performance
- Consider jsonb_populate_record for structured extraction
- Use jsonb operators efficiently (?, @>, <@)
- Implement partial indexes for common filters

### 4. Partitioning Strategy (Future)
- Consider partitioning large tables by created_at
- Implement archiving for old optimization results
- Use table inheritance for similar document types

## Migration Challenges & Solutions

### Challenge 1: Document ID Preservation
**Issue**: ArangoDB uses string _key, PostgreSQL uses UUID
**Solution**: Add legacy_id column for backward compatibility during migration

### Challenge 2: Full-Text Search
**Issue**: ArangoDB CONTAINS vs PostgreSQL FTS
**Solution**: 
- Use PostgreSQL's to_tsvector/to_tsquery for text search
- Create GIN indexes on tsvector columns
- Consider pg_trgm extension for fuzzy matching

### Challenge 3: Complex Nested Queries
**Issue**: AQL's nested loops vs PostgreSQL's JSON operators
**Solution**:
- Use LATERAL joins for complex JSON array queries
- Implement CTEs for multi-step queries
- Consider stored procedures for very complex operations

### Challenge 4: Data Consistency During Migration
**Issue**: Maintaining data integrity during transition
**Solution**:
- Implement dual-write pattern initially
- Use database triggers for consistency
- Plan phased migration with verification steps

## Migration Steps

### Phase 1: Schema Setup
1. Create new PostgreSQL tables
2. Add all indexes and constraints
3. Verify foreign key relationships

### Phase 2: Data Migration
1. Export ArangoDB data to JSON
2. Transform data to match new schema
3. Bulk insert with legacy_id preservation
4. Verify data integrity

### Phase 3: Application Update
1. Update database connection layer
2. Rewrite queries from AQL to SQL
3. Update service layer methods
4. Comprehensive testing

### Phase 4: Cutover
1. Stop writes to ArangoDB
2. Final data sync
3. Switch application to PostgreSQL
4. Monitor performance

### Phase 5: Cleanup
1. Remove ArangoDB dependencies
2. Drop legacy_id columns (after verification)
3. Optimize queries based on production usage

## Monitoring & Maintenance

### Key Metrics
- Query response times
- Index usage statistics
- JSONB query performance
- Connection pool utilization

### Maintenance Tasks
- Regular VACUUM and ANALYZE
- Index rebuilding as needed
- Query plan monitoring
- JSONB statistics updates

## Conclusion

The migration from ArangoDB to PostgreSQL is achievable with moderate complexity. The proposed schema maintains full compatibility with the existing better-auth tables while providing efficient storage and querying of document-oriented data through JSONB columns. The phased migration approach minimizes risk and allows for verification at each step.

Key benefits of this migration:
1. **Simplified Infrastructure**: Single database system
2. **Better Integration**: Native foreign keys with auth tables
3. **Mature Ecosystem**: PostgreSQL's extensive tooling and extensions
4. **Cost Reduction**: Elimination of ArangoDB licensing/hosting costs
5. **Improved Performance**: Optimized indexes and query patterns