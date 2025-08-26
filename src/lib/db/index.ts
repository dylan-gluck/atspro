import { Pool } from 'pg';
import type { UserResume } from '$lib/types/user-resume';
import type {
	UserJob,
	JobDocument,
	JobActivity,
	JobActivityType,
	JobStatus
} from '$lib/types/user-job';
import { DATABASE_URL } from '$env/static/private';

// Database connection pool
const pool = new Pool({
	connectionString: DATABASE_URL
});

// Resume operations
export const resume = {
	async get(userId: string): Promise<UserResume | null> {
		const { rows } = await pool.query(`SELECT * FROM "userResume" WHERE "userId" = $1`, [userId]);
		return rows[0] || null;
	},

	async create(userId: string, data: any): Promise<UserResume> {
		const { rows } = await pool.query(
			`INSERT INTO "userResume"
       ("userId", "contactInfo", "summary", "workExperience", "education", "certifications", "skills")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
			[
				userId,
				JSON.stringify(data.contactInfo || {}),
				data.summary || null,
				JSON.stringify(data.workExperience || []),
				JSON.stringify(data.education || []),
				JSON.stringify(data.certifications || []),
				data.skills || []
			]
		);
		return rows[0];
	},

	async update(userId: string, data: any): Promise<UserResume> {
		const fields: string[] = [];
		const values: any[] = [];
		let idx = 1;

		Object.entries(data).forEach(([key, value]) => {
			if (value !== undefined && key !== 'id' && key !== 'userId') {
				fields.push(`"${key}" = $${idx++}`);
				// Handle skills array specifically for PostgreSQL TEXT[] type
				if (key === 'skills' && Array.isArray(value)) {
					values.push(value); // PostgreSQL driver will handle array conversion
				} else {
					values.push(typeof value === 'object' ? JSON.stringify(value) : value);
				}
			}
		});

		values.push(userId);

		const { rows } = await pool.query(
			`UPDATE "userResume" SET ${fields.join(', ')} WHERE "userId" = $${idx} RETURNING *`,
			values
		);
		return rows[0];
	}
};

// Job operations
export const jobs = {
	async list(
		userId: string,
		options: { status?: JobStatus; limit?: number; offset?: number } = {}
	): Promise<{ jobs: UserJob[]; total: number }> {
		const { status, limit = 20, offset = 0 } = options;

		let query = `SELECT * FROM "userJobs" WHERE "userId" = $1`;
		const params: any[] = [userId];

		if (status) {
			query += ` AND "status" = $2`;
			params.push(status);
		}

		query += ` ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`;

		const [jobsResult, countResult] = await Promise.all([
			pool.query(query, params),
			pool.query(
				`SELECT COUNT(*) FROM "userJobs" WHERE "userId" = $1${status ? ` AND "status" = $2` : ''}`,
				params.slice(0, status ? 2 : 1)
			)
		]);

		return {
			jobs: jobsResult.rows,
			total: parseInt(countResult.rows[0].count)
		};
	},

	async get(jobId: string): Promise<UserJob | null> {
		const { rows } = await pool.query(`SELECT * FROM "userJobs" WHERE "id" = $1`, [jobId]);
		return rows[0] || null;
	},

	async create(userId: string, data: any): Promise<UserJob> {
		const { rows } = await pool.query(
			`INSERT INTO "userJobs"
       ("userId", "company", "title", "description", "salary", "responsibilities",
        "qualifications", "logistics", "location", "additionalInfo", "link", "status", "notes")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
			[
				userId,
				data.company || '',
				data.title || '',
				data.description || '',
				data.salary,
				data.responsibilities,
				data.qualifications,
				data.logistics,
				data.location,
				data.additionalInfo,
				data.link,
				data.status || 'tracked',
				data.notes
			]
		);
		return rows[0];
	},

	async updateStatus(jobId: string, status: JobStatus, appliedAt?: Date | string): Promise<void> {
		const params: any[] = [jobId, status];
		let query = `UPDATE "userJobs" SET "status" = $2`;

		if (appliedAt) {
			query += `, "appliedAt" = $3`;
			params.push(appliedAt instanceof Date ? appliedAt.toISOString() : appliedAt);
		}

		await pool.query(`${query} WHERE "id" = $1`, params);
	},

	async updateNotes(jobId: string, notes: string): Promise<void> {
		await pool.query(`UPDATE "userJobs" SET "notes" = $2 WHERE "id" = $1`, [jobId, notes]);
	},

	async update(jobId: string, updates: any): Promise<void> {
		const fields: string[] = [];
		const values: any[] = [];
		let idx = 1;

		Object.entries(updates).forEach(([key, value]) => {
			if (value !== undefined && key !== 'id' && key !== 'userId') {
				fields.push(`"${key}" = $${idx++}`);
				values.push(value);
			}
		});

		if (fields.length > 0) {
			values.push(jobId);
			await pool.query(
				`UPDATE "userJobs" SET ${fields.join(', ')}, "updatedAt" = NOW() WHERE "id" = $${idx}`,
				values
			);
		}
	},

	async delete(jobId: string): Promise<void> {
		await pool.query(`DELETE FROM "userJobs" WHERE "id" = $1`, [jobId]);
	}
};

// Document operations
export const documents = {
	async list(jobId: string): Promise<JobDocument[]> {
		const { rows } = await pool.query(
			`SELECT * FROM "jobDocuments" WHERE "jobId" = $1 ORDER BY "createdAt" DESC`,
			[jobId]
		);
		return rows;
	},

	async get(documentId: string): Promise<JobDocument | null> {
		const { rows } = await pool.query(`SELECT * FROM "jobDocuments" WHERE "id" = $1`, [documentId]);
		return rows[0] || null;
	},

	async create(
		jobId: string,
		type: JobDocument['type'],
		content: string,
		metadata?: any
	): Promise<JobDocument> {
		// Get next version
		const { rows: versionRows } = await pool.query(
			`SELECT COALESCE(MAX("version"), 0) + 1 as version
       FROM "jobDocuments" WHERE "jobId" = $1 AND "type" = $2`,
			[jobId, type]
		);

		// Deactivate old versions
		await pool.query(
			`UPDATE "jobDocuments" SET "isActive" = false WHERE "jobId" = $1 AND "type" = $2`,
			[jobId, type]
		);

		// Create new document
		const { rows } = await pool.query(
			`INSERT INTO "jobDocuments" ("jobId", "type", "content", "contentMarkdown", "atsScore", "version", "metadata")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
			[
				jobId,
				type,
				content,
				metadata?.markdown || null, // Store markdown in dedicated column
				metadata?.atsScore || null, // Store ATS score in dedicated column
				versionRows[0].version,
				metadata ? JSON.stringify(metadata) : null
			]
		);

		return rows[0];
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
			pool.query(
				`SELECT * FROM "jobActivity" WHERE "jobId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
				[jobId, limit, offset]
			),
			pool.query(`SELECT COUNT(*) FROM "jobActivity" WHERE "jobId" = $1`, [jobId])
		]);

		return {
			items: itemsResult.rows,
			total: parseInt(countResult.rows[0].count)
		};
	},

	async create(jobId: string, type: JobActivityType, metadata?: any): Promise<JobActivity> {
		const description = generateActivityDescription(type, metadata);

		const { rows } = await pool.query(
			`INSERT INTO "jobActivity" ("jobId", "type", "description", "metadata")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
			[jobId, type, description, metadata ? JSON.stringify(metadata) : null]
		);

		return rows[0];
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
	createActivity: activity.create
};

export default db;
