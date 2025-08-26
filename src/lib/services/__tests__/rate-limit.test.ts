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
		it('should return FREE tier for anonymous users', async () => {
			const tier = await getUserTier(null);
			expect(tier).toBe(SubscriptionTier.FREE);
		});

		it('should return user subscription tier from database', async () => {
			const session = createMockSession('user-123');
			mockPool.query.mockResolvedValueOnce({
				rows: [
					{
						subscription_tier: SubscriptionTier.PROFESSIONAL,
						subscription_expires_at: new Date(Date.now() + 86400000)
					}
				]
			});

			const tier = await getUserTier(session);
			expect(tier).toBe(SubscriptionTier.PROFESSIONAL);
		});

		it('should downgrade expired subscriptions to FREE', async () => {
			const session = createMockSession('user-123');
			mockPool.query
				.mockResolvedValueOnce({
					rows: [
						{
							subscription_tier: SubscriptionTier.PROFESSIONAL,
							subscription_expires_at: new Date(Date.now() - 86400000) // Expired
						}
					]
				})
				.mockResolvedValueOnce({ rowCount: 1 }); // Update query

			const tier = await getUserTier(session);
			expect(tier).toBe(SubscriptionTier.FREE);
			expect(mockPool.query).toHaveBeenCalledTimes(2);
		});

		it('should return FREE for users not in database', async () => {
			const session = createMockSession('user-123');
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			const tier = await getUserTier(session);
			expect(tier).toBe(SubscriptionTier.FREE);
		});
	});

	describe('checkRateLimit', () => {
		it('should deny access for anonymous users', async () => {
			const result = await checkRateLimit(null, 'resume.optimize');

			expect(result.allowed).toBe(false);
			expect(result.limit).toBe(RATE_LIMITS['resume.optimize'][SubscriptionTier.FREE].maxRequests);
			expect(result.remaining).toBe(0);
		});

		it('should allow requests within rate limit', async () => {
			const session = createMockSession('user-123');

			// Mock getUserTier
			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.FREE }] })
				.mockResolvedValueOnce({ rowCount: 1 }) // Delete old records
				.mockResolvedValueOnce({ rows: [{ count: '1' }] }) // Current usage
				.mockResolvedValueOnce({ rowCount: 1 }); // Insert new record

			const result = await checkRateLimit(session, 'resume.optimize');

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(3); // FREE tier limit for resume.optimize
			expect(result.remaining).toBe(1); // 3 - 1 (current) - 1 (this request)
		});

		it('should deny requests exceeding rate limit', async () => {
			const session = createMockSession('user-123');

			// Mock getUserTier
			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.FREE }] })
				.mockResolvedValueOnce({ rowCount: 1 }) // Delete old records
				.mockResolvedValueOnce({ rows: [{ count: '3' }] }) // At limit
				.mockResolvedValueOnce({ rows: [{ oldest: new Date() }] }); // Oldest request

			const result = await checkRateLimit(session, 'resume.optimize');

			expect(result.allowed).toBe(false);
			expect(result.limit).toBe(3);
			expect(result.remaining).toBe(0);
			expect(result.retryAfter).toBeDefined();
		});

		it('should use different limits for different tiers', async () => {
			const session = createMockSession('user-123');

			// Test PREMIUM tier
			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.PREMIUM }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '50' }] })
				.mockResolvedValueOnce({ rowCount: 1 });

			const result = await checkRateLimit(session, 'resume.optimize');

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(200); // PREMIUM tier limit
			expect(result.remaining).toBe(149); // 200 - 50 - 1
		});

		it('should use default limits for unknown endpoints', async () => {
			const session = createMockSession('user-123');

			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.FREE }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '0' }] })
				.mockResolvedValueOnce({ rowCount: 1 });

			const result = await checkRateLimit(session, 'unknown.endpoint');

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(60); // Default FREE tier limit (per minute)
		});
	});

	describe('enforceRateLimit', () => {
		it('should throw RateLimitError when limit exceeded', async () => {
			const session = createMockSession('user-123');

			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.FREE }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '3' }] })
				.mockResolvedValueOnce({ rows: [{ oldest: new Date() }] });

			await expect(enforceRateLimit(session, 'resume.optimize')).rejects.toThrow(RateLimitError);
		});

		it('should not throw when within limits', async () => {
			const session = createMockSession('user-123');

			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.FREE }] })
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
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.FREE }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '1' }] })
				.mockResolvedValueOnce({ rowCount: 1 });

			const headers = await getRateLimitHeaders(session, 'resume.optimize');

			expect(headers['X-RateLimit-Limit']).toBe('3');
			expect(headers['X-RateLimit-Remaining']).toBe('1');
			expect(headers['X-RateLimit-Reset']).toBeDefined();
			expect(headers['Retry-After']).toBeUndefined();
		});

		it('should include Retry-After header when limit exceeded', async () => {
			const session = createMockSession('user-123');

			mockPool.query
				.mockResolvedValueOnce({ rows: [{ subscription_tier: SubscriptionTier.FREE }] })
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rows: [{ count: '3' }] })
				.mockResolvedValueOnce({ rows: [{ oldest: new Date() }] });

			const headers = await getRateLimitHeaders(session, 'resume.optimize');

			expect(headers['X-RateLimit-Limit']).toBe('3');
			expect(headers['X-RateLimit-Remaining']).toBe('0');
			expect(headers['Retry-After']).toBeDefined();
		});
	});

	describe('Rate limit configurations', () => {
		it('should have proper tier hierarchy for all endpoints', () => {
			Object.entries(RATE_LIMITS).forEach(([endpoint, limits]) => {
				if (endpoint !== 'default') {
					const freeLimits = limits[SubscriptionTier.FREE];
					const proLimits = limits[SubscriptionTier.PROFESSIONAL];
					const premiumLimits = limits[SubscriptionTier.PREMIUM];

					// Premium should have highest limits
					expect(premiumLimits.maxRequests).toBeGreaterThanOrEqual(proLimits.maxRequests);
					// Professional should have higher limits than free
					expect(proLimits.maxRequests).toBeGreaterThanOrEqual(freeLimits.maxRequests);
				}
			});
		});

		it('should have reasonable time windows', () => {
			Object.entries(RATE_LIMITS).forEach(([endpoint, limits]) => {
				Object.values(limits).forEach((config) => {
					// Windows should be between 1 minute and 1 day
					expect(config.windowMs).toBeGreaterThanOrEqual(60000); // 1 minute
					expect(config.windowMs).toBeLessThanOrEqual(86400000); // 1 day
				});
			});
		});
	});
});
