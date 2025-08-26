# SvelteKit Documentation Cheat Sheets

This directory contains condensed guides and cheat sheets for SvelteKit, scraped and organized from the official documentation.

## Guide Structure

### [01. Getting Started](./01-getting-started.md)

- **Overview**: What is SvelteKit, comparison to other frameworks
- **Quick Start**: Project creation and basic setup
- **Project Types**: SSG, SPA, hybrid rendering, deployment options
- **Project Structure**: File organization and key directories
- **Web Standards**: Built-in web APIs SvelteKit uses
- **Development Flow**: Basic workflow and next steps

### [02. Core Concepts](./02-core-concepts.md)

- **Routing**: Filesystem-based routing, dynamic routes, route files
- **Data Loading**: `load` functions, server vs universal loading
- **Layouts**: Shared UI components and nested layouts
- **API Routes**: Creating endpoints with `+server.js`
- **Form Actions**: Server-side form handling and progressive enhancement
- **Error Handling**: Custom error pages and error boundaries
- **Page Options**: Rendering configuration (prerender, SSR, CSR)
- **Type Safety**: Auto-generated TypeScript types

### [03. Build & Deploy](./03-build-deploy.md)

- **Building**: Two-stage build process and build guards
- **Adapters**: Platform-specific deployment preparation
- **Official Adapters**: Static, Node, Vercel, Netlify, Cloudflare
- **Configuration**: Adapter setup and platform-specific options
- **Deployment Patterns**: Common deployment configurations
- **Performance**: Build optimization and troubleshooting
- **Environment Setup**: Platform detection and environment variables

### [04. Advanced Features](./04-advanced-features.md)

- **Hooks**: Request interception, error handling, URL rewriting
- **State Management**: Server vs client state, context API, reactive state
- **Advanced Routing**: Route parameters, matchers, groups
- **Load Functions**: Dependency tracking, parent data, error handling
- **Form Handling**: Multiple actions, file uploads, advanced enhancement
- **Performance**: Code splitting, preloading, bundle optimization

### [05. Remote Functions](./05-remote-functions.md)

- **Overview**: Type-safe client-server communication via `.remote.js` files
- **Query**: Read dynamic data from server with validation and refresh capabilities
- **Form**: Write data with progressive enhancement and single-flight mutations
- **Command**: Non-form data mutations callable from anywhere
- **Prerender**: Build-time data prerendering for CDN-cached content
- **Features**: Automatic validation, optimistic updates, error handling
- **Configuration**: Requires `kit.experimental.remoteFunctions` flag

## Quick Navigation

### Common Use Cases

- **New to SvelteKit**: Start with [Getting Started](./01-getting-started.md)
- **Building pages**: See [Core Concepts - Routing](./02-core-concepts.md#filesystem-based-routing)
- **Loading data**: See [Core Concepts - Data Loading](./02-core-concepts.md#data-loading)
- **Forms**: See [Core Concepts - Form Actions](./02-core-concepts.md#form-actions)
- **Deployment**: See [Build & Deploy](./03-build-deploy.md)
- **Server customization**: See [Advanced Features - Hooks](./04-advanced-features.md#hooks)
- **State management**: See [Advanced Features - State Management](./04-advanced-features.md#state-management)
- **Type-safe RPC**: See [Remote Functions](./05-remote-functions.md)

### File Reference

| Need                 | File(s)                       | Purpose                   |
| -------------------- | ----------------------------- | ------------------------- |
| **Page**             | `+page.svelte`                | UI component              |
| **Data Loading**     | `+page.js`, `+page.server.js` | Fetch data                |
| **Layout**           | `+layout.svelte`              | Shared wrapper            |
| **API**              | `+server.js`                  | REST endpoints            |
| **Forms**            | `+page.server.js` (actions)   | Server-side form handling |
| **Error**            | `+error.svelte`               | Error boundaries          |
| **Remote Functions** | `*.remote.js`, `*.remote.ts`  | Type-safe RPC             |

### Configuration Files

- **`svelte.config.js`** - SvelteKit configuration
- **`vite.config.js`** - Vite configuration
- **`src/hooks.server.js`** - Server-side hooks
- **`src/hooks.client.js`** - Client-side hooks
- **`src/app.html`** - HTML template

## Official Resources

- **Docs**: https://svelte.dev/docs/kit
- **Tutorial**: https://svelte.dev/tutorial/kit
- **Examples**: https://github.com/sveltejs/kit/tree/main/examples
- **Discord**: https://svelte.dev/chat

_Last updated: 2025-01-20_
_Source: https://svelte.dev/docs/kit (scraped via freecrawl-mcp)_
