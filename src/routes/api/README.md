# ATSPro API Documentation

ATSPro uses **SvelteKit Remote Functions** instead of traditional REST API endpoints. This architecture provides type-safe, server-side functions that can be called directly from client components with automatic serialization and error handling.

## Architecture Overview

The API layer consists of remote functions located in `/src/lib/services/` that handle:
- **Resume Processing**: Upload, extraction, and optimization
- **Job Management**: Adding, tracking, and status updates
- **Document Generation**: Optimized resumes, cover letters, company research
- **Activity Tracking**: Job application timeline and metrics

## Authentication & Security

### Authentication
- **Method**: Session-based authentication via Better-Auth
- **Enforcement**: All remote functions use `requireAuth()` helper
- **Session Validation**: Automatic user ID extraction from request context
- **Unauthorized Access**: Returns 401 errors for unauthenticated requests

### Rate Limiting
Each function implements specific rate limits to prevent abuse:

| Function | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `extractResume` | 10 requests | 1 hour | Resume extraction |
| `extractJob` | 20 requests | 1 hour | Job extraction |
| `updateResume` | 30 requests | 1 hour | Resume updates |
| `optimizeResume` | 10 requests | 1 hour | AI optimization |
| `generateCoverLetter` | 15 requests | 1 hour | Cover letter generation |
| `generateCompanyResearch` | 5 requests | 1 hour | Company research |
| `updateJobNotes` | 60 requests | 1 hour | Job notes updates |

### File Security
- **Validation**: File type and size validation
- **Allowed Types**: PDF, Markdown, Plain Text
- **Size Limits**: 10MB maximum file size
- **Error Handling**: Comprehensive error codes and messages

## Remote Functions API

### Resume Functions (`/src/lib/services/resume.remote.ts`)

#### `getResume()`
**Type**: Query  
**Description**: Retrieves the current user's resume  
**Authentication**: Required  
**Returns**: `Resume | null`

```typescript
const resume = await getResume();
```

#### `extractResume(FormData)`
**Type**: Form Action  
**Description**: Extracts resume data from uploaded file using AI  
**Authentication**: Required  
**Rate Limit**: 10/hour  

**Parameters**:
- `document: File` - Resume file (PDF, MD, TXT)

**Returns**:
```typescript
{
  resumeId: string;
  extractedFields: Resume;
}
```

**Supported File Types**:
- PDF: Processed via AI with document parsing
- Markdown/Text: Direct text extraction

**Error Conditions**:
- 400: User already has resume, invalid file, no file provided
- 429: Rate limit exceeded

#### `updateResume(updates)`
**Type**: Command  
**Description**: Updates specific resume fields  
**Authentication**: Required  
**Rate Limit**: 30/hour  

**Parameters**:
```typescript
{
  contactInfo?: any;
  summary?: string;
  workExperience?: any[];
  education?: any[];
  certifications?: any[];
  skills?: string[];
}
```

**Returns**:
```typescript
{
  id: string;
  updatedFields: string[];
  updatedAt: string;
}
```

### Job Functions (`/src/lib/services/job.remote.ts`)

#### `getJobs(params?)`
**Type**: Query  
**Description**: Lists user's jobs with filtering and pagination  
**Authentication**: Required  

**Parameters**:
```typescript
{
  status?: 'tracked' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';
  limit?: number; // 1-100, default 20
  offset?: number; // default 0
}
```

