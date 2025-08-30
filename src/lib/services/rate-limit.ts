import { getPool } from '$lib/db/pool';
import { sql } from 'drizzle-orm';
import type { Session } from '$lib/auth';

export enum SubscriptionTier {
	APPLICANT = 'applicant',
	CANDIDATE = 'candidate',
	EXECUTIVE = 'executive'
}

export interface RateLimitConfig {
	windowMs: number;
	maxRequests: number;
}

export interface TierLimits {
	[SubscriptionTier.APPLICANT]: RateLimitConfig;
	[SubscriptionTier.CANDIDATE]: RateLimitConfig;
	[SubscriptionTier.EXECUTIVE]: RateLimitConfig;
}

export const RATE_LIMITS: Record<string, TierLimits> = {
	'resume.optimize': {
		[SubscriptionTier.APPLICANT]: { windowMs: 2592000000, maxRequests: 0 }, // 0 per month (30 days)
		[SubscriptionTier.CANDIDATE]: { windowMs: 2592000000, maxRequests: 50 }, // 50 per month
		[SubscriptionTier.EXECUTIVE]: { windowMs: 2592000000, maxRequests: 999999 } // Unlimited
	},
	'ats.report': {
		[SubscriptionTier.APPLICANT]: { windowMs: 2592000000, maxRequests: 0 }, // 0 per month
		[SubscriptionTier.CANDIDATE]: { windowMs: 2592000000, maxRequests: 50 }, // 50 per month
		[SubscriptionTier.EXECUTIVE]: { windowMs: 2592000000, maxRequests: 999999 } // Unlimited
	},
	'job.applications': {
		[SubscriptionTier.APPLICANT]: { windowMs: 999999999999, maxRequests: 10 }, // 10 active
		[SubscriptionTier.CANDIDATE]: { windowMs: 999999999999, maxRequests: 999999 }, // Unlimited
		[SubscriptionTier.EXECUTIVE]: { windowMs: 999999999999, maxRequests: 999999 } // Unlimited
	},
	'job.extract': {
		[SubscriptionTier.APPLICANT]: { windowMs: 86400000, maxRequests: 5 }, // 5 per day
		[SubscriptionTier.CANDIDATE]: { windowMs: 86400000, maxRequests: 100 }, // 100 per day
		[SubscriptionTier.EXECUTIVE]: { windowMs: 86400000, maxRequests: 500 } // 500 per day
	},
	'cover-letter.generate': {
		[SubscriptionTier.APPLICANT]: { windowMs: 2592000000, maxRequests: 0 }, // Not available
		[SubscriptionTier.CANDIDATE]: { windowMs: 2592000000, maxRequests: 0 }, // Not available
		[SubscriptionTier.EXECUTIVE]: { windowMs: 2592000000, maxRequests: 999999 } // Unlimited
	},
	'export.pdf': {
		[SubscriptionTier.APPLICANT]: { windowMs: 86400000, maxRequests: 5 }, // 5 per day
		[SubscriptionTier.CANDIDATE]: { windowMs: 86400000, maxRequests: 50 }, // 50 per day
		[SubscriptionTier.EXECUTIVE]: { windowMs: 86400000, maxRequests: 200 } // 200 per day
	},
	'ai.analyze': {
		[SubscriptionTier.APPLICANT]: { windowMs: 3600000, maxRequests: 10 }, // 10 per hour
		[SubscriptionTier.CANDIDATE]: { windowMs: 3600000, maxRequests: 100 }, // 100 per hour
		[SubscriptionTier.EXECUTIVE]: { windowMs: 3600000, maxRequests: 500 } // 500 per hour
	},
	default: {
		[SubscriptionTier.APPLICANT]: { windowMs: 60000, maxRequests: 60 }, // 60 per minute
		[SubscriptionTier.CANDIDATE]: { windowMs: 60000, maxRequests: 300 }, // 300 per minute
		[SubscriptionTier.EXECUTIVE]: { windowMs: 60000, maxRequests: 1000 } // 1000 per minute
	}
};

export class RateLimitError extends Error {
	constructor(
		public readonly retryAfter: number,
		public readonly limit: number,
		public readonly remaining: number
	) {
		super(`Rate limit exceeded. Try again in ${Math.ceil(retryAfter / 1000)} seconds.`);
		this.name = 'RateLimitError';
	}
}

