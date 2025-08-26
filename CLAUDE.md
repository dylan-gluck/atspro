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

1. **ALWAYS**: Use Svelte 5 syntax with runes (`$state`, `$derived`, `$effect`)
2. **ALWAYS**: Use SvelteKit Remote Functions NOT traditional API / form actions
3. **DEBUGGING**: Use `console.log` and `debugger` statements for debugging

### Critical Svelte 5 & SvelteKit Syntax

#### Svelte 5 Runes
```svelte
<script>
  // State management
  let count = $state(0);  // NOT $state<number>(0) - no generics in runes!
  let doubled = $derived(count * 2);

  // Effects must return void
  $effect(() => {
    // For async operations, use IIFE
    (async () => {
      const data = await fetchData();
      // process data
    })();
  });
</script>
```

#### Remote Functions (Form with File Upload)
```svelte
<script>
  import { extractResume } from '$lib/services/resume.remote';

  // CRITICAL: Forms with file inputs MUST have enctype
  // Without this, file uploads will fail silently!
</script>

<form
  enctype="multipart/form-data"  <!-- REQUIRED for file uploads -->
  {...extractResume.enhance(async ({ form, data, submit }) => {
    // Handle submission
    const result = await submit();
  })}
>
  <input type="file" name="document" />
</form>
```

#### Button Click Handlers
```svelte
<!-- ALWAYS use arrow functions for onclick handlers -->
<button onclick={() => handleClick()}>Click</button>

<!-- NOT this (will cause type errors) -->
<button onclick={handleClick}>Click</button>
```

### Troubleshooting Guide

#### Remote Function Not Working (405 Error)
1. Clear `.svelte-kit` folder and restart dev server
2. For forms with files, MUST have `enctype="multipart/form-data"`

#### TypeScript Errors with Runes
- Never use generics with `$state` (use `$state(value)` not `$state<T>(value)`)
- `$effect` must return void - use IIFE for async operations
- Always use arrow functions for event handlers

#### Database Array Errors
- PostgreSQL `TEXT[]` columns need special handling
- Pass JavaScript arrays directly, don't JSON.stringify them. The pg driver will handle the conversion automatically

## Key Docs:

Always Read: @TODO.md

Reference when working on related features:
- Bun: `.claude/docs/bun/*`
- Svelte: `.claude/docs/svelte/*`
- Sveltekit: `.claude/docs/sveltekit/*`
- Better-auth: `.claude/docs/better-auth/*`
- Vercel AI SDK: `.claude/docs/ai-sdk/*`
