# ATSPro API Refactor Implementation Specification

## Overview

This specification details the implementation of ATSPro's API refactor from synchronous to asynchronous task-based endpoints. The refactor introduces background workers, task queues, and real-time status updates while maintaining backward compatibility.

## Implementation Agents Assignment

### Agent 1: Infrastructure & Database Setup
**Responsibility**: Core infrastructure, database schemas, and dependency management
**Files to Create/Modify**:
- `apps/api/pyproject.toml` - Add database adapters
- `apps/api/app/database/` - Database connection management
- `apps/api/app/database/migrations/` - SQL migration files
- `apps/api/app/config.py` - Configuration management

### Agent 2: Task Queue & Worker Infrastructure  
**Responsibility**: Redis queue system and base worker framework
**Files to Create/Modify**:
- `apps/api/app/queue/` - Redis queue management
- `apps/api/app/workers/base.py` - Base worker class
- `apps/api/app/workers/manager.py` - Worker manager
- `apps/api/app/services/task_service.py` - Task management service

### Agent 3: Parse Resume Endpoint & Worker
**Responsibility**: Async resume parsing functionality
**Files to Create/Modify**:
- `apps/api/app/routers/parse.py` - Updated parse endpoint
- `apps/api/app/workers/resume_parser.py` - Resume parsing worker
- `tests/test_parse_async.py` - Tests for async parsing

### Agent 4: Parse Job Endpoint & Worker
**Responsibility**: Async job parsing functionality  
**Files to Create/Modify**:
- `apps/api/app/routers/job.py` - Updated job endpoint
- `apps/api/app/workers/job_parser.py` - Job parsing worker
- `tests/test_job_async.py` - Tests for async job parsing

### Agent 5: Optimize, Score & Research Workers
**Responsibility**: Advanced async operations (optimize, score, research)
**Files to Create/Modify**:
- `apps/api/app/routers/optimize.py` - Updated optimize endpoint
- `apps/api/app/workers/optimizer.py` - Optimization worker
- `apps/api/app/workers/scorer.py` - Scoring worker
- `apps/api/app/workers/researcher.py` - Research worker
- `tests/test_advanced_workers.py` - Tests for advanced workers

### Agent 6: Task Management & Real-time Updates
**Responsibility**: Task status endpoints and WebSocket integration
**Files to Create/Modify**:
- `apps/api/app/routers/tasks.py` - Task management endpoints
- `apps/api/app/websocket/` - WebSocket handlers
- `tests/test_task_management.py` - Task management tests

## Technical Requirements

### Dependencies to Add

```toml
# Database adapters
"psycopg[binary]>=3.1.0",
"redis>=5.0.0", 
"python-arango>=7.5.0",

# Background jobs  
"rq>=1.15.0",
"sse-starlette>=1.6.0",

# Database migrations
"alembic>=1.12.0",
```

### Database Schema

#### PostgreSQL Tables

```sql
-- Task tracking table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- References better-auth user.id
    task_type VARCHAR(50) NOT NULL, -- 'parse_resume', 'parse_job', 'optimize', 'score', 'research'
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 2, -- 1=high, 2=normal, 3=low
    payload JSONB NOT NULL, -- Input parameters
    result_id TEXT, -- Reference to result in ArangoDB
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    progress INTEGER DEFAULT 0, -- 0-100 percentage
    estimated_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(task_type);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);

-- Task performance metrics
CREATE TABLE task_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type VARCHAR(50) NOT NULL,
    duration_ms INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_type VARCHAR(50),
    worker_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_metrics_type_date ON task_metrics(task_type, created_at);
```

#### ArangoDB Collections

```javascript
// Document collections
db._create("tasks_results");    // Task result storage
db._create("resumes");          // Enhanced resume storage
db._create("jobs");             // Enhanced job storage
db._create("optimizations");    // Optimization results
db._create("research_reports"); // Research documents

// Edge collections
db._createEdgeCollection("task_results");     // tasks -> results
db._createEdgeCollection("user_tasks");       // users -> tasks
db._createEdgeCollection("resume_jobs");      // resumes -> jobs
```