export async function getUserTier(session: Session | null): Promise<SubscriptionTier> {
	if (!session?.user?.id) {
		return SubscriptionTier.APPLICANT;
	}

	const pool = getPool();
	const result = await pool.query(
		`SELECT subscription_tier, subscription_expires_at 
			FROM "user" 
			WHERE id = $1`,
		[session.user.id]
	);

	if (result.rows.length === 0) {
		return SubscriptionTier.APPLICANT;
	}

	const user = result.rows[0] as {
		subscription_tier: string;
		subscription_expires_at: Date | null;
	};

	// Check if subscription has expired
	if (
		user.subscription_expires_at &&
		new Date(user.subscription_expires_at) < new Date() &&
		user.subscription_tier !== SubscriptionTier.APPLICANT
	) {
		// Update to free tier if subscription expired
		await pool.query(
			`UPDATE "user" 
				SET subscription_tier = $1, 
					subscription_expires_at = NULL 
				WHERE id = $2`,
			[SubscriptionTier.APPLICANT, session.user.id]
		);
		return SubscriptionTier.APPLICANT;
	}

	return (user.subscription_tier as SubscriptionTier) || SubscriptionTier.APPLICANT;
}

export async function checkRateLimit(
	session: Session | null,
	endpoint: string
): Promise<{
	allowed: boolean;
	limit: number;
	remaining: number;
	resetAt: Date;
	retryAfter?: number;
}> {
	const tier = await getUserTier(session);
	const limits = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];
	const config = limits[tier];

	if (!session?.user?.id) {
		// For anonymous users, use stricter limits
		const anonConfig = limits[SubscriptionTier.APPLICANT];
		return {
			allowed: false,
			limit: anonConfig.maxRequests,
			remaining: 0,
			resetAt: new Date(Date.now() + anonConfig.windowMs),
			retryAfter: anonConfig.windowMs
		};
	}

	const userId = session.user.id;
	const now = new Date();
	const windowStart = new Date(now.getTime() - config.windowMs);

	const pool = getPool();

	// Clean up old rate limit records
	await pool.query(
		`DELETE FROM rate_limits 
			WHERE window_start < $1`,
		[new Date(now.getTime() - config.windowMs * 2)]
	);

	// Check current usage
	const result = await pool.query(
		`SELECT COUNT(*) as count 
			FROM rate_limits 
			WHERE user_id = $1 
				AND endpoint = $2 
				AND window_start >= $3`,
		[userId, endpoint, windowStart]
	);

	const currentCount = Number(result.rows[0]?.count || 0);
	const remaining = Math.max(0, config.maxRequests - currentCount);
	const resetAt = new Date(now.getTime() + config.windowMs);

	if (currentCount >= config.maxRequests) {
		// Find the oldest request in the window to calculate retry time
		const oldestResult = await pool.query(
			`SELECT MIN(window_start) as oldest 
				FROM rate_limits 
				WHERE user_id = $1 
					AND endpoint = $2 
					AND window_start >= $3`,
			[userId, endpoint, windowStart]
		);

		const oldest = oldestResult.rows[0]?.oldest as Date;
		const retryAfter = oldest
			? config.windowMs - (now.getTime() - new Date(oldest).getTime())
			: config.windowMs;

		return {
			allowed: false,
			limit: config.maxRequests,
			remaining: 0,
			resetAt,
			retryAfter: Math.max(0, retryAfter)
		};
	}

	// Record the request
	try {
		await pool.query(
			`INSERT INTO rate_limits (user_id, endpoint, window_start, request_count) 
				VALUES ($1, $2, $3, 1)
				ON CONFLICT (user_id, endpoint, window_start) 
				DO UPDATE SET request_count = rate_limits.request_count + 1`,
			[userId, endpoint, now]
		);
	} catch (error) {
		console.error('Failed to record rate limit:', error);
	}

	return {
		allowed: true,
		limit: config.maxRequests,
		remaining: remaining - 1,
		resetAt
	};
}

export async function enforceRateLimit(session: Session | null, endpoint: string): Promise<void> {
	const result = await checkRateLimit(session, endpoint);

	if (!result.allowed) {
		throw new RateLimitError(result.retryAfter || 60000, result.limit, result.remaining);
	}
}

export async function getRateLimitHeaders(
	session: Session | null,
	endpoint: string
): Promise<Record<string, string>> {
	const result = await checkRateLimit(session, endpoint);

	return {
		'X-RateLimit-Limit': result.limit.toString(),
		'X-RateLimit-Remaining': result.remaining.toString(),
		'X-RateLimit-Reset': result.resetAt.toISOString(),
		...(result.retryAfter && {
			'Retry-After': Math.ceil(result.retryAfter / 1000).toString()
		})
	};
}
