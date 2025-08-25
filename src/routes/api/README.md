# API Spec

The backend API will contain all of the core business logic, prompts and agent workflows. Each core function will have its own endpoint, eg: '/api/optimize`.

## Requirements

- Vercel AI SDK
- Sveltekit Remote Functions

## Endpoints

### Extract Resume `/api/extract/resume`

- POST {document: File} => Returns {success, error}
- Validate user session, get userId
- Validate file type:
  - If PDF, base64 encode & add to messages array as `file`
  - If Doc/Docx, first convert to PDF then base64 encode & add to messages array as `file`
  - If Md/Txt, extract the text content and add to messaged array as `text`
  - If any other type, return error
- Extract resume data using Vercel AI SDK and Resume type `src/lib/types/resume.ts`
- Post resume data to db using the `userId` as a foreign key.
- Return json response with success/error

### Extract Job `/api/extract/job`

- POST {jobUrl: string, jobDescription: string} => Returns {success, error, data: {jobId: string}}
  - If jobUrl, Fetch page content (freecrawl), add to messages array as `text`
  - If jobDescription, add string to messages array as `text`
- Extract role data from raw job description using Vercel AI SDK and Job type `src/lib/types/job.ts`
- Post job data to db using the `userId` as a foreign key.
- Return `jobId` in standard json response with success/error

### Optimize `/api/optimize`

- POST {resumeId: string, jobId: string} => Returns {success, error, data: {documents: string[]}}
- Confirm resume and job exist in db
- Fetch resume and job data from db
- Format messages array as `text` with resume and job data
- Vercel AI SDK, Optimize Agent => Returns optimized Resume data as Markdown
- Post new JobDocument type "resume" to the db, foreign key `jobId`
- Return list of all documents for the job
