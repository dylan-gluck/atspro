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
- [x] Analyze data model, api-spec & all routes for consistency
- [x] Add missing fields to data model (notes, jobActivity)
- [x] Document Remote Functions architecture (docs/remote-functions-architecture.md)

## Phase 3: Enable Remote Functions & Database Setup

- [ ] Enable experimental remote functions in svelte.config.js
- [ ] Apply data model changes to DB (migrations)
- [ ] Create database utility functions
- [ ] Set up AI SDK integration helpers

## Phase 4: Service Implementation (Remote Functions)

- [ ] Create base utilities (auth helpers, rate limiting, error handling)
- [ ] Implement `resume.remote.ts` service
  - [ ] getResume query
  - [ ] extractResume form (file upload)
  - [ ] updateResume command
- [ ] Implement `job.remote.ts` service
  - [ ] getJobs query (with filtering/pagination)
  - [ ] getJob query (single job)
  - [ ] extractJob form
  - [ ] updateJobStatus command
  - [ ] deleteJob command
  - [ ] updateJobNotes command
- [ ] Implement `document.remote.ts` service
  - [ ] getDocument query
  - [ ] optimizeResume command
  - [ ] generateCoverLetter form
  - [ ] generateCompanyResearch command
- [ ] Implement `activity.remote.ts` service
  - [ ] getJobActivity query

## Phase 5: Front-end Integration

- [ ] Update onboarding flow to use remote functions
- [ ] Update job tracker dashboard to use remote functions
- [ ] Update job details page to use remote functions
- [ ] Update resume editor to use remote functions
- [ ] Implement optimistic UI with withOverride
- [ ] Add loading states and error boundaries

## Phase 6: Testing & Polish

- [ ] Write unit tests for remote functions
- [ ] Write integration tests for service flows
- [ ] Implement rate limiting and monitoring
- [ ] Performance optimization (query caching, prerendering)
- [ ] Error tracking and logging setup
