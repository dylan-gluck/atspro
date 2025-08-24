---
description: Systematic removal of Redis and background workers, converting ATSPro to synchronous architecture
argument-hint: --preserve-logic --test-coverage --incremental
---

# Remove Redis and Convert to Synchronous Architecture

This workflow orchestrates the complete removal of Redis, background workers, and async task processing from ATSPro, replacing them with synchronous service calls while preserving all core functionality.

## Initial Context

- Project root: `/Users/dylan/Workspace/projects/atspro`
- Key documentation:
  - `/Users/dylan/Workspace/projects/atspro/CLAUDE.md`
  - `/Users/dylan/Workspace/projects/atspro/.claude/commands/remove-redis-plan.md`
- Related specifications:
  - Research analysis: Redis integration points and worker architecture
  - Current async endpoints: `/api/parse`, `/api/jobs`, `/api/job/parse-document`
- Prerequisites:
  - Docker environment running (`pnpm docker:dev`)
  - All tests passing in current state
  - Backup of current working state

## Todo Setup

Initialize progress tracking for implementation phases:

<TodoWrite>
# Redis Removal Progress

## Phase 1: Create Synchronous Service Layer
- [ ] Create resume_processor.py service
- [ ] Create job_processor.py service
- [ ] Create optimization_processor.py service
- [ ] Add timeout and retry logic
- [ ] Test service methods independently

## Phase 2: Convert API Endpoints
- [ ] Convert /api/parse endpoint to sync
- [ ] Convert /api/jobs endpoint to sync
- [ ] Convert /api/job/parse-document to sync
- [ ] Update response models
- [ ] Update OpenAPI schema

## Phase 3: Update Frontend
- [ ] Simplify jobs.ts service
- [ ] Remove polling logic
- [ ] Update UI components for sync
- [ ] Add timeout handling
- [ ] Update error boundaries

## Phase 4: Remove Infrastructure
- [ ] Remove worker code directories
- [ ] Clean API startup (main.py)
- [ ] Update Docker configuration
- [ ] Remove Redis dependencies
- [ ] Update environment variables

## Final Phase: Testing and Validation
- [ ] Update unit tests
- [ ] Run end-to-end tests
- [ ] Performance testing
- [ ] Documentation update
- [ ] Final review and sign-off
</TodoWrite>

## Phase 1: Create Synchronous Service Layer

Extract core processing logic from workers into synchronous service methods that can be called directly from API endpoints.

### 1.1 Create Resume Processing Service

Extract and refactor resume parsing logic into a synchronous service.

<Task>
You are fullstack-eng. Your task is to create a synchronous resume processing service by extracting logic from the existing worker.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Read and understand the current implementation:
- `apps/api/app/workers/resume_parser.py` (lines 134-467)
- `apps/api/app/models/resume.py` (for data models)
- `apps/api/app/database/connections.py` (for ArangoDB/PostgreSQL)

Create `apps/api/app/services/resume_processor.py` with:

1. **ResumeProcessorService class**
   - `__init__()` method with database connections
   - `process_resume_sync(file_content: bytes, filename: str, user_id: str)` method
   - Extract text using unstructured library
   - Call OpenAI agent for parsing
   - Store in ArangoDB synchronously
   - Update PostgreSQL user profile
   - Return parsed data directly

2. **Error handling**
   - 60-second timeout for AI calls
   - Exponential backoff retry (3 attempts)
   - Proper exception types for different failures
   - Logging for debugging

3. **Performance optimizations**
   - Connection pooling for databases
   - Efficient memory handling for large files
   - Proper cleanup of temporary files

Quality requirements:
- Type hints for all methods
- Docstrings with clear documentation
- No Redis or queue dependencies
- Maintain same data validation as worker

After completion, update the todo item "Create resume_processor.py service" as complete.
</Task>

### 1.2 Create Job Processing Service

Extract and refactor job parsing logic into a synchronous service.

<Task>
You are fullstack-eng. Your task is to create a synchronous job processing service.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Read and understand the current implementation:
- `apps/api/app/workers/job_parser.py` (lines 130-432)
- `apps/api/app/models/job.py` (for data models)

