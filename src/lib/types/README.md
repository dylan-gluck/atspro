# TypeScript Type Definitions

This directory contains the core TypeScript type definitions for ATSPro, an AI-powered ATS resume optimization platform. These types define the data structures for resumes, jobs, user interactions, and related entities throughout the application.

## Purpose

The types directory serves as the single source of truth for:
- Data model definitions for the application
- Type safety across all services and components
- Database schema contracts
- API request/response structures
- Consistent data handling patterns

## Type Files Overview

### `resume.ts`
Defines the core resume data structure and related interfaces.

**Exports:**
- `Link` - Contact link interface (name, url)
- `ContactInfo` - User contact information with optional fields
- `WorkExperience` - Employment history with responsibilities and skills
- `Education` - Educational background with courses and achievements
- `Certification` - Professional certifications with expiration tracking
- `Resume` - Main resume interface aggregating all sections

**Key Features:**
- Flexible optional fields for incomplete data
- Array fields for multiple entries (responsibilities, skills, honors)
- Date handling for employment and education timelines
- Support for current employment tracking

### `job.ts`
Contains basic job description interfaces for job postings.

**Exports:**
- `Job` - Core job posting data structure
- `JobDocument` - Associated documents for job applications

**Key Features:**
- Comprehensive job description fields
- Optional salary and location information
- Array support for multiple responsibilities and qualifications
- Document type classification (resume, cover, research, prep)

### `user-job.ts`
Extended job types with user-specific tracking and database metadata.

**Exports:**
- `JobStatus` - Union type for application status tracking
- `UserJob` - Extended job interface with user and database fields
- `JobDocument` - Enhanced document interface with versioning
- `JobActivityType` - Union type for activity tracking
- `JobActivity` - Activity log interface for job interactions

**Key Features:**
- Status tracking through application lifecycle
- Activity logging for user interactions
- Document versioning and metadata
- Timestamp tracking for all operations

### `user-resume.ts`
Extended resume type with user association and database metadata.

**Exports:**
- `UserResume` - Extended resume interface with user and database fields

**Key Features:**
- Extends base `Resume` interface
- Database integration with timestamps
- User association through foreign key

## Type Relationships

```
Resume (base structure)
    ↓ extends
UserResume (+ user association + timestamps)

Job (base structure)
    ↓ extends  
UserJob (+ user tracking + status + timestamps)
    ↓ relates to
JobDocument (versioned documents per job)
    ↓ relates to
JobActivity (activity tracking per job)
```

## Database Integration

These types are designed to work directly with PostgreSQL tables:

- **userResume**: Maps to `UserResume` interface
- **userJobs**: Maps to `UserJob` interface  
- **jobDocuments**: Maps to `JobDocument` interface
- **jobActivities**: Maps to `JobActivity` interface

All database-integrated types include:
- `id`: UUID primary key
- `userId`: Foreign key to better-auth user tables
- `createdAt`/`updatedAt`: Timestamp tracking

## Usage Examples

### Creating a New Resume
```typescript
import type { Resume, ContactInfo } from '$lib/types/resume';

const contactInfo: ContactInfo = {
  fullName: "John Doe",
  email: "john@example.com",
  phone: "+1-555-0123",
  links: [
    { name: "LinkedIn", url: "https://linkedin.com/in/johndoe" }
  ]
};

const resume: Resume = {
  contactInfo,
  workExperience: [],
  education: [],
  certifications: [],
  skills: ["JavaScript", "TypeScript", "React"]
};
```

### Tracking Job Application Status
```typescript
import type { UserJob, JobStatus } from '$lib/types/user-job';

const updateJobStatus = (job: UserJob, newStatus: JobStatus): UserJob => {
  return {
    ...job,
    status: newStatus,
    updatedAt: new Date()
  };
};
```

### Creating Job Documents
```typescript
import type { JobDocument } from '$lib/types/user-job';

const createCoverLetter = (jobId: string, content: string): Omit<JobDocument, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    jobId,
    type: 'cover',
    content,
    version: 1,
    isActive: true
  };
};
```

## Application Integration

These types are used throughout the application:

- **Services**: Remote functions use these types for data validation
- **Components**: Svelte components receive these types as props
- **Database**: ORM operations map directly to these interfaces
- **API**: Request/response structures align with these types

## Type Safety Benefits

1. **Compile-time validation** - Catch data structure errors before runtime
2. **IntelliSense support** - IDE autocomplete and documentation
3. **Refactoring safety** - Changes propagate through the entire codebase
4. **API contract enforcement** - Consistent data exchange between client/server
5. **Database schema validation** - Ensure queries match expected structures

## Contributing

When modifying types:

1. Consider backward compatibility
2. Update related database schemas
3. Test with existing services and components  
4. Update this documentation
5. Verify TypeScript compilation across the project

All types should include proper JSDoc comments for complex interfaces and maintain consistency with the existing patterns.