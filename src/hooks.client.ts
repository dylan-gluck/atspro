/**
 * Client-side Hooks
 * Initialize Sentry for client-side error tracking
 */

import { handleErrorWithSentry, replayIntegration } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';
import { sentryConfig, getSentryUserContext } from '$lib/sentry';
import { authClient } from '$lib/auth-client';

// Initialize Sentry on the client
Sentry.init({
	...sentryConfig,

	// Client-specific configuration
	integrations: [
		Sentry.browserTracingIntegration(),
		replayIntegration({
			// Mask all text content for privacy
			maskAllText: true,
			maskAllInputs: true
		})
	],

	// Set up automatic breadcrumb tracking
	beforeBreadcrumb(breadcrumb) {
		// Filter out sensitive breadcrumbs
		if (breadcrumb.category === 'navigation' && breadcrumb.data?.to?.includes('/api/')) {
			return null;
		}
		return breadcrumb;
	}
});

// Set user context when authentication state changes
authClient.getSession().then((result) => {
	if (result?.data?.user) {
		const userContext = getSentryUserContext(result.data.user);
		if (userContext) {
			Sentry.setUser(userContext);
		}
	}
});

// Handle errors with Sentry
export const handleError = handleErrorWithSentry();

// Optional: Add custom error handling
export function handleCustomError(error: Error, context?: Record<string, unknown>) {
	// Log to console in development
	if (import.meta.env.DEV) {
		console.error('Client error:', error, context);
	}

	// Send to Sentry with additional context
	Sentry.captureException(error, {
		extra: context,
		tags: {
			location: 'client'
		}
	});
}
