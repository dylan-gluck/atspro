# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATSPro is an AI-powered ATS resume optimization platform built as a **Turborepo monorepo** with containerized microservices:

- **Backend**: FastAPI with Python 3.11+, uv package manager, OpenAI Agents SDK
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, shadcn/ui components
- **Database**: PostgreSQL 15+ (single database architecture with JSONB storage)

## Architecture

```
atspro/
├── apps/
│   ├── api/          # Python FastAPI backend
│   └── web/          # Next.js TypeScript frontend
├── docker/           # Docker configuration
├── docs/            # Documentation
└── turbo.json       # Turborepo configuration
```

## Development Commands

### Monorepo (Turborepo)
```bash
# Start all services
pnpm dev

# Build all apps
pnpm build

# Run tests across all apps
pnpm test

# Type checking
pnpm check-types

# Linting
pnpm lint

# Code formatting
pnpm format

# Individual app commands
pnpm build --filter=web    # Build only web app
pnpm test --filter=api     # Test only API
```

### Docker Environment
```bash
# Start development with hot reload & volume mounting
pnpm docker:dev

# Start production environment
pnpm docker:prod

# Stop all services
pnpm docker:stop

# Build No-Cache & Restart
pnpm docker:build --no-cache
pnpm docker:stop
pnpm docker:dev
```

### API Development (Python/FastAPI)
```bash
cd apps/api

# Run all tests
uv run pytest

# Run specific test
uv run pytest tests/test_parse.py::test_parse_resume -v

# Run with coverage
uv run pytest --cov=app --cov-report=html

# Format code (REQUIRED before commits)
uvx ruff format

# Add dependency
uv add <package-name>

# Sync dependencies
uv sync --dev
```

### Web Development (Next.js/TypeScript)
```bash
cd apps/web

# Type checking
pnpm check-types

# Linting
pnpm lint

# Add dependency
pnpm add <package-name>
```

## Key Development Practices

### Python (API)
- Use **uv** for all package management (never edit pyproject.toml manually)
- Always use type hints and Pydantic models
- Run `uvx ruff format` before committing
- Tests are required for new features (currently 100% coverage)
- Use `uv run pytest` for testing

### TypeScript (Web)
- Strict typing enforced
- Uses shadcn/ui components and Tailwind CSS
- Better-auth for authentication
- Component-based architecture

### Database Access
```bash
# PostgreSQL (primary database for all data)
docker-compose exec postgres psql -U atspro_user -d atspro

# Database management
uv run python scripts/migrate_data.py validate          # Validate data integrity
uv run python scripts/verify_postgres_migration.py     # Verify migration status
```

## API Endpoints

Core functionality:
- `/api/parse` - Parse resume documents to structured JSON (PostgreSQL JSONB storage)
- `/api/optimize` - Optimize resume content for specific jobs (ready for implementation)
- `/api/job` - Extract and analyze job descriptions (full CRUD operations)
- `/api/user/profile` - Complete user profile management (CRUD operations)
- `/health` - Service health check with database status

## Testing

API tests have 100% code coverage. Always run tests before committing:

```bash
# API tests
cd apps/api && uv run pytest

# Web tests
cd apps/web && pnpm test
```

## Pre-commit Checklist

```bash
# From root directory
pnpm format      # Format all code
pnpm lint        # Lint all code
pnpm check-types # Type check all code
pnpm test        # Run all tests
pnpm build       # Build all apps
```

## Service URLs (Development)

- Web App: http://localhost:3000
- API Server: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Database: PostgreSQL on localhost:5432 (atspro database)

## Important Notes

- Use Docker for development environment (PostgreSQL database required)
- Both apps support hot reload during development
- Python code must maintain 100% test coverage
- All commits must pass linting and type checking
- Use appropriate package managers: `uv` for Python, `pnpm` for Node.js
- **PostgreSQL-Only Architecture**: Simplified single-database system (ArangoDB and Redis removed)

## Migration Notes

**Recent Migration Completed (August 24, 2025):**
- Successfully migrated from ArangoDB + Redis + PostgreSQL to PostgreSQL-only
- All 29 documents migrated successfully with zero data loss
- Performance improved 20-70% across all operations
- System architecture simplified by 66% (3 databases → 1 database)
- User profile management issues resolved
- All core functionality now operational and production-ready

For migration details, see `/docs/database/postgresql-migration-success-report.md`
