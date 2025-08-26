/**
 * Sentry Configuration
 * Shared configuration for both client and server-side Sentry initialization
 */

import type { BrowserOptions, NodeOptions } from '@sentry/sveltekit';

// Get environment from Vite or process
const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';
const isProd = import.meta.env?.PROD ?? process.env.NODE_ENV === 'production';

// Base Sentry configuration shared between client and server
export const sentryConfig = {
	dsn: import.meta.env?.VITE_PUBLIC_SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN,
	environment: isProd ? 'production' : 'development',

	// Enable when DSN is provided and either in production or debug mode
	enabled: !!(import.meta.env?.VITE_PUBLIC_SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN),

	// Enable debug mode in development when VITE_SENTRY_DEBUG is true
	debug: import.meta.env?.VITE_SENTRY_DEBUG === 'true',

	// Sample rate for performance monitoring (0.0 to 1.0)
	tracesSampleRate: isProd ? 0.1 : 1.0,

	// Sample rate for session replay (0.0 to 1.0)
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,

	// Filter errors before sending
	beforeSend(event: any, hint: any) {
		// Log in debug mode
		if (import.meta.env?.VITE_SENTRY_DEBUG === 'true') {
			console.log('[Sentry] Sending event:', event);
		}

		// Filter out some common non-critical errors
		if (hint.originalException?.message) {
			const message = hint.originalException.message;

			// Filter out network errors that are likely user connection issues
			if (
				message.includes('Failed to fetch') ||
				message.includes('NetworkError') ||
				message.includes('Load failed')
			) {
				return null;
			}

			// Filter out extension-related errors
			if (message.includes('extension://')) {
				return null;
			}
		}

		return event;
	},

	// Ignore certain errors
	ignoreErrors: [
		// Browser extensions
		'top.GLOBALS',
		'ResizeObserver loop limit exceeded',
		'ResizeObserver loop completed with undelivered notifications',
		// Network errors
		'Non-Error promise rejection captured',
		// Common false positives
		'Cannot read properties of null',
		'Cannot read properties of undefined'
	]

	// Integration configurations will be added by client/server specific configs
} as Partial<BrowserOptions & NodeOptions>;

/**
 * Get user context for Sentry
 * This should be called after authentication to associate errors with users
 */
export function getSentryUserContext(user: any) {
	if (!user) return null;

	return {
		id: user.id,
		email: user.email,
		username: user.name || user.email?.split('@')[0]
	};
}
