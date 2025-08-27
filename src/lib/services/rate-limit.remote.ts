import { getUserTier, checkRateLimit, RATE_LIMITS, SubscriptionTier } from './rate-limit';
import { auth } from '$lib/auth';
import { getRequestEvent } from '$app/server';

export async function getRateLimitStatus() {
	const event = getRequestEvent();
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	const tier = await getUserTier(session);
	const endpoints = Object.keys(RATE_LIMITS).filter((k) => k !== 'default');

	const status = await Promise.all(
		endpoints.map(async (endpoint) => {
			const result = await checkRateLimit(session, endpoint);
			const config = RATE_LIMITS[endpoint][tier];

			return {
				endpoint,
				limit: config.maxRequests,
				windowMs: config.windowMs,
				remaining: result.remaining,
				resetAt: result.resetAt,
				allowed: result.allowed
			};
		})
	);

	return {
		tier,
		limits: status,
		upgradeAvailable: tier !== SubscriptionTier.PREMIUM
	};
}

export async function getSubscriptionInfo() {
	const event = getRequestEvent();
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (!session?.user?.id) {
		return {
			tier: SubscriptionTier.FREE,
			expiresAt: null,
			features: getFeaturesForTier(SubscriptionTier.FREE)
		};
	}

	const tier = await getUserTier(session);

	return {
		tier,
		expiresAt: null, // TODO: Get from database
		features: getFeaturesForTier(tier)
	};
}

function getFeaturesForTier(tier: SubscriptionTier) {
	switch (tier) {
		case SubscriptionTier.FREE:
			return {
				resumeOptimizations: 3,
				jobExtractions: 5,
				coverLetters: 1,
				pdfExports: 5,
				atsScoring: true,
				keywordAnalysis: true,
				basicSupport: true,
				advancedAnalytics: false,
				prioritySupport: false,
				apiAccess: false
			};
		case SubscriptionTier.PROFESSIONAL:
			return {
				resumeOptimizations: 50,
				jobExtractions: 100,
				coverLetters: 20,
				pdfExports: 50,
				atsScoring: true,
				keywordAnalysis: true,
				basicSupport: true,
				advancedAnalytics: true,
				prioritySupport: false,
				apiAccess: false
			};
		case SubscriptionTier.PREMIUM:
			return {
				resumeOptimizations: 200,
				jobExtractions: 500,
				coverLetters: 100,
				pdfExports: 200,
				atsScoring: true,
				keywordAnalysis: true,
				basicSupport: true,
				advancedAnalytics: true,
				prioritySupport: true,
				apiAccess: true
			};
	}
}
