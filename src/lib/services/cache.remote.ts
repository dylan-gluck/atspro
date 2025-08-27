import { query, command } from '$app/server';
import { getCacheStats, clearAllCaches } from '$lib/ai/cache';
import { requireAuth } from './utils';

// Get cache statistics
export const getCacheStatistics = query(async () => {
	console.log('[getCacheStatistics] Getting cache statistics');

	// Check authentication
	requireAuth();

	const stats = getCacheStats();

	// Calculate total cost savings
	const totalHits =
		stats.resume.metrics.hits +
		stats.job.metrics.hits +
		stats.optimization.metrics.hits +
		stats.coverLetter.metrics.hits;

	const totalRequests =
		stats.resume.metrics.totalRequests +
		stats.job.metrics.totalRequests +
		stats.optimization.metrics.totalRequests +
		stats.coverLetter.metrics.totalRequests;

	// Estimate cost savings (rough estimates per cached request)
	const costSavings = {
		resume: stats.resume.metrics.hits * 0.05, // ~$0.05 per resume extraction
		job: stats.job.metrics.hits * 0.03, // ~$0.03 per job extraction
		optimization: stats.optimization.metrics.hits * 0.15, // ~$0.15 per optimization
		coverLetter: stats.coverLetter.metrics.hits * 0.1, // ~$0.10 per cover letter
		total: 0
	};

	costSavings.total =
		costSavings.resume + costSavings.job + costSavings.optimization + costSavings.coverLetter;

	return {
		stats,
		summary: {
			totalHits,
			totalRequests,
			overallHitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
			estimatedCostSavings: costSavings,
			totalCacheSize:
				stats.resume.size + stats.job.size + stats.optimization.size + stats.coverLetter.size
		}
	};
});

// Clear all caches
export const clearCaches = command(async () => {
	console.log('[clearCaches] Clearing all AI caches');

	// Check authentication
	requireAuth();

	clearAllCaches();

	return {
		success: true,
		message: 'All caches cleared successfully'
	};
});
