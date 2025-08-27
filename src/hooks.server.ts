import { auth } from '$lib/auth'; // path to your auth file
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { handleErrorWithSentry, sentryHandle } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';
import { sentryConfig, getSentryUserContext } from '$lib/sentry';

// Initialize Sentry on the server
if (!building) {
	Sentry.init({
		...sentryConfig
	});
}

const authHandle: Handle = async ({ event, resolve }) => {
	// Fetch current session from Better Auth
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	// Make session and user available on server
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;

		// Set Sentry user context
		const userContext = getSentryUserContext(session.user);
		if (userContext) {
			Sentry.setUser(userContext);
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

// Use sequence to combine multiple handle functions
// sentryHandle should be first to capture all errors
export const handle = sequence(sentryHandle(), authHandle);

// Handle errors with Sentry
export const handleError = handleErrorWithSentry();

// Optional: Add custom server error handling
export function handleCustomError(error: Error, context?: Record<string, unknown>) {
	// Log to console in development
	if (process.env.NODE_ENV === 'development') {
		console.error('Server error:', error, context);
	}

	// Send to Sentry with additional context
	Sentry.captureException(error, {
		extra: context,
		tags: {
			location: 'server'
		}
	});
}
