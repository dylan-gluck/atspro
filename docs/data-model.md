# ATSPro Data Model Documentation

## Overview
The ATSPro application uses PostgreSQL to store all application data. The database schema leverages Better-Auth for authentication and extends it with custom tables for the core business logic.

## Database Schema

### Existing Tables (Better-Auth)

#### `user`
Authentication user table
- `id` (text, primary key)
- `name` (text, not null)
- `email` (text, unique, not null)
- `emailVerified` (boolean, not null)
- `image` (text, nullable)
- `createdAt` (timestamp, default CURRENT_TIMESTAMP, not null)
- `updatedAt` (timestamp, default CURRENT_TIMESTAMP, not null)

#### `session`
User session management
- `id` (text, primary key)
- `expiresAt` (timestamp, not null)
- `token` (text, unique, not null)
- `createdAt` (timestamp, not null)
- `updatedAt` (timestamp, not null)
- `ipAddress` (text, nullable)
- `userAgent` (text, nullable)
- `userId` (text, not null, foreign key → user.id, cascade delete)

#### `account`
OAuth/Social account connections
- `id` (text, primary key)
- `accountId` (text, not null)
- `providerId` (text, not null)
- `userId` (text, not null, foreign key → user.id, cascade delete)
- `accessToken` (text, nullable)
- `refreshToken` (text, nullable)
- `idToken` (text, nullable)
- `accessTokenExpiresAt` (timestamp, nullable)
- `refreshTokenExpiresAt` (timestamp, nullable)
- `scope` (text, nullable)
- `password` (text, nullable)
- `createdAt` (timestamp, not null)
- `updatedAt` (timestamp, not null)

#### `verification`
Email/token verification
- `id` (text, primary key)
- `identifier` (text, not null)
- `value` (text, not null)
- `expiresAt` (timestamp, not null)
- `createdAt` (timestamp, default CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, default CURRENT_TIMESTAMP)

### New Tables (ATSPro Business Logic)

#### `userResume`
Stores the base resume data for each user (one per user)
- `id` (uuid, primary key, generated)
- `userId` (text, not null, unique, foreign key → user.id, cascade delete)
- `contactInfo` (jsonb, not null)
  - Structure: `ContactInfo` type
- `summary` (text, nullable)
- `workExperience` (jsonb, not null, default '[]')
  - Array of `WorkExperience` objects
- `education` (jsonb, not null, default '[]')
  - Array of `Education` objects
- `certifications` (jsonb, not null, default '[]')
  - Array of `Certification` objects
- `skills` (text[], not null, default '{}')
  - Array of skill strings
- `createdAt` (timestamp, default CURRENT_TIMESTAMP, not null)
- `updatedAt` (timestamp, default CURRENT_TIMESTAMP, not null)

**Indexes:**
- Unique index on `userId`
- Index on `createdAt`

#### `userJobs`
Stores job postings that users are tracking/applying to
- `id` (uuid, primary key, generated)
- `userId` (text, not null, foreign key → user.id, cascade delete)
- `company` (text, not null)
- `title` (text, not null)
- `description` (text, not null)
- `salary` (text, nullable)
- `responsibilities` (text[], nullable)
- `qualifications` (text[], nullable)
- `logistics` (text[], nullable)
- `location` (text[], nullable)
- `additionalInfo` (text[], nullable)
- `link` (text, nullable)
- `status` (text, not null, default 'tracked')
  - Enum: 'tracked', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'
- `appliedAt` (timestamp, nullable)
- `createdAt` (timestamp, default CURRENT_TIMESTAMP, not null)
- `updatedAt` (timestamp, default CURRENT_TIMESTAMP, not null)

**Indexes:**
- Index on `userId`
- Index on `status`
- Index on `createdAt`
- Composite index on `(userId, status)`

#### `jobDocuments`
Stores generated documents for specific jobs (resumes, cover letters, etc.)
- `id` (uuid, primary key, generated)
- `jobId` (uuid, not null, foreign key → userJobs.id, cascade delete)
- `type` (text, not null)
  - Enum: 'resume', 'cover', 'research', 'prep'
- `content` (text, not null)
  - Markdown formatted content
- `version` (integer, not null, default 1)
- `isActive` (boolean, not null, default true)
- `metadata` (jsonb, nullable)
  - Additional document metadata (e.g., ATS score, keywords matched)
- `createdAt` (timestamp, default CURRENT_TIMESTAMP, not null)
- `updatedAt` (timestamp, default CURRENT_TIMESTAMP, not null)

**Indexes:**
- Index on `jobId`
- Index on `type`
- Composite index on `(jobId, type, isActive)`
- Index on `createdAt`

## JSONB Field Structures

### ContactInfo (jsonb)
```json
{
  "fullName": "string",
  "email": "string | null",
  "phone": "string | null",
  "address": "string | null",
  "links": [
    {
      "name": "string",
      "url": "string"
    }
  ]
}
```

### WorkExperience (jsonb array element)
```json
{
  "company": "string",
  "position": "string",
  "startDate": "string | null",
  "endDate": "string | null",
  "isCurrent": "boolean",
  "description": "string | null",
  "responsibilities": ["string"],
  "skills": ["string"]
}
```

### Education (jsonb array element)
```json
{
  "institution": "string",
  "degree": "string",
  "fieldOfStudy": "string | null",
  "graduationDate": "string | null",
  "gpa": "number | null",
  "honors": ["string"],
  "relevantCourses": ["string"],
  "skills": ["string"]
}
```

### Certification (jsonb array element)
```json
{
  "name": "string",
  "issuer": "string",
  "dateObtained": "string | null",
  "expirationDate": "string | null",
  "credentialId": "string | null"
}
```

## Database Constraints & Business Rules

1. **One Resume Per User**: Each user can have only one base resume (enforced by unique constraint on `userResume.userId`)

2. **Multiple Jobs Per User**: Users can track unlimited job opportunities

3. **Multiple Documents Per Job**: Each job can have multiple versions of documents (resumes, cover letters, research, prep materials)

4. **Cascade Deletes**: 
   - Deleting a user removes all associated resumes, jobs, and documents
   - Deleting a job removes all associated documents

5. **Timestamps**: All tables include `createdAt` and `updatedAt` timestamps with automatic updates

6. **Version Control**: Documents maintain version numbers for tracking iterations

## Migration Strategy

1. **Phase 1**: Run Better-Auth migrations (already completed)
2. **Phase 2**: Create `userResume` table with JSONB fields
3. **Phase 3**: Create `userJobs` table
4. **Phase 4**: Create `jobDocuments` table
5. **Phase 5**: Add indexes for performance optimization

## Performance Considerations

- Use JSONB for complex nested data structures (contact info, experience, education)
- Create indexes on foreign keys and commonly queried fields
- Composite indexes for frequent filter combinations
- Consider partitioning `jobDocuments` table if document volume becomes large

## Future Enhancements

- Add `userApplications` table to track application status separately from jobs
- Add `jobAnalytics` table for tracking view counts, ATS scores, etc.
- Consider adding full-text search indexes on job descriptions and document content
- Add audit trail table for tracking all changes to sensitive data