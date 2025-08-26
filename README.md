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
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/) with OpenAI integration
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) with Tailwind CSS
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Testing**: [Vitest](https://vitest.dev/) with Playwright browser testing

## 📋 Prerequisites

- **Bun**: v1.0+ (recommended runtime)
- **PostgreSQL**: v13+ database server
- **Node.js**: v18+ (if not using Bun)
- **OpenAI API Key**: For AI-powered resume processing

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd atspro-bun
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

# OpenAI API (for AI features)
OPENAI_API_KEY="your-openai-api-key"

# Application
PUBLIC_APP_URL="http://localhost:5173"
```

### 4. Set Up Database
Run the database migrations to create the required tables:
```bash
# Connect to your PostgreSQL database and run:
psql -d atspro -f migrations/001_create_atspro_tables.sql
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

# Run unit tests
bun run test:unit

# Run all tests
bun run test
```

## 🗄 Database Schema

The application uses PostgreSQL with the following main tables:

- **userResume**: Stores user resume data with JSONB fields for flexible structure
- **userJobs**: Tracks job applications with status management
- **jobDocuments**: Versioned document storage for each job application
- **jobActivity**: Activity timeline for tracking user actions

## 🔧 Key Features Implementation

### Remote Functions Architecture
ATSPro uses SvelteKit's experimental remote functions feature for type-safe client-server communication:
- **Query functions**: For data fetching with automatic caching
- **Command functions**: For data mutations with validation
- **Form functions**: For file uploads and form processing

### AI Integration
- Resume parsing and optimization using OpenAI GPT models
- Intelligent field extraction from uploaded documents
- Content generation for cover letters and application materials

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
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `PUBLIC_APP_URL`: Production application URL

### Database Migration
Run the migration script on your production database:
```bash
psql -d production_db -f migrations/001_create_atspro_tables.sql
```

## 📝 License

This project is private and proprietary.

---

**Note**: This project is in active development. Some features may be incomplete or subject to change. Check the TODO.md file for current development status and planned features.
