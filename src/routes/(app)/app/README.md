# Dashboard Page

The main hub of the ATSPro application where authenticated users can monitor their job search progress, view key statistics, and quickly access important features. The dashboard serves as the central command center for managing job applications and tracking progress.

## Purpose and Features

The dashboard provides a comprehensive overview of the user's job search activity with:

- **Real-time statistics** - Total jobs tracked, applications sent, interview invitations, and response rates
- **Recent job listings** - Quick access to the 5 most recently added or updated jobs
- **Activity feed** - Timeline of recent actions across all jobs
- **Quick actions** - Fast access to common tasks like adding jobs and editing resume
- **Visual progress tracking** - Match scores and progress bars for job applications

## Statistics Display

The dashboard displays four key metrics in card format:

### Total Jobs Tracked

- Shows the total count of all jobs in the user's system
- Includes weekly change indicator based on jobs added in the past 7 days

### Applications Sent

- Counts jobs with status: `applied`, `interviewing`, or `offered`
- Displays weekly change for recently applied positions

### Interview Invitations

- Shows count of jobs currently in `interviewing` status
- Tracks weekly changes in interview activity

### Response Rate

- Calculates percentage of applications that received responses
- Formula: (interviewing + offered) / (applied + interviewing + offered) × 100%

## Data Fetching with Remote Functions

The dashboard uses SvelteKit Remote Functions for efficient data management:

### Primary Data Sources

- **`getJobs({ limit: 20 })`** - Fetches recent jobs with pagination and total count
- **`getDashboardActivity({ limit: 10 })`** - Retrieves cross-job activity feed with job context

### Data Flow

```typescript
// Reactive queries with loading states
let jobsQuery = getJobs({ limit: 20 });
let activitiesQuery = getDashboardActivity({ limit: 10 });

// Derived reactive state
let jobs = $derived(jobsQuery.current?.jobs || []);
let activities = $derived(activitiesQuery.current?.activities || []);
let jobsLoading = $derived(jobsQuery.loading);
```

## Component Structure

### Layout Integration

- Uses the shared app layout (`+layout.svelte`) with sidebar navigation
- Inherits responsive design and user authentication context
- Integrates with the application-wide theme system

### Main Dashboard Sections

1. **Page Header**
   - Welcome message and dashboard title
   - Primary action buttons (Edit Resume, Add Job)

2. **Statistics Grid**
   - 4-column responsive grid on desktop (2-column on mobile)
   - Loading skeletons during data fetch
   - Color-coded change indicators (green for positive trends)

3. **Content Grid**
   - Two-column layout on desktop
   - **Recent Jobs (2/3 width)** - Detailed job cards with status badges and match scores
   - **Sidebar (1/3 width)** - Quick actions and activity feed

### Job Card Components

Each job card displays:

- Job title and company name
- Location and application date
- Status badge with appropriate styling
- Match score with progress bar
- Quick action buttons

## User Interactions Available

### Primary Actions

- **Add Job** - Navigate to job creation flow (/app/jobs/new)
- **Edit Resume** - Navigate to resume editing interface (/app/resume)
- **View All Jobs** - Navigate to complete jobs listing page (/app/jobs)

### Job-Specific Actions

- **View Job Details** - Click any job card to open detailed view
- **Status Updates** - Visual status badges indicate current application stage

### Navigation

- **Sidebar Navigation** - Access to Resume, Jobs, and Settings pages
- **User Menu** - Profile access and logout functionality
- **Notifications** - Bell icon with notification badge (3 notifications shown)

## Real-time Updates

The dashboard leverages SvelteKit's reactive system for live updates:

### Automatic Refresh

- Remote function queries automatically update when underlying data changes
- Statistics recalculate reactively using Svelte 5 runes (`$derived`)
- Activity feed updates in real-time when new actions are performed
- Total job count updates from pagination metadata

### Loading States

- Skeleton components display during data fetching
- Individual loading states for jobs and activities
- Graceful handling of empty states with encouraging messages

### Empty States

- **No Jobs**: Displays encouragement message with call-to-action to add first job
- **No Activity**: Shows helpful message explaining how activity tracking works

## Technical Implementation

### State Management

- Uses Svelte 5 runes (`$derived`) for reactive calculations
- Leverages SvelteKit's built-in state management for navigation
- Remote functions handle server-side data fetching and caching

### Performance Optimizations

- Limited data fetching (20 jobs, 10 activities) for fast initial load
- Skeleton loading prevents layout shifts
- Efficient date formatting and relative time calculations

### Error Handling

- Graceful degradation when data is unavailable
- User-friendly empty states for new users
- Rate limiting protection on server-side operations

## Data Types

The dashboard works with several key TypeScript interfaces:

- **`UserJob`** - Complete job information including status, dates, and metadata
- **`JobActivity`** - Timeline events with types like 'applied', 'interview_scheduled', etc.
- **`JobStatus`** - Enum for job pipeline stages: tracked, applied, interviewing, offered, rejected, withdrawn

## Current Implementation Status

The dashboard is fully functional with:

- Real-time statistics calculation from actual job data
- Working navigation to all major sections
- Activity feed with job-specific context
- Responsive design with loading states
- ATS score tracking (placeholder values while optimization system develops)

The dashboard serves as the primary interface for job search management, providing users with essential insights and quick access to key functionality within the ATSPro platform.
