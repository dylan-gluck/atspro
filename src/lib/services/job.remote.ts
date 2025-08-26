import { query, form, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/db';
import { extractJob as extractJobWithAI, fetchJobContent } from '$lib/ai';
import { requireAuth, checkRateLimitV2, ErrorCodes } from './utils';
import type { JobStatus } from '$lib/types/user-job';

// List user's jobs with filtering
const listJobsSchema = v.object({
	status: v.optional(
		v.picklist(['tracked', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'])
	),
	limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100))),
	offset: v.optional(v.pipe(v.number(), v.minValue(0)))
});

export const getJobs = query(listJobsSchema, async (params = {}) => {
	const userId = requireAuth();

	const { status, limit = 20, offset = 0 } = params;

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

	// Apply tier-based rate limiting
	await checkRateLimitV2('job.extract');

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

	// Store in database with transaction for atomicity
	const job = await db.transaction(async (tx) => {
		const newJob = await tx.createUserJob(userId, extracted);

		// Create initial activity
		await tx.createActivity(newJob.id, 'job_added', {
			source: jobUrl ? 'url' : 'manual'
		});

		return newJob;
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

	// Update status with transaction for atomicity
	await db.transaction(async (tx) => {
		// Update status
		await tx.updateJobStatus(jobId, status as JobStatus, appliedAt);

		// Create activity record
		await tx.createActivity(jobId, 'status_change', {
			previousStatus: job.status,
			newStatus: status
		});

		// If applied, create additional activity
		if (status === 'applied' && appliedAt) {
			await tx.createActivity(jobId, 'applied', {
				appliedAt
			});
		}
	});

	// Refresh affected queries
	await Promise.all([getJob(jobId).refresh(), getJobs({}).refresh()]);

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

	// Notes updates don't need strict rate limiting

	const job = await db.getJob(jobId);
	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}

	// Update notes with transaction for atomicity
	await db.transaction(async (tx) => {
		// Update notes
		await tx.updateJobNotes(jobId, notes);

		// Create activity if notes were added (not just edited)
		if (!job.notes && notes) {
			await tx.createActivity(jobId, 'note_added');
		}
	});

	// Refresh job details
	await getJob(jobId).refresh();

	return {
		jobId,
		notesUpdated: true
	};
});

// Create job manually (without AI extraction)
const createJobSchema = v.object({
	company: v.pipe(v.string(), v.minLength(1)),
	title: v.pipe(v.string(), v.minLength(1)),
	description: v.pipe(v.string(), v.minLength(1)),
	salary: v.optional(v.nullable(v.string())),
	location: v.optional(v.nullable(v.array(v.string()))),
	link: v.optional(v.nullable(v.string())),
	status: v.optional(
		v.picklist(['tracked', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'])
	),
	notes: v.optional(v.nullable(v.string()))
});

export const createJob = command(createJobSchema, async (jobData) => {
	const userId = requireAuth();

	// Apply tier-based rate limiting
	await checkRateLimitV2('job.extract');

	// Prepare job data with defaults
	const jobToCreate = {
		company: jobData.company,
		title: jobData.title,
		description: jobData.description,
		salary: jobData.salary || null,
		responsibilities: null,
		qualifications: null,
		logistics: null,
		location: jobData.location || null,
		additionalInfo: null,
		link: jobData.link || null,
		status: (jobData.status || 'tracked') as JobStatus,
		notes: jobData.notes || null,
		appliedAt: jobData.status === 'applied' ? new Date() : null
	};

	// Create job in database with transaction for atomicity
	const job = await db.transaction(async (tx) => {
		const newJob = await tx.createUserJob(userId, jobToCreate);

		// Create initial activity
		await tx.createActivity(newJob.id, 'job_added', {
			source: 'manual'
		});

		// If status is applied, create applied activity
		if (jobData.status === 'applied') {
			await tx.createActivity(newJob.id, 'applied', {
				appliedAt: new Date()
			});
		}

		return newJob;
	});

	// Refresh jobs list
	await getJobs({}).refresh();

	return {
		jobId: job.id
	};
});

// Update job
const updateJobSchema = v.object({
	jobId: v.pipe(v.string(), v.uuid()),
	company: v.optional(v.pipe(v.string(), v.minLength(1))),
	title: v.optional(v.pipe(v.string(), v.minLength(1))),
	description: v.optional(v.pipe(v.string(), v.minLength(1))),
	salary: v.optional(v.nullable(v.string())),
	location: v.optional(v.nullable(v.array(v.string()))),
	link: v.optional(v.nullable(v.string())),
	responsibilities: v.optional(v.nullable(v.array(v.string()))),
	qualifications: v.optional(v.nullable(v.array(v.string()))),
	logistics: v.optional(v.nullable(v.array(v.string()))),
	additionalInfo: v.optional(v.nullable(v.array(v.string())))
});

export const updateJob = command(updateJobSchema, async ({ jobId, ...updates }) => {
	const userId = requireAuth();

	// Job updates don't need strict rate limiting

	const job = await db.getJob(jobId);
	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}

	// Update job in database with transaction for atomicity
	await db.transaction(async (tx) => {
		// Update job
		await tx.updateJob(jobId, updates);

		// Create activity record
		await tx.createActivity(jobId, 'job_updated', {
			updatedFields: Object.keys(updates)
		});
	});

	// Refresh affected queries
	await Promise.all([getJob(jobId).refresh(), getJobs({}).refresh()]);

	return {
		jobId,
		updated: true
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
