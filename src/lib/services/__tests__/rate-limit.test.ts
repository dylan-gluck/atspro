import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getUserTier,
	checkRateLimit,
	enforceRateLimit,
	getRateLimitHeaders,
	SubscriptionTier,
	RateLimitError,
	RATE_LIMITS
} from '../rate-limit';
import { createMockSession, createMockPool } from './test-helpers';

// Mock the pool module
vi.mock('$lib/db/pool', () => ({
	getPool: vi.fn()
}));

describe('Rate Limiting Service', () => {
	let mockPool: ReturnType<typeof createMockPool>;

	beforeEach(async () => {
		mockPool = createMockPool();
		const poolModule = await import('$lib/db/pool');
		vi.mocked(poolModule).getPool.mockReturnValue(mockPool as any);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('getUserTier', () => {
		it('should return APPLICANT tier for anonymous users', async () => {
			const tier = await getUserTier(null);
			expect(tier).toBe(SubscriptionTier.APPLICANT);
		});

		it('should return user subscription tier from database', async () => {
			const session = createMockSession('user-123');
			mockPool.query.mockResolvedValueOnce({
				rows: [
					{
						subscription_tier: SubscriptionTier.CANDIDATE,
						subscription_expires_at: new Date(Date.now() + 86400000)
					}
				]
			});

			const tier = await getUserTier(session);
			expect(tier).toBe(SubscriptionTier.CANDIDATE);
		});

		it('should downgrade expired subscriptions to APPLICANT', async () => {
			const session = createMockSession('user-123');
			mockPool.query
				.mockResolvedValueOnce({
					rows: [
						{
							subscription_tier: SubscriptionTier.CANDIDATE,
							subscription_expires_at: new Date(Date.now() - 86400000) // Expired
						}
					]
				})
				.mockResolvedValueOnce({ rowCount: 1 }); // Update query

			const tier = await getUserTier(session);
			expect(tier).toBe(SubscriptionTier.APPLICANT);
			expect(mockPool.query).toHaveBeenCalledTimes(2);
		});

		it('should return APPLICANT for users not in database', async () => {
			const session = createMockSession('user-123');
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			const tier = await getUserTier(session);
			expect(tier).toBe(SubscriptionTier.APPLICANT);
		});
	});

	describe('checkRateLimit', () => {
		it('should deny access for anonymous users', async () => {
			const result = await checkRateLimit(null, 'resume.optimize');

			expect(result.allowed).toBe(false);
			expect(result.limit).toBe(
				RATE_LIMITS['resume.optimize'][SubscriptionTier.APPLICANT].maxRequests
			);
			expect(result.remaining).toBe(0);
		});

		it('should check requests against rate limit', async () => {
			const session = createMockSession('user-123');

			// Mock getUserTier - using CANDIDATE tier for actual limits
			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.CANDIDATE }] })
				.mockResolvedValueOnce({ rowCount: 1 }) // Delete old records
				.mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Current usage
				.mockResolvedValueOnce({ rowCount: 1 }); // Insert new record

			const result = await checkRateLimit(session, 'resume.optimize');

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(50); // CANDIDATE tier limit for resume.optimize
			expect(result.remaining).toBe(39); // 50 - 10 (current) - 1 (this request)
		});

		it('should deny requests exceeding rate limit', async () => {
			const session = createMockSession('user-123');

			// Mock getUserTier - APPLICANT has 0 limit for optimization
			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.APPLICANT }] })
				.mockResolvedValueOnce({ rowCount: 1 }) // Delete old records
				.mockResolvedValueOnce({ rows: [{ count: '0' }] }) // At limit (0 allowed)
				.mockResolvedValueOnce({ rows: [{ oldest: new Date() }] }); // Oldest request

			const result = await checkRateLimit(session, 'resume.optimize');

			expect(result.allowed).toBe(false);
			expect(result.limit).toBe(0);
			expect(result.remaining).toBe(0);
			expect(result.retryAfter).toBeDefined();
		});

		it('should use different limits for different tiers', async () => {
			const session = createMockSession('user-123');

			// Test EXECUTIVE tier
			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.EXECUTIVE }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '50' }] })
				.mockResolvedValueOnce({ rowCount: 1 });

			const result = await checkRateLimit(session, 'resume.optimize');

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(999999); // EXECUTIVE tier limit (unlimited)
			expect(result.remaining).toBe(999948); // 999999 - 50 - 1
		});

		it('should use default limits for unknown endpoints', async () => {
			const session = createMockSession('user-123');

			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.APPLICANT }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '0' }] })
				.mockResolvedValueOnce({ rowCount: 1 });

			const result = await checkRateLimit(session, 'unknown.endpoint');

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(60); // Default APPLICANT tier limit (per minute)
		});
	});

	describe('enforceRateLimit', () => {
		it('should throw RateLimitError when limit exceeded', async () => {
			const session = createMockSession('user-123');

			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.APPLICANT }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '0' }] })
				.mockResolvedValueOnce({ rows: [{ oldest: new Date() }] });

			await expect(enforceRateLimit(session, 'resume.optimize')).rejects.toThrow(RateLimitError);
		});

		it('should not throw when within limits', async () => {
			const session = createMockSession('user-123');

			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.CANDIDATE }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '0' }] })
				.mockResolvedValueOnce({ rowCount: 1 });

			await expect(enforceRateLimit(session, 'resume.optimize')).resolves.not.toThrow();
		});
	});

	describe('getRateLimitHeaders', () => {
		it('should return rate limit headers', async () => {
			const session = createMockSession('user-123');

			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.CANDIDATE }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '10' }] })
				.mockResolvedValueOnce({ rowCount: 1 });

			const headers = await getRateLimitHeaders(session, 'resume.optimize');

			expect(headers['X-RateLimit-Limit']).toBe('50');
			expect(headers['X-RateLimit-Remaining']).toBe('39');
			expect(headers['X-RateLimit-Reset']).toBeDefined();
			expect(headers['Retry-After']).toBeUndefined();
		});

		it('should include Retry-After header when limit exceeded', async () => {
			const session = createMockSession('user-123');

			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.APPLICANT }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '0' }] })
				.mockResolvedValueOnce({ rows: [{ oldest: new Date() }] });

			const headers = await getRateLimitHeaders(session, 'resume.optimize');

			expect(headers['X-RateLimit-Limit']).toBe('0');
			expect(headers['X-RateLimit-Remaining']).toBe('0');
			expect(headers['Retry-After']).toBeDefined();
		});
	});

	describe('Rate limit configurations', () => {
		it('should have proper tier hierarchy for all endpoints', () => {
			Object.entries(RATE_LIMITS).forEach(([endpoint, limits]) => {
				if (endpoint !== 'default') {
					const freeLimits = limits[SubscriptionTier.APPLICANT];
					const proLimits = limits[SubscriptionTier.CANDIDATE];
					const premiumLimits = limits[SubscriptionTier.EXECUTIVE];

					// Executive should have highest limits
					expect(premiumLimits.maxRequests).toBeGreaterThanOrEqual(proLimits.maxRequests);
					// Candidate should have higher limits than applicant
					expect(proLimits.maxRequests).toBeGreaterThanOrEqual(freeLimits.maxRequests);
				}
			});
		});

		it('should have reasonable time windows', () => {
			Object.entries(RATE_LIMITS).forEach(([endpoint, limits]) => {
				Object.values(limits).forEach((config) => {
					// Windows should be between 1 minute and very long (for active jobs)
					expect(config.windowMs).toBeGreaterThanOrEqual(60000); // 1 minute
					expect(config.windowMs).toBeLessThanOrEqual(999999999999); // Very long for active jobs
				});
			});
		});
	});
});
