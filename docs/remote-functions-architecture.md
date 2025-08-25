# ATSPro Remote Functions Architecture

## Overview

This document outlines how to leverage SvelteKit's experimental Remote Functions feature to implement ATSPro's API as a type-safe, service-oriented architecture. Instead of traditional REST endpoints, we'll use `.remote.ts` files that provide full-stack type safety and automatic client-server communication.

## Why Remote Functions for ATSPro?

### Benefits Over Traditional REST

1. **Type Safety**: End-to-end TypeScript types without manual API client generation
2. **Developer Experience**: Autocomplete, refactoring support, and compile-time checks
3. **Simplified Auth**: Direct access to session via `getRequestEvent()`
4. **Built-in Features**: CSRF protection, automatic serialization, error handling
5. **Performance**: Single-flight mutations reduce round trips
6. **Progressive Enhancement**: Forms work without JavaScript

### Perfect Fit for Our Requirements

- All operations require authentication (easy with `getRequestEvent()`)
- Complex data structures (handled by devalue serialization)
- File uploads (native FormData support)
- AI operations (async server-side processing)
- Real-time updates (query refresh capabilities)

## Architecture Design

### Service Layer Structure

```
src/lib/services/
├── resume.remote.ts      # Resume extraction & management
├── job.remote.ts         # Job tracking & management
├── document.remote.ts    # Document generation & optimization
├── activity.remote.ts    # Activity tracking
└── types.ts             # Shared types (reuse existing)
```

### Implementation Pattern

Each service file exports typed remote functions that encapsulate business logic:

```typescript
// Example: src/lib/services/resume.remote.ts
import { query, form, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import * as v from 'valibot';

// Queries for reading data
export const getResume = query(async () => { ... });

// Forms for file uploads and complex mutations
export const extractResume = form(async (data) => { ... });

// Commands for simple mutations
export const updateResume = command(schema, async (updates) => { ... });
```

## Service Implementations

### 1. Resume Service (`resume.remote.ts`)

```typescript
import { query, form, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import type { Resume, ContactInfo, WorkExperience } from '$lib/types/resume';
// Import AI SDK and database utilities

// Get current user's resume
export const getResume = query(async () => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  const resume = await db.getUserResume(userId);
  if (!resume) return null;
  
  return resume;
});

// Extract resume from uploaded file
export const extractResume = form(async (data) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  // Check for existing resume
  const existing = await db.getUserResume(userId);
  if (existing) error(400, 'DUPLICATE_RESUME');

  const file = data.get('document') as File;
  if (!file) error(400, 'INVALID_FILE_TYPE');

  // Validate file type
  const validTypes = ['application/pdf', 'text/markdown', 'text/plain'];
  if (!validTypes.includes(file.type)) {
    error(400, 'INVALID_FILE_TYPE');
  }

  // Process file based on type
  let content: string;
  if (file.type === 'application/pdf') {
    // Convert to base64 for AI processing
    const buffer = await file.arrayBuffer();
    content = Buffer.from(buffer).toString('base64');
  } else {
    content = await file.text();
  }

  // Extract with AI
  const extracted = await extractResumeWithAI(content, file.type);
  
  // Store in database
  const resume = await db.createUserResume(userId, extracted);
  
  return {
    resumeId: resume.id,
    extractedFields: extracted
  };
});

// Update specific resume fields
const updateResumeSchema = v.object({
  contactInfo: v.optional(v.custom<ContactInfo>()),
  summary: v.optional(v.string()),
  workExperience: v.optional(v.array(v.custom<WorkExperience>())),
  // ... other fields
});

export const updateResume = command(updateResumeSchema, async (updates) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  const resume = await db.updateUserResume(userId, updates);
  
  // Refresh the query on success
  await getResume().refresh();
  
  return {
    id: resume.id,
    updatedFields: Object.keys(updates),
    updatedAt: resume.updatedAt
  };
});
```

### 2. Job Service (`job.remote.ts`)

