# Resume Editor

The Resume Editor is the core feature of the ATSPro platform, providing users with a comprehensive and intuitive interface to create, edit, and optimize their resumes for ATS (Applicant Tracking System) compatibility.

## Overview

The resume editor combines a powerful form-based editing interface with real-time preview functionality and AI-powered optimization tools. Built with Svelte 5 runes and SvelteKit Remote Functions, it provides a modern, responsive editing experience with automatic saving and version control.

## Key Features

### Multi-Section Resume Management

- **Contact Information**: Full name, email, phone, address, and social/portfolio links
- **Professional Summary**: AI-optimizable summary section
- **Work Experience**: Dynamic list with company, position, dates, descriptions, and responsibilities
- **Education**: Degree information with institution, field of study, GPA, and graduation dates
- **Certifications**: Professional certifications with issuer, dates, and credential IDs
- **Skills**: Tag-based skill management with easy add/remove functionality

### Real-Time Preview

- **Desktop Layout**: Split-screen editor with live preview panel
- **Mobile Responsive**: Collapsible preview for mobile devices
- **Professional Formatting**: Clean, ATS-friendly resume layout
- **Section Reordering**: Visual preview updates as sections are rearranged

### Form Management

- **Dynamic Lists**: Add/remove experience, education, certifications, and skills
- **Accordion Interface**: Organized sections with expand/collapse functionality
- **Section Reordering**: Move sections up/down with visual controls
- **Input Validation**: Real-time form validation and error handling

### Save & Version Control

- **Auto-Save Detection**: Tracks changes and enables save button when needed
- **Optimistic Updates**: Immediate UI updates with server synchronization
- **Cancel Changes**: Revert to last saved state
- **Success Notifications**: Toast notifications for save/error states

## Technical Implementation

### Component Architecture

```typescript
// Main component: +page.svelte
- Svelte 5 runes ($state, $derived, $effect)
- SvelteKit Remote Functions for data operations
- Real-time change detection and form management
```

### Data Flow

1. **Load Resume**: Fetches existing resume data via `getResume()` remote function
2. **Edit Interface**: Reactive form controls bound to resume data
3. **Preview Update**: Real-time preview updates as user edits
4. **Save Changes**: Updates sent via `updateResume()` remote function
5. **State Sync**: Original resume state updated on successful save

### AI Integration

The resume editor integrates with OpenAI through the AI service layer:

#### Resume Extraction

- **File Upload**: Supports PDF, Markdown, and plain text files
- **AI Processing**: Uses GPT-4o-mini for structured data extraction
- **Schema Validation**: Zod schema ensures proper data structure
- **Multi-format Support**: Handles different file types with appropriate processing

#### Resume Optimization

- **ATS Optimization**: `optimizeResume()` function enhances content for ATS systems
- **Keyword Integration**: Incorporates job-specific keywords naturally
- **Score Calculation**: Provides optimization score and keyword analysis
- **Content Enhancement**: Improves descriptions while maintaining authenticity

#### Cover Letter Generation

- **Integrated Generation**: `generateCoverLetter()` creates targeted cover letters
- **Tone Control**: Professional, enthusiastic, or conversational tones
- **Job Matching**: Uses both resume and job data for personalization

## Data Structure

### Resume Interface

```typescript
interface Resume {
	contactInfo: ContactInfo;
	summary?: string | null;
	workExperience: WorkExperience[];
	education: Education[];
	certifications: Certification[];
	skills: string[];
}

interface ContactInfo {
	fullName: string;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
	links: Link[];
}

interface WorkExperience {
	company: string;
	position: string;
	startDate?: string | null;
	endDate?: string | null;
	isCurrent?: boolean;
	description?: string | null;
	responsibilities: string[];
	skills: string[];
}
```

## Remote Functions

### Data Operations

- **`getResume()`**: Retrieves current user's resume data
- **`updateResume(resumeData)`**: Updates resume with validation and rate limiting
- **`extractResume(fileData)`**: AI-powered resume extraction from uploaded files

### Rate Limiting & Security

- **Update Limits**: 30 resume updates per hour per user
- **Extract Limits**: 10 resume extractions per hour per user
- **File Validation**: Type and size validation for uploads
- **Authentication**: All operations require authenticated user

## User Experience Features

### Responsive Design

- **Desktop**: Full split-screen layout with editor and preview
- **Tablet**: Optimized accordion layout with toggle preview
- **Mobile**: Single-column layout with collapsible preview

### Accessibility

- **Keyboard Navigation**: Full keyboard support for all form controls
- **Screen Reader**: Proper ARIA labels and semantic HTML
- **Focus Management**: Logical tab order and focus indicators
- **High Contrast**: Compatible with high contrast modes

### Performance

- **Lazy Loading**: Components loaded on demand
- **Optimistic Updates**: Immediate UI response for better UX
- **Efficient Rendering**: Svelte 5 runes for minimal re-renders
- **Caching**: Resume data cached between sessions

## Error Handling

### User-Friendly Errors

- **Save Failures**: Clear error messages with retry options
- **Upload Errors**: Specific feedback for file type/size issues
- **Network Issues**: Graceful handling of connectivity problems
- **Validation Errors**: Inline field validation with helpful messages

### Technical Resilience

- **Rate Limit Handling**: User feedback when limits are reached
- **Authentication Errors**: Automatic redirect to login when needed
- **Server Errors**: Fallback UI states for server issues
- **Data Recovery**: Ability to restore unsaved changes

## File Upload & Parsing

### Supported Formats

- **PDF Files**: Binary processing with AI extraction
- **Text Files**: Direct text parsing for markdown/plain text
- **Size Limits**: 10MB maximum file size
- **Type Validation**: Strict file type checking

### Processing Pipeline

1. **File Validation**: Type, size, and format checks
2. **Content Extraction**: Format-specific content parsing
3. **AI Processing**: Structured data extraction via OpenAI
4. **Schema Validation**: Ensures extracted data matches expected format
5. **Database Storage**: Saves structured resume data
6. **UI Update**: Populates editor with extracted information

## Integration Points

### Database Layer

- **Resume Storage**: PostgreSQL with structured JSON fields
- **Version History**: Tracks resume updates over time
- **User Association**: Links resume data to authenticated users

### AI Service Layer

- **OpenAI Integration**: GPT-4o-mini and GPT-4.1 models
- **Structured Generation**: Zod schema validation for AI responses
- **Error Recovery**: Graceful handling of AI service failures

### Authentication System

- **Better-Auth**: Secure user authentication and session management
- **Role-Based Access**: User-specific resume access controls
- **Session Validation**: Automatic re-authentication when needed

This resume editor represents the cornerstone of the ATSPro platform, providing users with professional-grade tools to create ATS-optimized resumes while maintaining an intuitive and accessible user experience.
