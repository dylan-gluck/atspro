# Authenticated App Routes

This route group `(app)` contains all authenticated application routes, separated from marketing pages and API endpoints. It implements a comprehensive layout system with authentication checks, navigation, and shared UI components.

## Route Group Structure

```
(app)/
├── README.md                    # This documentation
├── app/                         # Main authenticated app routes
│   ├── +layout.server.ts        # Server-side authentication logic
│   ├── +layout.svelte          # Shared app layout with sidebar & header
│   ├── +page.svelte            # Dashboard (main landing page)
│   ├── jobs/                   # Job management routes
│   │   ├── +page.svelte        # Jobs list view
│   │   └── [id]/              
│   │       └── +page.svelte    # Individual job detail view
│   ├── resume/
│   │   └── +page.svelte        # Resume editor
│   └── settings/
│       └── +page.svelte        # User settings page
└── onboarding/
    └── +page.svelte            # User onboarding flow
```

## Authentication System

### Better-Auth Integration

The app uses [Better-Auth](https://better-auth.com) for authentication management:

- **Client**: `authClient` from `$lib/auth-client.ts` handles browser-side auth operations
- **Server**: `auth` from `$lib/auth.ts` manages server-side authentication
- **Session Management**: Handled through SvelteKit's `hooks.server.ts`

### Authentication Flow

1. **Session Retrieval**: `hooks.server.ts` fetches current session on every request
2. **Server-Side Check**: `app/+layout.server.ts` validates authentication (currently disabled)
3. **Client-Side Access**: Components access user data through `locals.user` and `locals.session`
4. **Logout**: Handled via `authClient.signOut()` with redirect to sign-in page

### Authentication State

```typescript
// Available in all (app) routes via +layout.server.ts
interface LayoutData {
  user: User | null;     // Current authenticated user
  session: Session | null; // Active session data
}
```

## Layout Architecture

### Responsive Sidebar Layout

The main app layout (`app/+layout.svelte`) implements a modern sidebar-based interface:

**Key Features:**
- Collapsible sidebar with icons and labels
- Mobile-responsive with overlay sidebar
- Persistent navigation state
- User avatar and profile dropdown
- Theme toggle support
- Notification indicators

**Layout Components:**
- **Sidebar**: Brand logo, main navigation, user profile
- **Header**: Mobile toggle, app title, notifications, theme toggle
- **Main**: Scrollable content area with consistent padding

### Navigation Structure

**Primary Navigation (Sidebar):**
- Dashboard (`/app`) - Overview and statistics
- Resume (`/app/resume`) - Resume editor
- Jobs (`/app/jobs`) - Job tracking and management  
- Settings (`/app/settings`) - User preferences

**User Menu (Dropdown):**
- Profile - User account details
- Settings - Application preferences
- Log out - Sign out functionality

## Child Routes Documentation

### `/app` - Dashboard
**Purpose**: Main landing page showing job search overview and recent activity

**Features:**
- Statistics cards (jobs tracked, applications sent, interviews, response rate)
- Recent jobs list with status badges and match scores
- Activity feed showing recent actions
- Quick action buttons for common tasks
- Loading states and empty states

**Data Sources:**
- `getJobs()` - Fetch user's job applications
- `getDashboardActivity()` - Recent activity feed

### `/app/resume` - Resume Editor
**Purpose**: Comprehensive resume editing interface with live preview

**Features:**
- Accordion-based section editing (Contact, Summary, Experience, Education, Certifications, Skills)
- Drag-and-drop section reordering
- Real-time preview (desktop) with mobile toggle
- Auto-save detection with unsaved changes warnings
- Dynamic list management (add/remove items)
- Form validation and error handling

**Data Sources:**
- `getResume()` - Load current resume data
- `updateResume()` - Save resume changes

### `/app/jobs` - Job Management
**Purpose**: Job application tracking with filtering and search capabilities

**Features:**
- Searchable and filterable job list
- Status-based filtering (applied, interviewing, etc.)
- Pagination support
- Bulk actions and individual job management
- Status badges and visual indicators

**Data Sources:**
- `getJobs()` - Paginated job listings with filters
- `deleteJob()` - Job removal functionality

### `/app/jobs/[id]` - Job Details
**Purpose**: Individual job application details and management

**Features:**
- Detailed job information display
- Status management and updates
- Notes and activity tracking
- Document attachments
- Application timeline

### `/app/settings` - User Preferences
**Purpose**: Account management and application settings

**Features:**
- Profile information editing
- Notification preferences
- Billing and subscription management
- Account security settings

### `/onboarding` - User Onboarding
**Purpose**: Multi-step initial setup flow for new users

**Features:**
- 5-step guided onboarding process
- Resume upload with AI extraction
- Profile information review and editing
- Preference configuration
- Welcome messaging and feature highlights

**Steps:**
1. Welcome and feature overview
2. Resume file upload (PDF, TXT, Markdown)
3. Resume data review and editing
4. Profile preferences and notifications
5. Success confirmation and dashboard redirect

## Security Considerations

### Route Protection
- All routes in `(app)` require authentication (implementation in `+layout.server.ts`)
- Unauthenticated users are redirected to `/auth/sign-in`
- Session validation occurs on every server request

### Data Access Control  
- User data is scoped by `locals.user.id` in remote functions
- Database queries include user-specific WHERE clauses
- No cross-user data access possible through the application layer

### Client-Side Security
- Sensitive operations use SvelteKit Remote Functions (not client-side API calls)
- Authentication tokens managed securely by Better-Auth
- XSS protection through Svelte's automatic escaping

## Shared Components and Utilities

### UI Components
- Consistent design system using shadcn/ui components
- Responsive layouts with mobile-first approach
- Loading states, skeletons, and error boundaries
- Toast notifications for user feedback

### Remote Functions
- `$lib/services/*.remote.ts` - Server-side data operations
- Type-safe with full TypeScript support  
- Built-in loading states and error handling
- Automatic revalidation on data changes

### Type Definitions
- `$lib/types/*` - Comprehensive TypeScript interfaces
- Resume, Job, User, and Activity type definitions
- Ensures type safety across the entire application

## Development Guidelines

### Svelte 5 Best Practices
- Use runes (`$state`, `$derived`, `$effect`) for reactive state
- Implement proper component lifecycle management
- Arrow functions for event handlers
- Avoid generics with `$state` runes

### SvelteKit Patterns
- Prefer Remote Functions over traditional API routes
- Use proper loading states and error handling
- Implement progressive enhancement patterns
- Server-side rendering for better performance

### Authentication Patterns
- Check authentication in `+layout.server.ts` files
- Use `locals.user` for user data access
- Handle sign-out with proper cleanup and redirects
- Implement proper session management
