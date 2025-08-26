import { error as svelteError } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';

/**
 * Custom error class with additional context
 */
export class AppError extends Error {
	constructor(
		message: string,
		public code?: string,
		public status: number = 500,
		public details?: unknown
	) {
		super(message);
		this.name = 'AppError';
	}
}

/**
 * Error codes for consistent error handling
 */
export const ErrorCode = {
	// Auth errors
	UNAUTHORIZED: 'UNAUTHORIZED',
	FORBIDDEN: 'FORBIDDEN',
	SESSION_EXPIRED: 'SESSION_EXPIRED',

	// Validation errors
	INVALID_INPUT: 'INVALID_INPUT',
	INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
	FILE_TOO_LARGE: 'FILE_TOO_LARGE',
	MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

	// Resource errors
	NOT_FOUND: 'NOT_FOUND',
	ALREADY_EXISTS: 'ALREADY_EXISTS',
	CONFLICT: 'CONFLICT',

	// Rate limiting
	RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
	QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

	// AI/Processing errors
	AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
	EXTRACTION_FAILED: 'EXTRACTION_FAILED',
	GENERATION_FAILED: 'GENERATION_FAILED',
	OPTIMIZATION_FAILED: 'OPTIMIZATION_FAILED',

	// Database errors
	DATABASE_ERROR: 'DATABASE_ERROR',
	TRANSACTION_FAILED: 'TRANSACTION_FAILED',
	CONNECTION_FAILED: 'CONNECTION_FAILED',

	// External service errors
	EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
	API_ERROR: 'API_ERROR',
	NETWORK_ERROR: 'NETWORK_ERROR',

	// Generic errors
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Throw a SvelteKit error with additional context
 */
export function throwError(
	status: number,
	message: string,
	code?: ErrorCode,
	details?: unknown
): never {
	// Log to Sentry with context
	Sentry.captureException(new AppError(message, code, status, details), {
		tags: {
			error_code: code,
			status_code: status
		},
		extra: {
			details
		}
	});

	// Throw SvelteKit error
	throw svelteError(status, {
		message,
		code,
		details: import.meta.env.DEV ? details : undefined
	});
}

/**
 * Handle errors consistently
 */
export function handleError(err: unknown): AppError {
	// Already an AppError
	if (err instanceof AppError) {
		return err;
	}

	// Standard Error
	if (err instanceof Error) {
		// Check for specific error types
		if (err.message.includes('rate limit')) {
			return new AppError(
				'Rate limit exceeded. Please wait before trying again.',
				ErrorCode.RATE_LIMIT_EXCEEDED,
				429,
				{ originalError: err.message }
			);
		}

		if (err.message.includes('unauthorized') || err.message.includes('auth')) {
			return new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401, {
				originalError: err.message
			});
		}

		if (err.message.includes('not found')) {
			return new AppError('Resource not found', ErrorCode.NOT_FOUND, 404, {
				originalError: err.message
			});
		}

		// Generic error
		return new AppError(
			err.message || 'An unexpected error occurred',
			ErrorCode.INTERNAL_ERROR,
			500,
			{ originalError: err }
		);
	}

	// Unknown error type
	return new AppError('An unknown error occurred', ErrorCode.UNKNOWN_ERROR, 500, {
		originalError: err
	});
}

/**
 * Safe error handler that won't throw
 */
export function safeHandleError(
	err: unknown,
	context?: string
): { success: false; error: AppError } {
	const appError = handleError(err);

	// Log to console in development
	if (import.meta.env.DEV) {
		console.error(`[${context || 'Error'}]:`, appError);
	}

	// Report to Sentry
	Sentry.captureException(appError, {
		tags: {
			context,
			error_code: appError.code
		}
	});

	return {
		success: false,
		error: appError
	};
}

/**
 * Wrap async functions with error handling
 */
export async function withErrorHandling<T>(
	fn: () => Promise<T>,
	context?: string
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
	try {
		const data = await fn();
		return { success: true, data };
	} catch (err) {
		return safeHandleError(err, context);
	}
}

/**
 * Retry logic for transient errors
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: {
		maxAttempts?: number;
		delay?: number;
		backoff?: boolean;
		onRetry?: (attempt: number, error: unknown) => void;
	} = {}
): Promise<T> {
	const { maxAttempts = 3, delay = 1000, backoff = true, onRetry } = options;

	let lastError: unknown;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err;

			if (attempt < maxAttempts) {
				const waitTime = backoff ? delay * attempt : delay;

				if (onRetry) {
					onRetry(attempt, err);
				}

				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}
		}
	}

	throw lastError;
}

/**
 * Validate input and throw error if invalid
 */
export function validateInput<T>(
	input: unknown,
	validator: (input: unknown) => input is T,
	errorMessage: string
): asserts input is T {
	if (!validator(input)) {
		throwError(400, errorMessage, ErrorCode.INVALID_INPUT);
	}
}

/**
 * Assert condition and throw error if false
 */
export function assert(
	condition: boolean,
	message: string,
	status: number = 500,
	code?: ErrorCode
): asserts condition {
	if (!condition) {
		throwError(status, message, code);
	}
}
