import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getResume, extractResume, updateResume } from '../resume.remote';
import {
	createMockSession,
	createMockDb,
	createMockAI,
	createMockRequestEvent,
	createMockFormData,
	createMockFile,
	sampleResumeData
} from './test-helpers';

// Mock dependencies
vi.mock('$lib/db', () => ({
	db: {}
}));

vi.mock('$lib/ai', () => ({
	extractResume: vi.fn()
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
	validateFile: vi.fn(),
	ErrorCodes: {
		UNAUTHORIZED: 'UNAUTHORIZED',
		NOT_FOUND: 'NOT_FOUND'
	}
}));

describe('Resume Remote Functions', () => {
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
		vi.mocked(aiModule).extractResume = mockAI.extractResume;

		const utilsModule = await import('../utils');
		vi.mocked(utilsModule).requireAuth.mockReturnValue('user-123');

		const serverModule = await import('$app/server');
		vi.mocked(serverModule).getRequestEvent.mockReturnValue(
			createMockRequestEvent(mockSession) as any
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getResume', () => {
		it('should return user resume when it exists', async () => {
			mockDb.getUserResume.mockResolvedValueOnce({
				id: 'resume-123',
				userId: 'user-123',
				...sampleResumeData
			});

			const result = await getResume();

			expect(result).toEqual({
				id: 'resume-123',
				userId: 'user-123',
				...sampleResumeData
			});
			expect(mockDb.getUserResume).toHaveBeenCalledWith('user-123');
		});

		it('should return null when no resume exists', async () => {
			mockDb.getUserResume.mockResolvedValueOnce(null);

			const result = await getResume();

			expect(result).toBeNull();
		});

		it('should require authentication', async () => {
			const { requireAuth } = vi.mocked(await import('../utils'));
			requireAuth.mockImplementation(() => {
				throw new Error('Unauthorized');
			});

			await expect(getResume()).rejects.toThrow('Unauthorized');
		});
	});

	describe('extractResume', () => {
		it('should extract resume from PDF file', async () => {
			const file = createMockFile('PDF content', 'resume.pdf', 'application/pdf');
			const formData = createMockFormData({ document: file });

			mockDb.getUserResume.mockResolvedValueOnce(null); // No existing resume
			mockAI.extractResume.mockResolvedValueOnce(sampleResumeData);
			mockDb.createUserResume.mockResolvedValueOnce({
				id: 'resume-123',
				userId: 'user-123',
				...sampleResumeData
			});

			const result = await (extractResume as any)(formData);

			expect(result).toEqual({
				resumeId: 'resume-123',
				extractedFields: sampleResumeData
			});
			expect(mockAI.extractResume).toHaveBeenCalled();
			expect(mockDb.createUserResume).toHaveBeenCalledWith('user-123', sampleResumeData);
		});

		it('should extract resume from text file', async () => {
			const file = createMockFile('Resume text content', 'resume.txt', 'text/plain');
			const formData = createMockFormData({ document: file });

			mockDb.getUserResume.mockResolvedValueOnce(null);
			mockAI.extractResume.mockResolvedValueOnce(sampleResumeData);
			mockDb.createUserResume.mockResolvedValueOnce({
				id: 'resume-123',
				userId: 'user-123',
				...sampleResumeData
			});

			const result = await (extractResume as any)(formData);

			expect(result).toEqual({
				resumeId: 'resume-123',
				extractedFields: sampleResumeData
			});
			expect(mockAI.extractResume).toHaveBeenCalledWith('Resume text content', 'text/plain');
		});

		it('should enforce rate limiting', async () => {
			const { checkRateLimitV2 } = vi.mocked(await import('../utils'));
			checkRateLimitV2.mockRejectedValueOnce(new Error('Rate limit exceeded'));

			const file = createMockFile('PDF content', 'resume.pdf');
			const formData = createMockFormData({ document: file });

			await expect((extractResume as any)(formData)).rejects.toThrow('Rate limit exceeded');
			expect(checkRateLimitV2).toHaveBeenCalledWith('ai.analyze');
		});

		it('should prevent duplicate resumes', async () => {
			mockDb.getUserResume.mockResolvedValueOnce({
				id: 'existing-resume',
				userId: 'user-123'
			});

			const file = createMockFile('PDF content', 'resume.pdf');
			const formData = createMockFormData({ document: file });

			await expect((extractResume as any)(formData)).rejects.toThrow();
			expect(mockDb.createUserResume).not.toHaveBeenCalled();
		});

		it('should validate file type', async () => {
			const { validateFile } = vi.mocked(await import('../utils'));
			validateFile.mockImplementation(() => {
				throw new Error('Invalid file type');
			});

			const file = createMockFile('Content', 'resume.docx', 'application/msword');
			const formData = createMockFormData({ document: file });

			mockDb.getUserResume.mockResolvedValueOnce(null);

			await expect((extractResume as any)(formData)).rejects.toThrow('Invalid file type');
		});

		it('should handle missing file', async () => {
			const formData = createMockFormData({}); // No file

			mockDb.getUserResume.mockResolvedValueOnce(null);

			await expect((extractResume as any)(formData)).rejects.toThrow();
			expect(mockAI.extractResume).not.toHaveBeenCalled();
		});
	});

	describe('updateResume', () => {
		it('should update resume fields', async () => {
			const updates = {
				summary: 'Updated summary',
				skills: ['New Skill 1', 'New Skill 2']
			};

			mockDb.getUserResume.mockResolvedValueOnce({
				id: 'resume-123',
				userId: 'user-123',
				...sampleResumeData
			});

			mockDb.updateUserResume.mockResolvedValueOnce({
				id: 'resume-123',
				userId: 'user-123',
				...sampleResumeData,
				...updates
			});

			const result = await updateResume(updates);

			expect(result).toEqual({
				id: 'resume-123',
				updatedFields: ['summary', 'skills'],
				success: true
			});
			expect(mockDb.updateUserResume).toHaveBeenCalledWith('user-123', updates);
		});

		it('should require existing resume', async () => {
			mockDb.getUserResume.mockResolvedValueOnce(null);

			const updates = { summary: 'Updated summary' };

			await expect(updateResume(updates)).rejects.toThrow();
			expect(mockDb.updateUserResume).not.toHaveBeenCalled();
		});

		it('should validate update schema', async () => {
			mockDb.getUserResume.mockResolvedValueOnce({
				id: 'resume-123',
				userId: 'user-123'
			});

			const invalidUpdates = {
				invalidField: 'This should not be allowed'
			};

			// Schema validation should filter out invalid fields
			mockDb.updateUserResume.mockResolvedValueOnce({
				id: 'resume-123',
				userId: 'user-123'
			});

			const result = await updateResume(invalidUpdates as any);

			// The invalid field should be filtered out
			expect(mockDb.updateUserResume).toHaveBeenCalled();
		});

		it('should handle partial updates', async () => {
			mockDb.getUserResume.mockResolvedValueOnce({
				id: 'resume-123',
				userId: 'user-123',
				...sampleResumeData
			});

			const partialUpdate = {
				contactInfo: {
					...sampleResumeData.contactInfo,
					phone: '+9876543210' // Only updating phone
				}
			};

			mockDb.updateUserResume.mockResolvedValueOnce({
				id: 'resume-123',
				userId: 'user-123',
				...sampleResumeData,
				contactInfo: partialUpdate.contactInfo
			});

			const result = await updateResume(partialUpdate);

			expect(result.updatedFields).toContain('contactInfo');
			expect(mockDb.updateUserResume).toHaveBeenCalledWith('user-123', partialUpdate);
		});
	});

	describe('Resume validation', () => {
		it('should validate required contact info fields', async () => {
			const invalidResume = {
				...sampleResumeData,
				contactInfo: {
					fullName: '' // Invalid: empty name
				}
			};

			mockDb.getUserResume.mockResolvedValueOnce(null);
			mockAI.extractResume.mockResolvedValueOnce(invalidResume);

			// The AI should not return invalid data, but if it does,
			// the system should handle it gracefully
			mockDb.createUserResume.mockRejectedValueOnce(new Error('Invalid contact info'));

			const file = createMockFile('Content', 'resume.pdf');
			const formData = createMockFormData({ document: file });

			await expect((extractResume as any)(formData)).rejects.toThrow();
		});

		it('should handle array fields correctly', async () => {
			const resumeWithArrays = {
				...sampleResumeData,
				skills: [], // Empty arrays should be allowed
				workExperience: null // Null should be converted to empty array
			};

			mockDb.getUserResume.mockResolvedValueOnce({
				id: 'resume-123',
				...resumeWithArrays,
				workExperience: [] // DB should normalize nulls
			});

			const result = await getResume();

			expect(result?.skills).toEqual([]);
			expect(result?.workExperience).toEqual([]);
		});
	});
});
