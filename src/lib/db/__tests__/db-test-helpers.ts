import { Pool } from 'pg';
import { vi } from 'vitest';

// Mock pool for database testing
export function createMockPool() {
	const mockQuery = vi.fn();
	const mockConnect = vi.fn();
	const mockEnd = vi.fn();
	
	const pool = {
		query: mockQuery,
		connect: mockConnect,
		end: mockEnd
	};
	
	return { pool, mockQuery, mockConnect, mockEnd };
}

// Mock database results
export const mockDbResults = {
	resume: {
		id: 'resume-123',
		userId: 'user-123',
		contactInfo: JSON.stringify({
			name: 'Test User',
			email: 'test@example.com',
			phone: '555-1234',
			location: 'San Francisco, CA'
		}),
		summary: 'Experienced software developer',
		workExperience: JSON.stringify([
			{
				company: 'Tech Corp',
				title: 'Senior Developer',
				startDate: '2020-01',
				endDate: '2024-01',
				description: 'Built awesome things'
			}
		]),
		education: JSON.stringify([
			{
				institution: 'University',
				degree: 'BS Computer Science',
				graduationDate: '2019'
			}
		]),
		certifications: JSON.stringify([]),
		skills: ['JavaScript', 'TypeScript', 'React'],
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01')
	},
	
	job: {
		id: 'job-123',
		userId: 'user-123',
		company: 'Test Company',
		title: 'Software Engineer',
		description: 'Job description',
		requirements: ['Requirement 1', 'Requirement 2'],
		benefits: ['Benefit 1', 'Benefit 2'],
		link: 'https://example.com/job',
		status: 'tracked',
		appliedAt: null,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01')
	},
	
	document: {
		id: 'doc-123',
		jobId: 'job-123',
		type: 'resume',
		name: 'Optimized Resume',
		content: '<p>Resume content</p>',
		metadata: {},
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01')
	},
	
	activity: {
		id: 'activity-123',
		jobId: 'job-123',
		type: 'job_added',
		metadata: { source: 'manual' },
		createdAt: new Date('2024-01-01')
	}
};

// Helper to setup database transaction mocks
export function setupTransactionMocks(mockPool: ReturnType<typeof createMockPool>) {
	const mockClient = {
		query: vi.fn(),
		release: vi.fn()
	};
	
	mockPool.mockConnect.mockResolvedValue(mockClient);
	
	return { mockClient };
}

// Helper to create expected SQL queries
export const expectedQueries = {
	getResume: (userId: string) => ({
		text: `SELECT * FROM "userResume" WHERE "userId" = $1`,
		values: [userId]
	}),
	
	createResume: (userId: string, data: any) => ({
		text: `INSERT INTO "userResume"
       ("userId", "contactInfo", "summary", "workExperience", "education", "certifications", "skills")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
		values: [
			userId,
			JSON.stringify(data.contactInfo || {}),
			data.summary || null,
			JSON.stringify(data.workExperience || []),
			JSON.stringify(data.education || []),
			JSON.stringify(data.certifications || []),
			data.skills || []
		]
	}),
	
	listJobs: (userId: string, status?: string, limit = 20, offset = 0) => {
		if (status) {
			return {
				text: `SELECT * FROM "userJobs" WHERE "userId" = $1 AND status = $2 ORDER BY "createdAt" DESC LIMIT $3 OFFSET $4`,
				values: [userId, status, limit, offset]
			};
		}
		return {
			text: `SELECT * FROM "userJobs" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
			values: [userId, limit, offset]
		};
	},
	
	getJob: (jobId: string) => ({
		text: `SELECT * FROM "userJobs" WHERE id = $1`,
		values: [jobId]
	}),
	
	createJob: (userId: string, data: any) => ({
		text: expect.stringContaining('INSERT INTO "userJobs"'),
		values: expect.arrayContaining([userId])
	}),
	
	updateJobStatus: (jobId: string, status: string, appliedAt?: string) => ({
		text: expect.stringContaining('UPDATE "userJobs" SET status'),
		values: expect.arrayContaining([status, jobId])
	}),
	
	deleteJob: (jobId: string) => ({
		text: `DELETE FROM "userJobs" WHERE id = $1`,
		values: [jobId]
	}),
	
	getJobDocuments: (jobId: string) => ({
		text: `SELECT * FROM "jobDocuments" WHERE "jobId" = $1 ORDER BY "createdAt" DESC`,
		values: [jobId]
	}),
	
	createActivity: (jobId: string, type: string, metadata: any) => ({
		text: `INSERT INTO "jobActivity" ("jobId", type, metadata) VALUES ($1, $2, $3) RETURNING *`,
		values: [jobId, type, JSON.stringify(metadata)]
	})
};