---
description: Migrate from dual-database architecture (PostgreSQL + ArangoDB) to PostgreSQL-only using JSONB for document storage
argument-hint: [--preserve-data] [--test-migration]
---

# Migrate to PostgreSQL-Only Architecture

This workflow orchestrates the complete migration from the current dual-database architecture (PostgreSQL for users, ArangoDB for documents) to a PostgreSQL-only architecture using JSONB columns for document storage. This eliminates database complexity and resolves the user profile connection issues identified in E2E testing.

## Initial Context

- Project root: `/Users/dylan/Workspace/projects/atspro`
- Key documentation:
  - `/Users/dylan/Workspace/projects/atspro/CLAUDE.md`
  - `/Users/dylan/Workspace/projects/atspro/docs/tests/e2e-test-report-2025-08-24.md`
- Related specifications:
  - Current database schema: `apps/api/app/database/connections.py`
  - Current data models: `apps/api/app/models/`
  - Existing auth schema: `apps/web/better-auth_migrations/2025-08-13T19-23-23.791Z.sql`
- Prerequisites:
  - Docker environment running (`pnpm docker:dev`)
  - Current system working for core processing (verified in E2E tests)
  - Data backup strategy in place
  - PostgreSQL MCP tools available for validation

## Todo Setup

Initialize progress tracking for implementation phases:

<TodoWrite>
# PostgreSQL Migration Progress

## Phase 1: Database Schema Design
- [ ] Analyze current ArangoDB data structures
- [ ] Design PostgreSQL tables with JSONB columns
- [ ] Create migration SQL scripts
- [ ] Design indexes for performance
- [ ] Create database migration utilities

## Phase 2: Service Layer Migration
- [ ] Update database connections to PostgreSQL-only
- [ ] Migrate resume service to use PostgreSQL JSONB
- [ ] Migrate job service to use PostgreSQL JSONB
- [ ] Migrate optimization service to use PostgreSQL JSONB
- [ ] Update all database queries and operations

## Phase 3: API Endpoint Updates
- [ ] Update all API endpoints for new database schema
- [ ] Test endpoint functionality with PostgreSQL
- [ ] Update response models if needed
- [ ] Verify data consistency and relationships

## Phase 4: Data Migration
- [ ] Create data export utilities from ArangoDB
- [ ] Create data import utilities to PostgreSQL
- [ ] Execute data migration with validation
- [ ] Verify data integrity post-migration

## Phase 5: Infrastructure Updates
- [ ] Remove ArangoDB from Docker configuration
- [ ] Update environment variables and configuration
- [ ] Remove ArangoDB dependencies from codebase
- [ ] Update deployment scripts

## Final Phase: Testing and Validation
- [ ] Update unit tests for PostgreSQL-only
- [ ] Run comprehensive E2E tests
- [ ] Performance testing with PostgreSQL
- [ ] Documentation updates
- [ ] Production readiness assessment
</TodoWrite>

## Phase 1: Database Schema Design

Analyze current data structures and design PostgreSQL schema to replace ArangoDB collections.

### 1.1 Analyze Current Data Structures

<Task>
You are fullstack-eng. Analyze the current ArangoDB data structures and design a PostgreSQL schema.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Examine the current data structures:
1. **Read existing PostgreSQL schema** - `apps/web/better-auth_migrations/2025-08-13T19-23-23.791Z.sql`
2. **Read current database connections** - `apps/api/app/database/connections.py`
3. **Analyze data models** - Review all models in `apps/api/app/models/`
4. **Identify ArangoDB collections** currently used:
   - Resume documents
   - Job documents  
   - Optimization results
   - Any other document collections

Document current schema:
1. **Review existing auth tables** - user, session, account, verification
2. **Map ArangoDB collections to PostgreSQL tables** (avoiding conflicts with existing schema)
3. **Identify document fields** that will become JSONB columns
4. **Design relational structure** using existing user table as foreign key
5. **Plan indexing strategy** for JSONB queries

Create schema design document at: `docs/database/postgresql-migration-schema.md`

Include:
- Current ArangoDB collection structure
- Existing PostgreSQL auth schema compatibility analysis
- Proposed PostgreSQL table structure (compatible with existing user table)
- JSONB column designs
- Index strategy for performance
- Migration complexity assessment

After completion, update the todo item "Analyze current ArangoDB data structures" as complete.
</Task>

### 1.2 Create Migration SQL Scripts

<Task>
You are fullstack-eng. Create comprehensive PostgreSQL migration scripts.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Create migration scripts in `apps/api/app/database/migrations/`:

