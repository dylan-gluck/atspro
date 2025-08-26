# ATSPro Implementation Roadmap

A comprehensive workflow for completing the ATSPro AI-powered ATS resume optimization platform, focusing on testing infrastructure, missing core features, and production readiness.

## Initial Context

- Project root: `/Users/dylan/Workspace/projects/atspro-bun`
- Key documentation:
  - `CLAUDE.md` - Development guidelines
  - `src/lib/types/README.md` - Type definitions
  - `docs/remote-functions-architecture.md` - Remote Functions project docs
  - `.claude/docs/sveltekit/05-remote-functions.md` - Remote Functions vendor docs
- Key components:
  - `src/lib/ai/index.ts` - Agents Config (AI SDK)
  - `src/lib/services/*` - Service Architecture (Remote Functions Implementation)

## Todo Setup

Initialize progress tracking for implementation phases:

```
# ATSPro Completion Progress

## Phase 1: Testing Infrastructure
- [x] Set up Vitest unit test framework
- [x] Create mock tests for database operations
- [x] Set up E2E tests with Playwright
- [x] Add test coverage reporting (thresholds disabled for development)
- [x] Configure CI/CD with GitHub Actions
- [x] All tests passing

## Phase 2: Missing Core Features
- [ ] Implement resume optimization with markdown storage
- [ ] Implement ATS score calculation
- [ ] Implement company research with web scraping
- [ ] Implement PDF export for resumes

## Phase 3: Production Readiness
- [ ] Set up error tracking (Sentry)
- [ ] Implement structured logging
- [ ] Add performance optimizations
- [ ] Security hardening

## Phase 4: Feature Polish
- [ ] Complete document viewing/downloading
- [ ] Add OAuth providers (Google, GitHub)
- [ ] Implement user settings and preferences
- [ ] Add notification system
```

## Phase 1: Testing Infrastructure

Establish comprehensive testing coverage to ensure application reliability and maintainability.

### 1.1 Unit Test Framework Setup

Set up Vitest testing framework and create initial test structure.

```bash
# Already configured in package.json, just needs tests written
bun test:unit
```

### 1.2 Remote Function Tests

Create unit tests for all remote functions in `/src/lib/services/`.

Key functions to test:

1. **auth.remote.ts** - Authentication functions
2. **job.remote.ts** - Job CRUD operations
3. **resume.remote.ts** - Resume management
4. **ai.remote.ts** - AI integration functions

Example test structure:

```typescript
// src/lib/services/__tests__/job.remote.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { extractJob, createJob, updateJob } from '../job.remote';

describe('Job Remote Functions', () => {
	// Test job extraction, creation, updates, etc.
});
```

### 1.3 Database Integration Tests

Test database operations and SQL queries.

```typescript
// src/lib/db/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import * as db from '../index';

describe('Database Operations', () => {
	// Test CRUD operations for all entities
});
```

### 1.4 Component Tests

Test critical Svelte components using vitest-browser-svelte.

Priority components:

- JobCard component
- ResumeEditor component
- DocumentViewer component
- Forms with validation

### 1.5 E2E Tests with Playwright

Create end-to-end tests for critical user flows.

```typescript
// tests/e2e/auth.spec.ts
// tests/e2e/job-management.spec.ts
// tests/e2e/resume-optimization.spec.ts
```

Critical flows to test:

1. User registration and login
2. Resume upload and parsing
3. Job creation and tracking
4. Resume optimization workflow
5. Document generation

## Phase 2: Missing Core Features

Implement the remaining core functionality as identified in the original TODO.

### 2.1 Resume Optimization Enhancement

Enhance the resume optimization to store markdown content in the database.

Implementation tasks:

1. Update database schema to add markdown field to jobDocuments
2. Modify AI optimization to return both HTML and markdown
3. Store markdown alongside HTML in database
4. Update UI to support markdown viewing/editing

Files to modify:

- `/src/lib/db/schema.sql` - Add markdown column
- `/src/lib/services/ai.remote.ts` - Update optimization logic
- `/src/routes/(app)/app/jobs/[id]/+page.svelte` - Display options

### 2.2 ATS Score Calculation

Implement ATS compatibility scoring system.

Components needed:

1. **Keyword Analysis**: Compare resume keywords with job description
2. **Format Checking**: Verify ATS-friendly formatting
3. **Score Algorithm**: Calculate percentage match
4. **Visual Display**: Progress bars and recommendations

Implementation approach:

```typescript
// src/lib/services/scoring.remote.ts
export const calculateATSScore = command(
  v.object({
    resumeContent: v.string(),
    jobDescription: v.string(),
    optimizedContent: v.optional(v.string())
  }),
  async ({ resumeContent, jobDescription, optimizedContent }) => {
    // Implement scoring logic
    return {
      originalScore: number,
      optimizedScore: number,
      recommendations: string[]
    }
  }
)
```