```typescript
import { query, form, command, prerender } from '$app/server';
import * as v from 'valibot';
import type { Job } from '$lib/types/job';

// List user's jobs with filtering
const listJobsSchema = v.object({
  status: v.optional(v.picklist(['tracked', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'])),
  limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100))),
  offset: v.optional(v.pipe(v.number(), v.minValue(0))),
  sort: v.optional(v.picklist(['createdAt', 'company', 'title'])),
  order: v.optional(v.picklist(['asc', 'desc']))
});

export const getJobs = query(listJobsSchema, async (params = {}) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  const { 
    status, 
    limit = 20, 
    offset = 0, 
    sort = 'createdAt', 
    order = 'desc' 
  } = params;

  const jobs = await db.getUserJobs(userId, { status, limit, offset, sort, order });
  const total = await db.getUserJobsCount(userId, { status });

  return {
    jobs,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  };
});

// Get single job details
export const getJob = query(v.string(), async (jobId) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  const job = await db.getJob(jobId);
  if (!job || job.userId !== userId) error(404, 'JOB_NOT_FOUND');

  const documents = await db.getJobDocuments(jobId);
  
  return { job, documents };
});

// Extract job from URL or text
export const extractJob = form(async (data) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  const jobUrl = data.get('jobUrl') as string;
  const jobDescription = data.get('jobDescription') as string;

  if (!jobUrl && !jobDescription) {
    error(400, 'MISSING_INPUT');
  }

  let content: string;
  if (jobUrl) {
    // Fetch and extract from URL
    content = await fetchJobContent(jobUrl);
  } else {
    content = jobDescription;
  }

  // Extract with AI
  const extracted = await extractJobWithAI(content);
  
  // Store in database
  const job = await db.createUserJob(userId, extracted);

  // Single-flight mutation: refresh jobs list
  await getJobs({}).refresh();
  
  return {
    jobId: job.id,
    extractedData: extracted
  };
});

// Update job status
const updateStatusSchema = v.object({
  jobId: v.string(),
  status: v.picklist(['tracked', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn']),
  appliedAt: v.optional(v.string())
});

export const updateJobStatus = command(updateStatusSchema, async ({ jobId, status, appliedAt }) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  const job = await db.getJob(jobId);
  if (!job || job.userId !== userId) error(404, 'JOB_NOT_FOUND');

  // Update status
  await db.updateJobStatus(jobId, status, appliedAt);
  
  // Create activity record
  await db.createActivity(jobId, 'status_change', {
    previousStatus: job.status,
    newStatus: status
  });

  // Refresh affected queries
  await Promise.all([
    getJob(jobId).refresh(),
    getJobs({}).refresh()
  ]);
});

// Delete job
export const deleteJob = command(v.string(), async (jobId) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  const job = await db.getJob(jobId);
  if (!job || job.userId !== userId) error(404, 'JOB_NOT_FOUND');

  await db.deleteJob(jobId); // Cascades to documents
  
  // Refresh jobs list
  await getJobs({}).refresh();
});
```

### 3. Document Service (`document.remote.ts`)

```typescript
import { query, form, command } from '$app/server';
import * as v from 'valibot';

// Get document content
export const getDocument = query(v.string(), async (documentId) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  const doc = await db.getDocument(documentId);
  if (!doc) error(404, 'DOCUMENT_NOT_FOUND');

  // Verify ownership through job
  const job = await db.getJob(doc.jobId);
  if (!job || job.userId !== userId) error(403, 'Forbidden');

  return doc;
});

// Optimize resume for job
const optimizeSchema = v.object({
  resumeId: v.string(),
  jobId: v.string()
});

export const optimizeResume = command(optimizeSchema, async ({ resumeId, jobId }) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  // Verify ownership
  const [resume, job] = await Promise.all([
    db.getUserResume(userId),
    db.getJob(jobId)
  ]);

  if (!resume || resume.id !== resumeId) error(404, 'RESUME_NOT_FOUND');
  if (!job || job.userId !== userId) error(404, 'JOB_NOT_FOUND');

  // Generate optimized resume with AI
  const optimized = await generateOptimizedResume(resume, job);
  
  // Store as document
  const doc = await db.createJobDocument(jobId, 'resume', optimized.content, {
    atsScore: optimized.score,
    matchedKeywords: optimized.keywords
  });

  // Create activity
  await db.createActivity(jobId, 'document_generated', { type: 'resume' });

  // Get all documents for response
  const documents = await db.getJobDocuments(jobId);

  // Refresh job details
  await getJob(jobId).refresh();

  return {
    documentId: doc.id,
    documents,
    optimizationScore: optimized.score,
    matchedKeywords: optimized.keywords,
    suggestions: optimized.suggestions
  };
});

// Generate cover letter
const coverLetterSchema = v.object({
  jobId: v.string(),
  tone: v.optional(v.picklist(['professional', 'enthusiastic', 'conversational']))
});

export const generateCoverLetter = form(async (data) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  const jobId = data.get('jobId') as string;
  const tone = data.get('tone') as string || 'professional';

  // Verify ownership and get data
  const [resume, job] = await Promise.all([
    db.getUserResume(userId),
    db.getJob(jobId)
  ]);

  if (!resume) error(404, 'RESUME_NOT_FOUND');
  if (!job || job.userId !== userId) error(404, 'JOB_NOT_FOUND');

  // Generate with AI
  const coverLetter = await generateCoverLetterWithAI(resume, job, tone);
  
  // Store document
  const doc = await db.createJobDocument(jobId, 'cover', coverLetter);

  // Create activity
  await db.createActivity(jobId, 'document_generated', { type: 'cover' });

  // Refresh job details
  await getJob(jobId).refresh();

  return {
    documentId: doc.id,
    type: 'cover',
    content: coverLetter,
    version: doc.version
  };
});
```

