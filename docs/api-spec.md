# ATSPro API Specification

## Overview

The ATSPro API provides endpoints for resume optimization, job tracking, and document generation. All endpoints require authentication via Better-Auth session tokens.

## Authentication

All API endpoints require a valid session. Authentication is handled by Better-Auth middleware.

- Session token passed via cookies or Authorization header
- All endpoints return 401 for unauthenticated requests

## Base URL

- Development: `http://localhost:5173/api`
- Production: `https://atspro.app/api`

## Response Format

All endpoints return JSON responses with the following structure:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  }
}
```

## Endpoints

### 1. Extract Resume

**POST** `/api/extract/resume`

Extracts and structures resume data from uploaded documents.

#### Request

```typescript
{
	document: File; // PDF, DOCX, MD, or TXT file
}
```

#### Headers

- `Content-Type: multipart/form-data`

#### Processing Logic

1. Validate user session and get `userId`
2. Validate file type:
   - **PDF**: Base64 encode and add to AI messages as `file`
   - **DOC/DOCX**: Convert to PDF, then base64 encode
   - **MD/TXT**: Extract text content and add as `text`
   - **Other**: Return error
3. Extract resume data using Vercel AI SDK with `Resume` type schema
4. Store resume data in `userResume` table with `userId` foreign key
5. Return success/error response

#### Response

```json
{
  "success": true,
  "data": {
    "resumeId": "uuid-here",
    "extractedFields": {
      "contactInfo": { ... },
      "summary": "...",
      "workExperience": [...],
      "education": [...],
      "certifications": [...],
      "skills": [...]
    }
  },
  "message": "Resume extracted successfully"
}
```

#### Error Codes

- `INVALID_FILE_TYPE`: Unsupported file format
- `FILE_TOO_LARGE`: File exceeds 10MB limit
- `EXTRACTION_FAILED`: AI extraction failed
- `DUPLICATE_RESUME`: User already has a resume

---

### 2. Extract Job

**POST** `/api/extract/job`

Extracts job posting data from URL or raw description text.

#### Request

```typescript
{
  jobUrl?: string,        // URL to job posting
  jobDescription?: string // Raw job description text
}
// Note: Must provide either jobUrl OR jobDescription, not both
```

#### Processing Logic

1. Validate user session and get `userId`
2. Process input:
   - **If jobUrl**: Fetch page content (using web scraper/crawler), extract text
   - **If jobDescription**: Use provided text directly
3. Extract job data using Vercel AI SDK with `Job` type schema
4. Store job data in `userJobs` table with `userId` foreign key
5. Return `jobId` in response

#### Response

```json
{
  "success": true,
  "data": {
    "jobId": "uuid-here",
    "extractedData": {
      "company": "Example Corp",
      "title": "Senior Software Engineer",
      "description": "...",
      "salary": "$150,000 - $200,000",
      "responsibilities": [...],
      "qualifications": [...],
      "location": ["San Francisco, CA"],
      "link": "https://..."
    }
  },
  "message": "Job extracted successfully"
}
```

#### Error Codes

- `MISSING_INPUT`: Neither jobUrl nor jobDescription provided
- `INVALID_URL`: Provided URL is malformed
- `FETCH_FAILED`: Unable to fetch job posting from URL
- `EXTRACTION_FAILED`: AI extraction failed
- `RATE_LIMIT`: Too many extraction requests

---

### 3. Optimize Resume

**POST** `/api/optimize`

Generates an optimized resume tailored to a specific job posting.

#### Request

```typescript
{
  resumeId: string, // UUID of user's resume
  jobId: string     // UUID of target job
}
```

#### Processing Logic

1. Validate user session
2. Verify `resumeId` and `jobId` exist and belong to user
3. Fetch resume and job data from database
4. Format data for AI processing:
   - Combine resume and job data as structured text
   - Include optimization instructions
5. Use Vercel AI SDK Optimization Agent to generate optimized resume
6. Store optimized resume in `jobDocuments` table:
   - Type: "resume"
   - Foreign key: `jobId`
   - Content: Markdown formatted resume
7. Return list of all documents for the job

#### Response

```json
{
	"success": true,
	"data": {
		"documentId": "uuid-here",
		"documents": [
			{
				"id": "uuid-1",
				"type": "resume",
				"version": 1,
				"createdAt": "2025-01-15T10:00:00Z"
			},
			{
				"id": "uuid-2",
				"type": "cover",
				"version": 1,
				"createdAt": "2025-01-15T11:00:00Z"
			}
		],
		"optimizationScore": 92,
		"matchedKeywords": ["React", "TypeScript", "AWS"],
		"suggestions": [
			"Consider adding more quantifiable achievements",
			"Include certification completion dates"
		]
	},
	"message": "Resume optimized successfully"
}
```

#### Error Codes

- `RESUME_NOT_FOUND`: Resume ID doesn't exist or doesn't belong to user
- `JOB_NOT_FOUND`: Job ID doesn't exist or doesn't belong to user
- `OPTIMIZATION_FAILED`: AI optimization failed
- `RATE_LIMIT`: Too many optimization requests

---

### 4. Get User Resume

**GET** `/api/resume`

Retrieves the user's current resume data.

#### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "contactInfo": { ... },
    "summary": "...",
    "workExperience": [...],
    "education": [...],
    "certifications": [...],
    "skills": [...],
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
}
```