1. **003_create_documents_tables.sql**:
   ```sql
   -- Create resume_documents table with JSONB storage
   -- Compatible with existing better-auth schema (user table uses text id)
   CREATE TABLE resume_documents (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id TEXT NOT NULL REFERENCES "user"(id),
       filename VARCHAR(255) NOT NULL,
       content_type VARCHAR(100) NOT NULL,
       file_size INTEGER NOT NULL,
       parsed_data JSONB NOT NULL,
       metadata JSONB DEFAULT '{}',
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Add similar tables for jobs, optimizations, etc.
   -- Note: user_id as TEXT to match better-auth schema
   ```

2. **Create indexes for JSONB performance**:
   - GIN indexes for JSONB columns
   - Composite indexes for user queries
   - Full-text search indexes if needed

3. **Create helper functions** for JSONB operations
4. **Create data validation constraints**

Quality requirements:
- Production-ready SQL with proper constraints
- Performance-optimized indexes
- Data integrity constraints
- Proper foreign key relationships with existing better-auth schema
- Compatible with existing "user" table (TEXT id field)

**Validation step**: Use PostgreSQL MCP tools to verify schema changes:
```
mcp__postgres__query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('resume_documents', 'job_documents')")
```

After completion, update the todo item "Create migration SQL scripts" as complete.
</Task>

### 1.3 Design Performance Indexes

Steps to complete:
1. Create GIN indexes for JSONB columns
2. Design composite indexes for common query patterns
3. Add full-text search indexes for resume/job content
4. Create unique constraints where needed
5. Benchmark index performance

Expected outcome: Optimized database performance for document queries

## Phase 2: Service Layer Migration (Parallel Execution)

Update all services to use PostgreSQL instead of ArangoDB.

### 2.1 Update Database Connections

<Task>
You are fullstack-eng. Update database connections to PostgreSQL-only.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Modify `apps/api/app/database/connections.py`:

1. **Remove ArangoDB connections**:
   - Remove ArangoDB client initialization
   - Remove ArangoDB connection pooling
   - Remove ArangoDB health checks

2. **Enhance PostgreSQL connections**:
   - Optimize connection pooling settings
   - Add JSONB query utilities
   - Create document operation helpers

3. **Create PostgreSQL document utilities**:
   ```python
   async def store_document(
       table: str, 
       user_id: str, 
       data: dict, 
       metadata: dict = None
   ) -> str:
       # Store document in PostgreSQL JSONB column
   
   async def get_document(
       table: str, 
       doc_id: str, 
       user_id: str
   ) -> dict:
       # Retrieve document from PostgreSQL
   ```

4. **Update health checks** to only check PostgreSQL
5. **Update dependency injection** in `dependencies.py`

**Validation step**: Use PostgreSQL MCP tools to verify connection health:
```
mcp__postgres__query("SELECT 1 as health_check")
```

After completion, update the todo item "Update database connections to PostgreSQL-only" as complete.
</Task>

### 2.2 Migrate Resume Service

<Task>
You are fullstack-eng. Migrate resume service to use PostgreSQL JSONB storage.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Update `apps/api/app/services/resume_processor.py` and `apps/api/app/services/resume_service.py`:

1. **Update storage methods**:
   - Replace ArangoDB calls with PostgreSQL JSONB operations
   - Use prepared statements for JSONB queries
   - Maintain same service interface

2. **Update query methods**:
   - Convert AQL queries to SQL with JSONB operations
   - Use PostgreSQL JSON operators for filtering
   - Optimize queries for performance

3. **Update data validation**:
   - Ensure JSONB data matches Pydantic models
   - Add JSON schema validation if needed

4. **Test service methods**:
   - Verify all CRUD operations work
   - Test complex queries on JSONB data
   - Validate performance

Quality requirements:
- Maintain existing service interface
- No breaking changes to API contracts
- Optimized JSONB queries
- Proper error handling
- Compatible with better-auth user schema (TEXT id)

**Validation step**: Use PostgreSQL MCP tools to verify resume operations:
```
mcp__postgres__query("SELECT id, user_id, filename, created_at FROM resume_documents LIMIT 5")
```

After completion, update the todo item "Migrate resume service to use PostgreSQL JSONB" as complete.
</Task>

### 2.3 Migrate Job Service

<Task>
You are fullstack-eng. Migrate job service to use PostgreSQL JSONB storage.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Update `apps/api/app/services/job_processor.py` and `apps/api/app/services/job_service.py`:

1. **Convert job document storage** to PostgreSQL JSONB
2. **Update job search and filtering** using PostgreSQL JSON operators
3. **Migrate job metadata storage** to JSONB columns
4. **Update job relationship queries** using JOIN operations

**Validation step**: Use PostgreSQL MCP tools to verify job operations:
```
mcp__postgres__query("SELECT id, user_id, created_at FROM job_documents LIMIT 5")
```

After completion, update the todo item "Migrate job service to use PostgreSQL JSONB" as complete.
</Task>

### 2.4 Migrate Optimization Service

