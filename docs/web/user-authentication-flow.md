# User Authentication Flow

This document outlines the implementation requirements for the User Auth flow in the `projects/web` NextJs app.

Current State:
- Better-auth added to project
- Better-auth config & initial DB setup complete
- Better-auth `auth.ts` and `auth-client.ts` created.

Requirements:
- Email / Password login & registration page using Shadcn/ui components
- Better-auth signIn method
- Propper session management with `nextCookies`
- Protected route `/` redirects to `/sign-in` if no session

Documentation:
- `docs/vendor/betterauth_next.md` - NextJs integration docs
- `docs/vendor/betterauth_concepts.md` - Better-auth basic usage

MCP servers:
- `/shadcn:create-auth-flow`
- `/shadcn:build-shadcn-page`
