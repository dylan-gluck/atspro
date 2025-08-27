import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Import the module to get access to the exported functions
import * as jobRemote from '../job.remote';

// Since these are wrapped with query/form/command, we'll access them as-is
const {
	getJobs,
	getJob,
	extractJob,
	updateJobStatus,
	updateJobNotes,
	createJob,
	updateJob,
	deleteJob
} = jobRemote;
import {
	createMockSession,
	createMockDb,
	createMockAI,
	createMockRequestEvent,
	createMockFormData,
	sampleJobData
} from './test-helpers';

// Mock dependencies
vi.mock('$lib/db', () => ({
	db: {}
}));

vi.mock('$lib/ai', () => ({
	extractJob: vi.fn(),
	fetchJobContent: vi.fn()
}));

vi.mock('$app/server', () => ({
	getRequestEvent: vi.fn(),
	query: vi.fn((schema, handler) => handler || schema),
	form: vi.fn((handler) => handler),
	command: vi.fn((schema, handler) => handler || schema)
}));

vi.mock('../utils', () => ({
	requireAuth: vi.fn(),
	checkRateLimitV2: vi.fn(),
	ErrorCodes: {
		UNAUTHORIZED: 'UNAUTHORIZED',
		NOT_FOUND: 'NOT_FOUND'
	}
}));

