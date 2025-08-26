# Onboarding Flow

A guided 5-step onboarding process that helps new users set up their profile and upload their resume for ATS optimization.

## Overview

The onboarding flow is designed to create a smooth first-time user experience by:

- Introducing ATSPro's key features and benefits
- Collecting resume data through file upload or manual entry
- Allowing users to review and refine extracted information
- Gathering user preferences for personalized experience
- Setting up the foundation for resume optimization

## Access & Redirect Logic

- **Required for new users**: After login, users without a resume are redirected to `/onboarding`
- **Access protection**: Users cannot access any `/app/*` pages until onboarding is completed
- **Existing users**: Users with a resume are redirected to `/app` if they try to visit `/onboarding`
- **Completion trigger**: Onboarding is considered complete when resume data exists in the database

## 5-Step Onboarding Process

### Step 1: Welcome & Introduction

**Purpose**: Introduce ATSPro features and set expectations

**Content**:

- Welcome message with ATSPro branding
- Key feature highlights:
  - AI-powered resume optimization
  - ATS filter compatibility
  - Application tracking
- Visual indicators of platform benefits
- No data collection in this step

**Navigation**: Always allows proceeding to next step

### Step 2: Resume Upload

**Purpose**: Collect user's resume document for AI extraction

**Features**:

- **File Upload Methods**:
  - Drag and drop interface
  - Click to browse file picker
- **Supported Formats**: PDF, TXT, Markdown (.pdf, .txt, .md)
- **File Validation**:
  - Maximum size: 10MB
  - Type validation with user-friendly error messages
  - DOCX files are rejected with conversion suggestion
- **Upload States**:
  - Idle: Shows upload area with instructions
  - File Selected: Displays file info with remove option
  - Extracting: Loading indicator with progress feedback
  - Error: Clear error messages with retry options

**Data Processing**:

- Uses `extractResume` remote function for AI-powered extraction
- Handles different file types (PDF as Buffer, text files as string)
- Rate limited to 10 extractions per hour per user
- Automatically advances to review step on successful extraction

**Security**: Files are processed securely with encryption and never shared without consent

**Navigation**:

- Previous: Returns to welcome step
- Next: Only enabled when file is uploaded and not currently processing

### Step 3: Review & Edit Information

**Purpose**: Allow users to verify and correct AI-extracted resume data

**Data Fields**:

- **Contact Information**:
  - Full Name (required for navigation)
  - Email address
  - Phone number
  - Location/Address
- **Professional Summary**: Multi-line text area for career overview
- **Skills**: Display extracted skills as tags/badges
- **Additional Data**: Work experience, education, certifications (extracted but not editable in onboarding)

**Form Validation**:

- Full name is required to proceed
- Real-time validation with visual feedback
- Two-way data binding with resume state

**Navigation**:

- Previous: Returns to upload step
- Next: Enabled when full name is provided

### Step 4: Profile Preferences (Optional)

**Purpose**: Gather user preferences for personalized experience

**Preferences Collected**:

- **Target Job Role**: Text input for desired position
- **Experience Level**: Dropdown selection:
  - Entry Level (0-2 years)
  - Mid Level (2-5 years)
  - Senior Level (5-10 years)
  - Executive (10+ years)
- **Email Notifications**:
  - Job Match Alerts: Notifications for matching opportunities
  - Weekly Career Tips: Resume and interview guidance

**User Experience**:

- All fields are optional
- Skip option available with prominent button
- Clear descriptions for each preference
- Default values set for optimal user experience

**Navigation**:

- Previous: Returns to review step
- Skip: Saves resume and completes onboarding
- Finish: Saves all data and advances to success step

### Step 5: Success & Next Steps

**Purpose**: Confirm completion and guide users toward first actions

**Content**:

- Success confirmation with celebratory design
- Clear "What's Next" guidance:
  1. Find a job posting
  2. Generate optimized resume
  3. Apply with confidence
- Direct path to dashboard

**Navigation**: Single "Go to Dashboard" button redirects to `/app`

## Progress Tracking & Navigation

### Progress Indicator

