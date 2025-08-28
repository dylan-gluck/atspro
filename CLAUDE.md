# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATSPro is an AI-powered ATS resume optimization platform built with SvelteKit, Bun, Better-Auth, and PostgreSQL.

Agent orchestration and business logic implemented using Vercel AI SDK, Baml, Mastra.

### Key Files & Folders

- **Project Scripts**: `scripts/*`
- **DB Migrations**: `migrations/*`
- **Data Model**: `docs/data-model.md`
- **Vendor Docs**: `.claude/docs/*`

### Key Implementation Notes

1. **SVELTE**: Always use Svelte 5 syntax with runes (`$state`, `$derived`, `$effect`). This project uses SvelteKit Remote Functions NOT traditional API / form actions
2. **DB**: Use the `postgres` mcp server for READ operations. Always write migrations and run using `bun run migrate`.
3. **DEBUGGING**: Use `console.log` and `debugger` statements for debugging during development. Remove before commit.
4. **TESTING**: ALWAYS check if dev server is running before starting tests. If not running, start server with `bun run dev`
5. **TESTING**: ALWAYS use playwright mcp & test data in `.test-data/*`
6. **TESTING**: ALWAYS run typecheck `bun run check`, tests `bun run test`, lint `bun run lint` & format `bun run format` before committing changes.

### Project-specific Subagent Use

Vendor-specific Experts with access to latest docs & examples. Use to consult on feature planning, implementation, review & debugging. (**svelte**, **better-auth**, **ai-sdk**)
