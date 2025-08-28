# CRUSH.md - ATSPro Development Guide

## Build/Test Commands

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run check` - TypeScript type checking (ALWAYS run before commits)
- `bun run test` - Run unit tests
- `bun run test:watch` - Watch mode for unit tests
- `bun run test:e2e` - Run Playwright e2e tests
- `bun run test:e2e:debug` - Debug e2e tests
- `bun run test:all` - Run all tests (unit + e2e)
- `bun run lint` - Check formatting with Prettier
- `bun run format` - Auto-format with Prettier

## Code Style Guidelines

- **Svelte**: Use Svelte 5 runes (`$state`, `$derived`, `$effect`) - NO legacy reactive statements
- **Remote Functions**: Use SvelteKit Remote Functions NOT traditional API routes or form actions
- **Formatting**: Tabs, single quotes, 100 char width, trailing comma: none
- **Imports**: Use `.js` extensions for TypeScript imports (e.g., `from '$lib/utils.js'`)
- **Types**: Export interfaces from `$lib/types/`, use Zod/Valibot for validation
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Database**: Use Drizzle ORM with PostgreSQL, schema in `$lib/db/schema/`
- **Testing**: Use Vitest for unit tests, Playwright for e2e, test data in `.test-data/`
- **Error Handling**: Use SvelteKit's `error()` function, proper HTTP status codes
- **Debugging**: Use `console.log` and `debugger` statements for debugging
- **UI**: Use shadcn-svelte components from `$lib/components/ui/`

## Key Patterns

- Remote functions in `$lib/services/*.remote.ts` with proper auth/rate limiting
- Database operations through `$lib/db/` with proper schema definitions
- Component props with `$props()` destructuring and proper TypeScript types
