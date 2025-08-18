# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATSPro is an AI-powered ATS resume optimization platform built as a **Turborepo monorepo** with containerized microservices:

- **Backend**: FastAPI with Python 3.11+, uv package manager, OpenAI Agents SDK
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, shadcn/ui components
- **Databases**: PostgreSQL (auth), ArangoDB (documents), Redis (cache/jobs)

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

# Clean restart (removes volumes)
pnpm docker:clean
```

### API Development (Python/FastAPI)
```bash
cd apps/api

# Start dev server
uv run fastapi dev

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

# Start dev server
pnpm dev

# Build for production
pnpm build

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
# PostgreSQL
docker-compose exec postgres psql -U atspro_user -d atspro

# ArangoDB Web UI
open http://localhost:8529

# Redis CLI
docker-compose exec redis redis-cli
```

## API Endpoints

Core functionality:
- `/api/parse` - Parse resume documents to structured JSON
- `/api/optimize` - Optimize resume content for specific jobs
- `/api/job` - Extract and analyze job descriptions
- `/health` - Service health check

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
- ArangoDB UI: http://localhost:8529

## Multi-Agent Orchestration

This project uses Claude Code's **enhanced multi-agent orchestration framework** with a custom JSON-based context system for complex development tasks. **The main Claude Code session acts as the orchestrator**, coordinating specialized agents and workflows through structured JSON communication.

### Orchestration Commands

```bash
# Plan development tasks
/plan implement user authentication system

# Execute feature workflows  
/implement profile picture upload

# Analyze codebase
/analyze backend architecture patterns

# Debug issues
/debug PDF upload failures

# Review code quality
/review recent authentication changes

# Run comprehensive tests
/test user onboarding workflow

# Manage workflows
/workflow list
/workflow execute feature-implementation

# NEW: Context management
/context status
/context agents
/context workflows
```

### JSON Context System

**NEW**: Custom JSON-based agent coordination replacing MCP memory tools:

```bash
# Context operations using jq
source .claude/lib/context.sh

# Agent lifecycle automatically tracked
update_agent "agent_id" "fullstack-eng" "completed" "task"

# Cross-agent communication via shared context
update_workflow_context "workflow_id" "api_endpoints" "$ENDPOINTS_JSON"
get_workflow_context "workflow_id"

# Rich results storage
add_agent_results "agent_id" "Summary" '[{"type": "improvement", "severity": "medium"}]'

# Metrics tracking
increment_metric "linesAnalyzed" 1500
```

### Agent Coordination

As the orchestrator, the main Claude Code session:
1. **Launches specialized agents** using the Task tool
2. **Manages workflows** from `.claude/workflows/`
3. **Tracks agent lifecycle** in JSON context system
4. **Facilitates cross-agent communication** via shared context
5. **Aggregates results** with structured findings and metadata
6. **Monitors progress** with real-time metrics

### Available Specialized Agents

- **fullstack-eng** - Full stack implementation across frontend/backend
- **doc-expert** - Documentation research and compilation
- **code-review** - Code quality analysis and security review
- **e2e-tester** - End-to-end testing with Playwright
- **frontend-eng/ux-eng** - UI/UX implementation with React/shadcn
- **log-monitor** - Docker log monitoring and analysis

### Workflow Templates

Enhanced workflows in `.claude/workflows/` with JSON context operations:
- **feature-implementation.json** - Complete feature development cycle with context sharing
- **bug-fix.json** - Bug investigation and resolution
- **codebase-analysis.json** - Comprehensive parallel code analysis
- **e2e-user-journey-test.json** - End-to-end testing workflows

### Context System Architecture

```
.claude/
├── context/         # JSON context system
│   ├── context.json # Session state, agents, workflows
│   └── schema.json  # JSON schema definitions
├── lib/             # Context management functions
│   └── context.sh   # jq-based operations
├── hooks/          # Automated tracking via hooks
└── workflows/      # Enhanced workflow templates
```

## Important Notes

- Use Docker for development environment (databases, services)
- Both apps support hot reload during development
- Python code must maintain 100% test coverage
- All commits must pass linting and type checking
- Use appropriate package managers: `uv` for Python, `pnpm` for Node.js
- **JSON context system** stores structured agent communication in `.claude/context/`
- Always use orchestration commands for complex multi-step tasks
- Context system provides rich agent coordination and progress tracking