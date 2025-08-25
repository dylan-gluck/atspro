import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/db';
import { requireAuth, ErrorCodes } from './utils';
import type { JobActivity } from '$lib/types/user-job';

// Get job activity timeline
const activitySchema = v.object({
	jobId: v.pipe(v.string(), v.uuid()),
	limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100))),
	offset: v.optional(v.pipe(v.number(), v.minValue(0)))
});

export const getJobActivity = query(activitySchema, async ({ jobId, limit = 50, offset = 0 }) => {
	const userId = requireAuth();
	
	// Verify job ownership
	const job = await db.getJob(jobId);
	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}
	
	const result = await db.activity.list(jobId, limit, offset);
	
	return {
		activities: result.items,
		jobTitle: `${job.title} at ${job.company}`,
		pagination: {
			total: result.total,
			limit,
			offset,
			hasMore: offset + limit < result.total
		}
	};
});

// Get activity summary for a job
export const getActivitySummary = query(v.pipe(v.string(), v.uuid()), async (jobId) => {
	const userId = requireAuth();
	
	// Verify job ownership
	const job = await db.getJob(jobId);
	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}
	
	// Get recent activities and count by type
	const activities = await db.getJobActivities(jobId, { limit: 100 });
	
	// Count activities by type
	const activityCounts: Record<string, number> = {};
	activities.forEach((activity: JobActivity) => {
		activityCounts[activity.type] = (activityCounts[activity.type] || 0) + 1;
	});
	
	// Calculate timeline metrics
	const firstActivity = activities[activities.length - 1];
	const lastActivity = activities[0];
	
	const daysSinceCreated = firstActivity 
		? Math.floor((Date.now() - new Date(firstActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
		: 0;
	
	const daysSinceLastActivity = lastActivity
		? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
		: null;
	
	return {
		jobId,
		totalActivities: activities.length,
		activityCounts,
		daysSinceCreated,
		daysSinceLastActivity,
		recentActivities: activities.slice(0, 5),
		timeline: {
			created: firstActivity?.createdAt || job.createdAt,
			lastActivity: lastActivity?.createdAt || null,
			applied: job.appliedAt || null
		}
	};
});

// Get all activities across all jobs for dashboard
const dashboardActivitySchema = v.object({
	limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50))),
	types: v.optional(v.array(v.string()))
});

export const getDashboardActivity = query(dashboardActivitySchema, async ({ limit = 20, types }) => {
	const userId = requireAuth();
	
	// Get all user's jobs
	const { jobs } = await db.jobs.list(userId, { limit: 100 });
	
	if (jobs.length === 0) {
		return {
			activities: [],
			totalJobs: 0
		};
	}
	
	// Collect activities from all jobs
	const allActivities: Array<JobActivity & { jobTitle: string; jobCompany: string }> = [];
	
	for (const job of jobs) {
		const { items } = await db.activity.list(job.id, 10, 0);
		
		// Add job context to each activity
		items.forEach((activity: JobActivity) => {
			allActivities.push({
				...activity,
				jobTitle: job.title,
				jobCompany: job.company
			});
		});
	}
	
	// Sort by date (newest first)
	allActivities.sort((a, b) => 
		new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
	
	// Filter by types if specified
	let filteredActivities = allActivities;
	if (types && types.length > 0) {
		filteredActivities = allActivities.filter(a => types.includes(a.type));
	}
	
	// Limit results
	const limitedActivities = filteredActivities.slice(0, limit);
	
	return {
		activities: limitedActivities,
		totalJobs: jobs.length,
		hasMore: filteredActivities.length > limit
	};
});