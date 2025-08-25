# User Story: Resume Onboarding Flow Issue

## Background

Users successfully complete the onboarding flow by uploading their resume, get redirected to the dashboard, but encounter missing resume data when navigating to the resume editor.

## User Story

**As a** new user who has just completed onboarding  
**I want** to view and edit my uploaded resume in the resume editor  
**So that** I can customize and optimize my resume for job applications

## Current Behavior (Bug)

1. User uploads resume during `/onboarding`
2. User is successfully redirected to dashboard
3. User navigates to `/resume` editor page
4. Resume editor shows no data/empty state
5. User cannot edit or view their uploaded resume content

## Expected Behavior

1. User uploads resume during `/onboarding`
2. Resume is parsed and stored in database with proper user association
3. User is redirected to dashboard
4. User navigates to `/resume` editor page
5. Resume editor displays the parsed resume data
6. User can edit resume fields and save changes
7. Updated resume data persists in database

## Acceptance Criteria

### ✅ Resume Upload & Storage

- [ ] Uploading a resume to `/onboarding` should create a valid resume record in the database
- [ ] Resume should be associated with the authenticated user
- [ ] Parse task should complete successfully with structured resume data
- [ ] Resume data should be stored in ArangoDB with proper user linkage

### ✅ Resume Data Retrieval

- [ ] Resume page `/resume` should fetch the user's resume data from the database
- [ ] API endpoint `/api/resume` should return the current user's resume
- [ ] Frontend should handle loading states and display resume data
- [ ] Missing resume should show appropriate empty state with upload option

### ✅ Resume Update Functionality

- [ ] User should be able to edit resume fields (name, email, experience, etc.)
- [ ] Resume updates should save to database
- [ ] UI should provide feedback on save success/failure
- [ ] Updated data should persist across page refreshes

## Technical Investigation Areas

### Database Layer

- Verify resume records are created in ArangoDB after onboarding
- Check user association and data structure
- Confirm task completion and result storage

### API Layer

- Test `/api/parse` endpoint functionality
- Verify `/api/resume` endpoint returns user data
- Check authentication and user context in API calls
- Validate PATCH `/api/resume/{id}` for updates

### Frontend Layer

- Investigate resume service data fetching
- Check authentication state in resume editor
- Verify API client integration and error handling
- Test resume editor component data binding

### Integration Flow

- End-to-end onboarding → dashboard → resume editor flow
- WebSocket task updates during parsing
- Cross-service communication between web app and API

## Test Scenarios

### E2E Test Flow

1. Sign in to application
2. Navigate to onboarding (`/onboarding`)
3. Upload a test resume file
4. Wait for parsing completion
5. Verify redirect to dashboard
6. Navigate to resume editor (`/resume`)
7. Verify resume data is displayed
8. Edit resume field
9. Save changes
10. Refresh page and verify persistence

### Database Verification

- Query user resume records after onboarding
- Verify data structure and completeness
- Check task completion status and results

## Environment

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **Database**: PostgreSQL (auth), ArangoDB (resumes), Redis (tasks)
- **Test User**: Will be created during E2E testing

## Priority

**HIGH** - Core user flow is broken, preventing users from accessing their uploaded resume data.
