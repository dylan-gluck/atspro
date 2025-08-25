# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATSPro is an AI-powered ATS resume optimization platform built with SvelteKit, Bun, Better-Auth, and PostgreSQL. This is a simplified version of the original ATSPro monorepo, focused on rapid development with modern tools.

## Development Commands

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun --bun run build

# Preview production build
bun run preview

# Type checking
bun run check
bun run check:watch

# Linting and formatting
bun run lint        # Check formatting
bun run format      # Auto-format code

# Testing
bun run test        # Run all tests once
bun run test:unit   # Run tests in watch mode
```

## Architecture

### Tech Stack

- **Runtime**: Bun (replaces Node.js)
- **Framework**: SvelteKit with Svelte 5
- **Styling**: Tailwind CSS v4 with shadcn-svelte components
- **Database**: PostgreSQL with Better-Auth for authentication
- **Forms**: Sveltekit-superforms with formsnap
- **Testing**: Vitest with Playwright for browser tests

### Project Structure

```
src/
├── lib/
│   ├── auth.ts              # Better-Auth server configuration
│   ├── auth-client.ts       # Better-Auth client configuration
│   ├── types/               # TypeScript type definitions
│   │   ├── resume.ts        # Resume data types (camelCase)
│   │   └── job.ts           # Job and JobDocument types (camelCase)
│   └── components/ui/       # shadcn-svelte components
├── routes/
│   ├── (app)/              # Authenticated app routes
│   │   ├── app/            # Dashboard and main app
│   │   │   ├── job/[id]/   # Job details page
│   │   │   ├── resume/     # Resume editor
│   │   │   └── settings/   # User settings
│   │   └── onboarding/     # Resume upload/creation flow
│   ├── (marketing)/        # Public marketing pages
│   │   └── auth/[method]/  # Authentication pages
│   └── api/                # API endpoints (to be implemented)
└── hooks.server.ts         # SvelteKit server hooks for auth
```

### Database Schema

Uses camelCase for all columns. Three main tables extend Better-Auth's user tables:

- **userResume**: One resume per user (JSONB for complex fields)
- **userJobs**: Multiple jobs per user
- **jobDocuments**: Generated documents per job (resume, cover letter, etc.)

See `docs/data-model.md` for complete schema.

### API Design

All API endpoints follow RESTful patterns with consistent response format:

- Success: `{ success: true, data: {...}, message: "..." }`
- Error: `{ success: false, error: { code: "...", message: "..." } }`

Key endpoints (see `docs/api-spec.md`):

- `/api/extract/resume` - Extract resume from file upload
- `/api/extract/job` - Extract job from URL or text
- `/api/optimize` - Generate optimized resume for job
- `/api/generate/cover` - Generate cover letter
- `/api/generate/research` - Generate company research

### Authentication Flow

Better-Auth handles all authentication with PostgreSQL storage:

1. Session management via `hooks.server.ts`
2. Auth routes at `/auth/[method]`
3. Protected routes under `(app)` layout group
4. Onboarding redirect for users without resumes

### Environment Variables

Required in `.env`:

```
DATABASE_URL=            # PostgreSQL connection string
BETTER_AUTH_SECRET=      # Auth secret key
BETTER_AUTH_URL=         # Auth base URL
ANTHROPIC_API_KEY=       # For AI features
OPENAI_API_KEY=          # For AI features
```

### Testing Strategy

Two test environments configured:

- **Client tests**: Browser-based Svelte component tests (`*.svelte.test.ts`)
- **Server tests**: Node environment for server-side logic

### Key Implementation Notes

1. **Type Consistency**: All types use camelCase (not snake_case)
2. **Database**: Column names use camelCase to match TypeScript types
3. **Components**: Use shadcn-svelte components from `$lib/components/ui`
4. **Forms**: Use sveltekit-superforms for form handling
5. **Routing**: Group layouts for (app) and (marketing) sections
6. **Adapter**: Uses svelte-adapter-bun for Bun runtime

### Phase-Based Development

@TODO.md

Currently completing Phase 1 (Project Setup).
Next phases:

- Phase 2: UI Scaffolding
- Phase 3: API & Database Updates
- Phase 4: Service Architecture
- Phase 5: Front-end/Back-end Integration
- Phase 6: End-to-end Testing

### Reference Implementation

The original ATSPro monorepo at `/Users/dylan/Workspace/projects/atspro/` contains:

- UI layouts and components to reference (copy UI only, not logic)
- Next.js frontend (being converted to SvelteKit)

When implementing features, reference the original for UI patterns but build new logic using SvelteKit patterns and Vercel AI SDK.