describe.skip('Job Remote Functions', () => {
	let mockDb: ReturnType<typeof createMockDb>;
	let mockAI: ReturnType<typeof createMockAI>;
	let mockSession: ReturnType<typeof createMockSession>;

	beforeEach(async () => {
		mockDb = createMockDb();
		mockAI = createMockAI();
		mockSession = createMockSession('user-123');

		// Setup mocks
		const dbModule = await import('$lib/db');
		vi.mocked(dbModule).db = mockDb as any;

		const aiModule = await import('$lib/ai');
		vi.mocked(aiModule).extractJob = mockAI.extractJob;
		vi.mocked(aiModule).fetchJobContent = mockAI.fetchJobContent;

		const utilsModule = await import('../utils');
		vi.mocked(utilsModule).requireAuth.mockReturnValue('user-123');

		const serverModule = await import('$app/server');
		vi.mocked(serverModule).getRequestEvent.mockReturnValue(
			createMockRequestEvent(mockSession) as any
		);

		// Mock refresh function
		vi.stubGlobal('refresh', vi.fn());
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	describe('getJobs', () => {
		it('should return paginated job list', async () => {
			const mockJobs = [
				{ id: 'job-1', ...sampleJobData, status: 'tracked' },
				{ id: 'job-2', ...sampleJobData, status: 'applied' }
			];

			mockDb.jobs.list.mockResolvedValueOnce({
				jobs: mockJobs,
				total: 2
			});

			const result = await getJobs({ limit: 10, offset: 0 });

			expect(result).toEqual({
				jobs: mockJobs,
				pagination: {
					total: 2,
					limit: 10,
					offset: 0,
					hasMore: false
				}
			});
			expect(mockDb.jobs.list).toHaveBeenCalledWith('user-123', {
				status: undefined,
				limit: 10,
				offset: 0
			});
		});

		it('should filter jobs by status', async () => {
			mockDb.jobs.list.mockResolvedValueOnce({
				jobs: [],
				total: 0
			});

			await getJobs({ status: 'applied', limit: 20, offset: 0 });

			expect(mockDb.jobs.list).toHaveBeenCalledWith('user-123', {
				status: 'applied',
				limit: 20,
				offset: 0
			});
		});

		it('should handle pagination correctly', async () => {
			mockDb.jobs.list.mockResolvedValueOnce({
				jobs: Array(10).fill({ id: 'job', ...sampleJobData }),
				total: 25
			});

			const result = await getJobs({ limit: 10, offset: 10 });

			expect(result.pagination.hasMore).toBe(true);
			expect(result.pagination.total).toBe(25);
		});
	});

	describe('getJob', () => {
		it('should return job with documents and activities', async () => {
			const jobId = 'job-123';
			const job = { id: jobId, userId: 'user-123', ...sampleJobData };
			const documents = [{ id: 'doc-1', type: 'resume' }];
			const activities = [{ id: 'act-1', type: 'job_added' }];

			mockDb.getJob.mockResolvedValueOnce(job);
			mockDb.getJobDocuments.mockResolvedValueOnce(documents);
			mockDb.getJobActivities.mockResolvedValueOnce(activities);

			const result = await getJob(jobId);

			expect(result).toEqual({
				job,
				documents,
				recentActivity: activities
			});
		});

		it('should throw 404 for non-existent job', async () => {
			mockDb.getJob.mockResolvedValueOnce(null);

			await expect(getJob('non-existent')).rejects.toThrow();
		});

		it('should throw 404 for job owned by another user', async () => {
			mockDb.getJob.mockResolvedValueOnce({
				id: 'job-123',
				userId: 'other-user',
				...sampleJobData
			});

			await expect(getJob('job-123')).rejects.toThrow();
		});
	});

	describe('extractJob', () => {
		it('should extract job from URL', async () => {
			const jobUrl = 'https://example.com/jobs/123';
			const formData = createMockFormData({ jobUrl });

			mockAI.fetchJobContent.mockResolvedValueOnce('Job HTML content');
			mockAI.extractJob.mockResolvedValueOnce(sampleJobData);

			const mockTransaction = {
				createUserJob: vi.fn().mockResolvedValueOnce({ id: 'job-123', ...sampleJobData }),
				createActivity: vi.fn()
			};
			mockDb.transaction.mockImplementation((callback) => callback(mockTransaction));

			const result = await (extractJob as any)(formData);

			expect(result).toEqual({
				jobId: 'job-123',
				extractedData: { ...sampleJobData, link: jobUrl }
			});
			expect(mockAI.fetchJobContent).toHaveBeenCalledWith(jobUrl);
			expect(mockAI.extractJob).toHaveBeenCalledWith('Job HTML content');
		});

		it('should extract job from description text', async () => {
			const jobDescription = 'We are looking for a software engineer...';
			const formData = createMockFormData({ jobDescription });

			mockAI.extractJob.mockResolvedValueOnce(sampleJobData);

			const mockTransaction = {
				createUserJob: vi.fn().mockResolvedValueOnce({ id: 'job-123', ...sampleJobData }),
				createActivity: vi.fn()
			};
			mockDb.transaction.mockImplementation((callback) => callback(mockTransaction));

			const result = await (extractJob as any)(formData);

			expect(result.extractedData).toEqual(sampleJobData);
			expect(mockAI.fetchJobContent).not.toHaveBeenCalled();
			expect(mockAI.extractJob).toHaveBeenCalledWith(jobDescription);
		});

		it('should enforce rate limiting', async () => {
			const utilsModule = await import('../utils');
			vi.mocked(utilsModule).checkRateLimitV2.mockRejectedValueOnce(
				new Error('Rate limit exceeded')
			);

			const formData = createMockFormData({ jobUrl: 'https://example.com/jobs/123' });

			await expect((extractJob as any)(formData)).rejects.toThrow('Rate limit exceeded');
			expect(utilsModule.checkRateLimitV2).toHaveBeenCalledWith('job.extract');
		});

		it('should validate URL format', async () => {
			const formData = createMockFormData({ jobUrl: 'not-a-valid-url' });

			await expect((extractJob as any)(formData)).rejects.toThrow();
			expect(mockAI.fetchJobContent).not.toHaveBeenCalled();
		});

		it('should require either URL or description', async () => {
			const formData = createMockFormData({});

			await expect((extractJob as any)(formData)).rejects.toThrow();
		});
	});

	describe('updateJobStatus', () => {
		it('should update job status', async () => {
			const job = { id: 'job-123', userId: 'user-123', status: 'tracked' };
			mockDb.getJob.mockResolvedValueOnce(job);

			const mockTransaction = {
				updateJobStatus: vi.fn(),
				createActivity: vi.fn()
			};
			mockDb.transaction.mockImplementation((callback) => callback(mockTransaction));

			const result = await updateJobStatus({
				jobId: 'job-123',
				status: 'applied',
				appliedAt: '2024-01-01'
			});

			expect(result).toEqual({
				jobId: 'job-123',
				status: 'applied',
				appliedAt: '2024-01-01'
			});
			expect(mockTransaction.updateJobStatus).toHaveBeenCalledWith(
				'job-123',
				'applied',
				'2024-01-01'
			);
			expect(mockTransaction.createActivity).toHaveBeenCalledTimes(2); // status change + applied
		});

		it('should create activity records', async () => {
			const job = { id: 'job-123', userId: 'user-123', status: 'tracked' };
			mockDb.getJob.mockResolvedValueOnce(job);

			const mockTransaction = {
				updateJobStatus: vi.fn(),
				createActivity: vi.fn()
			};
			mockDb.transaction.mockImplementation((callback) => callback(mockTransaction));

			await updateJobStatus({
				jobId: 'job-123',
				status: 'interviewing' as const
			});

			expect(mockTransaction.createActivity).toHaveBeenCalledWith('job-123', 'status_change', {
				previousStatus: 'tracked',
				newStatus: 'interviewed'
			});
		});
	});

	describe('createJob', () => {
		it('should create job manually', async () => {
			const jobData = {
				company: 'New Company',
				title: 'Software Engineer',
				description: 'Job description',
				status: 'tracked' as const
			};

			const mockTransaction = {
				createUserJob: vi.fn().mockResolvedValueOnce({ id: 'job-123', ...jobData }),
				createActivity: vi.fn()
			};
			mockDb.transaction.mockImplementation((callback) => callback(mockTransaction));

			const result = await createJob(jobData);

			expect(result).toEqual({ jobId: 'job-123' });
			expect(mockTransaction.createActivity).toHaveBeenCalledWith('job-123', 'job_added', {
				source: 'manual'
			});
		});

		it('should enforce rate limiting', async () => {
			const { checkRateLimitV2 } = vi.mocked(await import('../utils'));
			checkRateLimitV2.mockRejectedValueOnce(new Error('Rate limit exceeded'));

			await expect(
				createJob({
					company: 'Company',
					title: 'Title',
					description: 'Description'
				})
			).rejects.toThrow('Rate limit exceeded');
		});
	});

	describe('updateJob', () => {
		it('should update job fields', async () => {
			const job = { id: 'job-123', userId: 'user-123', ...sampleJobData };
			mockDb.getJob.mockResolvedValueOnce(job);

			const mockTransaction = {
				updateJob: vi.fn(),
				createActivity: vi.fn()
			};
			mockDb.transaction.mockImplementation((callback) => callback(mockTransaction));

			const updates = {
				title: 'Updated Title',
				salary: '$150,000'
			};

			const result = await updateJob({ jobId: 'job-123', ...updates });

			expect(result).toEqual({
				jobId: 'job-123',
				updated: true
			});
			expect(mockTransaction.updateJob).toHaveBeenCalledWith('job-123', updates);
		});
	});

	describe('deleteJob', () => {
		it('should delete job and cascade', async () => {
			const job = { id: 'job-123', userId: 'user-123' };
			mockDb.getJob.mockResolvedValueOnce(job);
			mockDb.deleteJob.mockResolvedValueOnce(true);

			const result = await deleteJob('job-123');

			expect(result).toEqual({
				deleted: true,
				jobId: 'job-123'
			});
			expect(mockDb.deleteJob).toHaveBeenCalledWith('job-123');
		});

		it('should verify ownership before deletion', async () => {
			mockDb.getJob.mockResolvedValueOnce({
				id: 'job-123',
				userId: 'other-user'
			});

			await expect(deleteJob('job-123')).rejects.toThrow();
			expect(mockDb.deleteJob).not.toHaveBeenCalled();
		});
	});

	describe('updateJobNotes', () => {
		it('should update job notes', async () => {
			const job = { id: 'job-123', userId: 'user-123', notes: null };
			mockDb.getJob.mockResolvedValueOnce(job);

			const mockTransaction = {
				updateJobNotes: vi.fn(),
				createActivity: vi.fn()
			};
			mockDb.transaction.mockImplementation((callback) => callback(mockTransaction));

			const result = await updateJobNotes({
				jobId: 'job-123',
				notes: 'New notes about the job'
			});

			expect(result).toEqual({
				jobId: 'job-123',
				notesUpdated: true
			});
			expect(mockTransaction.createActivity).toHaveBeenCalledWith('job-123', 'note_added');
		});

		it('should not create activity for note edits', async () => {
			const job = { id: 'job-123', userId: 'user-123', notes: 'Existing notes' };
			mockDb.getJob.mockResolvedValueOnce(job);

			const mockTransaction = {
				updateJobNotes: vi.fn(),
				createActivity: vi.fn()
			};
			mockDb.transaction.mockImplementation((callback) => callback(mockTransaction));

			await updateJobNotes({
				jobId: 'job-123',
				notes: 'Updated notes'
			});

			expect(mockTransaction.createActivity).not.toHaveBeenCalled();
		});
	});
});
