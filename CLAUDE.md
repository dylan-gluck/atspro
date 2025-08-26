# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATSPro is an AI-powered ATS resume optimization platform built with SvelteKit, Bun, Better-Auth, and PostgreSQL.

## Architecture

### Tech Stack

- **Runtime**: Bun (replaces Node.js)
- **Framework**: SvelteKit with Svelte 5
- **Styling**: Tailwind CSS v4 with shadcn-svelte components
- **Database**: PostgreSQL with Better-Auth for authentication
- **Forms**: Sveltekit-superforms with formsnap
- **Testing**: Vitest with Playwright for browser tests

### Database Schema

See `docs/data-model.md` for complete schema.

### Authentication Flow

Better-Auth handles all authentication with PostgreSQL storage:

1. Session management via `hooks.server.ts`
2. Auth routes at `/auth/[method]`

### Key Implementation Notes

1. **ALWAYS**: Use svelte 5 syntax
2. **ALWAYS**: Use sveltekit Remote Functions NOT traditional api / form actions.
3. **DEBUGGING**: Use `console.log` and `debugger` statements for debugging.

## Key Docs:

Always Read: @TODO.md

Reference when working on related features:
- Bun: `.claude/docs/bun/*`
- Svelte: `.claude/docs/svelte/*`
- Sveltekit: `.claude/docs/sveltekit/*`
- Better-auth: `.claude/docs/better-auth/*`
- Vercel AI SDK: `.claude/docs/ai-sdk/*`
