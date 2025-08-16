# Background Worker Integration Specification

## Executive Summary

This specification outlines the integration of background job processing capabilities into ATSPro's existing synchronous FastAPI + Next.js architecture. The solution uses Redis-based task queues with minimal complexity suitable for a micro-SaaS application.

## Current Architecture Analysis

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.11+, uv package manager
- **Current Endpoints**: Synchronous operations
  - `/api/parse` - Resume document parsing (OpenAI Agents SDK)
  - `/api/job` - Job description extraction (web scraping + AI)
  - `/api/optimize` - Resume optimization
- **AI Integration**: OpenAI Agents SDK with structured output
- **Data Models**: Pydantic schemas for Resume and Job entities

### Frontend (Next.js)
- **Framework**: Next.js 15 with TypeScript, shadcn/ui
- **Authentication**: better-auth integration
- **Real-time**: No current WebSocket or SSE implementation
- **State Management**: React hooks, no global state library

### Infrastructure
- **Databases**: PostgreSQL (auth), ArangoDB (documents), Redis (available)
- **Containerization**: Docker Compose with health checks
- **Networking**: Internal Docker bridge network

## Integration Architecture Design

### 1. Task Queue Infrastructure

**Technology Stack**:
- **Queue**: Redis with RQ (Redis Queue) for Python
- **Worker Process**: Dedicated Python worker containers
- **Job Storage**: Redis for queue state, PostgreSQL for persistent job records
- **Real-time Updates**: Server-Sent Events (SSE) for frontend notifications

**Queue Structure**:
```
Redis Queues:
├── default (general tasks)
├── high_priority (user-facing operations) 
├── low_priority (background processing)
└── failed (retry/monitoring)
```

### 2. Backend Architecture Changes

#### A. Database Schema Extensions

**New Tables** (PostgreSQL):
```sql
-- Job tracking table
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    job_type VARCHAR(50) NOT NULL, -- 'parse_resume', 'extract_job', etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    priority INTEGER DEFAULT 5, -- 1 (high) to 10 (low)
    input_data JSONB, -- Task input parameters
    result_data JSONB, -- Task output/results
    error_message TEXT,
    progress INTEGER DEFAULT 0, -- 0-100 percentage
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

-- Entity associations for job tracking
CREATE TABLE job_entity_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    background_job_id UUID REFERENCES background_jobs(id),
    entity_type VARCHAR(50), -- 'resume', 'job_posting', 'optimization'
    entity_id UUID, -- Foreign key to respective entity
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. New API Endpoints

**Job Management**:
```python
# New router: /api/jobs
GET    /api/jobs/{job_id}        # Get job status
GET    /api/jobs                 # List user's jobs (with filters)
POST   /api/jobs/{job_id}/cancel # Cancel pending job
DELETE /api/jobs/{job_id}        # Delete completed job

# Real-time updates
GET    /api/jobs/events          # SSE endpoint for job updates
```

**Modified Existing Endpoints**:
```python
# Convert to async job initiation
PUT /api/parse    → Returns job_id, starts background task
PUT /api/job      → Returns job_id, starts background task  
PUT /api/optimize → Returns job_id, starts background task
```

#### C. Task Processing Framework

**Worker Structure**:
```python
# apps/api/app/workers/
├── __init__.py
├── base.py          # Base worker class with error handling
├── resume_worker.py # Resume parsing tasks
├── job_worker.py    # Job extraction tasks
└── optimize_worker.py # Resume optimization tasks
```

**Task Implementation Pattern**:
```python
from rq import Worker, Queue
from typing import Dict, Any
import json

class BaseTask:
    def __init__(self, job_id: str, user_id: str):
        self.job_id = job_id
        self.user_id = user_id
    
    async def update_progress(self, progress: int, status: str = None):
        # Update job status in database
        # Publish SSE event to frontend
        pass
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Override in subclasses
        raise NotImplementedError
