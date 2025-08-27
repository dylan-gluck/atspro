import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db as drizzleDb } from './drizzle';
import { userResume, userJobs, jobDocuments, jobActivity } from './schema';
import type { UserResume } from '$lib/types/user-resume';
import type { NewUserJob } from './schema/user-jobs';
import type { UserJob, JobDocument, JobActivity, JobActivityType } from '$lib/types/user-job';
import type { NewJobDocument } from './schema/job-documents';
import type { NewJobActivity, ActivityType } from './schema/job-activity';
import type { JobStatus } from './schema/user-jobs';

// Resume operations
export const resume = {
	async get(userId: string): Promise<UserResume | null> {
		const result = await drizzleDb
			.select()
			.from(userResume)
			.where(eq(userResume.userId, userId))
			.limit(1);
		return result[0] || null;
	},

	async create(userId: string, data: any): Promise<UserResume> {
		const result = await drizzleDb
			.insert(userResume)
			.values({
				userId,
				contactInfo: data.contactInfo || {},
				summary: data.summary || null,
				workExperience: data.workExperience || [],
				education: data.education || [],
				certifications: data.certifications || [],
				skills: data.skills || []
			})
			.returning();
		return result[0];
	},

	async update(userId: string, data: any): Promise<UserResume> {
		const updateData: any = {};

		Object.entries(data).forEach(([key, value]) => {
			if (value !== undefined && key !== 'id' && key !== 'userId') {
				updateData[key] = value;
			}
		});

		const result = await drizzleDb
			.update(userResume)
			.set(updateData)
			.where(eq(userResume.userId, userId))
			.returning();
		return result[0];
	}
};

// Job operations
export const jobs = {
	async list(
		userId: string,
		options: { status?: JobStatus; limit?: number; offset?: number } = {}
	): Promise<{ jobs: UserJob[]; total: number }> {
		const { status, limit = 20, offset = 0 } = options;

		const whereConditions = status
			? and(eq(userJobs.userId, userId), eq(userJobs.status, status))
			: eq(userJobs.userId, userId);

		// Get jobs with their latest ATS scores from resume documents
		const [jobsResult, countResult] = await Promise.all([
			drizzleDb
				.select({
					job: userJobs,
					atsScore: sql<number | null>`(
						SELECT "atsScore" 
						FROM "jobDocuments" 
						WHERE "jobDocuments"."jobId" = "userJobs"."id" 
						AND "jobDocuments"."type" = 'resume' 
						AND "jobDocuments"."isActive" = true 
						LIMIT 1
					)`
				})
				.from(userJobs)
				.where(whereConditions)
				.orderBy(desc(userJobs.createdAt))
				.limit(limit)
				.offset(offset),
			drizzleDb
				.select({ count: sql<number>`count(*)` })
				.from(userJobs)
				.where(whereConditions)
		]);

		// Map results to include ATS score in job object
		const jobsWithScores = jobsResult.map((row) => ({
			...row.job,
			atsScore: row.atsScore
		}));

		return {
			jobs: jobsWithScores,
			total: Number(countResult[0].count)
		};
	},

	async get(jobId: string): Promise<UserJob | null> {
		const result = await drizzleDb.select().from(userJobs).where(eq(userJobs.id, jobId)).limit(1);
		return result[0] || null;
	},

	async create(userId: string, data: any): Promise<UserJob> {
		const insertData: NewUserJob = {
			userId,
			company: data.company || '',
			title: data.title || '',
			description: data.description || '',
			salary: data.salary,
			responsibilities: data.responsibilities,
			qualifications: data.qualifications,
			logistics: data.logistics,
			location: data.location,
			additionalInfo: data.additionalInfo,
			link: data.link,
			status: data.status || 'tracked',
			notes: data.notes
		};

		const result = await drizzleDb.insert(userJobs).values(insertData).returning();
		return result[0];
	},

	async updateStatus(jobId: string, status: JobStatus, appliedAt?: Date | string): Promise<void> {
		const updateData: any = { status };

		if (appliedAt) {
			updateData.appliedAt = appliedAt instanceof Date ? appliedAt : new Date(appliedAt);
		}

		await drizzleDb.update(userJobs).set(updateData).where(eq(userJobs.id, jobId));
	},

	async updateNotes(jobId: string, notes: string): Promise<void> {
		await drizzleDb.update(userJobs).set({ notes }).where(eq(userJobs.id, jobId));
	},

	async update(jobId: string, updates: any): Promise<void> {
		const updateData: any = {};

		Object.entries(updates).forEach(([key, value]) => {
			if (value !== undefined && key !== 'id' && key !== 'userId') {
				updateData[key] = value;
			}
		});

		if (Object.keys(updateData).length > 0) {
			await drizzleDb.update(userJobs).set(updateData).where(eq(userJobs.id, jobId));
		}
	},

	async delete(jobId: string): Promise<void> {
		await drizzleDb.delete(userJobs).where(eq(userJobs.id, jobId));
	}
};

