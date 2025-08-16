# Service Architecture

The ATSPro web app should implement a service architecture to abstract the various data layers. Each service should expose methods to fetch relevant data from the DBs and post data to the API.

**Services:**

- UserService:
  - get_profile - get profile data from postgres
  - update_profile - update profile data in postgres
  - get_settings - get settings data from postgres
  - update_settings - update settings data in postgres
  - get_subscription - get subscription data from postgres

- ResumeService:
  - get_resume - get resume data from arango db
  - update_resume - update resume data in arango db
  - new_resume - post document to API

- JobsService:
  - list_jobs
  - get_job
  - get_documents
  - new_document
  - new_job

## MCP servers:
- `language-server-ts` Language server for Typescript app (definition, references, rename_symbol etc)
- `language-server-py` Language server for Python app (definition, references,
