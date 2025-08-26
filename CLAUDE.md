# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATSPro is an AI-powered ATS resume optimization platform built with SvelteKit, Bun, Better-Auth, and PostgreSQL.

### Key Implementation Notes

1. **ALWAYS**: Use Svelte 5 syntax with runes (`$state`, `$derived`, `$effect`)
2. **ALWAYS**: Use SvelteKit Remote Functions NOT traditional API / form actions
3. **DEBUGGING**: Use `console.log` and `debugger` statements for debugging

### Critical Svelte 5 & SvelteKit Syntax

#### TypeScript Errors with Runes

- Never use generics with `$state` (use `$state(value)` not `$state<T>(value)`)
- `$effect` must return void - use IIFE for async operations
- Always use arrow functions for event handlers

## Key Documentation:

Always Read: @TODO.md

Reference when working on related features:

- Bun: `.claude/docs/bun/*`
- Svelte: `.claude/docs/svelte/*`
- Sveltekit: `.claude/docs/sveltekit/*`
- Better-auth: `.claude/docs/better-auth/*`
- Vercel AI SDK: `.claude/docs/ai-sdk/*`

## MCP Servers

- `mcp__postgres__query` Use for confirming db changes
- `mcp__playwright__*` Use for testing features while developing & running end-to-end tests.
- `mcp__language-server-ts__*` Use for complex parsing & mutations across codebase, eg rename symbol.
- `mcp__shadcn-ui__*` Always use when building new views