// Document operations
export const documents = {
	async list(jobId: string): Promise<JobDocument[]> {
		return await drizzleDb
			.select()
			.from(jobDocuments)
			.where(eq(jobDocuments.jobId, jobId))
			.orderBy(desc(jobDocuments.createdAt));
	},

	async get(documentId: string): Promise<JobDocument | null> {
		const result = await drizzleDb
			.select()
			.from(jobDocuments)
			.where(eq(jobDocuments.id, documentId))
			.limit(1);
		return result[0] || null;
	},

	async create(
		jobId: string,
		type: JobDocument['type'],
		content: string,
		metadata?: any
	): Promise<JobDocument> {
		// Transaction for version management
		return await drizzleDb.transaction(async (tx) => {
			// Get next version
			const versionResult = await tx
				.select({
					version: sql<number>`COALESCE(MAX("version"), 0) + 1`
				})
				.from(jobDocuments)
				.where(and(eq(jobDocuments.jobId, jobId), eq(jobDocuments.type, type)));

			const version = versionResult[0]?.version || 1;

			// Deactivate old versions
			await tx
				.update(jobDocuments)
				.set({ isActive: false })
				.where(and(eq(jobDocuments.jobId, jobId), eq(jobDocuments.type, type)));

			// Create new document
			const insertData: NewJobDocument = {
				jobId,
				type,
				content,
				contentMarkdown: metadata?.markdown || null,
				atsScore: metadata?.atsScore || null,
				version,
				metadata: metadata || null
			};

			const result = await tx.insert(jobDocuments).values(insertData).returning();
			return result[0];
		});
	}
};

// Activity tracking
export const activity = {
	async list(
		jobId: string,
		limit = 50,
		offset = 0
	): Promise<{ items: JobActivity[]; total: number }> {
		const [itemsResult, countResult] = await Promise.all([
			drizzleDb
				.select()
				.from(jobActivity)
				.where(eq(jobActivity.jobId, jobId))
				.orderBy(desc(jobActivity.createdAt))
				.limit(limit)
				.offset(offset),
			drizzleDb
				.select({ count: sql<number>`count(*)` })
				.from(jobActivity)
				.where(eq(jobActivity.jobId, jobId))
		]);

		return {
			items: itemsResult,
			total: Number(countResult[0].count)
		};
	},

	async create(jobId: string, type: JobActivityType, metadata?: any): Promise<JobActivity> {
		const description = generateActivityDescription(type, metadata);

		const insertData: NewJobActivity = {
			jobId,
			type: type as ActivityType,
			description,
			metadata: metadata || null
		};

		const result = await drizzleDb.insert(jobActivity).values(insertData).returning();
		return result[0];
	}
};

// Helper function for activity descriptions
function generateActivityDescription(type: JobActivityType, metadata?: any): string {
	const descriptions: Record<JobActivityType, string> = {
		job_added: `Job added${metadata?.source ? ` from ${metadata.source}` : ''}`,
		job_updated: `Job updated${metadata?.updatedFields ? ` (${metadata.updatedFields.join(', ')})` : ''}`,
		status_change: `Status changed${metadata ? ` to ${metadata.newStatus}` : ''}`,
		document_generated: `Generated ${metadata?.type || 'document'}`,
		note_added: 'Added notes',
		applied: 'Applied to position',
		interview_scheduled: `Interview scheduled${metadata?.date ? ` for ${metadata.date}` : ''}`,
		offer_received: 'Received offer'
	};

	return descriptions[type] || `Activity: ${type}`;
}

