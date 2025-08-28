import { getRequestEvent } from '$app/server';
import { auth } from '$lib/auth';
import {
	enforceRateLimit,
	getRateLimitHeaders,
	checkRateLimit as checkRateLimitNew
} from './rate-limit';
import { throwError, ErrorCode } from '$lib/utils/error-handling';
import { getSubscriptionInfo, trackUsage } from './subscription.remote';
import { error } from '@sveltejs/kit';

// Legacy rate limiter for backward compatibility
const rateLimiter = new Map<string, number[]>();

// Use the new rate limiting system
export async function checkRateLimitV2(endpoint: string, customMessage?: string): Promise<void> {
	const event = getRequestEvent();
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	// Check subscription-based limits for specific features
	if (endpoint === 'resume.optimize' || endpoint === 'ats.report') {
		const subscription = await getSubscriptionInfo();
		const feature = endpoint === 'resume.optimize' ? 'optimizations' : 'atsReports';

		if (subscription.usage[feature].used >= subscription.usage[feature].limit) {
			throw error(
				429,
				customMessage || `Monthly ${feature} limit reached. Please upgrade to continue.`
			);
		}

		// Track usage
		await trackUsage({ feature: endpoint.replace('.', '_') });
		return; // Skip standard rate limiting for subscription-tracked features
	}

	// Standard rate limiting for other endpoints
	const result = await checkRateLimitNew(session, endpoint);
	if (!result.allowed) {
		throw error(429, customMessage || 'Rate limit exceeded');
	}
}

// Legacy function for backward compatibility
export function checkRateLimit(
	userId: string,
	limit: number,
	window: number,
	action: string = 'default'
) {
	const now = Date.now();
	const key = `${userId}:${action}:${limit}:${window}`;
	const timestamps = rateLimiter.get(key) || [];

	// Filter out old timestamps outside the window
	const recent = timestamps.filter((t) => t > now - window);

	if (recent.length >= limit) {
		throwError(
			429,
			'Too many requests. Please wait before trying again.',
			ErrorCode.RATE_LIMIT_EXCEEDED
		);
	}

	recent.push(now);
	rateLimiter.set(key, recent);
}

// Authentication helper
export function requireAuth() {
	const { locals } = getRequestEvent();
	const userId = locals.user?.id;

	if (!userId) {
		throwError(401, 'Unauthorized', ErrorCode.UNAUTHORIZED);
	}

	return userId;
}

// Legacy error codes - use ErrorCode from error-handling instead
export const ErrorCodes = {
	// Auth errors
	UNAUTHORIZED: 'UNAUTHORIZED',
	FORBIDDEN: 'FORBIDDEN',

	// Validation errors
	INVALID_INPUT: 'INVALID_INPUT',
	INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
	FILE_TOO_LARGE: 'FILE_TOO_LARGE',

	// Resource errors
	NOT_FOUND: 'NOT_FOUND',
	ALREADY_EXISTS: 'ALREADY_EXISTS',

	// Rate limiting
	RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

	// AI/Processing errors
	AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
	EXTRACTION_FAILED: 'EXTRACTION_FAILED',
	GENERATION_FAILED: 'GENERATION_FAILED',

	// Database errors
	DATABASE_ERROR: 'DATABASE_ERROR',

	// Generic errors
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

// File validation helper
export function validateFile(
	file: File,
	allowedTypes: string[],
	maxSize: number = 10 * 1024 * 1024 // 10MB default
) {
	if (!file) {
		throwError(400, 'No file provided', ErrorCode.INVALID_INPUT);
	}

	if (!allowedTypes.includes(file.type)) {
		throwError(
			400,
			`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
			ErrorCode.INVALID_FILE_TYPE
		);
	}

	if (file.size > maxSize) {
		throwError(
			400,
			`File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
			ErrorCode.FILE_TOO_LARGE
		);
	}
}

// Logging helper
export function logActivity(action: string, userId: string, metadata?: Record<string, unknown>) {
	// In production, this would send to a logging service
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			action,
			userId,
			metadata
		})
	);
}

// Performance monitoring helper
export function measurePerformance<T>(operation: string, fn: () => T | Promise<T>): T | Promise<T> {
	const start = performance.now();

	try {
		const result = fn();

		if (result instanceof Promise) {
			return result.finally(() => {
				const duration = performance.now() - start;
				logActivity('performance', operation, { duration });
			});
		}

		const duration = performance.now() - start;
		logActivity('performance', operation, { duration });
		return result;
	} catch (error) {
		const duration = performance.now() - start;
		logActivity('performance_error', operation, { duration, error: String(error) });
		throw error;
	}
}

// Clean and format markdown content
export function formatMarkdown(content: string): string {
	return content
		.trim()
		.replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double
		.replace(/^\s+/gm, '') // Remove leading whitespace from lines
		.replace(/\s+$/gm, ''); // Remove trailing whitespace from lines
}
