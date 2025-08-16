# Onboarding Flow

This document outlines the implementation requirements for the Onboarding flow in the `projects/web` NextJs app.

## Requirements

**User Flow:**
- After signing in, if a user does not yet have a `resume_id` in their `Profile` in the postgres DB, show the onboarding flow `/onboarding`.
- The onboarding page has a drag-and-drop file upload supporting (PDF, Docx, Md, Txt).
- Once user drops document, POST API request to python backend (`/parse` endpoint)
- If success, redirect to `/`, otherwise handle error and allow re-upload.

**Front-end Design:**
- Centered file upload component with Title & Intro text

**Implementation:**
- Handle loading and error states
- Redirect to home (`/`) on success

**Questions:**
- Should `Resume` data be added to DB in the API or after the response? The API is currently set up to simply return the parsed data, but it could be refactored to:
  1. Accept `file` & additional field `user_id`
  2. Parse data (no change)
  3. Post `Resume` data to arrango DB, get the `resume_id`
  4. Add `resume_id` to `Profile` table for user in postgres DB
  5. Return standard succcess/fail JSON for web app to handle
- The plan is to store user data (resumes, job data, documents) in the arango DB. Do we need to store a record of the arango document in the postgres DB or should we set up the arango DB to be able to query by `user_id`?

## MCP servers:
- `language-server-ts` Language server for Typescript app (definition, references, rename_symbol etc)
- `language-server-py` Language server for Python app (definition, references, rename_symbol etc)
- `shadcn-ui` Interact shadcn component registry, new and existing components
