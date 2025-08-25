# ATS Pro Data Model

ATS Pro is an app where user's optimize their resume against job descriptions for roles they are applying to.

## Data Types
- Resume: `src/lib/types/resume.ts`
- Job: `src/lib/types/job.ts`
- JobDocument: `src/lib/types/job.ts`

## DB Setup
- We are using `postresql` for all data in the app.
- Better-auth is configured for authentication, existing user tables in migrations folder: `better-auth_migrations/*`
- All data should use foreign keys to ensure referential integrity. Every table should have `createdAt` & `updatedAt` columns.
- Each user should have the following tables in addition to the existing better-auth tables:
  - `userResume`: Base resume data matching `Resume` type, primary key is `id` with uuid type. One resume per `userId`.
  - `userJobs`: Job data matching `Job` type, primary key is `id` with uuid type. Many jobs per `userId`.
  - `jobDocuments`: Generated documents for a job, primary key is `id` with uuid type. Many documents per `jobId`.
