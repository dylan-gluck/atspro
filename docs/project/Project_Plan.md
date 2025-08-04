# ATSPro - ATS resume optimization

ATSPro isn't just another resume checker—it's the comprehensive career advancement platform that finally levels the playing field. We decode the hidden language of hiring algorithms, then arm you with everything you need to not just get noticed, but get hired.
Our three-pillar approach:

🎯 ATS Mastery – Our proprietary engine, reverse-engineered from leading ATS platforms, doesn't just scan your resume—it reconstructs it for maximum algorithmic impact. Watch your match rates soar from 35% to 85%+.

🔬 Company Intelligence – Go beyond generic applications with deep-dive research reports, insider interview questions, and cultural insights that help you speak their language from day one.

📈 Success Analytics – Track your entire job search journey with precision. See which strategies drive interviews, which companies respond, and where your next breakthrough is coming from.

---

# Technical Implementation

This project is set up as a monorepo using Turborepo with Docker containerization for all services.

## Monorepo Structure:

- /
  - Turborepo config
  - Docker compose
- apps/
  - api/ (python backend, business logic)
  - web/ (nextjs typescript)
  - marketing/ (nextjs typescript)
  - redis/ (bullmq message broker)
  - postgres/ (db for auth, subscriptions, transactions)
  - arango/ (db for documents, relationships)
- docs/
  - project/ (project plan, technical specs, etc)
  - vendor/ (vendor docs)

## API Specs:

- UV package manager
- FastAPI backend
- OpenAI Agent SDK
- Pydantic types

The API will contain all of the core business logic, prompts and agent workflows. Each core function will have its own endpoint, eg: '/api/v1/optimize`.

Note: Most of these endpoints are long-running tasks that should be handled as background workers. The logic below should be updated to reflect this by returning a job ID and polling for status. Once job is finished data is posted directly to db rather than returned in a response.

**Parse Resume**
- POST {document: File} => Returns {success, error, data: {resumeId: string, taskId: string}}
- Create db entry & start background task.
- Return id of resume document and task
- Worker:
  - Extract resume data from document using unstructured + llm extraction
  - Format using Resume pydantic model
  - Update db with extracted resume data

**Parse Job**
- POST {job: string} => Returns {success, error, data: {jobId: string, taskId: string}}
- Create db entry & start background task.
- Return id of job document and task
- Worker:
  - Extract role data from job description text
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


## Web App Specs

- Pnpm package manager
- Nextjs + Typescript
- Shadcn/ui + Tailwind css
- Zustand state management
- Betterauth user authentication (Email, Google, Linkedin)
- Polar.sh payments
- Resend transactional emails

The web app will serve as the primary entrypoint for users; a platform to track job applications & manage related documents.

Logged out users only have access to `/` which displays the login/registration form.

After logging in for the first time, if user does not have base resume redirect to onboarding `/start`. Users are prompted to upload existing resume during initial onboarding. Document is parsed in background task, once complete the extracted resume data is persisted to their profile. User's can edit their base resume data at any point on a dedicated screen.

The main dashboard `/` should contain high-level stats across all jobs, recent notifications, calendar reminders, list of running background tasks. A grid displaying cards for each "Active" job currently being tracked including title, company, status, stats. Clicking a job opens the job details page.

When a user adds a job, an entry is created in the database with an id but the data columns are empty. Job details page `/job/{id}` polls db for job data and displays list of any running background tasks associated with that job. Once job data exists the page is hydrated and the layout is updated. Extracted job description & company info displayed in main column. Aside contains a dropdown input to set status, ATS scorecard (before & after optimization), list of generated documents. Clicking a document fetches the markdown from the db and generates a PDF on the fly, download event automatically fired off to store file.

**BetterAuth Plugins**
- @polar-sh/better-auth

## Postgres

DB for user authentication, settings, subscription management, transactional data.

Data model mostly defined by BetterAuth + plugins.

## ArangoDB

DB for user-created data, resume & job data, document relations.
