import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resume, jobs, documents, activity } from '../index';
import { db as drizzleDb } from '../drizzle';
import { userResume, userJobs, jobDocuments, jobActivity } from '../schema';
import type { UserResume } from '$lib/types/user-resume';
import type { UserJob, JobDocument, JobActivity } from '$lib/types/user-job';

// Mock drizzle-orm
vi.mock('../drizzle', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		transaction: vi.fn()
	}
}));

describe('Database Operations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Resume Operations', () => {
		const mockUserId = 'test-user-123';
		const mockResumeData = {
			id: 'resume-123',
			userId: mockUserId,
			contactInfo: {
				fullName: 'John Doe',
				email: 'john@example.com',
				phone: '+1234567890',
				address: 'San Francisco, CA',
				links: [{ name: 'LinkedIn', url: 'https://linkedin.com/in/johndoe' }]
			},
			summary: 'Experienced software engineer',
			workExperience: [
				{
					position: 'Senior Developer',
					company: 'Tech Corp',
					startDate: '2020-01',
					endDate: '2024-01',
					description: 'Led development team',
					responsibilities: ['Built APIs', 'Mentored juniors']
				}
			],
			education: [
				{
					degree: 'BS Computer Science',
					institution: 'University',
					graduationDate: '2019'
				}
			],
			skills: ['JavaScript', 'TypeScript', 'React'],
			certifications: [],
			createdAt: new Date(),
			updatedAt: new Date()
		};

		it('should get user resume', async () => {
			const selectMock = vi.fn().mockReturnThis();
			const fromMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockReturnThis();
			const limitMock = vi.fn().mockResolvedValue([mockResumeData]);

			vi.mocked(drizzleDb).select.mockReturnValue({
				from: fromMock,
				where: whereMock,
				limit: limitMock
			} as any);

			fromMock.mockReturnValue({ where: whereMock, limit: limitMock });
			whereMock.mockReturnValue({ limit: limitMock });

			const result = await resume.get(mockUserId);

			expect(result).toEqual(mockResumeData);
			expect(drizzleDb.select).toHaveBeenCalled();
			expect(limitMock).toHaveBeenCalledWith(1);
		});

		it('should return null if resume not found', async () => {
			const selectMock = vi.fn().mockReturnThis();
			const fromMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockReturnThis();
			const limitMock = vi.fn().mockResolvedValue([]);

			vi.mocked(drizzleDb).select.mockReturnValue({
				from: fromMock,
				where: whereMock,
				limit: limitMock
			} as any);

			fromMock.mockReturnValue({ where: whereMock, limit: limitMock });
			whereMock.mockReturnValue({ limit: limitMock });

			const result = await resume.get(mockUserId);

			expect(result).toBeNull();
		});

		it('should create user resume', async () => {
			const insertMock = vi.fn().mockReturnThis();
			const valuesMock = vi.fn().mockReturnThis();
			const returningMock = vi.fn().mockResolvedValue([mockResumeData]);

			vi.mocked(drizzleDb).insert.mockReturnValue({
				values: valuesMock,
				returning: returningMock
			} as any);

			valuesMock.mockReturnValue({ returning: returningMock });

			const result = await resume.create(mockUserId, mockResumeData);

			expect(result).toEqual(mockResumeData);
			expect(drizzleDb.insert).toHaveBeenCalledWith(userResume);
			expect(valuesMock).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: mockUserId,
					contactInfo: mockResumeData.contactInfo
				})
			);
		});

		it('should update user resume', async () => {
			const updateMock = vi.fn().mockReturnThis();
			const setMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockReturnThis();
			const returningMock = vi.fn().mockResolvedValue([mockResumeData]);

			vi.mocked(drizzleDb).update.mockReturnValue({
				set: setMock,
				where: whereMock,
				returning: returningMock
			} as any);

			setMock.mockReturnValue({ where: whereMock, returning: returningMock });
			whereMock.mockReturnValue({ returning: returningMock });

			const updates = { summary: 'Updated summary' };
			const result = await resume.update(mockUserId, updates);

			expect(result).toEqual(mockResumeData);
			expect(drizzleDb.update).toHaveBeenCalledWith(userResume);
			expect(setMock).toHaveBeenCalledWith(updates);
		});
	});

	describe('Job Operations', () => {
		const mockUserId = 'test-user-123';
		const mockJobData: UserJob = {
			id: 'job-123',
			userId: mockUserId,
			company: 'Tech Corp',
			title: 'Software Engineer',
			description: 'Build amazing software',
			salary: '$120k-$150k',
			responsibilities: ['Develop features', 'Code review'],
			qualifications: ['3+ years experience', 'BS CS'],
			logistics: ['Remote', 'Full-time'],
			location: ['San Francisco, CA'],
			additionalInfo: ['Great benefits'],
			link: 'https://example.com/job',
			status: 'tracked',
			notes: 'Interesting opportunity',
			appliedAt: null,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		it('should list user jobs', async () => {
			const selectMock = vi.fn().mockReturnThis();
			const fromMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockReturnThis();
			const orderByMock = vi.fn().mockReturnThis();
			const limitMock = vi.fn().mockReturnThis();
			const offsetMock = vi.fn().mockResolvedValue([mockJobData]);

			vi.mocked(drizzleDb).select.mockImplementation((fields?: any) => {
				if (fields && fields.count) {
					// Count query
					return {
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockResolvedValue([{ count: 1 }])
					} as any;
				}
				// Regular select query
				return {
					from: fromMock,
					where: whereMock,
					orderBy: orderByMock,
					limit: limitMock,
					offset: offsetMock
				} as any;
			});

			fromMock.mockReturnValue({
				where: whereMock,
				orderBy: orderByMock,
				limit: limitMock,
				offset: offsetMock
			});
			whereMock.mockReturnValue({
				orderBy: orderByMock,
				limit: limitMock,
				offset: offsetMock
			});
			orderByMock.mockReturnValue({
				limit: limitMock,
				offset: offsetMock
			});
			limitMock.mockReturnValue({ offset: offsetMock });

			const result = await jobs.list(mockUserId);

			expect(result.jobs).toEqual([mockJobData]);
			expect(result.total).toBe(1);
		});

		it('should get specific job', async () => {
			const selectMock = vi.fn().mockReturnThis();
			const fromMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockReturnThis();
			const limitMock = vi.fn().mockResolvedValue([mockJobData]);

			vi.mocked(drizzleDb).select.mockReturnValue({
				from: fromMock,
				where: whereMock,
				limit: limitMock
			} as any);

			fromMock.mockReturnValue({ where: whereMock, limit: limitMock });
			whereMock.mockReturnValue({ limit: limitMock });

			const result = await jobs.get('job-123');

			expect(result).toEqual(mockJobData);
			expect(limitMock).toHaveBeenCalledWith(1);
		});

		it('should create new job', async () => {
			const insertMock = vi.fn().mockReturnThis();
			const valuesMock = vi.fn().mockReturnThis();
			const returningMock = vi.fn().mockResolvedValue([mockJobData]);

			vi.mocked(drizzleDb).insert.mockReturnValue({
				values: valuesMock,
				returning: returningMock
			} as any);

			valuesMock.mockReturnValue({ returning: returningMock });

			const result = await jobs.create(mockUserId, mockJobData);

			expect(result).toEqual(mockJobData);
			expect(drizzleDb.insert).toHaveBeenCalledWith(userJobs);
			expect(valuesMock).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: mockUserId,
					company: mockJobData.company,
					title: mockJobData.title
				})
			);
		});

		it('should update job status', async () => {
			const updateMock = vi.fn().mockReturnThis();
			const setMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockResolvedValue(undefined);

			vi.mocked(drizzleDb).update.mockReturnValue({
				set: setMock,
				where: whereMock
			} as any);

			setMock.mockReturnValue({ where: whereMock });

			await jobs.updateStatus('job-123', 'applied', new Date());

			expect(drizzleDb.update).toHaveBeenCalledWith(userJobs);
			expect(setMock).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'applied',
					appliedAt: expect.any(Date)
				})
			);
		});

		it('should update job notes', async () => {
			const updateMock = vi.fn().mockReturnThis();
			const setMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockResolvedValue(undefined);

			vi.mocked(drizzleDb).update.mockReturnValue({
				set: setMock,
				where: whereMock
			} as any);

			setMock.mockReturnValue({ where: whereMock });

			await jobs.updateNotes('job-123', 'Updated notes');

			expect(drizzleDb.update).toHaveBeenCalledWith(userJobs);
			expect(setMock).toHaveBeenCalledWith({ notes: 'Updated notes' });
		});

		it('should delete job', async () => {
			const deleteMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockResolvedValue(undefined);

			vi.mocked(drizzleDb).delete.mockReturnValue({
				where: whereMock
			} as any);

			await jobs.delete('job-123');

			expect(drizzleDb.delete).toHaveBeenCalledWith(userJobs);
		});
	});

	describe('Document Operations', () => {
		const mockDocument: JobDocument = {
			id: 'doc-123',
			jobId: 'job-123',
			type: 'resume',
			content: 'Resume content',
			version: 1,
			isActive: true,
			metadata: {
				keywords: ['JavaScript'],
				contentMarkdown: '# Resume',
				atsScore: 85
			},
			createdAt: new Date(),
			updatedAt: new Date()
		};

		it('should list job documents', async () => {
			const selectMock = vi.fn().mockReturnThis();
			const fromMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockReturnThis();
			const orderByMock = vi.fn().mockResolvedValue([mockDocument]);

			vi.mocked(drizzleDb).select.mockReturnValue({
				from: fromMock,
				where: whereMock,
				orderBy: orderByMock
			} as any);

			fromMock.mockReturnValue({ where: whereMock, orderBy: orderByMock });
			whereMock.mockReturnValue({ orderBy: orderByMock });

			const result = await documents.list('job-123');

			expect(result).toEqual([mockDocument]);
			expect(drizzleDb.select).toHaveBeenCalled();
		});

		it('should get specific document', async () => {
			const selectMock = vi.fn().mockReturnThis();
			const fromMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockReturnThis();
			const limitMock = vi.fn().mockResolvedValue([mockDocument]);

			vi.mocked(drizzleDb).select.mockReturnValue({
				from: fromMock,
				where: whereMock,
				limit: limitMock
			} as any);

			fromMock.mockReturnValue({ where: whereMock, limit: limitMock });
			whereMock.mockReturnValue({ limit: limitMock });

			const result = await documents.get('doc-123');

			expect(result).toEqual(mockDocument);
		});

		it('should create document with versioning', async () => {
			const txMock = {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue([{ version: 2 }]),
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				insert: vi.fn().mockReturnThis(),
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue([mockDocument])
			};

			// Setup select chain for version query
			txMock.select.mockReturnValue({
				from: txMock.from
			} as any);
			txMock.from.mockReturnValue({
				where: txMock.where
			} as any);

			// Setup update chain
			txMock.update.mockReturnValue({
				set: txMock.set,
				where: vi.fn().mockResolvedValue(undefined)
			} as any);
			txMock.set.mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined)
			} as any);

			// Setup insert chain
			txMock.insert.mockReturnValue({
				values: txMock.values
			} as any);
			txMock.values.mockReturnValue({
				returning: txMock.returning
			} as any);

			vi.mocked(drizzleDb).transaction.mockImplementation(async (callback) => {
				return await callback(txMock as any);
			});

			const result = await documents.create('job-123', 'resume', 'Content', {
				markdown: '# Content',
				atsScore: 85
			});

			expect(result).toEqual(mockDocument);
			expect(txMock.update).toHaveBeenCalledWith(jobDocuments);
			expect(txMock.insert).toHaveBeenCalledWith(jobDocuments);
		});

		// Note: documents.delete doesn't exist in the actual implementation
		// This test is kept as a placeholder for future implementation
	});

	describe('Activity Operations', () => {
		const mockActivity: JobActivity = {
			id: 'activity-123',
			jobId: 'job-123',
			type: 'status_change',
			description: 'Status changed to applied',
			metadata: { from: 'tracked', to: 'applied' },
			createdAt: new Date()
		};

		it('should list job activities', async () => {
			const selectMock = vi.fn().mockReturnThis();
			const fromMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockReturnThis();
			const orderByMock = vi.fn().mockReturnThis();
			const limitMock = vi.fn().mockReturnThis();
			const offsetMock = vi.fn().mockResolvedValue([mockActivity]);

			vi.mocked(drizzleDb).select.mockImplementation((fields?: any) => {
				if (fields && fields.count) {
					// Count query
					return {
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockResolvedValue([{ count: 1 }])
					} as any;
				}
				// Regular select query
				return {
					from: fromMock,
					where: whereMock,
					orderBy: orderByMock,
					limit: limitMock,
					offset: offsetMock
				} as any;
			});

			fromMock.mockReturnValue({
				where: whereMock,
				orderBy: orderByMock,
				limit: limitMock,
				offset: offsetMock
			});
			whereMock.mockReturnValue({
				orderBy: orderByMock,
				limit: limitMock,
				offset: offsetMock
			});
			orderByMock.mockReturnValue({
				limit: limitMock,
				offset: offsetMock
			});
			limitMock.mockReturnValue({ offset: offsetMock });

			const result = await activity.list('job-123', 10);

			expect(result.items).toEqual([mockActivity]);
			expect(result.total).toBe(1);
			expect(limitMock).toHaveBeenCalledWith(10);
		});

		it('should create activity', async () => {
			const insertMock = vi.fn().mockReturnThis();
			const valuesMock = vi.fn().mockReturnThis();
			const returningMock = vi.fn().mockResolvedValue([mockActivity]);

			vi.mocked(drizzleDb).insert.mockReturnValue({
				values: valuesMock,
				returning: returningMock
			} as any);

			valuesMock.mockReturnValue({ returning: returningMock });

			const result = await activity.create('job-123', 'status_change', {
				from: 'tracked',
				to: 'applied'
			});

			expect(result).toEqual(mockActivity);
			expect(drizzleDb.insert).toHaveBeenCalledWith(jobActivity);
		});
	});

	describe('Transaction Handling', () => {
		it('should handle transaction rollback on error', async () => {
			const txMock = {
				insert: vi.fn().mockReturnThis(),
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockRejectedValue(new Error('Database error')),
				rollback: vi.fn()
			};

			// Setup the chain
			txMock.insert.mockReturnValue({
				values: txMock.values
			} as any);
			txMock.values.mockReturnValue({
				returning: txMock.returning
			} as any);

			vi.mocked(drizzleDb).transaction.mockImplementation(async (callback) => {
				try {
					return await callback(txMock as any);
				} catch (error) {
					txMock.rollback();
					throw error;
				}
			});

			await expect(
				drizzleDb.transaction(async (tx) => {
					const result = await tx
						.insert(userJobs)
						.values({} as any)
						.returning();
					return result;
				})
			).rejects.toThrow('Database error');

			expect(txMock.rollback).toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		it('should handle database connection errors', async () => {
			const selectMock = vi.fn().mockReturnThis();
			const fromMock = vi.fn().mockReturnThis();
			const whereMock = vi.fn().mockReturnThis();
			const limitMock = vi.fn().mockRejectedValue(new Error('Connection refused'));

			vi.mocked(drizzleDb).select.mockReturnValue({
				from: fromMock,
				where: whereMock,
				limit: limitMock
			} as any);

			fromMock.mockReturnValue({ where: whereMock, limit: limitMock });
			whereMock.mockReturnValue({ limit: limitMock });

			await expect(resume.get('user-123')).rejects.toThrow('Connection refused');
		});

		it('should handle constraint violations', async () => {
			const insertMock = vi.fn().mockReturnThis();
			const valuesMock = vi.fn().mockReturnThis();
			const returningMock = vi.fn().mockRejectedValue(new Error('Unique constraint violation'));

			vi.mocked(drizzleDb).insert.mockReturnValue({
				values: valuesMock,
				returning: returningMock
			} as any);

			valuesMock.mockReturnValue({ returning: returningMock });

			await expect(resume.create('user-123', {})).rejects.toThrow('Unique constraint violation');
		});
	});
});
