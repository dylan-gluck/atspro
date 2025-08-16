# ATSPro

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/yourusername/atspro)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![Node.js](https://img.shields.io/badge/node.js-20+-green.svg)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-compose-blue.svg)](https://docker.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **AI-powered ATS resume optimization platform that decodes hiring algorithms and maximizes your job search success**

ATSPro isn't just another resume checker—it's the comprehensive career advancement platform that finally levels the playing field. We decode the hidden language of hiring algorithms, then arm you with everything you need to not just get noticed, but get hired.

## ✨ Features

### 🎯 ATS Mastery
Our proprietary engine, reverse-engineered from leading ATS platforms, doesn't just scan your resume—it reconstructs it for maximum algorithmic impact. Watch your match rates soar from 35% to 85%+.

### ⚡ Real-Time Processing
Advanced async task architecture with WebSocket updates provides instant feedback on resume parsing, job analysis, and optimization progress. No more waiting in the dark—track every step in real-time.

### 🔬 Company Intelligence
Go beyond generic applications with deep-dive research reports, insider interview questions, and cultural insights that help you speak their language from day one.

### 📈 Success Analytics
Track your entire job search journey with precision. See which strategies drive interviews, which companies respond, and where your next breakthrough is coming from.

### 🏗️ Enterprise Architecture
Built for scale with Redis-based queues, background workers, multi-database architecture, and comprehensive service layer for reliability and performance.

## 🏗️ Architecture

ATSPro is built as a **Turborepo monorepo** with containerized microservices:

```
atspro/
├── apps/
│   ├── api/          # Python FastAPI backend
│   └── web/          # Next.js TypeScript frontend
├── docker/           # Docker configuration
├── docs/            # Documentation
└── turbo.json       # Turborepo configuration
```

### Technology Stack

**Backend (API)**
- **FastAPI** - Modern Python web framework with async task processing
- **Redis Queue System** - Priority-based task queues with background workers
- **WebSocket Manager** - Real-time task status updates and notifications
- **OpenAI Agents SDK** - AI-powered document processing
- **Unstructured** - Advanced document parsing
- **Pydantic** - Data validation and serialization
- **uv** - Fast Python package manager

**Frontend (Web)**
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript with comprehensive service layer
- **Service Architecture** - Factory pattern with dependency injection
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **Vitest** - Modern testing framework with 97%+ coverage

**Infrastructure**
- **PostgreSQL** - User auth, task tracking, metrics storage
- **Redis** - Task queues, caching, and real-time processing
- **ArangoDB** - Document storage and relationships
- **Docker Compose** - Service orchestration

## 🚀 Local Development Setup

### Prerequisites

- **Docker & Docker Compose** - For containerized development environment
- **Node.js 20+** with **pnpm** - For monorepo management and frontend development
- **Python 3.11+** with **uv** - For local API development (optional)
- **Git** - Version control

### Step 1: Clone & Navigate

```bash
# Clone the repository
git clone https://github.com/dylan-gluck/atspro.git
cd atspro
```

### Step 2: Install Dependencies

```bash
# Install monorepo dependencies with pnpm
pnpm install

# This installs:
# - Root workspace dependencies
# - Next.js web app dependencies
# - Python dependencies are handled by Docker
```

### Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env
```

**Edit `.env` file with your settings:**

```env
# Database Configuration
POSTGRES_PASSWORD=secure_postgres_password_here
DATABASE_URL=postgresql://atspro_user:secure_postgres_password_here@localhost:5432/atspro

# Redis Configuration
REDIS_PASSWORD=secure_redis_password_here
REDIS_URL=redis://:secure_redis_password_here@localhost:6379

# ArangoDB Configuration
ARANGO_ROOT_PASSWORD=secure_arango_password_here
ARANGO_URL=http://localhost:8529

# Development settings
NODE_ENV=development
```

> **Note**: For development, you can keep the default `dev_*_password_change_in_prod` values

### Step 4: Start Development Environment

**Option A: Using pnpm scripts (Recommended)**
```bash
# Start all services with hot reload
pnpm docker:dev

# This runs: docker-compose up -d
# Includes development overrides with volume mounting
```

**Option B: Using Docker scripts**
```bash
# Use the development script
chmod +x docker/scripts/dev.sh
./docker/scripts/dev.sh
```

**Option C: Manual Docker Compose**
```bash
# Start with development overrides
docker-compose up -d

# View logs in real-time
docker-compose logs -f
```

### Step 5: Verify Services

Wait 30-60 seconds for all services to start, then verify:

```bash
# Check service status
docker-compose ps

# All services should show "healthy" status
# If any show "unhealthy", check logs: docker-compose logs [service-name]
```

### Step 6: Access Your Applications

| Service | URL | Purpose |
|---------|-----|---------|
| **Web App** | http://localhost:3000 | Next.js frontend application |
| **API Server** | http://localhost:8000 | FastAPI backend with docs |
| **API Health** | http://localhost:8000/health | Service health check |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation |
| **ArangoDB UI** | http://localhost:8529 | Database admin interface |

**Database Connections:**
- **PostgreSQL**: `localhost:5432` (database: `atspro`, user: `atspro_user`)
- **Redis**: `localhost:6379`
- **ArangoDB**: `localhost:8529` (user: `root`, password: from `.env`)

### Step 7: Verify Everything Works

**Test API:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"atspro-api"}
```

**Test Web App:**
```bash
curl http://localhost:3000
# Should return HTML content
```

### Troubleshooting

**If services fail to start:**

1. **Check Docker is running:**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **View service logs:**
   ```bash
   # View all logs
   docker-compose logs

   # View specific service logs
   docker-compose logs api
   docker-compose logs web
   docker-compose logs arangodb
   ```

3. **Restart services:**
   ```bash
   # Stop and restart
   pnpm docker:stop
   pnpm docker:dev

   # Or with full cleanup
   pnpm docker:clean
   pnpm docker:dev
   ```

4. **Check port conflicts:**
   ```bash
   # Check if ports are in use
   lsof -i :3000  # Web app
   lsof -i :8000  # API
   lsof -i :5432  # PostgreSQL
   lsof -i :6379  # Redis
   lsof -i :8529  # ArangoDB
   ```

**Common Issues:**

- **API container restarting**: Check for Python import errors in logs
- **ArangoDB unhealthy**: Wait longer for initialization (60-90 seconds)
- **Web app build errors**: Clear Next.js cache with `rm -rf apps/web/.next`
- **Permission errors**: Ensure Docker has proper permissions

### Next Steps

Once everything is running:

1. **Explore the API**: Visit http://localhost:8000/docs for interactive documentation
2. **Start coding**: Make changes to files and see them reflected immediately
3. **Run tests**: Use `pnpm test` or individual service test commands
4. **Check the monorepo commands** in the Development section below

## 🛠️ Development

### Docker Environment Commands

```bash
# Start/Stop Services
pnpm docker:dev      # Start development with hot reload & volume mounting
pnpm docker:prod     # Start production environment (optimized builds)
pnpm docker:stop     # Stop all services
pnpm docker:clean    # Stop and remove all volumes (fresh start)

# Alternative using scripts
./docker/scripts/dev.sh   # Start dev with health checks
./docker/scripts/prod.sh  # Start prod with health checks

# Manual Docker Compose
docker-compose up -d          # Start with development overrides
docker-compose logs -f        # View logs in real-time
docker-compose ps             # Check service status
docker-compose restart api    # Restart specific service
```

### Monorepo Commands (Turborepo)

```bash
# Development
pnpm dev             # Start all apps in development mode
pnpm build           # Build all applications
pnpm lint            # Lint all applications
pnpm check-types     # Type check all applications
pnpm test            # Run tests for all applications
pnpm format          # Format code in all applications

# Individual app commands
pnpm build --filter=web    # Build only web app
pnpm test --filter=api     # Test only API
pnpm dev --filter=web      # Start only web app
```

### API Development (Python FastAPI)

**Quick Commands:**
```bash
cd apps/api

# Start development server (outside Docker)
uv run fastapi dev

# Run all tests
uv run pytest

# Run with coverage report
uv run pytest --cov=app --cov-report=html

# Run specific test
uv run pytest tests/test_parse.py::test_parse_resume -v

# Format code
uvx ruff format

# Type checking
uvx mypy app/

# Add new dependency
uv add <package-name>

# Sync dependencies after pulling changes
uv sync --dev
```

**Inside Docker Container:**
```bash
# Execute commands inside running container
docker-compose exec api uv run pytest
docker-compose exec api uvx ruff format
docker-compose exec api uv add new-package

# Shell access
docker-compose exec api bash
```

### Web Development (Next.js TypeScript)

**Quick Commands:**
```bash
cd apps/web

# Start development server (outside Docker)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm check-types

# Linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Run tests with Vitest
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Add new dependency
pnpm add <package-name>
pnpm add -D <dev-package-name>
```

**Inside Docker Container:**
```bash
# Execute commands inside running container
docker-compose exec web pnpm build
docker-compose exec web pnpm test

# Shell access
docker-compose exec web sh
```

### Database Management

**PostgreSQL:**
```bash
# Connect to database
docker-compose exec postgres psql -U atspro_user -d atspro

# Run SQL commands
docker-compose exec postgres psql -U atspro_user -d atspro -c "SELECT version();"

# Backup database
docker-compose exec postgres pg_dump -U atspro_user atspro > backup.sql

# Restore database
docker-compose exec -T postgres psql -U atspro_user atspro < backup.sql
```

**ArangoDB:**
```bash
# Access ArangoDB shell
docker-compose exec arangodb arangosh --server.password your_password

# Backup collection
docker-compose exec arangodb arangodump --server.password your_password

# Access via Web UI
open http://localhost:8529  # Username: root
```

**Redis:**
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Monitor Redis operations
docker-compose exec redis redis-cli monitor

# Get Redis info
docker-compose exec redis redis-cli info
```

### Development Workflow

**Making Changes:**

1. **Backend Changes** (`apps/api/`):
   ```bash
   # Make changes to Python files
   # FastAPI will automatically reload (when using Docker dev)

   # Add tests
   # Run tests: uv run pytest
   ```

2. **Frontend Changes** (`apps/web/`):
   ```bash
   # Make changes to TypeScript/React files
   # Next.js will automatically reload via HMR

   # Check types: pnpm check-types
   # Format: pnpm format
   ```

3. **Database Schema Changes**:
   ```bash
   # Update PostgreSQL init scripts: docker/postgres/init/
   # Restart database: docker-compose restart postgres

   # For ArangoDB, use the web interface or API calls
   ```

**Pre-commit Checklist:**
```bash
# Format all code
pnpm format

# Lint all code
pnpm lint

# Type check all code
pnpm check-types

# Run all tests
pnpm test

# Build all apps to check for errors
pnpm build
```

## 📊 API Endpoints

### Core Processing (Synchronous)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parse` | POST | Parse resume documents to structured JSON |
| `/api/optimize` | POST | Optimize resume content for specific jobs |
| `/api/job` | POST | Extract and analyze job descriptions |
| `/api/linkedin` | GET | LinkedIn profile integration |
| `/health` | GET | Service health check |

### Async Processing (Background Tasks)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parse/async` | POST | Queue resume parsing with real-time updates |
| `/api/optimize/async` | POST | Queue optimization with progress tracking |
| `/api/job/async` | POST | Queue job analysis with status notifications |

### Task Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks/{task_id}` | GET | Get task status, progress, and results |
| `/api/tasks/` | GET | List user tasks with filtering and pagination |
| `/api/tasks/{task_id}` | DELETE | Cancel running task |
| `/api/tasks/{task_id}/result` | GET | Retrieve completed task results |

### WebSocket Real-Time Updates

- **Endpoint**: `/ws/tasks`
- **Authentication**: Token-based (via query parameter)
- **Messages**: Task status, progress updates, completion notifications
- **Features**: Auto-reconnection, user-specific task filtering

## 🗄️ Database Schema

### PostgreSQL (Primary Database)
- **User Authentication**: BetterAuth integration for secure user management
- **Task Management**: Comprehensive task tracking with status, progress, and metrics
- **Performance Analytics**: Task execution metrics and system monitoring
- **Subscription Management**: User plans and billing information

### ArangoDB (Document Store)
- **Resume Documents**: Structured resume data with version history
- **Job Descriptions**: Parsed job postings with analysis results
- **Optimization Results**: Generated resume optimizations and suggestions
- **Document Relationships**: Links between resumes, jobs, and optimizations

### Redis (Queue & Cache)
- **Task Queues**: Priority-based background job processing (high/normal/low)
- **Real-time Updates**: WebSocket connection management and message routing
- **API Caching**: Response caching for improved performance
- **Session Storage**: Fast session data access

## 🚀 Deployment

### Development

```bash
# Start with hot reload and volume mounting
pnpm docker:dev
```

### Production

```bash
# Build and deploy production stack
pnpm docker:prod

# Or use Docker Compose directly
docker-compose -f docker-compose.yml up -d --build
```

### Environment Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update critical settings in `.env`:
   ```env
   POSTGRES_PASSWORD=your_secure_password
   REDIS_PASSWORD=your_redis_password
   ARANGO_ROOT_PASSWORD=your_arango_password
   ```

## 🧪 Testing

### API Tests

```bash
cd apps/api

# Run all tests
uv run pytest

# Run with coverage report
uv run pytest --cov=app

# Run specific test file
uv run pytest tests/test_parse.py -v
```

### Web Tests

```bash
cd apps/web

# Run Vitest tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test auth.test.ts
```

**Test Coverage**: 97%+ coverage with comprehensive service layer testing, including:
- Service factory and dependency injection patterns
- API client with retry logic and error handling
- Authentication flows and user management
- React hooks integration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- **Python**: Use type hints, Pydantic models, and comprehensive docstrings
- **Async Processing**: Implement new features using the task queue system for long-running operations
- **TypeScript**: Maintain strict typing, use service layer for API interactions
- **Service Architecture**: Follow factory pattern and dependency injection for new services
- **Testing**: Write tests for all new features with edge case coverage (100% API, 97%+ web)
- **Real-time Updates**: Integrate WebSocket notifications for user-facing operations
- **Code Style**: Use provided formatters (`uvx ruff format`, `pnpm format`)

## 📚 Documentation

- [Project Documentation](docs/README.md)
- [API Documentation](apps/api/README.md)
- [Web App Documentation](apps/web/README.md)
- [Docker Setup Guide](docker/README.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [Next.js](https://nextjs.org/)
- Powered by [OpenAI Agents SDK](https://github.com/openai/openai-agents)
- Document processing by [Unstructured](https://unstructured.io/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

---

<div align="center">
  <strong>Transform your job search. Master the ATS. Get hired.</strong>
</div>