### 4. Activity Service (`activity.remote.ts`)

```typescript
import { query } from '$app/server';
import * as v from 'valibot';

// Get job activity timeline
const activitySchema = v.object({
  jobId: v.string(),
  limit: v.optional(v.pipe(v.number(), v.maxValue(100))),
  offset: v.optional(v.number())
});

export const getJobActivity = query(activitySchema, async ({ jobId, limit = 50, offset = 0 }) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  if (!userId) error(401, 'Unauthorized');

  // Verify job ownership
  const job = await db.getJob(jobId);
  if (!job || job.userId !== userId) error(404, 'JOB_NOT_FOUND');

  const activities = await db.getJobActivities(jobId, { limit, offset });
  const total = await db.getJobActivityCount(jobId);

  return {
    activities,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  };
});
```

## Usage in Components

### Example: Resume Upload Page

```svelte
<!-- src/routes/(app)/onboarding/+page.svelte -->
<script>
  import { extractResume, getResume } from '$lib/services/resume.remote';
  import { goto } from '$app/navigation';

  // Check if user already has resume
  const existingResume = getResume();
  $: if ($existingResume) goto('/app');
</script>

<h1>Upload Your Resume</h1>

<form 
  {...extractResume.enhance(async ({ submit }) => {
    try {
      const result = await submit();
      // Automatically navigates on success due to server redirect
      console.log('Resume extracted:', result.resumeId);
    } catch (error) {
      // Show error toast
    }
  })}
>
  <input 
    type="file" 
    name="document" 
    accept=".pdf,.md,.txt"
    required 
  />
  <button type="submit">
    Extract Resume
  </button>
</form>

{#if extractResume.result?.extractedFields}
  <div>
    <h2>Extracted Successfully!</h2>
    <pre>{JSON.stringify(extractResume.result.extractedFields, null, 2)}</pre>
  </div>
{/if}
```

### Example: Job Tracker Dashboard

```svelte
<!-- src/routes/(app)/app/+page.svelte -->
<script>
  import { getJobs, updateJobStatus, deleteJob } from '$lib/services/job.remote';
  
  let statusFilter = $state('');
  
  // Reactive query with filters
  const jobs = $derived(getJobs({ 
    status: statusFilter || undefined,
    limit: 20 
  }));

  async function handleStatusUpdate(jobId, newStatus) {
    await updateJobStatus({ jobId, status: newStatus });
    // Jobs list auto-refreshes due to single-flight mutation
  }
</script>

<h1>Your Jobs</h1>

<select bind:value={statusFilter}>
  <option value="">All</option>
  <option value="tracked">Tracked</option>
  <option value="applied">Applied</option>
  <!-- ... -->
</select>

{#await jobs}
  <p>Loading jobs...</p>
{:then data}
  <div class="job-grid">
    {#each data.jobs as job}
      <div class="job-card">
        <h3>{job.title} at {job.company}</h3>
        <select 
          value={job.status}
          onchange={(e) => handleStatusUpdate(job.id, e.target.value)}
        >
          <option value="tracked">Tracked</option>
          <option value="applied">Applied</option>
          <!-- ... -->
        </select>
        <button onclick={() => deleteJob(job.id)}>
          Delete
        </button>
      </div>
    {/each}
  </div>
  
  {#if data.pagination.hasMore}
    <button onclick={() => jobs.refresh()}>
      Load More
    </button>
  {/if}
{/await}
```

