# Refactor API endpoints

Note: Most of these endpoints are long-running tasks that should be handled as background workers. The logic below should be updated to reflect this by returning a job ID and polling for status. Once job is finished data is posted directly to db rather than returned in a response.

## New Endpoint Logic

**Parse Resume**
- POST {document: File} => Returns {success, error, data: {resumeId: string, taskId: string}}
- Parse resume using Agents SDK and Resume model
- Post resume data to arango db using the user_id as a foreign key.
- Return json response with success/error & resume_id from db

**Parse Job**
- POST {url: string} => Returns {success, error, data: {jobId: string, taskId: string}}
- Create db entry & start background task.
- Return id of job document and task
- Worker:
  - Extract role data from job posting
  - Format using Job pydantic model
  - Update db with extracted job data

**Optimize**
- POST {resumeId: string, jobId: string} => Returns {success, error, data: {documentId: string, taskId: string}}
- Confirm resume and document exist in db and have data
- Create db entry for document & start background task.
- Return id of resume document and task
- Worker:
  - Fetch resume and job data from db
  - Optimize resume content based on job data and settings
  - Format as markdown
  - Update db with optimized resume, add document relation to job entity

**Score**
- POST {resumeId: string, jobId: string} => Returns {success, error, data: {taskId: string}}
- Confirm resume and document exist in db and have data
- Start background task
- Return id of task
- Worker:
  - Fetch resume and job data from db
  - Score resume based on job data and settings, returns percentage match as number
  - Update job entity in db with score

**Research**
- POST {resumeId: string, jobId: string} => Returns {success, error, data: {documentId: string, taskId: string}}
- Confirm resume and document exist in db and have data
- Start background task
- Return id of task
- Worker:
  - Conduct deep dive research on company, considering position and location as factors
  - Include 10-20 thoughtful questions candidate should ask to demonstrate value
  - Update db with research report, add document relation to job entity