---

### 5. Update Resume

**PUT** `/api/resume`

Updates the user's resume data.

#### Request

```typescript
{
  contactInfo?: ContactInfo,
  summary?: string,
  workExperience?: WorkExperience[],
  education?: Education[],
  certifications?: Certification[],
  skills?: string[]
}
// All fields are optional - only provided fields will be updated
```

#### Response

```json
{
	"success": true,
	"data": {
		"id": "uuid-here",
		"updatedFields": ["summary", "skills"],
		"updatedAt": "2025-01-15T12:00:00Z"
	},
	"message": "Resume updated successfully"
}
```

---

### 6. List Jobs

**GET** `/api/jobs`

Retrieves all jobs tracked by the user.

#### Query Parameters

- `status` (optional): Filter by job status ('tracked', 'applied', 'interviewing', etc.)
- `limit` (optional): Number of results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `sort` (optional): Sort field ('created_at', 'company', 'title', default: 'created_at')
- `order` (optional): Sort order ('asc', 'desc', default: 'desc')

#### Response

```json
{
	"success": true,
	"data": {
		"jobs": [
			{
				"id": "uuid-here",
				"company": "Example Corp",
				"title": "Senior Software Engineer",
				"status": "applied",
				"appliedAt": "2025-01-14T10:00:00Z",
				"createdAt": "2025-01-13T10:00:00Z",
				"documentsCount": 3
			}
		],
		"pagination": {
			"total": 45,
			"limit": 20,
			"offset": 0,
			"hasMore": true
		}
	}
}
```

---

### 7. Get Job Details

**GET** `/api/jobs/:id`

Retrieves detailed information about a specific job.

#### Response

```json
{
  "success": true,
  "data": {
    "job": {
      "id": "uuid-here",
      "company": "Example Corp",
      "title": "Senior Software Engineer",
      "description": "...",
      "salary": "$150,000 - $200,000",
      "responsibilities": [...],
      "qualifications": [...],
      "logistics": [...],
      "location": ["San Francisco, CA"],
      "additionalInfo": [...],
      "link": "https://...",
      "status": "applied",
      "appliedAt": "2025-01-14T10:00:00Z",
      "createdAt": "2025-01-13T10:00:00Z"
    },
    "documents": [
      {
        "id": "doc-uuid-1",
        "type": "resume",
        "version": 1,
        "isActive": true,
        "createdAt": "2025-01-13T11:00:00Z"
      },
      {
        "id": "doc-uuid-2",
        "type": "cover",
        "version": 1,
        "isActive": true,
        "createdAt": "2025-01-13T12:00:00Z"
      }
    ]
  }
}
```

---

### 8. Get Document

**GET** `/api/documents/:id`

Retrieves the content of a specific document.

#### Response

```json
{
	"success": true,
	"data": {
		"id": "uuid-here",
		"jobId": "job-uuid",
		"type": "resume",
		"content": "# John Doe\n\n## Contact Information\n...",
		"version": 1,
		"isActive": true,
		"metadata": {
			"atsScore": 92,
			"keywordsMatched": ["React", "TypeScript"]
		},
		"created_at": "2025-01-13T11:00:00Z"
	}
}
```

---

### 9. Generate Cover Letter

**POST** `/api/generate/cover`

Generates a cover letter for a specific job.

