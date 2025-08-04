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

### 🔬 Company Intelligence
Go beyond generic applications with deep-dive research reports, insider interview questions, and cultural insights that help you speak their language from day one.

### 📈 Success Analytics
Track your entire job search journey with precision. See which strategies drive interviews, which companies respond, and where your next breakthrough is coming from.

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
- **FastAPI** - Modern Python web framework
- **OpenAI Agents SDK** - AI-powered document processing
- **Unstructured** - Advanced document parsing
- **Pydantic** - Data validation and serialization
- **uv** - Fast Python package manager

**Frontend (Web)**
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **Zustand** - Lightweight state management

**Infrastructure**
- **PostgreSQL** - User auth, settings, subscriptions
- **Redis** - Caching and background job queues
- **ArangoDB** - Document storage and relationships
- **Docker Compose** - Service orchestration

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** - For containerized development
- **Node.js 20+** with **pnpm** - For frontend development
- **Python 3.11+** with **uv** - For local API development (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/atspro.git
cd atspro

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development environment
pnpm docker:dev
```

### Access Your Services

- **Web Application**: http://localhost:3000
- **API Server**: http://localhost:8000
- **API Health Check**: http://localhost:8000/health
- **ArangoDB Web UI**: http://localhost:8529 (user: root)
- **PostgreSQL**: localhost:5432 (database: atspro)
- **Redis**: localhost:6379

## 🛠️ Development

### Available Commands

```bash
# Docker Environment
pnpm docker:dev      # Start development with hot reload
pnpm docker:prod     # Start production environment
pnpm docker:stop     # Stop all services
pnpm docker:clean    # Stop and remove all volumes

# Turborepo Commands
pnpm build           # Build all applications
pnpm dev             # Start all apps in development
pnpm lint            # Lint all applications
pnpm check-types     # Type check all applications
pnpm test            # Run tests for all applications
pnpm format          # Format code in all applications
```

### API Development

```bash
cd apps/api

# Start development server
uv run fastapi dev

# Run tests with coverage
uv run pytest --cov=app

# Format code
uvx ruff format

# Add new dependency
uv add <package-name>
```

### Web Development

```bash
cd apps/web

# Start development server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm check-types

# Linting
pnpm lint
```

## 📊 API Endpoints

### Core Functionality

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parse` | POST | Parse resume documents to structured JSON |
| `/api/optimize` | POST | Optimize resume content for specific jobs |
| `/api/job` | POST | Extract and analyze job descriptions |
| `/api/linkedin` | GET | LinkedIn profile integration |
| `/health` | GET | Service health check |

### Background Processing

Most endpoints return task IDs for long-running operations. Results are stored in the database and can be polled for completion status.

## 🗄️ Database Schema

### PostgreSQL (BetterAuth)
- User authentication and sessions
- Subscription management
- Transactional data

### ArangoDB (Documents)
- Resume data and documents
- Job descriptions and analysis
- Document relationships and history

### Redis (Cache & Jobs)
- Session storage
- Background job queues (BullMQ)
- API response caching

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

# Run Jest tests
pnpm test

# Run with coverage
pnpm test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- **Python**: Use type hints, Pydantic models, and comprehensive docstrings
- **TypeScript**: Maintain strict typing and component-based architecture
- **Testing**: Write tests for all new features with edge case coverage
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