Create `apps/api/app/services/job_processor.py` with:

1. **JobProcessorService class**
   - `process_job_url_sync(url: str, user_id: str)` method
   - `process_job_document_sync(file_content: bytes, filename: str, user_id: str)` method
   - Web scraping with 30s timeout
   - AI agent processing
   - ArangoDB storage

2. **Circuit breaker pattern**
   - Track failures per domain
   - Temporarily block failing domains
   - Fallback to basic extraction

3. **URL validation**
   - Validate URL format
   - Check for blocked domains
   - Handle redirects properly

Quality requirements:
- Async HTTP client with proper timeout
- Robust HTML parsing
- Clear error messages

After completion, update the todo item "Create job_processor.py service" as complete.
</Task>

### 1.3 Create Optimization Service

<Task>
You are fullstack-eng. Your task is to create a synchronous optimization service.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Read the current implementation:
- `apps/api/app/workers/optimizer.py` (lines 96-274)

Create `apps/api/app/services/optimization_processor.py` with:

1. **OptimizationProcessorService class**
   - `optimize_resume_sync(resume_id: str, job_id: str, user_id: str)` method
   - Fetch resume and job from ArangoDB
   - Call OpenAI agent for optimization
   - Format as markdown
   - Store optimized version

2. **Long operation handling**
   - 90-second timeout for complex documents
   - Progress tracking (if possible)
   - Chunking for very large resumes

After completion, update the todo item "Create optimization_processor.py service" as complete.
</Task>

### 1.4 Add Timeout and Retry Logic

Create shared utilities for timeout and retry handling.

Steps to complete:
1. Create `apps/api/app/services/utils.py`
2. Implement `with_timeout` decorator
3. Implement `with_retry` decorator with exponential backoff
4. Add circuit breaker implementation
5. Create timeout exceptions

Expected outcome: Reusable decorators for all service methods

### 1.5 Test Service Methods

<Task>
You are fullstack-eng. Create comprehensive tests for the new synchronous services.

Start by:
cd /Users/dylan/Workspace/projects/atspro/apps/api

Create test files:
- `tests/services/test_resume_processor.py`
- `tests/services/test_job_processor.py`
- `tests/services/test_optimization_processor.py`

Test scenarios:
1. Successful processing
2. Timeout handling
3. Retry logic
4. Invalid inputs
5. Database failures

Run tests with:
```bash
uv run pytest tests/services/ -v
```

After completion, update the todo item "Test service methods independently" as complete.
</Task>

## Phase 2: Convert API Endpoints (Parallel Execution)

Convert all async endpoints to use the new synchronous services. These can be done in parallel.

### 2.1 Convert Resume Parse Endpoint

<Task>
You are fullstack-eng. Convert the resume parsing endpoint to synchronous.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Modify `apps/api/app/routers/parse.py`:

1. **Import the new service**
   ```python
   from app.services.resume_processor import ResumeProcessorService
   ```

2. **Replace async task creation** (lines 31-136)
   - Remove task_service imports
   - Remove task creation logic
   - Call `resume_processor.process_resume_sync()`
   - Return parsed data directly

3. **Update response model**
   - Remove `task_id` from response
   - Add parsed resume data fields
   - Update status codes

Example transformation:
```python
# BEFORE
task_id = await task_service.create_parse_task(...)
return {"task_id": task_id, "resume_id": resume_id}

# AFTER
result = await resume_processor.process_resume_sync(...)
return {"data": result, "resume_id": resume_id}
```

After completion, update the todo item "Convert /api/parse endpoint to sync" as complete.
</Task>

### 2.2 Convert Job Endpoints

<Task>
You are fullstack-eng. Convert the job parsing endpoints to synchronous.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Modify `apps/api/app/routers/job.py`:

1. **Convert POST /api/jobs** (lines 260-302)
   - Call `job_processor.process_job_url_sync()`
   - Return job data directly

2. **Convert POST /api/job/parse-document** (lines 304-402)
   - Call `job_processor.process_job_document_sync()`
   - Return parsed job data

3. **Remove task references**
   - Clean up imports
   - Remove task status checks

