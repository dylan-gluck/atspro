# Dynamic Authentication Routes

This directory implements a dynamic authentication system using SvelteKit's parameter routes with Better-Auth integration. The `[method]` parameter allows a single component to handle multiple authentication flows.

## Overview

The dynamic auth route (`/auth/[method]`) provides a unified authentication interface that supports:

- User sign-in (`/auth/sign-in`)
- User registration (`/auth/sign-up`)
- Password reset (`/auth/forgot-password`)

## Route Structure

```
src/routes/(marketing)/auth/[method]/
├── +page.svelte          # Dynamic auth form component
└── README.md            # This documentation
```

## Dynamic Routing Implementation

### URL Parameters

The route accepts the following method parameters:

- `sign-in` - User login form
- `sign-up` - User registration form
- `forgot-password` - Password reset form
- Invalid methods show a 404-like error state

### Route Configuration

The component uses Svelte 5 runes to derive form configuration based on the URL parameter:

```typescript
let method = $derived(page.params.method);
let formConfig = $derived(() => {
	switch (method) {
		case 'sign-in':
			return {
				/* sign-in config */
			};
		case 'sign-up':
			return {
				/* sign-up config */
			};
		case 'forgot-password':
			return {
				/* reset config */
			};
		default:
			return {
				/* error state */
			};
	}
});
```

## Better-Auth Integration

### Client Configuration

Authentication is handled through the Better-Auth Svelte client:

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	baseURL: PUBLIC_BETTER_AUTH_URL || 'http://localhost:5173'
});
```

### Server Configuration

Better-Auth server setup with PostgreSQL and SvelteKit integration:

```typescript
// src/lib/auth.ts
export const auth = betterAuth({
	database: new Pool({ connectionString: DATABASE_URL }),
	plugins: [sveltekitCookies(getRequestEvent)],
	emailAndPassword: { enabled: true }
});
```

### Session Management

Sessions are handled in `hooks.server.ts` and made available through `event.locals`:

```typescript
// Session available on all server routes
if (session) {
	event.locals.session = session.session;
	event.locals.user = session.user;
}
```

## Authentication Flow Architecture

### Sign-In Flow

1. User submits email/password
2. `authClient.signIn.email()` called with credentials
3. Optional "Remember Me" functionality
4. Success: Redirect to `/app`
5. Error: Display validation message

### Sign-Up Flow

1. User submits name/email/password
2. `authClient.signUp.email()` creates account
3. Automatic sign-in after successful registration
4. Success: Redirect to `/onboarding`
5. Error: Display validation message

### Password Reset Flow

1. User submits email address
2. **TODO**: Password reset not yet implemented
3. Shows placeholder error message

## Form Validation and Error Handling

### Client-Side Validation

- HTML5 form validation (required fields, email format)
- Real-time form state management with Svelte 5 runes
- Loading states during authentication requests

### Error Handling

```typescript
try {
	await authClient.signIn.email({ email, password, rememberMe });
	goto('/app');
} catch (err: any) {
	console.error('Auth error:', err);
	error = err?.message || 'An error occurred during authentication';
}
```

### Error Display

Errors are shown in a styled error banner above the form:

```svelte
{#if error}
	<div
		class="border-destructive/20 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
	>
		{error}
	</div>
{/if}
```

## Security Measures

### Form Security

- CSRF protection via Better-Auth and SvelteKit
- Secure session handling with HTTP-only cookies
- Password fields with proper `type="password"`
- Email validation and sanitization

### Session Security

- PostgreSQL database storage for session persistence
- Secure cookie configuration through Better-Auth
- Server-side session validation in hooks

### Input Sanitization

- HTML5 input validation (email format, required fields)
- Better-Auth handles input sanitization on server-side
- No client-side password storage

## Post-Authentication Redirects

### Redirect Logic

- **Sign-in success**: → `/app` (main dashboard)
- **Sign-up success**: → `/onboarding` (user setup flow)
- **Access protection**: Unauthenticated users → `/auth/sign-in`
- **Authenticated users**: `/auth/*` → `/app`

### Navigation Flow

```
Unauthenticated: /app/* → /auth/sign-in
Sign-in success: /auth/sign-in → /app
Sign-up success: /auth/sign-up → /onboarding
Onboarding complete: /onboarding → /app
```

## Social Authentication (Planned)

### Current State

Social login buttons are present but not functional:

- Google OAuth (placeholder)
- GitHub OAuth (placeholder)

### Implementation Status

```typescript
// TODO: Implement OAuth providers
async function handleGoogleLogin() {
	error = 'Google login is not yet configured';
}

async function handleGithubLogin() {
	error = 'GitHub login is not yet configured';
}
```

## UI Components and Styling

### Component Structure

- **Card Layout**: Clean card-based form design
- **Responsive Design**: Mobile-first responsive layout
- **Loading States**: Button loading states during requests
- **Form Controls**: Input, Label, Button, Checkbox components

### Form Variations by Method

- **Sign-in**: Email, password, remember me, forgot password link
- **Sign-up**: Name, email, password (no remember me)
- **Forgot-password**: Email only, no social login options

## Future Enhancements

### Planned Features

- [ ] Password reset functionality via email
- [ ] Google OAuth integration
- [ ] GitHub OAuth integration
- [ ] Email verification for new accounts
- [ ] Rate limiting for auth attempts
- [ ] Account lockout protection

### Security Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] Magic link authentication
- [ ] Device fingerprinting
- [ ] Suspicious login detection

## Development Notes

### Svelte 5 Patterns Used

- `$derived()` for computed values based on URL params
- `$state()` for reactive form data
- Arrow functions for event handlers
- Proper TypeScript integration with Better-Auth types

### File References

- **Auth Client**: `/src/lib/auth-client.ts`
- **Auth Server**: `/src/lib/auth.ts`
- **Session Hooks**: `/src/hooks.server.ts`
- **App Layout**: `/src/routes/(app)/app/+layout.server.ts`
- **Dynamic Route**: `/src/routes/(marketing)/auth/[method]/+page.svelte`