// Export all as db object for compatibility
export const db = {
	// Resume operations
	getUserResume: resume.get,
	createUserResume: resume.create,
	updateUserResume: resume.update,

	// Job operations
	jobs,
	getUserJobs: async (userId: string, options?: any) => {
		const result = await jobs.list(userId, options);
		return result.jobs;
	},
	getUserJobsCount: async (userId: string, options?: any) => {
		const result = await jobs.list(userId, { ...options, limit: 0 });
		return result.total;
	},
	getJob: jobs.get,
	createUserJob: jobs.create,
	updateJobStatus: jobs.updateStatus,
	updateJobNotes: jobs.updateNotes,
	updateJob: jobs.update,
	deleteJob: jobs.delete,

	// Document operations
	documents,
	getJobDocuments: documents.list,
	getDocument: documents.get,
	createJobDocument: documents.create,

	// Activity operations
	activity,
	getJobActivities: async (jobId: string, options?: any) => {
		const result = await activity.list(jobId, options?.limit, options?.offset);
		return result.items;
	},
	getJobActivityCount: async (jobId: string) => {
		const result = await activity.list(jobId, 0, 0);
		return result.total;
	},
	createActivity: activity.create,

	// Transaction support for atomic operations
	transaction: async <T>(
		callback: (tx: {
			createUserJob: typeof jobs.create;
			updateJobStatus: typeof jobs.updateStatus;
			updateJobNotes: typeof jobs.updateNotes;
			updateJob: typeof jobs.update;
			createJobDocument: typeof documents.create;
			createActivity: typeof activity.create;
		}) => Promise<T>
	): Promise<T> => {
		return await drizzleDb.transaction(async (tx) => {
			// Create transaction-aware versions of all operations
			const txOps = {
				createUserJob: async (userId: string, data: any) => {
					const insertData: NewUserJob = {
						userId,
						company: data.company || '',
						title: data.title || '',
						description: data.description || '',
						salary: data.salary,
						responsibilities: data.responsibilities,
						qualifications: data.qualifications,
						logistics: data.logistics,
						location: data.location,
						additionalInfo: data.additionalInfo,
						link: data.link,
						status: data.status || 'tracked',
						notes: data.notes
					};
					const result = await tx.insert(userJobs).values(insertData).returning();
					return result[0] as UserJob;
				},

				updateJobStatus: async (jobId: string, status: JobStatus, appliedAt?: Date | string) => {
					const updateData: any = { status };
					if (appliedAt) {
						updateData.appliedAt = appliedAt instanceof Date ? appliedAt : new Date(appliedAt);
					}
					await tx.update(userJobs).set(updateData).where(eq(userJobs.id, jobId));
				},

				updateJobNotes: async (jobId: string, notes: string) => {
					await tx.update(userJobs).set({ notes }).where(eq(userJobs.id, jobId));
				},

				updateJob: async (jobId: string, updates: any) => {
					const updateData: any = {};
					Object.entries(updates).forEach(([key, value]) => {
						if (value !== undefined && key !== 'id' && key !== 'userId') {
							updateData[key] = value;
						}
					});
					if (Object.keys(updateData).length > 0) {
						await tx.update(userJobs).set(updateData).where(eq(userJobs.id, jobId));
					}
				},

				createJobDocument: async (
					jobId: string,
					type: JobDocument['type'],
					content: string,
					metadata?: any
				) => {
					// Get next version
					const versionResult = await tx
						.select({
							version: sql<number>`COALESCE(MAX("version"), 0) + 1`
						})
						.from(jobDocuments)
						.where(and(eq(jobDocuments.jobId, jobId), eq(jobDocuments.type, type)));

					const version = versionResult[0]?.version || 1;

					// Deactivate old versions
					await tx
						.update(jobDocuments)
						.set({ isActive: false })
						.where(and(eq(jobDocuments.jobId, jobId), eq(jobDocuments.type, type)));

					// Create new document
					const insertData: NewJobDocument = {
						jobId,
						type,
						content,
						contentMarkdown: metadata?.markdown || null,
						atsScore: metadata?.atsScore || null,
						version,
						metadata: metadata || null
					};

					const result = await tx.insert(jobDocuments).values(insertData).returning();
					return result[0] as JobDocument;
				},

				createActivity: async (jobId: string, type: JobActivityType, metadata?: any) => {
					const description = generateActivityDescription(type, metadata);

					const insertData: NewJobActivity = {
						jobId,
						type: type as ActivityType,
						description,
						metadata: metadata || null
					};

					const result = await tx.insert(jobActivity).values(insertData).returning();
					return result[0] as JobActivity;
				}
			};

			return await callback(txOps);
		});
	}
};

export default db;