### 2.3 Company Research Enhancement

Implement web search and scraping for company research.

Integration approach:

1. Use WebSearch tool for finding company information
2. Use WebFetch for scraping company websites
3. Generate comprehensive research document
4. Store as job document type 'research'

### 2.4 PDF Export Implementation

Implement PDF generation for resumes and cover letters.

Options to evaluate:

1. **markdown-pdf** - Simple markdown to PDF conversion
2. **puppeteer** - HTML to PDF with better formatting control
3. **jsPDF** - Client-side PDF generation

Recommended approach:

```typescript
// src/lib/services/export.remote.ts
import { generatePDF } from '$lib/utils/pdf-generator';

export const exportDocument = command(
	v.object({
		documentId: v.string(),
		format: v.picklist(['pdf', 'docx', 'txt'])
	}),
	async ({ documentId, format }) => {
		const document = await db.getDocument(documentId);
		const pdf = await generatePDF(document.content);
		return { url: pdf.url };
	}
);
```

## Phase 3: Production Readiness

Prepare the application for production deployment.

### 3.1 Error Tracking Setup

Implement Sentry for error tracking and monitoring.

```bash
bun add @sentry/sveltekit
```

Configuration:

1. Set up Sentry project
2. Configure in `app.html` and `hooks.client.ts`
3. Add error boundaries
4. Implement error reporting

### 3.2 Structured Logging

Replace console.log with structured logging system.

```typescript
// src/lib/utils/logger.ts
import pino from 'pino';

export const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	transport: {
		target: 'pino-pretty'
	}
});
```

### 3.3 Performance Optimization

Implement performance improvements:

1. Code splitting for routes
2. Lazy loading for components
3. Image optimization
4. Bundle size reduction
5. Caching strategies

### 3.4 Security Hardening

Enhance security measures:

1. Implement CSRF protection
2. Add Content Security Policy
3. Enhanced file upload validation
4. Rate limiting improvements
5. SQL injection prevention audit

## Phase 4: Feature Polish (Optional Enhancements)

Complete secondary features for enhanced user experience.

### 4.1 Document Management Completion

- Implement document viewing modal
- Add download functionality
- Enable inline editing
- Version history tracking

### 4.2 OAuth Integration

- Configure Google OAuth
- Configure GitHub OAuth
- Update Better-Auth settings
- Add provider buttons to auth pages

### 4.3 User Settings & Preferences

- Profile editing functionality
- Email notification preferences
- Resume privacy settings
- API key management

### 4.4 Notification System

- Email notifications for job updates
- In-app notifications
- Reminder system for follow-ups
- Weekly summary emails

## Success Criteria

The ATSPro platform is ready for production when:

1. ✅ Test coverage exceeds 80% for critical paths
2. ✅ All Phase 2 core features are implemented and tested
3. ✅ Error tracking and logging are operational
4. ✅ Performance metrics meet targets (<3s page load)
5. ✅ Security audit completed with no critical issues
6. ✅ Documentation is complete for all features
7. ✅ CI/CD pipeline is configured and operational

## Error Handling

If any phase fails:

1. Review error logs and identify root cause
2. Create hotfix branch if in production
3. Run regression tests after fixes
4. Update documentation with lessons learned
5. Escalate to team lead if blocked > 4 hours

## Completion

Upon successful completion:

1. **System State**: Fully functional ATS optimization platform
2. **Achievements**:
   - Comprehensive test coverage
   - All core features operational
   - Production-ready infrastructure
   - Security hardened
3. **Next Steps**:
   - Deploy to production environment
   - Monitor performance and errors
   - Gather user feedback
   - Plan next feature iteration

The system will be ready for public launch with confidence in reliability, performance, and user experience.

---

## Implementation Notes

### Priority Order

1. **Critical**: Phase 1 (Testing) and Phase 2 (Core Features)
2. **High**: Phase 3 (Production Readiness)
3. **Medium**: Phase 4 (Feature Polish)

### Time Estimates

- Phase 1: 2-3 days
- Phase 2: 3-4 days
- Phase 3: 2-3 days
- Phase 4: 2-3 days
- **Total**: 9-13 days for complete implementation

### Dependencies

- Phase 2 can start in parallel with Phase 1
- Phase 3 requires Phase 1 completion
- Phase 4 can be deferred to post-launch

### Risk Factors

1. AI API costs during testing
2. PDF generation library compatibility
3. OAuth provider setup complexity
4. Database migration risks

Remember to:

- Commit frequently with semantic commits
- Update tests as features are added
- Document all API changes
- Keep security in mind throughout
- Monitor bundle size impacts
