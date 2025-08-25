# TODO

## Phase 1: Project Setup

- [x] Initialize app scaffolding
- [x] Add better-auth, initial migration
- [x] Project types & Documentation
- [x] Full data model (docs/data-model.md)
- [x] API Spec (docs/api-spec.md)

## Phase 2: UI Scaffolding

- [x] Build core components
- [x] Build main app views

@.claude/docs/sveltekit/05-remote-functions.md
@docs/api-spec.md
@docs/data-model.md

## Phase 2.5: API Scaffolding
- [x] Analyze data model, api-spec & all routes in `src/routes/`, check for consistency between data model and page data. Update data model / spec docs as needed.
- [x] Add missing fields to data model (notes, jobActivity)
- [ ] Create API route structure in `/src/routes/api/`, all endpoints
  - Type-safe API client using SvelteKit conventions (Remote Functions).
  - DO NOT add business logic, just console.log() form data & return success.

## Phase 3: API & Database Updates
- [ ] Apply data model changes to DB
- [ ] Add API business logic using Agents SDK
- [ ] Connect Better-Auth session to layouts and pages
- [ ] Add server-side load functions to all routes

## Phase 4: Service Architecture

- [ ] UserService for interacting with User db tables
- [ ] ResumeService for interacting with Resume db tables
- [ ] JobService for interacting with Job db tables

## Phase 5: Front-end/Back-end Integration

- [ ] Integrate the UserService
- [ ] Integrate the ResumeService
- [ ] Integrate the JobService

## Phase 6: End-to-end Testing

- [ ] Write user stories using `.test-data`
- [ ] Run end-to-end tests
