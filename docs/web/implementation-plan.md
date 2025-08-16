# Frontend Implementation Plan

## Overview
This document provides a consolidated implementation plan for the ATSPro web application frontend based on the specifications in `onboarding-flow.md` and `page-layouts.md`.

## Architecture Overview
- **Framework**: Next.js 15 with App Router
- **UI Library**: Shadcn/ui components
- **Styling**: Tailwind CSS with Vintage Paper theme
- **Services**: Existing service architecture with dependency injection
- **Auth**: Better-auth integration

## Pages to Implement

### 1. Onboarding Flow (`/onboarding`)
**Priority**: Critical - Users without resume_id must complete this
- **Components**: File upload with drag-and-drop
- **API Integration**: POST to `/api/parse` endpoint
- **Database**: Store resume_id in Profile table
- **Redirect**: To dashboard (`/`) on success

### 2. Dashboard (`/`)
**Priority**: Critical - Main user interface
- **Top Row Cards**:
  - Profile info card
  - Stats card (active jobs, success rate)
  - Notifications card
- **Job Management**:
  - Job creation (URL input or document drop)
  - Job list (table/card view)
  - Pagination (10/20/50 items)
  - Filter states (all/active/archive)

### 3. Job Details (`/jobs/[id]`)
**Priority**: High - Core functionality
- **Job Information Display**
- **Application Status**: Awaiting Reply, Interview, Accepted, Rejected
- **Actions**: Optimize Resume, Score, Company Research, Interview Prep
- **Documents**: List of related documents (markdown stored, PDF export)

## Component Requirements

### Shared Components
1. **FileUpload**: Reusable drag-and-drop component
2. **JobCard**: Display job information in card format
3. **JobTable**: Tabular job display with sorting
4. **DocumentViewer**: Markdown viewer with PDF export
5. **StatsCard**: Display metrics and statistics
6. **NotificationList**: Show user notifications

### Services to Extend
1. **JobsService**: Create, update, list jobs
2. **ResumeService**: Parse and optimize resumes
3. **DocumentService**: Handle markdown to PDF conversion
4. **NotificationService**: Real-time updates via WebSocket

## Implementation Tasks

### Task 1: Onboarding Page
- Create `/onboarding` route with middleware check
- Implement FileUpload component
- Connect to parse API
- Update Profile with resume_id
- Add loading and error states
- Write tests

### Task 2: Dashboard Layout
- Update main dashboard layout
- Create ProfileCard component
- Create StatsCard component
- Create NotificationCard component
- Implement responsive grid layout
- Write tests

### Task 3: Job Creation
- Add job creation UI (URL/document input)
- Implement job parsing API call
- Handle success/error states
- Add to job list immediately
- Write tests

### Task 4: Job List
- Create JobTable component
- Create JobCard component
- Implement view toggle (table/card)
- Add pagination controls
- Add filter buttons
- Write tests

### Task 5: Job Details Page
- Create `/jobs/[id]` route
- Display job information
- Add status selector
- Implement action buttons
- Create documents list
- Write tests

### Task 6: Document Management
- Create DocumentViewer component
- Implement markdown to PDF conversion
- Add download functionality
- Handle document relationships
- Write tests

### Task 7: Real-time Updates
- Extend WebSocket integration
- Handle task progress updates
- Update UI optimistically
- Add connection status indicator
- Write tests

### Task 8: Polish & Integration
- Ensure consistent theme (Vintage Paper)
- Add loading skeletons
- Implement error boundaries
- Add accessibility features
- Final integration testing

## Design Guidelines
- Clean, grid/card-based layouts
- Professional with modern AI company aesthetic
- Vintage Paper theme from tweakcn
- Nice typography spacing and alignment
- Minimal but effective animations

## Testing Requirements
- Unit tests for all components
- Integration tests for user flows
- Service layer mocking
- >95% code coverage target

## API Endpoints Used
- `/api/parse` - Parse resume documents
- `/api/optimize` - Optimize resume for jobs
- `/api/job` - Parse job descriptions
- `/api/tasks/*` - Task management
- `/ws/tasks` - WebSocket for real-time updates

## Database Considerations
- PostgreSQL: User profiles, authentication
- ArangoDB: Resume and job documents
- Redis: Caching and real-time updates

## Success Criteria
1. User can complete onboarding flow
2. Dashboard displays all required information
3. Jobs can be created, viewed, and managed
4. Documents can be viewed and exported
5. Real-time updates work correctly
6. All tests pass with >95% coverage