### API Response Formats

#### Standard Task Response
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "resume_id": "uuid", // if applicable
    "job_id": "uuid",    // if applicable
    "document_id": "uuid" // if applicable
  }
}
```

#### Task Status Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending|running|completed|failed",
    "progress": 75,
    "created_at": "2024-01-01T00:00:00Z",
    "task_type": "parse_resume",
    "result": {}, // if completed
    "error": "error message" // if failed
  }
}
```

### Worker Framework

#### Base Worker Interface
```python
from abc import ABC, abstractmethod
import asyncio
import json
import logging
from typing import Any, Dict, List
from uuid import uuid4

class BaseWorker(ABC):
    def __init__(self, redis_client, db_client, arango_client, concurrency=1):
        self.redis = redis_client
        self.db = db_client
        self.arango = arango_client
        self.concurrency = concurrency
        self.worker_id = f"{self.__class__.__name__}_{uuid4().hex[:8]}"
        self.running = False
        
    @abstractmethod
    async def execute_task(self, task_data: Dict[str, Any]) -> Any:
        """Execute the specific task logic"""
        pass
    
    @abstractmethod
    def get_queue_names(self) -> List[str]:
        """Return list of queue names this worker processes"""
        pass
    
    async def start(self):
        """Start worker with specified concurrency"""
        pass
    
    async def _update_task_status(self, task_id: str, status: str, progress: int = None):
        """Update task status in database"""
        pass
```

### Error Handling

#### Task Error Types
```python
from enum import Enum

class TaskErrorType(Enum):
    TRANSIENT = "transient"          # Retry possible
    PERMANENT = "permanent"          # Do not retry
    RATE_LIMITED = "rate_limited"    # Retry with backoff
    RESOURCE_EXHAUSTED = "resource_exhausted"

class TaskError(Exception):
    def __init__(self, message: str, error_type: TaskErrorType, retryable: bool = None):
        super().__init__(message)
        self.error_type = error_type
        self.retryable = retryable if retryable is not None else error_type != TaskErrorType.PERMANENT
```

### Authentication Integration

All endpoints must integrate with existing better-auth system:

```python
from fastapi import Depends, HTTPException, Header
from typing import Optional

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Extract user from better-auth session"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Validate token and return user info
    return {"id": "user_id", "email": "user@example.com"}
```

### Queue Configuration

#### Redis Queue Structure
```
atspro:queue:high      # Priority 1 tasks
atspro:queue:normal    # Priority 2 tasks  
atspro:queue:low       # Priority 3 tasks
atspro:processing:{worker_id}  # Active tasks
atspro:dlq             # Dead letter queue
atspro:task:{task_id}  # Task metadata
atspro:result:{task_id}  # Temporary results (TTL: 24h)
```

## Endpoint Specifications

### 1. POST /api/parse (Updated)
**Agent 3 Responsibility**

**Input**: `multipart/form-data` with file upload
**Output**: Task ID and resume placeholder ID
**Worker**: `ResumeParseWorker`
**Processing**: Parse document using existing agent logic, store in ArangoDB

### 2. POST /api/job (Updated)  
**Agent 4 Responsibility**

**Input**: `{"url": "string"}`
**Output**: Task ID and job placeholder ID
**Worker**: `JobParseWorker`  
**Processing**: Extract job data from URL, store in ArangoDB

### 3. POST /api/optimize (Updated)
**Agent 5 Responsibility**

**Input**: `{"resume_id": "string", "job_id": "string"}`
**Output**: Task ID and document ID
**Worker**: `OptimizeWorker`
**Processing**: Optimize resume for job, store markdown result

### 4. POST /api/score
**Agent 5 Responsibility**

**Input**: `{"resume_id": "string", "job_id": "string"}`
**Output**: Task ID
**Worker**: `ScoreWorker`
**Processing**: Calculate match percentage, update job entity

### 5. POST /api/research
**Agent 5 Responsibility**

