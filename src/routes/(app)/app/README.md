# Dashboard Page

Main page of the ATS Pro application. User is able to quickly view stats across their active jobs, create a new job, and view a full list of jobs they have applied to.

## Adding a Job

- When a user adds a Job, the API is called and the job data is extracted and added to the DB.
- Once the request completes, a `jobId` is returned & the user is redirected to `/app/jobs/[id]`.