<Task>
You are fullstack-eng. Migrate optimization service to use PostgreSQL JSONB storage.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Update `apps/api/app/services/optimization_processor.py` and related services:

1. **Store optimization results** in PostgreSQL JSONB columns
2. **Update optimization history queries** using JSON operators
3. **Migrate optimization metadata** to relational columns
4. **Update cross-document queries** using JOINs

**Validation step**: Use PostgreSQL MCP tools to verify optimization operations:
```
mcp__postgres__query("SELECT id, user_id, created_at FROM optimization_results LIMIT 5")
```

After completion, update the todo item "Migrate optimization service to use PostgreSQL JSONB" as complete.
</Task>

## Phase 3: API Endpoint Updates

Update all API endpoints to work with PostgreSQL-only architecture.

### 3.1 Update All API Endpoints

<Task>
You are fullstack-eng. Update all API endpoints for PostgreSQL-only architecture.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Review and update all router files:
- `apps/api/app/routers/parse.py`
- `apps/api/app/routers/job.py`
- `apps/api/app/routers/resume.py`
- `apps/api/app/routers/optimize.py`
- `apps/api/app/routers/user.py`

Ensure:
1. **All endpoints work** with new PostgreSQL services
2. **Response models match** new data structures
3. **Error handling** works correctly
4. **Performance is acceptable** for JSONB queries

Quality requirements:
- No breaking API changes
- Maintain same response formats
- Proper error handling
- Performance testing
- User ID compatibility with better-auth (TEXT type)

**Validation step**: Use PostgreSQL MCP tools to verify endpoint data access:
```
mcp__postgres__query("SELECT COUNT(*) as total_documents, COUNT(DISTINCT user_id) as total_users FROM resume_documents")
```

After completion, update the todo item "Update all API endpoints for new database schema" as complete.
</Task>

## Phase 4: Data Migration

Migrate existing data from ArangoDB to PostgreSQL.

### 4.1 Create Data Migration Utilities

<Task>
You are fullstack-eng. Create utilities to migrate data from ArangoDB to PostgreSQL.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Create `apps/api/scripts/migrate_data.py`:

1. **Export utilities**:
   - Export all ArangoDB collections to JSON files
   - Validate data integrity during export
   - Create backup verification

2. **Import utilities**:
   - Import JSON data to PostgreSQL JSONB columns
   - Validate data after import
   - Create data consistency checks

3. **Migration orchestrator**:
   - Coordinate export/import process
   - Handle errors and rollback
   - Generate migration report

Quality requirements:
- Safe migration with rollback capability
- Data validation at each step
- Comprehensive error handling
- Migration progress reporting
- User ID mapping between systems (ensure compatibility with TEXT-based user IDs)

**Validation step**: Use PostgreSQL MCP tools to verify migration success:
```
mcp__postgres__query("SELECT table_name, pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size FROM (VALUES ('resume_documents'), ('job_documents'), ('optimization_results')) as tables(table_name)")
```

After completion, update the todo item "Create data export utilities from ArangoDB" as complete.
</Task>

### 4.2 Execute Data Migration

Steps to complete:
1. Create full backup of ArangoDB data
2. Run data export with validation
3. Import data to PostgreSQL with verification
4. Run data integrity checks using PostgreSQL MCP tools
5. Create migration success report

**Validation commands**:
```
mcp__postgres__query("SELECT COUNT(*) FROM resume_documents")
mcp__postgres__query("SELECT COUNT(*) FROM job_documents") 
mcp__postgres__query("SELECT COUNT(*) FROM optimization_results")
```

Expected outcome: All ArangoDB data successfully migrated to PostgreSQL

## Phase 5: Infrastructure Updates

Remove ArangoDB from the system entirely.

### 5.1 Update Docker Configuration

<Task>
You are fullstack-eng. Remove ArangoDB from Docker configuration.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Update Docker configuration:

1. **Remove ArangoDB service** from `docker-compose.yml`
2. **Remove ArangoDB volumes** and networks
3. **Update environment variables** - remove ArangoDB-related vars
4. **Update health checks** - remove ArangoDB health endpoints

Test the changes:
```bash
pnpm docker:stop
pnpm docker:dev
```

Verify:
- Only PostgreSQL, API, and Web containers running
- No ArangoDB references in configuration
- All services start correctly

**Validation step**: Use PostgreSQL MCP tools to verify single database operation:
```
mcp__postgres__query("SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
```

After completion, update the todo item "Remove ArangoDB from Docker configuration" as complete.
</Task>

### 5.2 Remove ArangoDB Dependencies

Execute these commands:
```bash
cd /Users/dylan/Workspace/projects/atspro/apps/api
uv remove python-arango aioarangodb
uv sync
```

Steps to complete:
1. Remove ArangoDB packages from dependencies
2. Remove ArangoDB imports from all code files
3. Clean up any ArangoDB-specific code
4. Update configuration files

