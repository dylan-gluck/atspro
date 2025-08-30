import { query, command } from '$app/server';
import { getPool } from '$lib/db/pool';
import { requireAuth } from './utils';
import * as v from 'valibot';

// Helper functions to get limits based on tier
function getOptimizationLimit(tier: string | null): number {
	switch (tier) {
		case 'applicant':
			return 0;
		case 'candidate':
			return 50;
		case 'executive':
			return 999999; // Effectively unlimited
		default:
			return 0;
	}
}

function getAtsReportLimit(tier: string | null): number {
	switch (tier) {
		case 'applicant':
			return 0;
		case 'candidate':
			return 50;
		case 'executive':
			return 999999; // Effectively unlimited
		default:
			return 0;
	}
}

function getJobLimit(tier: string | null): number {
	switch (tier) {
		case 'applicant':
			return 10;
		case 'candidate':
			return 999999; // Effectively unlimited
		case 'executive':
			return 999999; // Effectively unlimited
		default:
			return 10;
	}
}

// Get subscription info with usage
export const getSubscriptionInfo = query(async () => {
	const userId = requireAuth();
	const pool = getPool();

	const result = await pool.query(
		`SELECT 
			subscription_tier,
			subscription_expires_at,
			monthly_optimizations_used,
			monthly_ats_reports_used,
			active_job_applications,
			monthly_credits_reset_at
		FROM "user"
		WHERE id = $1`,
		[userId]
	);

	if (result.rows.length === 0) {
		// Default values for new users
		return {
			tier: 'applicant',
			expiresAt: null,
			usage: {
				optimizations: {
					used: 0,
					limit: 0
				},
				atsReports: {
					used: 0,
					limit: 0
				},
				activeJobs: {
					used: 0,
					limit: 10
				}
			},
			resetAt: null
		};
	}

	const user = result.rows[0];
	const tier = user.subscription_tier || 'applicant';

	return {
		tier,
		expiresAt: user.subscription_expires_at,
		usage: {
			optimizations: {
				used: user.monthly_optimizations_used || 0,
				limit: getOptimizationLimit(tier)
			},
			atsReports: {
				used: user.monthly_ats_reports_used || 0,
				limit: getAtsReportLimit(tier)
			},
			activeJobs: {
				used: user.active_job_applications || 0,
				limit: getJobLimit(tier)
			}
		},
		resetAt: user.monthly_credits_reset_at
	};
});

// Debug controls for testing
const updateSubscriptionSchema = v.object({
	tier: v.optional(v.picklist(['applicant', 'candidate', 'executive'])),
	resetUsage: v.optional(v.boolean()),
	maxOutUsage: v.optional(v.boolean())
});

export const updateSubscriptionDebug = command(updateSubscriptionSchema, async (params) => {
	const userId = requireAuth();
	const pool = getPool();

	// Update tier if specified
	if (params.tier) {
		await pool.query(
			`UPDATE "user" 
			SET subscription_tier = $1
			WHERE id = $2`,
			[params.tier, userId]
		);
	}

	// Reset usage if specified
	if (params.resetUsage) {
		await pool.query(
			`UPDATE "user" 
			SET monthly_optimizations_used = 0,
				monthly_ats_reports_used = 0,
				monthly_credits_reset_at = CURRENT_TIMESTAMP
			WHERE id = $1`,
			[userId]
		);
	}

	// Max out usage if specified
	if (params.maxOutUsage) {
		const tier = params.tier || 'applicant';
		const optimizationLimit = getOptimizationLimit(tier);
		const atsReportLimit = getAtsReportLimit(tier);

		await pool.query(
			`UPDATE "user" 
			SET monthly_optimizations_used = $1,
				monthly_ats_reports_used = $2
			WHERE id = $3`,
			[optimizationLimit, atsReportLimit, userId]
		);
	}

	// Refresh the query
	await getSubscriptionInfo().refresh();

	return { success: true };
});

// Track feature usage
const trackUsageSchema = v.object({
	feature: v.string()
});

export const trackUsage = command(trackUsageSchema, async ({ feature }) => {
	const userId = requireAuth();
	const pool = getPool();

	// Record in usage history
	await pool.query(
		`INSERT INTO subscription_usage (user_id, feature, used_at, metadata)
		VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
		[userId, feature, { timestamp: new Date().toISOString() }]
	);

	// Update counters based on feature
	if (feature === 'optimization') {
		await pool.query(
			`UPDATE "user" 
			SET monthly_optimizations_used = COALESCE(monthly_optimizations_used, 0) + 1
			WHERE id = $1`,
			[userId]
		);
	} else if (feature === 'ats_report') {
		await pool.query(
			`UPDATE "user" 
			SET monthly_ats_reports_used = COALESCE(monthly_ats_reports_used, 0) + 1
			WHERE id = $1`,
			[userId]
		);
	}

	// Refresh the query
	await getSubscriptionInfo().refresh();

	return { success: true };
});

// Get current job count for enforcement
export const getActiveJobCount = query(async () => {
	const userId = requireAuth();
	const pool = getPool();

	const result = await pool.query(
		`SELECT COUNT(*) as count
		FROM "userJobs"
		WHERE "userId" = $1 AND status NOT IN ('rejected', 'withdrawn')`,
		[userId]
	);

	const count = Number(result.rows[0]?.count || 0);

	// Also update the active_job_applications count in user table
	await pool.query(
		`UPDATE "user" 
		SET active_job_applications = $1
		WHERE id = $2`,
		[count, userId]
	);

	return count;
});

// Update active job count (to be called when jobs are added/removed)
export const updateActiveJobCount = command(v.object({}), async () => {
	const userId = requireAuth();
	const pool = getPool();

	const result = await pool.query(
		`SELECT COUNT(*) as count
		FROM "userJobs"
		WHERE "userId" = $1 AND status NOT IN ('rejected', 'withdrawn')`,
		[userId]
	);

	const count = Number(result.rows[0]?.count || 0);

	await pool.query(
		`UPDATE "user" 
		SET active_job_applications = $1
		WHERE id = $2`,
		[count, userId]
	);

	// Refresh the subscription info
	await getSubscriptionInfo().refresh();

	return { count };
});