**Input**: `{"resume_id": "string", "job_id": "string"}`
**Output**: Task ID and document ID
**Worker**: `ResearchWorker`
**Processing**: Research company and generate report

### 6. GET /api/tasks/{task_id}
**Agent 6 Responsibility**

**Output**: Task status and result if completed
**Features**: Real-time status, progress tracking

### 7. GET /api/tasks
**Agent 6 Responsibility**

**Output**: Paginated list of user's tasks
**Features**: Filtering by status, type, date range

### 8. DELETE /api/tasks/{task_id}
**Agent 6 Responsibility**

**Action**: Cancel pending/running task
**Features**: Graceful worker interruption

### 9. WebSocket /ws/tasks
**Agent 6 Responsibility**

**Features**: Real-time task status updates
**Protocol**: JSON messages for status changes

## Testing Requirements

### Test Coverage Expectations
- 100% coverage on new endpoints
- Unit tests for all workers
- Integration tests for queue operations
- WebSocket connection tests

### Test Patterns

#### Worker Testing
```python
@pytest.mark.asyncio
async def test_resume_parse_worker():
    worker = ResumeParseWorker(mock_redis, mock_db, mock_arango)
    task_data = {"task_id": "test", "payload": {"file_data": "..."}}
    result = await worker.execute_task(task_data)
    assert result is not None
```

#### Endpoint Testing
```python
@pytest.mark.asyncio
async def test_parse_endpoint_returns_task_id():
    response = await client.post("/api/parse", files={"file": ("test.pdf", b"content")})
    assert response.status_code == 200
    assert "task_id" in response.json()["data"]
```

## Configuration Management

### Environment Variables
```bash
# Database connections
DATABASE_URL=postgresql://user:pass@localhost/atspro
REDIS_URL=redis://localhost:6379
ARANGO_URL=http://localhost:8529
ARANGO_DATABASE=atspro

# Worker settings
WORKER_CONCURRENCY=3
TASK_TIMEOUT_SECONDS=300
MAX_RETRIES=3
RESULT_TTL_HOURS=24

# Queue settings
REDIS_QUEUE_PREFIX=atspro
HIGH_PRIORITY_WORKERS=2
NORMAL_PRIORITY_WORKERS=3
LOW_PRIORITY_WORKERS=1
```

### Configuration Class
```python
from pydantic import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    arango_url: str
    arango_database: str = "atspro"
    
    worker_concurrency: int = 3
    task_timeout_seconds: int = 300
    max_retries: int = 3
    result_ttl_hours: int = 24
    
    class Config:
        env_file = ".env"
```

## Implementation Guidelines

### Code Style
- Follow existing FastAPI patterns in the codebase
- Use type hints everywhere (Python 3.11+)
- Implement comprehensive error handling
- Add detailed logging for debugging
- Follow the existing test patterns for 100% coverage

### Database Transactions
- Use async database connections
- Implement proper transaction handling
- Handle connection pooling efficiently
- Add retry logic for transient failures

### Security Considerations
- Validate all user inputs
- Implement proper authorization checks
- Sanitize file uploads
- Rate limit API endpoints
- Secure WebSocket connections

### Performance Requirements
- Task creation response time: <200ms
- Task status retrieval: <100ms
- WebSocket message latency: <2s
- Worker processing throughput: >10 tasks/minute per worker

## Success Criteria

Each agent's implementation will be considered successful when:

1. **Functionality**: All endpoints work as specified
2. **Testing**: 100% test coverage with passing tests
3. **Integration**: Seamless integration with existing codebase
4. **Performance**: Meets specified performance requirements
5. **Error Handling**: Robust error handling and recovery
6. **Documentation**: Clear code documentation and type hints

## Integration Steps

1. **Agent 1**: Set up infrastructure and database schemas
2. **Agent 2**: Implement task queue and worker framework
3. **Agents 3-5**: Implement specific workers and endpoints in parallel
4. **Agent 6**: Add task management and real-time features
5. **Final Integration**: Combine all components and run full test suite

This specification provides the complete blueprint for implementing the ATSPro API refactor using specialized backend agents.