After completion, update the todo items "Convert /api/jobs endpoint to sync" and "Convert /api/job/parse-document to sync" as complete.
</Task>

### 2.3 Update Response Models

<Task>
You are fullstack-eng. Update all API response models for synchronous responses.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Create/modify response models:

1. **Create new models in `apps/api/app/models/responses.py`**
   ```python
   class ParsedResumeResponse(BaseModel):
       resume_id: str
       data: ResumeData

   class ParsedJobResponse(BaseModel):
       job_id: str
       data: JobData
   ```

2. **Remove task-related models**
   - Delete `TaskResponse`
   - Delete `TaskStatusResponse`

3. **Update OpenAPI schema**
   - Regenerate docs
   - Verify schema changes

After completion, update the todo items "Update response models" and "Update OpenAPI schema" as complete.
</Task>

## Phase 3: Update Frontend (Parallel Execution)

Update frontend to handle synchronous API responses.

### 3.1 Simplify Jobs Service

<Task>
You are frontend-eng. Simplify the jobs service to work with synchronous API.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Modify `apps/web/src/lib/services/jobs.ts`:

1. **Remove polling methods** (lines 233-304)
   - Delete `pollTaskUntilComplete()`
   - Delete `getTaskStatus()`
   - Delete `getTaskResult()`

2. **Update main methods**
   ```typescript
   async createJob(jobData: JobInput): Promise<Job> {
     const response = await fetch('/api/jobs', {
       method: 'POST',
       body: JSON.stringify(jobData)
     });
     if (!response.ok) throw new Error('Failed to parse job');
     return response.json(); // Direct data, no task_id
   }
   ```

3. **Remove async variants**
   - Delete `createJobAsync()`
   - Delete `parseJobFromDocumentAsync()`

4. **Add timeout handling**
   - Set 120s timeout for fetch
   - Add AbortController

After completion, update the todo items "Simplify jobs.ts service" and "Remove polling logic" as complete.
</Task>

### 3.2 Update UI Components

<Task>
You are frontend-eng. Update UI components for synchronous operations.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Find and update components that use job/resume services:

1. **Add loading states**
   - Replace task progress bars with spinners
   - Show "Processing..." messages
   - Estimate time remaining

2. **Update error handling**
   - Handle immediate failures
   - Show timeout messages
   - Add retry buttons

3. **Remove task status UI**
   - Delete progress tracking components
   - Remove task status displays

Components to check:
- Resume upload forms
- Job parsing forms
- Optimization UI

After completion, update the todo item "Update UI components for sync" as complete.
</Task>

### 3.3 Add Request Timeout Handling

Steps to complete:
1. Create or update `apps/web/src/lib/api/client.ts`
2. Implement fetch wrapper with timeout
3. Add user-friendly timeout messages
4. Create retry UI component
5. Test with slow network simulation

Expected outcome: Graceful handling of long-running requests

## Phase 4: Remove Infrastructure

Remove all Redis and worker-related code and configuration.

### 4.1 Remove Worker Code

Execute these commands:
```bash
cd /Users/dylan/Workspace/projects/atspro
rm -rf apps/api/app/workers/
rm -rf apps/api/app/queue/
rm -rf apps/api/app/websocket/
rm apps/api/app/routers/tasks.py
rm -f apps/api/app/services/task_service.py
```

Verify: No import errors when running the API

### 4.2 Clean API Startup

<Task>
You are fullstack-eng. Clean up the API startup to remove worker references.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Modify `apps/api/app/main.py`:

1. **Remove worker imports**
   - Delete worker manager imports
   - Delete WebSocket imports
   - Delete Redis imports

2. **Remove startup tasks**
   - Delete worker initialization
   - Delete WebSocket mounting
   - Delete Redis health checks

3. **Simplify lifespan**
   - Keep only database connections
   - Remove background task cleanup

Test with:
```bash
cd apps/api
uv run uvicorn app.main:app --reload
```

After completion, update the todo item "Clean API startup (main.py)" as complete.
</Task>

### 4.3 Update Docker Configuration

<Task>
You are fullstack-eng. Update Docker configuration to remove Redis.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Modify Docker files:

