# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATSPro is an AI-powered ATS resume optimization platform built with SvelteKit, Bun, Better-Auth, and PostgreSQL.

### Key Implementation Notes

1. **ALWAYS**: Use Svelte 5 syntax with runes (`$state`, `$derived`, `$effect`)
2. **ALWAYS**: Use SvelteKit Remote Functions NOT traditional API / form actions
3. **DEBUGGING**: Use `console.log` and `debugger` statements for debugging
4. **TESTING**: ALWAYS use playwright mcp & test data in `.test-data/*`
5. **TESTING**: ALWAYS run typecheck `bun run check` and tests `bun run test`