### Example: Resume Optimization

```svelte
<!-- src/routes/(app)/app/job/[id]/optimize/+page.svelte -->
<script>
  import { getJob } from '$lib/services/job.remote';
  import { getResume } from '$lib/services/resume.remote';
  import { optimizeResume } from '$lib/services/document.remote';
  
  let { params } = $props();
  
  const job = getJob(params.id);
  const resume = getResume();
  
  async function handleOptimize() {
    if (!$resume) return;
    
    const result = await optimizeResume({
      resumeId: $resume.id,
      jobId: params.id
    }).updates(job); // Single-flight mutation
    
    console.log('Optimization complete:', result);
  }
</script>

{#await Promise.all([job, resume])}
  <p>Loading...</p>
{:then [jobData, resumeData]}
  <h1>Optimize Resume for {jobData.job.title}</h1>
  
  <div class="optimization-panel">
    <div>
      <h2>Your Resume</h2>
      <p>{resumeData.summary}</p>
    </div>
    
    <div>
      <h2>Job Requirements</h2>
      <ul>
        {#each jobData.job.qualifications as qual}
          <li>{qual}</li>
        {/each}
      </ul>
    </div>
    
    <button onclick={handleOptimize}>
      Generate Optimized Resume
    </button>
    
    {#if jobData.documents.some(d => d.type === 'resume')}
      <p>✓ Optimized resume already generated</p>
    {/if}
  </div>
{/await}
```

## Migration Path

### Phase 1: Enable Remote Functions (Immediate)

```javascript
// svelte.config.js
const config = {
  kit: {
    experimental: {
      remoteFunctions: true
    }
  },
  compilerOptions: {
    experimental: {
      async: true
    }
  }
};
```

### Phase 2: Implement Services (Replace Phase 2.5)

1. Create service files in `src/lib/services/`
2. Implement authentication helper utilities
3. Add database query functions
4. Integrate AI SDK for extraction/generation

### Phase 3: Remove Traditional API Routes

- No need for `/src/routes/api/` structure
- Remote functions handle all client-server communication
- Better type safety and developer experience

### Phase 4: Update Components

- Replace fetch calls with remote function imports
- Use reactive queries with `$derived`
- Implement optimistic UI with `withOverride`

## Benefits Summary

1. **Reduced Boilerplate**: No manual API client code
2. **Type Safety**: End-to-end TypeScript without code generation
3. **Performance**: Single-flight mutations reduce round trips
4. **Security**: Built-in CSRF protection and session handling
5. **Developer Experience**: Autocomplete, refactoring, and error checking
6. **Progressive Enhancement**: Forms work without JavaScript
7. **Simplified Testing**: Can test services directly as functions

## Considerations

### Rate Limiting

Implement rate limiting at the service level:

```typescript
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(userId: string, limit: number, window: number) {
  const now = Date.now();
  const key = `${userId}:${limit}:${window}`;
  const timestamps = rateLimiter.get(key) || [];
  
  const recent = timestamps.filter(t => t > now - window);
  if (recent.length >= limit) {
    error(429, 'RATE_LIMIT');
  }
  
  recent.push(now);
  rateLimiter.set(key, recent);
}

// Use in service functions
export const extractResume = form(async (data) => {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  
  checkRateLimit(userId, 10, 3600000); // 10 per hour
  // ... rest of function
});
```

### Error Handling

Consistent error responses using SvelteKit's error helper:

```typescript
import { error } from '@sveltejs/kit';

// Throw structured errors
error(400, {
  code: 'INVALID_FILE_TYPE',
  message: 'Please upload a PDF, Markdown, or text file'
});
```

### Monitoring

Add logging and metrics:

```typescript
export const optimizeResume = command(schema, async (params) => {
  const start = performance.now();
  
  try {
    // ... operation
    
    logger.info('Resume optimized', {
      userId,
      jobId: params.jobId,
      duration: performance.now() - start
    });
  } catch (err) {
    logger.error('Optimization failed', { error: err, params });
    throw err;
  }
});
```

## Next Steps

1. Enable experimental features in config
2. Create base service utilities (auth, database, AI)
3. Implement services one by one with tests
4. Update UI components to use remote functions
5. Remove traditional API routes
6. Add monitoring and error tracking

This architecture provides a clean, type-safe, and performant foundation for ATSPro while reducing complexity and improving developer experience.