1. **Update `docker-compose.yml`**
   - Remove redis service definition
   - Remove redis from API depends_on
   - Remove REDIS_URL environment variable

2. **Update `docker-compose.dev.yml`**
   - Remove redis service overrides
   - Clean up networks

3. **Test the changes**
   ```bash
   pnpm docker:stop
   pnpm docker:dev
   ```

After completion, update the todo item "Update Docker configuration" as complete.
</Task>

### 4.4 Remove Dependencies

Execute these commands:
```bash
cd /Users/dylan/Workspace/projects/atspro/apps/api
uv remove redis rq sse-starlette
uv sync
```

Verify: Check `pyproject.toml` no longer contains Redis dependencies

## Final Phase: Testing and Validation

### 5.1 Update Unit Tests

<Task>
You are fullstack-eng. Update all unit tests for synchronous operations.

Start by:
cd /Users/dylan/Workspace/projects/atspro/apps/api

Update test files:

1. **Remove worker tests**
   ```bash
   rm -rf tests/workers/
   rm -rf tests/queue/
   ```

2. **Update endpoint tests**
   - Modify tests to expect immediate responses
   - Remove task_id assertions
   - Add timeout tests

3. **Run all tests**
   ```bash
   uv run pytest --cov=app --cov-report=html
   ```

Target: Maintain >95% coverage

After completion, update the todo item "Update unit tests" as complete.
</Task>

### 5.2 End-to-End Testing

<Task>
You are e2e-tester. Conduct comprehensive end-to-end testing of the synchronous system.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Test workflows:

1. **Resume Upload Flow**
   - Upload various file formats (PDF, DOCX, TXT)
   - Verify parsing completes
   - Check data in UI
   - Test error cases

2. **Job Parsing Flow**
   - Parse URLs from different job sites
   - Upload job documents
   - Verify extraction quality

3. **Optimization Flow**
   - Select resume and job
   - Generate optimization
   - Download result

Create test report at: `docs/testing/e2e-results.md`

After completion, update the todo item "Run end-to-end tests" as complete.
</Task>

### 5.3 Performance Testing

<Task>
You are fullstack-eng. Conduct performance testing of the synchronous system.

Start by:
cd /Users/dylan/Workspace/projects/atspro

Create `tests/performance/load_test.py`:

1. **Test concurrent requests**
   - 10 simultaneous parse requests
   - Measure response times
   - Check for memory leaks

2. **Test large files**
   - 50+ page PDFs
   - Complex documents
   - Measure processing time

3. **Create performance report**
   Location: `docs/testing/performance-report.md`

Acceptance criteria:
- Resume parsing: <30 seconds
- Job parsing: <20 seconds
- No memory leaks
- Graceful degradation under load

After completion, update the todo item "Performance testing" as complete.
</Task>

### 5.4 Documentation Update

Steps to complete:
1. Update `README.md` to remove Redis references
2. Update `CLAUDE.md` with new architecture
3. Update API documentation
4. Create migration guide for deployments
5. Document new timeout configurations

Expected outcome: All documentation reflects synchronous architecture

## Success Criteria

The Redis removal workflow is complete when:

1. ✅ All processing happens synchronously without Redis
2. ✅ No background workers or queues remain
3. ✅ Frontend handles synchronous responses correctly
4. ✅ All tests pass with >95% coverage
5. ✅ Performance meets requirements (<30s resume, <20s job)
6. ✅ Docker environment runs without Redis container
7. ✅ No Redis dependencies in package files
8. ✅ Documentation updated to reflect new architecture

## Error Handling

If any phase fails:
1. Check error logs for specific failure details
2. Rollback changes using git if needed
3. Consider implementing feature flag for gradual rollout
4. Test in isolated environment before production
5. Keep backup of working async version

## Completion

Upon successful completion:
1. All API endpoints respond synchronously with data
2. Redis container and dependencies completely removed
3. Simplified codebase with ~50% less complexity
4. Maintained functionality with acceptable performance
5. Ready for production deployment with monitoring

The system will provide a final summary report consolidating all phase outcomes and performance metrics.
