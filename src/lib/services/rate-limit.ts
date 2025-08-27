import { getPool } from '$lib/db/pool';
import { sql } from 'drizzle-orm';
import type { Session } from '$lib/auth';

export enum SubscriptionTier {
	FREE = 'free',
	PROFESSIONAL = 'professional',
	PREMIUM = 'premium'
}

export interface RateLimitConfig {
	windowMs: number;
	maxRequests: number;
}

export interface TierLimits {
	[SubscriptionTier.FREE]: RateLimitConfig;
	[SubscriptionTier.PROFESSIONAL]: RateLimitConfig;
	[SubscriptionTier.PREMIUM]: RateLimitConfig;
}

export const RATE_LIMITS: Record<string, TierLimits> = {
	'resume.optimize': {
		[SubscriptionTier.FREE]: { windowMs: 86400000, maxRequests: 3 }, // 3 per day
		[SubscriptionTier.PROFESSIONAL]: { windowMs: 86400000, maxRequests: 50 }, // 50 per day
		[SubscriptionTier.PREMIUM]: { windowMs: 86400000, maxRequests: 200 } // 200 per day
	},
	'job.extract': {
		[SubscriptionTier.FREE]: { windowMs: 86400000, maxRequests: 5 }, // 5 per day
		[SubscriptionTier.PROFESSIONAL]: { windowMs: 86400000, maxRequests: 100 }, // 100 per day
		[SubscriptionTier.PREMIUM]: { windowMs: 86400000, maxRequests: 500 } // 500 per day
	},
	'cover-letter.generate': {
		[SubscriptionTier.FREE]: { windowMs: 86400000, maxRequests: 1 }, // 1 per day
		[SubscriptionTier.PROFESSIONAL]: { windowMs: 86400000, maxRequests: 20 }, // 20 per day
		[SubscriptionTier.PREMIUM]: { windowMs: 86400000, maxRequests: 100 } // 100 per day
	},
	'export.pdf': {
		[SubscriptionTier.FREE]: { windowMs: 86400000, maxRequests: 5 }, // 5 per day
		[SubscriptionTier.PROFESSIONAL]: { windowMs: 86400000, maxRequests: 50 }, // 50 per day
		[SubscriptionTier.PREMIUM]: { windowMs: 86400000, maxRequests: 200 } // 200 per day
	},
	'ai.analyze': {
		[SubscriptionTier.FREE]: { windowMs: 3600000, maxRequests: 10 }, // 10 per hour
		[SubscriptionTier.PROFESSIONAL]: { windowMs: 3600000, maxRequests: 100 }, // 100 per hour
		[SubscriptionTier.PREMIUM]: { windowMs: 3600000, maxRequests: 500 } // 500 per hour
	},
	default: {
		[SubscriptionTier.FREE]: { windowMs: 60000, maxRequests: 60 }, // 60 per minute
		[SubscriptionTier.PROFESSIONAL]: { windowMs: 60000, maxRequests: 300 }, // 300 per minute
		[SubscriptionTier.PREMIUM]: { windowMs: 60000, maxRequests: 1000 } // 1000 per minute
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
		return SubscriptionTier.FREE;
	}

	const pool = getPool();
	const result = await pool.query(
		`SELECT subscription_tier, subscription_expires_at 
			FROM "user" 
			WHERE id = $1`,
		[session.user.id]
	);

	if (result.rows.length === 0) {
		return SubscriptionTier.FREE;
	}

	const user = result.rows[0] as {
		subscription_tier: string;
		subscription_expires_at: Date | null;
	};

	// Check if subscription has expired
	if (
		user.subscription_expires_at &&
		new Date(user.subscription_expires_at) < new Date() &&
		user.subscription_tier !== SubscriptionTier.FREE
	) {
		// Update to free tier if subscription expired
		await pool.query(
			`UPDATE "user" 
				SET subscription_tier = $1, 
					subscription_expires_at = NULL 
				WHERE id = $2`,
			[SubscriptionTier.FREE, session.user.id]
		);
		return SubscriptionTier.FREE;
	}

	return (user.subscription_tier as SubscriptionTier) || SubscriptionTier.FREE;
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
		const anonConfig = limits[SubscriptionTier.FREE];
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