**Returns**:
```typescript
{
  jobs: Job[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

#### `getJob(jobId)`
**Type**: Query  
**Description**: Retrieves single job with documents and activity  
**Authentication**: Required  

**Parameters**:
- `jobId: string` - UUID of the job

**Returns**:
```typescript
{
  job: Job;
  documents: Document[];
  recentActivity: Activity[];
}
```

#### `extractJob(FormData)`
**Type**: Form Action  
**Description**: Extracts job details from URL or description using AI  
**Authentication**: Required  
**Rate Limit**: 20/hour  

**Parameters**:
- `jobUrl?: string` - Job posting URL
- `jobDescription?: string` - Manual job description

**Returns**:
```typescript
{
  jobId: string;
  extractedData: Job;
}
```

**Features**:
- URL validation and content fetching
- AI-powered job detail extraction
- Automatic activity logging

#### `updateJobStatus(data)`
**Type**: Command  
**Description**: Updates job application status  
**Authentication**: Required  

**Parameters**:
```typescript
{
  jobId: string; // UUID
  status: 'tracked' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';
  appliedAt?: string; // ISO date
}
```

**Returns**:
```typescript
{
  jobId: string;
  status: string;
  appliedAt?: string;
}
```

#### `updateJobNotes(data)`
**Type**: Command  
**Description**: Updates job notes  
**Authentication**: Required  
**Rate Limit**: 60/hour  

**Parameters**:
```typescript
{
  jobId: string; // UUID
  notes: string;
}
```

#### `deleteJob(jobId)`
**Type**: Command  
**Description**: Deletes job and all associated data  
**Authentication**: Required  

**Parameters**:
- `jobId: string` - UUID of job to delete

### Document Functions (`/src/lib/services/document.remote.ts`)

#### `getDocument(documentId)`
**Type**: Query  
**Description**: Retrieves document content  
**Authentication**: Required  

**Parameters**:
- `documentId: string` - UUID of document

**Returns**: `Document`

#### `optimizeResume(data)`
**Type**: Command  
**Description**: Generates ATS-optimized resume for specific job  
**Authentication**: Required  
**Rate Limit**: 10/hour  

**Parameters**:
```typescript
{
  jobId: string; // UUID
}
```

**Returns**:
```typescript
{
  documentId: string;
  documents: Document[];
  optimizationScore: number;
  matchedKeywords: string[];
  version: number;
}
```

**AI Features**:
- ATS keyword optimization
- Score calculation
- Performance tracking

#### `generateCoverLetter(data)`
**Type**: Command  
**Description**: Generates personalized cover letter  
**Authentication**: Required  
**Rate Limit**: 15/hour  

**Parameters**:
```typescript
{
  jobId: string; // UUID
  tone?: 'professional' | 'enthusiastic' | 'conversational'; // default: 'professional'
}
```

**Returns**:
```typescript
{
  documentId: string;
  type: 'cover';
  content: string;
  version: number;
  tone: string;
}
```

#### `generateCompanyResearch(data)`
**Type**: Command  
**Description**: Generates company research document  
**Authentication**: Required  
**Rate Limit**: 5/hour  

**Parameters**:
```typescript
{
  jobId: string; // UUID
}
```

**Returns**:
```typescript
{
  documentId: string;
  type: 'research';
  content: string;
  version: number;
}
```

### Activity Functions (`/src/lib/services/activity.remote.ts`)

#### `getJobActivity(params)`
**Type**: Query  
**Description**: Retrieves job activity timeline  
**Authentication**: Required  

**Parameters**:
```typescript
{
  jobId: string; // UUID
  limit?: number; // 1-100, default 50
  offset?: number; // default 0
}
```

**Returns**:
```typescript
{
  activities: Activity[];
  jobTitle: string;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

#### `getActivitySummary(jobId)`
**Type**: Query  
**Description**: Gets activity metrics and timeline for a job  
**Authentication**: Required  

**Returns**:
```typescript
{
  jobId: string;
  totalActivities: number;
  activityCounts: Record<string, number>;
  daysSinceCreated: number;
  daysSinceLastActivity: number | null;
  recentActivities: Activity[];
  timeline: {
    created: string;
    lastActivity: string | null;
    applied: string | null;
  };
}
```

#### `getDashboardActivity(params?)`
**Type**: Query  
**Description**: Gets activity feed across all jobs for dashboard  
**Authentication**: Required  

**Parameters**:
```typescript
{
  limit?: number; // 1-50, default 20
  types?: string[]; // filter by activity types
}
```

## Error Handling

### Error Codes
All functions use standardized error codes defined in `utils.ts`:

- **UNAUTHORIZED** (401): Authentication required
- **FORBIDDEN** (403): Access denied
- **NOT_FOUND** (404): Resource not found
- **RATE_LIMIT_EXCEEDED** (429): Rate limit exceeded
- **INVALID_INPUT** (400): Validation failed
- **INVALID_FILE_TYPE** (400): Unsupported file format
- **FILE_TOO_LARGE** (400): File exceeds size limit
- **AI_PROCESSING_FAILED** (500): AI service error
- **DATABASE_ERROR** (500): Database operation failed

### Error Response Format
```typescript
{
  error: string; // Error message
  code?: string; // Error code
  details?: any; // Additional error details
}
```

## Data Types

### Core Types
The API uses TypeScript interfaces defined in `/src/lib/types/`:

- **Resume**: Complete resume structure with contact info, experience, education
- **Job**: Job posting data with requirements, company info, status
- **Activity**: Timeline events with timestamps and metadata
- **Document**: Generated documents (resumes, cover letters, research)

### Function Types
- **Query**: Read-only operations that can be cached
- **Command**: State-changing operations with automatic invalidation
- **Form**: File upload and form submission handlers

## Performance & Monitoring

### Caching
- Query results are automatically cached by SvelteKit
- Commands trigger cache invalidation for affected queries
- Manual refresh capability for real-time updates

### Monitoring
- Performance tracking for AI operations
- Activity logging for audit trails
- Error tracking for debugging

### AI Integration
- **Vercel AI SDK** for resume extraction and optimization
- **Performance Measurement** for AI operation timing
- **Structured Output** using TypeScript schemas

## Development Notes

### File Processing Pipeline
1. **Validation**: File type and size checks
2. **Content Extraction**: 
   - PDF: Buffer conversion for AI processing
   - Text: Direct content extraction
3. **AI Processing**: Structured data extraction
4. **Database Storage**: Normalized data persistence
5. **Activity Logging**: Automatic audit trail

### Security Considerations
- All file uploads are validated and size-limited
- Rate limiting prevents abuse and protects AI services
- User isolation ensures data privacy
- Error messages avoid information disclosure

This architecture provides a type-safe, performant, and secure API layer that leverages modern SvelteKit features while maintaining traditional API semantics through remote functions.