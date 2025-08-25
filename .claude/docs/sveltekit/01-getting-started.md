# SvelteKit Getting Started Guide

## Overview

SvelteKit is a framework for rapidly developing robust, performant web applications using Svelte. Think of it as:
- **React developers**: Similar to Next.js
- **Vue developers**: Similar to Nuxt.js

Key difference: SvelteKit does all the modern best practices work for you (SSR, CSR, prerendering, build optimization, etc.)

## Quick Start

```bash
npx sv create my-app
cd my-app
npm run dev
```

This creates a new SvelteKit project and starts dev server on http://localhost:5173

## Core Concepts

### Pages and Components
- Each page = Svelte component
- Pages live in `src/routes` directory
- Server-rendered first (fast initial load), then client-side app takes over

### Editor Setup
Recommended: VS Code + Svelte extension

## Project Types

SvelteKit supports multiple rendering approaches:

### Default (Hybrid)
- **First load**: SSR (Server-Side Rendering) - better SEO/performance
- **Navigation**: CSR (Client-Side Rendering) - faster, no flash
- Also called "transitional apps"

### Static Site Generation (SSG)
```js
// +page.js
export const prerender = true;
```
- Pre-generates HTML at build time
- Use `adapter-static` for full static sites
- Can mix prerendered and dynamic pages

### Single Page App (SPA)
- Client-side only rendering
- Use `adapter-static` with SPA mode
- Skip backend-related docs if using external API

### Multi-Page App
```js
// +page.js  
export const csr = false; // Disable client-side JS
```
- Traditional server-rendered pages
- No JavaScript hydration

### Deployment Options

| Type | Adapter | Use Case |
|------|---------|----------|
| **Serverless** | `adapter-auto`, `adapter-vercel`, `adapter-netlify` | Most common |
| **Node Server** | `adapter-node` | VPS, Docker, own server |
| **Static** | `adapter-static` | CDN, GitHub Pages |
| **Edge** | Platform-specific adapters | Ultra-low latency |

## Project Structure

```
my-project/
├── src/
│   ├── lib/              # Shared utilities ($lib alias)
│   │   └── server/       # Server-only code ($lib/server)
│   ├── params/           # Route parameter matchers
│   ├── routes/           # Your application routes
│   ├── app.html          # Main HTML template
│   ├── error.html        # Error page template
│   ├── hooks.client.js   # Client-side hooks
│   ├── hooks.server.js   # Server-side hooks
│   └── service-worker.js # Service worker
├── static/               # Static assets (robots.txt, etc.)
├── tests/                # Your tests
├── package.json
├── svelte.config.js      # Svelte/SvelteKit config
├── tsconfig.json         # TypeScript config
└── vite.config.js        # Vite config
```

### Key Files

**`src/app.html`** - Page template with placeholders:
- `%sveltekit.head%` - Scripts and head content
- `%sveltekit.body%` - Rendered page (put in `<div>` not `<body>`)
- `%sveltekit.assets%` - Asset path
- `%sveltekit.nonce%` - CSP nonce
- `%sveltekit.env.[NAME]%` - Environment variables (PUBLIC_ prefix)

**`src/error.html`** - Error page with placeholders:
- `%sveltekit.status%` - HTTP status
- `%sveltekit.error.message%` - Error message

## Web Standards

SvelteKit uses modern web APIs - your web skills transfer directly:

### Fetch API
- `fetch()` works in hooks, server routes, and browser
- Special SvelteKit version in `load` functions handles credentials/relative URLs

### Request/Response
- `Request` objects in hooks and server routes (`event.request`)
- Return `Response` objects from `+server.js` files

### Headers/FormData/Streams
- Standard `Headers`, `FormData`, streaming APIs
- Built on web standards, not framework-specific APIs

### URL/URLSearchParams
- `URL` objects everywhere (`event.url`, `page.url`, etc.)
- `url.searchParams` for query parameters

### Web Crypto
```js
const uuid = crypto.randomUUID();
```

## Development Flow

1. **Create project**: `npx sv create`
2. **Run dev server**: `npm run dev`
3. **Edit files in** `src/routes/` - changes reflect instantly (HMR)
4. **Build for production**: `npm run build`
5. **Deploy**: Use appropriate adapter

## Next Steps

- Learn [routing system](./02-core-concepts.md) - filesystem-based routes
- Understand data loading with `load` functions
- Set up forms with actions
- Configure rendering options per page

## Quick Reference

| Need | File | Purpose |
|------|------|---------|
| **Page** | `+page.svelte` | UI component |
| **Data** | `+page.js` | Client+server data loading |
| **Server Data** | `+page.server.js` | Server-only data loading |
| **Layout** | `+layout.svelte` | Shared UI wrapper |
| **API** | `+server.js` | REST/API endpoints |
| **Error** | `+error.svelte` | Error pages |