Expected outcome: No ArangoDB dependencies remaining in codebase

## Final Phase: Testing and Validation

Comprehensive testing of PostgreSQL-only system.

### 6.1 Update Unit Tests

<Task>
You are fullstack-eng. Update all unit tests for PostgreSQL-only architecture.

Start by:
cd /Users/dylan/Workspace/projects/atspro/apps/api

Update test files:
1. **Remove ArangoDB mocks** from all test files
2. **Update database fixtures** to use PostgreSQL-only
3. **Update service tests** for new JSONB operations
4. **Add JSONB query tests** for complex operations

Run tests with coverage:
```bash
uv run pytest tests/ -v --cov=app --cov-report=html --cov-report=term
```

Target: Maintain >90% test coverage with all tests passing

After completion, update the todo item "Update unit tests for PostgreSQL-only" as complete.
</Task>

### 6.2 Run E2E Tests

<Task>
You are e2e-tester. Run comprehensive E2E tests with PostgreSQL-only architecture.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Test all workflows from the previous E2E report:
1. **User profile management** - verify this is now fixed
2. **Resume upload and processing** - ensure still works correctly
3. **Job parsing workflows** - verify functionality maintained
4. **Cross-service data consistency** - test with single database

Focus on:
- User profile issues that caused previous test failures
- Data consistency across all operations
- Performance with PostgreSQL JSONB queries
- System stability under load

Create updated test report: `docs/tests/postgresql-migration-e2e-report.md`

After completion, update the todo item "Run comprehensive E2E tests" as complete.
</Task>

### 6.3 Performance Testing

<Task>
You are fullstack-eng. Conduct performance testing with PostgreSQL-only architecture.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Create performance benchmarks:
1. **JSONB query performance** vs previous ArangoDB queries
2. **Document storage performance** for large files
3. **Concurrent operation performance** with single database
4. **Memory usage** with PostgreSQL-only

Create performance report: `docs/testing/postgresql-performance-report.md`

Compare against previous dual-database performance and ensure:
- Resume parsing: <30 seconds
- Job parsing: <20 seconds  
- No performance degradation
- Improved consistency and reliability

After completion, update the todo item "Performance testing with PostgreSQL" as complete.
</Task>

### 6.4 Documentation Update

Steps to complete:
1. Update `README.md` to reflect PostgreSQL-only architecture
2. Update `CLAUDE.md` with new database information
3. Create migration guide for future deployments
4. Document new database schema and JSONB operations
5. Update API documentation for any changes

Expected outcome: All documentation reflects PostgreSQL-only architecture

## Success Criteria

The PostgreSQL migration is complete when:

1. ✅ All data successfully migrated from ArangoDB to PostgreSQL JSONB
2. ✅ All services working with PostgreSQL-only architecture
3. ✅ User profile management issues resolved (primary goal)
4. ✅ E2E tests pass with no critical issues
5. ✅ Performance meets or exceeds current benchmarks
6. ✅ Single database architecture simplifies deployment and maintenance
7. ✅ No ArangoDB dependencies remain in codebase
8. ✅ Docker environment runs with PostgreSQL-only
9. ✅ All unit tests pass with >90% coverage
10. ✅ Production-ready system with improved reliability

## Error Handling

If any phase fails:
1. **Data Migration Failure**: Restore from ArangoDB backup and investigate
2. **Service Migration Issues**: Rollback to dual-database configuration temporarily
3. **Performance Degradation**: Optimize JSONB indexes and queries
4. **Test Failures**: Fix issues before proceeding to next phase
5. **Docker Issues**: Verify PostgreSQL configuration and networking

## Completion

Upon successful completion:
1. **Simplified architecture** with single PostgreSQL database
2. **Resolved user profile management issues** from E2E testing
3. **Improved system reliability** and easier maintenance
4. **Better development experience** with unified database operations
5. **Production-ready system** with comprehensive testing validation
6. **Performance optimization** through proper JSONB indexing
7. **Reduced operational complexity** for deployment and monitoring

The system will provide a final summary report consolidating all phase outcomes, performance metrics, and readiness assessment for production deployment.

---

## Migration Benefits

This migration addresses the core issues identified in the E2E test report:

**Resolves Current Problems:**
- ✅ Eliminates dual-database connection complexity
- ✅ Fixes user profile management failures
- ✅ Simplifies error handling and debugging
- ✅ Reduces infrastructure complexity

**Provides Long-term Benefits:**
- ✅ Single database to manage and monitor
- ✅ Better transaction support with ACID compliance
- ✅ Simplified backup and recovery procedures
- ✅ More familiar technology stack for team
- ✅ Better tooling and ecosystem support
- ✅ Easier scaling and performance tuning

The migration maintains all current functionality while solving the critical reliability issues identified in testing.