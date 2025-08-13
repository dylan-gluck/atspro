# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Config
- **Github Username:** dylan-gluck
- **Git commit:** No claude mention, summarize changes
- **Emoji use:** minimal
- **Technical Approach:** Top 1% Staff Engineer, 100x Developer
- **Test your work:** Always
- **Documentation:** Keep updated with changes

## Documentation
- **Project Docs:** `docs/project/`
- **Vendor Docs:** `docs/vendor/`

## Project Overview

ATSPro is an ATS resume optimization platform built as a **Turborepo monorepo** with containerized services. The system helps users optimize their resumes for Applicant Tracking Systems using AI-powered analysis and document processing.

**Architecture:**
- **Monorepo:** Turborepo with pnpm workspaces for unified builds and caching
- **Containerization:** Docker Compose with secure networking for all services
- `apps/api/` - Python FastAPI backend with business logic (containerized)
- `apps/web/` - Next.js TypeScript frontend (containerized)
- **Database Services:** PostgreSQL (auth/subscriptions), Redis (BullMQ), ArangoDB (documents)
- **Development:** Hot reload with volume mounting, production-ready builds

## Development Commands

### Monorepo (Turborepo)
- **Start all apps:** `pnpm dev` (from root)
- **Build all apps:** `pnpm build` (uses Turborepo caching)
- **Lint all apps:** `pnpm lint`
- **Type check all:** `pnpm check-types`
- **Test all apps:** `pnpm test`
- **Format all code:** `pnpm format`

### Docker Environment
- **Start development:** `pnpm docker:dev` (hot reload + volume mounting)
- **Start production:** `pnpm docker:prod` (optimized builds)
- **Stop services:** `pnpm docker:stop`
- **Clean volumes:** `pnpm docker:clean` (removes all data)
- **View logs:** `docker-compose logs -f [service]`

### Individual Services

#### API (Python FastAPI)
- **Start dev server:** `uv run fastapi dev` (from `apps/api/`)
- **Run all tests:** `uv run pytest`
- **Run specific test:** `uv run pytest tests/test_name.py::test_function`
- **Run tests with coverage:** `uv run pytest --cov=app`
- **Format code:** `uvx ruff format`
- **Add dependency:** `uv add <package_name>`
- **Sync dependencies:** `uv sync --dev`

#### Web (Next.js)
- **Start dev server:** `pnpm dev` (from `apps/web/`)
- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Type check:** `pnpm check-types`
- **Production start:** `pnpm start`

## Code Architecture & Patterns

### API Structure
- **Routers:** `/app/routers/` - FastAPI route handlers (parse.py, optimize.py, job.py, linkedin.py)
- **Schemas:** `/app/schema/` - Pydantic models for data validation (job.py, resume.py)
- **Libraries:** `/app/lib/` - Shared utilities (agent.py, httpx.py)
- **Logging:** `/app/logger/` - Centralized logging configuration

**Key API Endpoints:**
- `/api/parse` - Document parsing to Resume JSON
- `/api/optimize` - Resume optimization based on job description
- Background job processing for long-running tasks

### Web Structure
- **App Router:** Next.js 15 with app directory structure
- **Styling:** Tailwind CSS with shadcn/ui components
- **State:** Zustand for state management
- **Auth:** BetterAuth with email/Google/LinkedIn providers
- **Payments:** Polar.sh integration

### Data Models
- **Resume processing:** Unstructured + LLM extraction → Pydantic models
- **Job analysis:** Text extraction → structured Job models
- **Document optimization:** AI-powered content matching and scoring

## Development Guidelines

### Python (API)
- Use Python 3.11+ with type hints everywhere
- Pydantic for all data validation and schemas
- Snake case naming (`format_resume`)
- Comprehensive docstrings with Args/Returns sections
- Explicit HTTP status codes in responses
- Try/except with specific exceptions
- Tests required for all new features (maintain 100% coverage)

### TypeScript (Web)
- Use TypeScript strictly with proper typing
- Component-based architecture with Next.js patterns
- Shadcn/ui for consistent component library
- Responsive design with Tailwind CSS

## Database Strategy
- **PostgreSQL:** User auth, settings, subscriptions (BetterAuth schema)
- **ArangoDB:** User documents, resume/job data, document relationships
- Background jobs return task IDs, results stored directly to database

## Testing Requirements
- API: Maintain 100% test coverage with pytest
- Write tests for edge cases and error scenarios
- Run tests before any commits
- Test both success and failure paths for all endpoints

## Container Management

### Service URLs (Development)
- **Web App:** http://localhost:3000
- **API:** http://localhost:8000
- **API Health:** http://localhost:8000/health
- **ArangoDB UI:** http://localhost:8529 (user: root)
- **PostgreSQL:** localhost:5432 (database: atspro)
- **Redis:** localhost:6379

### Docker Architecture
- **Secure Network:** All services on isolated Docker network (172.20.0.0/16)
- **Health Checks:** Comprehensive health monitoring for all services
- **Data Persistence:** Named volumes for PostgreSQL, Redis, and ArangoDB
- **Development Mode:** Hot reload with bind mounts for `apps/api` and `apps/web`
- **Production Mode:** Optimized builds with standalone Next.js output

### Environment Configuration
1. Copy environment template: `cp .env.example .env.production.local`
2. Update passwords in `.env.production.local` for production use
3. Services automatically use development defaults for local development

## Build System Notes

### Turborepo Configuration
- **Cache Strategy:** Aggressive caching for build, lint, test, and type-check tasks
- **Task Dependencies:** Build tasks depend on upstream package builds
- **Parallel Execution:** Lint and type-check run in parallel across packages
- **Remote Caching:** Ready for Vercel Remote Cache (when configured)

### Docker Build Issues
- **API Dependencies:** Uses direct `uv pip install` to avoid local package build issues
- **Build Context:** Dockerfiles optimized for layer caching with dependency-first copying
- **Multi-stage Builds:** Web app uses multi-stage build for minimal production image
- **Health Checks:** All services include proper health check endpoints

### Known Limitations
- **API Package:** Local package building disabled in Docker to avoid hatchling issues
- **Test Dependencies:** Some integration tests require external dependencies (poppler, libmagic)
- **File Processing:** Unstructured library needs system dependencies for full functionality

## Troubleshooting

### uv Build Errors
- Run `uv sync --dev` to ensure all dependencies are installed
- For Docker builds, dependencies are installed directly without local package building
- Use `uv run pytest tests/test_health.py -v` to verify basic API functionality

### Docker Issues
- Check container logs: `docker-compose logs -f [service]`
- Verify network connectivity: `docker-compose exec api curl http://web:3000/api/health`
- Reset environment: `pnpm docker:clean && pnpm docker:dev`

### Turborepo Issues
- Clear cache: `pnpm turbo build --force`
- Check workspace detection: `pnpm ls --recursive`
- Verify turbo.json task configuration matches package.json scripts
