# TODO:

Project:
- Env variables (Redis, postgres etc)
- Project Plan improvements
  - data model
  - service architecture
  - bullmq
- Docs: User Stories, Implementation Plan
- Fix resume & job types (python + ts) (shared?)

API:
- API routes refactor (workers + bullmq)
  - /parse/resume
  - /parse/job
  - /optimize
  - /score
  - /research

Web:
- Betterauth + polar setup
- Shadcn/ui components
- User service for auth, subscription, settings (postgres)
- UserData service for resume, job & document data (arrangodb)
- Tasks service for background job management, info (bullmq)
- Testing framework
- Limitations based on subscription
- Polar webhooks

## Questions
- How should secrets be shared? Stored?
- Deployment? Actions?
