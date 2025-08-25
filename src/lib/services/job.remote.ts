import { query, form, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/db';
import { extractJob as extractJobWithAI, fetchJobContent } from '$lib/ai';
import { requireAuth, checkRateLimit, ErrorCodes } from './utils';
import type { JobStatus } from '$lib/types/user-job';

// List user's jobs with filtering
const listJobsSchema = v.object({
	status: v.optional(v.picklist(['tracked', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'])),
	limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100))),
	offset: v.optional(v.pipe(v.number(), v.minValue(0)))
});

export const getJobs = query(listJobsSchema, async (params = {}) => {
	const userId = requireAuth();
	
	const { 
		status, 
		limit = 20, 
		offset = 0
	} = params;
	
	const result = await db.jobs.list(userId, { status, limit, offset });
	
	return {
		jobs: result.jobs,
		pagination: {
			total: result.total,
			limit,
			offset,
			hasMore: offset + limit < result.total
		}
	};
});

// Get single job details
export const getJob = query(v.pipe(v.string(), v.uuid()), async (jobId) => {
	const userId = requireAuth();
	
	const job = await db.getJob(jobId);
	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}
	
	const documents = await db.getJobDocuments(jobId);
	const activities = await db.getJobActivities(jobId, { limit: 10 });
	
	return { 
		job, 
		documents,
		recentActivity: activities
	};
});

// Extract job from URL or text
export const extractJob = form(async (data) => {
	const userId = requireAuth();
	
	// Rate limit: 20 job extractions per hour
	checkRateLimit(userId, 20, 3600000, 'extract_job');
	
	const jobUrl = data.get('jobUrl') as string;
	const jobDescription = data.get('jobDescription') as string;
	
	if (!jobUrl && !jobDescription) {
		error(400, 'Please provide either a job URL or job description');
	}
	
	let content: string;
	if (jobUrl) {
		// Validate URL
		try {
			new URL(jobUrl);
		} catch {
			error(400, 'Invalid URL format');
		}
		
		// Fetch and extract from URL
		content = await fetchJobContent(jobUrl);
	} else {
		content = jobDescription;
	}
	
	// Extract with AI
	const extracted = await extractJobWithAI(content);
	
	// Add the URL if provided
	if (jobUrl) {
		extracted.link = jobUrl;
	}
	
	// Store in database
	const job = await db.createUserJob(userId, extracted);
	
	// Create initial activity
	await db.createActivity(job.id, 'job_added', {
		source: jobUrl ? 'url' : 'manual'
	});
	
	// Single-flight mutation: refresh jobs list
	await getJobs({}).refresh();
	
	return {
		jobId: job.id,
		extractedData: extracted
	};
});

// Update job status
const updateStatusSchema = v.object({
	jobId: v.pipe(v.string(), v.uuid()),
	status: v.picklist(['tracked', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn']),
	appliedAt: v.optional(v.pipe(v.string(), v.isoDate()))
});

export const updateJobStatus = command(updateStatusSchema, async ({ jobId, status, appliedAt }) => {
	const userId = requireAuth();
	
	const job = await db.getJob(jobId);
	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}
	
	// Update status
	await db.updateJobStatus(jobId, status as JobStatus, appliedAt);
	
	// Create activity record
	await db.createActivity(jobId, 'status_change', {
		previousStatus: job.status,
		newStatus: status
	});
	
	// If applied, create additional activity
	if (status === 'applied' && appliedAt) {
		await db.createActivity(jobId, 'applied', {
			appliedAt
		});
	}
	
	// Refresh affected queries
	await Promise.all([
		getJob(jobId).refresh(),
		getJobs({}).refresh()
	]);
	
	return {
		jobId,
		status,
		appliedAt
	};
});

// Update job notes
const updateNotesSchema = v.object({
	jobId: v.pipe(v.string(), v.uuid()),
	notes: v.string()
});

export const updateJobNotes = command(updateNotesSchema, async ({ jobId, notes }) => {
	const userId = requireAuth();
	
	// Rate limit: 60 note updates per hour
	checkRateLimit(userId, 60, 3600000, 'update_notes');
	
	const job = await db.getJob(jobId);
	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}
	
	// Update notes
	await db.updateJobNotes(jobId, notes);
	
	// Create activity if notes were added (not just edited)
	if (!job.notes && notes) {
		await db.createActivity(jobId, 'note_added');
	}
	
	// Refresh job details
	await getJob(jobId).refresh();
	
	return {
		jobId,
		notesUpdated: true
	};
});

// Delete job
export const deleteJob = command(v.pipe(v.string(), v.uuid()), async (jobId) => {
	const userId = requireAuth();
	
	const job = await db.getJob(jobId);
	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}
	
	// Delete job (cascades to documents and activities)
	await db.deleteJob(jobId);
	
	// Refresh jobs list
	await getJobs({}).refresh();
	
	return {
		deleted: true,
		jobId
	};
});