#### Request

```typescript
{
  jobId: string,
  tone?: "professional" | "enthusiastic" | "conversational" // default: "professional"
}
```

#### Response

```json
{
	"success": true,
	"data": {
		"documentId": "uuid-here",
		"type": "cover",
		"content": "Dear Hiring Manager,\n\n...",
		"version": 1
	},
	"message": "Cover letter generated successfully"
}
```

---

### 10. Generate Company Research

**POST** `/api/generate/research`

Generates company research and insights for interview preparation.

#### Request

```typescript
{
	jobId: string;
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "documentId": "uuid-here",
    "type": "research",
    "content": "# Company Research: Example Corp\n\n...",
    "insights": {
      "companyCulture": "...",
      "recentNews": [...],
      "competitors": [...],
      "interviewTips": [...]
    }
  },
  "message": "Research document generated successfully"
}
```

---

### 11. Update Job Status

**PATCH** `/api/jobs/:id/status`

Updates the status of a job application.

#### Request

```typescript
{
  status: "tracked" | "applied" | "interviewing" | "offered" | "rejected" | "withdrawn",
  appliedAt?: string // ISO date string, required when status = "applied"
}
```

#### Response

```json
{
	"success": true,
	"data": {
		"id": "uuid-here",
		"status": "applied",
		"appliedAt": "2025-01-15T10:00:00Z",
		"updatedAt": "2025-01-15T10:00:00Z"
	},
	"message": "Job status updated successfully"
}
```

---

### 12. Delete Job

**DELETE** `/api/jobs/:id`

Deletes a job and all associated documents.

#### Response

```json
{
	"success": true,
	"message": "Job deleted successfully"
}
```

---

### 13. Update Job Notes

**PATCH** `/api/jobs/:id/notes`

Updates the notes field for a specific job.

#### Request

```typescript
{
  notes: string
}
```

#### Response

```json
{
	"success": true,
	"data": {
		"id": "uuid-here",
		"notes": "Updated notes content",
		"updatedAt": "2025-01-15T10:00:00Z"
	},
	"message": "Notes updated successfully"
}
```

---

### 14. Get Job Activity

**GET** `/api/jobs/:id/activity`

Retrieves the activity timeline for a specific job.

#### Query Parameters

- `limit` (optional): Number of activities to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

#### Response

```json
{
	"success": true,
	"data": {
		"activities": [
			{
				"id": "uuid-here",
				"jobId": "job-uuid",
				"type": "status_change",
				"description": "Status changed from tracked to applied",
				"metadata": {
					"previousStatus": "tracked",
					"newStatus": "applied"
				},
				"createdAt": "2025-01-15T10:00:00Z"
			}
		],
		"pagination": {
			"total": 15,
			"limit": 50,
			"offset": 0,
			"hasMore": false
		}
	}
}
```

---

## Rate Limiting

To prevent abuse and ensure fair usage:

- **Resume/Job Extraction**: 10 requests per hour
- **Document Generation**: 20 requests per hour
- **Read Operations**: 100 requests per minute
- **Update Operations**: 50 requests per minute

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Webhooks (Future Enhancement)

Planned webhook events:

- `resume.updated`: When resume is modified
- `job.created`: When new job is added
- `job.status_changed`: When job status changes
- `document.generated`: When new document is created

## SDK Integration

### Vercel AI SDK

Used for all AI-powered operations:

- Resume extraction and parsing
- Job description analysis
- Resume optimization
- Document generation

### SvelteKit Remote Functions

All endpoints will be implemented as SvelteKit server functions for:

- Type-safe API calls
- Automatic request/response handling
- Built-in CSRF protection
- Session management

## Error Handling Best Practices

1. Always validate input data before processing
2. Use database transactions for multi-step operations
3. Log all errors with context for debugging
4. Return user-friendly error messages
5. Include error codes for client-side handling
6. Implement retry logic for transient failures

## Security Considerations

1. **Authentication**: All endpoints require valid session
2. **Authorization**: Users can only access their own data
3. **Input Validation**: Strict validation on all inputs
4. **File Upload**: Limit file size and validate file types
5. **Rate Limiting**: Prevent abuse and DoS attacks
6. **Data Sanitization**: Clean all user input before storage
7. **CORS**: Configure appropriate CORS headers
8. **HTTPS**: Enforce HTTPS in production
