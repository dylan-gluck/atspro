# ATSPro

> **AI-powered ATS resume optimization platform that decodes hiring algorithms and maximizes your job search success**

ATSPro is a comprehensive career advancement platform built to help job seekers navigate modern hiring systems. Using AI-powered resume optimization and intelligent job tracking, ATSPro helps you get noticed by ATS systems and land more interviews.

## ✨ Features

### 🎯 AI-Powered Resume Optimization

- Upload resume documents (PDF, TXT, Markdown) for AI-powered extraction and optimization
- Intelligent parsing of work experience, education, skills, and certifications
- Real-time resume updates and version management

### 📊 Job Application Tracking

- Comprehensive job application management with status tracking
- Document generation for each application (resumes, cover letters, research reports)
- Activity timeline tracking for all job-related actions
- Application analytics and response rate monitoring

### 📈 Dashboard & Analytics

- Real-time dashboard with job search statistics
- Weekly progress tracking and trend analysis
- Response rate calculations and performance metrics
- Recent activity feed for quick updates

### 🔒 Secure Authentication

- Email and password authentication via Better-Auth
- Session management with cookie-based authentication
- User data isolation and privacy protection

## 🛠 Technology Stack

- **Framework**: [SvelteKit 2.0](https://kit.svelte.dev/) with Svelte 5 runes
- **Runtime**: [Bun](https://bun.sh/) for fast JavaScript runtime
- **Database**: [PostgreSQL](https://www.postgresql.org/) with connection pooling
- **Authentication**: [Better-Auth](https://better-auth.com/) with SvelteKit integration
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/) with Anthropic Claude integration
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) with Tailwind CSS
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Testing**: [Vitest](https://vitest.dev/) with Playwright browser testing

## 📋 Prerequisites

- **Bun**: v1.0+ (recommended runtime)
- **PostgreSQL**: v13+ database server
- **Node.js**: v18+ (if not using Bun)
- **Anthropic API Key**: For AI-powered resume processing

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/dylan-gluck/atspro
cd atspro
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/atspro"

# Anthropic API (for AI features)
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Application
PUBLIC_APP_URL="http://localhost:5173"

# Better-Auth
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:5173"
PUBLIC_BETTER_AUTH_URL="http://localhost:5173"
```

### 4. Set Up Database

Run the database migrations using the built-in migration system:

```bash
# Run all pending migrations
bun run migrate

# Check migration status
bun run migrate:status
```

### 5. Start Development Server

```bash
bun run dev
```

The application will be available at `http://localhost:5173`

## 🏗 Project Structure

```
src/
├── app.html                 # HTML template
├── hooks.server.ts         # Server hooks
├── lib/
│   ├── ai/                 # AI integration utilities
│   ├── auth.ts            # Authentication configuration
│   ├── auth-client.ts     # Client-side auth utilities
│   ├── db/                # Database operations
│   ├── components/ui/     # Reusable UI components
│   ├── services/          # Remote functions (SvelteKit)
│   │   ├── resume.remote.ts
│   │   ├── job.remote.ts
│   │   ├── document.remote.ts
│   │   └── activity.remote.ts
│   ├── types/             # TypeScript type definitions
│   └── utils.ts           # Utility functions
├── routes/
│   ├── (app)/             # Authenticated application routes
│   │   ├── app/           # Main dashboard
│   │   └── onboarding/    # User onboarding flow
│   ├── (marketing)/       # Public marketing pages
│   │   └── auth/          # Authentication pages
│   └── api/               # API endpoints
└── static/                # Static assets
```

## 🧪 Development Commands

```bash
# Development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Type checking
bun run check

# Format code
bun run format

# Lint code
bun run lint

# Database migrations
bun run migrate           # Run pending migrations
bun run migrate:status    # Check migration status
bun run migrate:rollback  # Rollback last migration

# Testing
bun run test:unit         # Run unit tests
bun run test              # Run all unit tests
bun run test:coverage     # Run tests with coverage
bun run test:watch        # Run tests in watch mode
bun run test:e2e          # Run end-to-end tests
bun run test:e2e:ui       # Run E2E tests with UI
bun run test:e2e:debug    # Debug E2E tests
bun run test:all          # Run all tests (unit + E2E)
bun run test:summary      # Generate test summary
```

## 🗄 Database Schema

The application uses PostgreSQL with the following main tables:

- **user**: User accounts and authentication (Better-Auth)
- **session**: User session management (Better-Auth)
- **userResume**: Stores user resume data with JSONB fields for flexible structure
- **userJobs**: Tracks job applications with status management
- **jobDocuments**: Versioned document storage for each job application (with HTML and markdown content)
- **jobActivity**: Activity timeline for tracking user actions
- **migrations**: Database migration tracking system

## 🔧 Key Features Implementation

### Remote Functions Architecture

ATSPro uses SvelteKit's experimental remote functions feature for type-safe client-server communication:

- **Query functions**: For data fetching with automatic caching
- **Command functions**: For data mutations with validation
- **Form functions**: For file uploads and form processing

### AI Integration

- Resume parsing and optimization using Anthropic Claude models
- Intelligent field extraction from uploaded documents (PDF and text)
- Content generation for cover letters and application materials
- ATS score calculation and keyword optimization
- Company research and job matching

### Authentication Flow

- Email/password registration and login
- Session management with secure cookies
- Protected routes with server-side validation

## 🚢 Deployment

### Production Build

```bash
bun run build
```

### Environment Setup

Ensure all production environment variables are configured:

- `DATABASE_URL`: Production PostgreSQL connection string
- `ANTHROPIC_API_KEY`: Anthropic API key for AI features
- `PUBLIC_APP_URL`: Production application URL
- `BETTER_AUTH_SECRET`: Secret key for authentication (generate a secure random string)
- `BETTER_AUTH_URL`: Production authentication URL
- `PUBLIC_BETTER_AUTH_URL`: Public authentication URL

### Database Migration

Run the migration system on your production database:

```bash
# Set production DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:pass@host:port/dbname"

# Run all migrations
bun run migrate
```

## 📝 License

This project is private and proprietary.

---

**Note**: This project is in active development. Some features may be incomplete or subject to change. Check the TODO.md file for current development status and planned features.