- **Visual Progress Bar**: Shows completion percentage (currentStep / 5 \* 100)
- **Step Indicators**: Numbered circles with completion states:
  - Active: Primary color with step number
  - Completed: Check mark icon with muted primary color
  - Upcoming: Muted background with step number
- **Connecting Lines**: Visual connection between step indicators

### Navigation Controls

- **Previous Button**:
  - Disabled on first step
  - Disabled during processing states
  - Returns to previous step with data preservation
- **Next/Finish Button**:
  - Context-aware labeling ("Next", "Finish", specific actions)
  - Disabled based on step validation rules
  - Shows loading states during processing
- **Skip Option**: Only available on optional steps (step 4)

### Navigation Rules

- **Step 1**: Always allows forward navigation
- **Step 2**: Requires file upload and successful extraction
- **Step 3**: Requires full name to be provided
- **Step 4**: Optional - allows skip or completion
- **Step 5**: Terminal step with dashboard navigation only

## Form Validation & Error Handling

### Client-Side Validation

- **File Upload**:
  - Type validation with specific error messages
  - Size validation (10MB maximum)
  - Real-time feedback during drag/drop
- **Contact Information**: Required field validation for full name
- **Visual Feedback**: Invalid states shown with appropriate styling

### Server-Side Integration

- **Rate Limiting**:
  - 10 resume extractions per hour
  - 30 resume updates per hour
  - Clear error messages when limits exceeded
- **Authentication**: All operations require valid user session
- **Data Validation**: Server-side validation using Valibot schemas

### Error States & Recovery

- **Network Errors**: Clear messaging with retry options
- **Validation Errors**: Inline error display with guidance
- **Processing Failures**: Graceful degradation with alternative paths
- **Rate Limit Errors**: Clear explanation with time-based recovery

## Integration with User Profile Setup

### Database Operations

- **Resume Creation**: Uses `createUserResume()` via `extractResume` remote function
- **Resume Updates**: Uses `updateUserResume()` via `updateResume` remote function
- **Data Structure**: Follows `Resume` type from `$lib/types/resume.ts`

### State Management

- **Svelte 5 Runes**: Modern reactive state with `$state`, `$derived`, `$effect`
- **Data Persistence**: Resume data maintained throughout flow
- **Session Integration**: Tied to authenticated user session

### Remote Function Integration

- **extractResume**: Handles file upload and AI-powered data extraction
- **updateResume**: Saves final resume data and user preferences
- **Error Handling**: Comprehensive error handling with user feedback
- **Loading States**: Real-time feedback during remote operations

## Technical Implementation

### Component Architecture

- **Single Page Component**: All steps contained in `/onboarding/+page.svelte`
- **Snippet-Based Steps**: Each step implemented as Svelte snippet for maintainability
- **Reactive State**: Centralized state management with computed derivations

### File Processing Flow

1. File validation (type, size)
2. File content extraction (PDF → Buffer, text → string)
3. AI-powered resume parsing
4. Database storage with user association
5. State update and navigation

### Security Considerations

- **File Upload Security**: Type and size validation prevents malicious uploads
- **Rate Limiting**: Prevents abuse of expensive AI operations
- **Authentication**: All operations require valid user authentication
- **Data Encryption**: Resume data stored securely with encryption

### Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Visual Feedback**: Clear indication of current state and available actions
- **Error Communication**: Accessible error messaging and recovery guidance

## Key Files & Dependencies

- **Main Component**: `/src/routes/(app)/onboarding/+page.svelte`
- **Remote Functions**: `/src/lib/services/resume.remote.ts`
- **AI Integration**: `/src/lib/ai/index.ts`
- **Type Definitions**: `/src/lib/types/resume.ts`
- **UI Components**: Shadcn-UI component library
- **Icons**: Lucide Svelte icon library

## Future Enhancements

- **Multiple Resume Support**: Allow users to maintain multiple resume versions
- **Enhanced AI Extraction**: Improved parsing for complex resume formats
- **Preview Integration**: Real-time resume preview during editing
- **Progress Persistence**: Save partial progress for incomplete onboarding sessions
- **Analytics Integration**: Track onboarding completion rates and drop-off points