```

### 3. Frontend Architecture Changes

#### A. Real-time Job Tracking

**Job Status Hook**:
```typescript
// hooks/use-job-status.ts
export function useJobStatus(jobId: string) {
  const [status, setStatus] = useState<JobStatus>('pending')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  
  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/jobs/events?job_id=${jobId}`)
    // Handle status updates
  }, [jobId])
  
  return { status, progress, result }
}
```

**UI Components**:
```typescript
// components/job-tracker.tsx - Reusable job progress component
// components/job-list.tsx - Dashboard job list
// components/job-status-badge.tsx - Status indicators
```

#### B. Workflow Integration

**Resume Upload Flow**:
1. User uploads file → API returns `job_id`
2. Frontend shows progress indicator with `useJobStatus`
3. On completion, frontend fetches parsed resume data
4. UI updates to show parsed results

**Job Creation Flow**:
1. User submits job URL → API returns `job_id`
2. Frontend navigates to job details page with loading state
3. Progress updates show extraction steps
4. On completion, page hydrates with job data

### 4. Data Models

#### A. Enhanced Schemas

**Background Job Schema**:
```python
from enum import Enum
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class BackgroundJob(BaseModel):
    id: str
    user_id: str
    job_type: str
    status: JobStatus
    priority: int
    progress: int
    input_data: Optional[dict]
    result_data: Optional[dict]
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    retry_count: int
    max_retries: int
```

**Task Input/Output Schemas**:
```python
class ResumeParseInput(BaseModel):
    file_content: bytes
    file_name: str
    file_type: str

class ResumeParseOutput(BaseModel):
    resume: Resume  # Existing Resume schema
    processing_time: float
    confidence_score: Optional[float]

class JobExtractionInput(BaseModel):
    url: str
    company_name: Optional[str]

class JobExtractionOutput(BaseModel):
    job: Job  # Existing Job schema
    processing_time: float
    source_reliability: Optional[float]
```

#### B. TypeScript Types

```typescript
// types/background-job.ts
export interface BackgroundJob {
  id: string
  userId: string
  jobType: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  priority: number
  progress: number
  inputData?: Record<string, any>
  resultData?: Record<string, any>
  errorMessage?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  retryCount: number
  maxRetries: number
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Est: 8-12 hours)
1. **Database Setup**
   - Create background_jobs table and migrations
   - Add entity association table
   - Set up database indexes

2. **Redis Queue Setup**
   - Configure RQ (Redis Queue) in Python
   - Add worker container to docker-compose.yml
   - Implement base worker class

3. **Basic Job API**
   - Create job management endpoints
   - Implement job creation and status checking
   - Add basic error handling

### Phase 2: Task Migration (Est: 6-10 hours)
1. **Convert Existing Endpoints**
   - Modify /api/parse to return job_id
   - Modify /api/job to return job_id
   - Implement worker classes for existing tasks

2. **Error Handling & Retry**
   - Add comprehensive error handling
   - Implement retry logic with exponential backoff
   - Add job cancellation capability

### Phase 3: Frontend Integration (Est: 10-15 hours)
1. **Real-time Updates**
   - Implement SSE endpoint
   - Create useJobStatus hook
   - Add job progress components

2. **UI Workflow Updates**
   - Update resume upload flow
   - Update job creation flow
   - Add job dashboard/list view

### Phase 4: Monitoring & Optimization (Est: 4-8 hours)
1. **Health Monitoring**
   - Add worker health checks
   - Implement job queue monitoring
   - Add basic metrics/logging

2. **Performance Tuning**
   - Optimize queue processing
   - Add job prioritization
   - Implement cleanup for old jobs

## Technical Considerations

### Scalability
- **Worker Scaling**: Docker Compose can easily scale worker containers
- **Queue Partitioning**: Separate queues by priority and type
- **Database Optimization**: Indexes on user_id, status, job_type for efficient queries

### Reliability
- **Retry Logic**: Exponential backoff with maximum retry limits
- **Dead Letter Queue**: Failed jobs moved to monitoring queue
- **Graceful Shutdown**: Workers finish current tasks before stopping
- **Health Checks**: Monitor worker process health

### Security
- **User Isolation**: Jobs are user-scoped with proper authentication
- **Input Validation**: All task inputs validated with Pydantic
- **Resource Limits**: Job execution timeouts and memory limits
- **Audit Trail**: Full job execution logging

### Monitoring
- **Job Metrics**: Success/failure rates, processing times, queue depths
- **Worker Health**: Process status, memory usage, error rates  
- **User Analytics**: Job usage patterns, popular features

## Migration Strategy

### Backwards Compatibility
- Keep synchronous endpoints available with deprecation warnings
- Add `async` query parameter to opt into background processing
- Gradual migration over 2-4 weeks

### Testing Strategy
- Unit tests for worker classes and job management
- Integration tests for complete workflows
- Load testing for queue performance
- E2E tests for frontend real-time updates

### Deployment Approach
- Deploy infrastructure changes first (database, Redis setup)
- Deploy backend changes with feature flags
- Deploy frontend changes progressively
- Monitor and optimize based on usage patterns

## Expected Development Effort

**Total Estimated Time**: 28-45 hours
- **Backend Development**: 60% (17-27 hours)
- **Frontend Development**: 30% (8-14 hours)
- **Testing & Integration**: 10% (3-4 hours)

**Risk Factors**:
- Real-time updates complexity may require additional SSE debugging
- Worker scaling may need fine-tuning based on actual usage
- Database migration complexity depends on existing data volume

## Success Metrics

### Technical Metrics
- Job completion rate >95%
- Average job processing time <30 seconds
- Frontend real-time update latency <2 seconds
- Worker container startup time <10 seconds

### User Experience Metrics  
- Reduced perceived wait time for long-running operations
- Clear job progress visibility
- Reliable job completion notifications
- Intuitive job management interface

This specification provides a comprehensive but appropriately-scoped solution for adding background job processing to ATSPro while maintaining the simplicity requirements of a micro-SaaS application.