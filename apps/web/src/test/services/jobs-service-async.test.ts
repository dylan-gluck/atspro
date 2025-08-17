import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JobsServiceImpl } from '@/lib/services/jobs';
import type { ApiClient, AuthService, JobEntity, ApiResponse } from '@/types/services';

// Mock dependencies
const mockApiClient: ApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  upload: vi.fn()
};

const mockAuthService: AuthService = {
  isInitialized: true,
  initialize: vi.fn(),
  destroy: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  validateSession: vi.fn(),
  getCurrentUser: vi.fn(),
  updateUser: vi.fn(),
  deleteAccount: vi.fn(),
  sendVerificationEmail: vi.fn(),
  verifyEmail: vi.fn(),
  changePassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  getBetterAuthClient: vi.fn()
};

const createMockJobEntity = (overrides: Partial<JobEntity> = {}): JobEntity => ({
  id: 'job-123',
  user_id: 'user-123',
  title: 'Software Engineer',
  company: 'Tech Corp',
  job_details: {
    company: 'Tech Corp',
    title: 'Software Engineer',
    description: 'Great opportunity',
    link: 'https://example.com/job'
  },
  status_info: {
    status: 'saved'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  archived: false,
  ...overrides
});

const createMockTaskStatus = (status: string, progress: number = 50) => ({
  id: 'task-123',
  status,
  progress,
  created_at: '2024-01-01T00:00:00Z',
  started_at: '2024-01-01T00:00:01Z',
  task_type: 'job_creation',
  user_id: 'user-123',
  priority: 1,
  max_retries: 3,
  retry_count: 0
});

describe('JobsService - Async Task Methods', () => {
  let jobsService: JobsServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    jobsService = new JobsServiceImpl(mockApiClient, mockAuthService);
    
    // Clear any running timers
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('createJobAsync', () => {
    it('successfully creates a job asynchronously', async () => {
      const taskResponse = { task_id: 'task-123', job_id: 'job-123' };
      const mockApiResponse: ApiResponse<{ task_id: string; job_id: string }> = {
        success: true,
        data: taskResponse
      };
      
      (mockApiClient.post as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.createJobAsync('https://example.com/job');
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/jobs', { job_url: 'https://example.com/job' });
      expect(result).toEqual(mockApiResponse);
    });

    it('returns error for empty job URL', async () => {
      const result = await jobsService.createJobAsync('');
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Job URL is required',
        errors: ['Job URL is required']
      });
      
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('returns error for invalid URL format', async () => {
      const result = await jobsService.createJobAsync('invalid-url');
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Invalid URL format',
        errors: ['Invalid URL format']
      });
      
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('clears cache on successful response', async () => {
      const taskResponse = { task_id: 'task-123', job_id: 'job-123' };
      const mockApiResponse: ApiResponse<{ task_id: string; job_id: string }> = {
        success: true,
        data: taskResponse
      };
      
      (mockApiClient.post as any).mockResolvedValue(mockApiResponse);
      
      const clearCachePatternSpy = vi.spyOn(jobsService as any, 'clearCachePattern');
      
      await jobsService.createJobAsync('https://example.com/job');
      
      expect(clearCachePatternSpy).toHaveBeenCalledWith('listJobs');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('searchJobs');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('filterJobs');
    });
  });

  describe('parseJobFromDocumentAsync', () => {
    it('successfully parses job from document asynchronously', async () => {
      const file = new File(['job content'], 'job.pdf', { type: 'application/pdf' });
      const taskResponse = { task_id: 'task-123', job_id: 'job-123' };
      const mockApiResponse: ApiResponse<{ task_id: string; job_id: string }> = {
        success: true,
        data: taskResponse
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.parseJobFromDocumentAsync(file);
      
      expect(mockApiClient.upload).toHaveBeenCalledWith('/api/job/parse-document', file);
      expect(result).toEqual(mockApiResponse);
    });

    it('returns error for missing file', async () => {
      const result = await jobsService.parseJobFromDocumentAsync(null as any);
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'File is required',
        errors: ['File is required']
      });
      
      expect(mockApiClient.upload).not.toHaveBeenCalled();
    });

    it('returns error for invalid file type', async () => {
      const file = new File(['content'], 'job.exe', { type: 'application/x-executable' });
      
      const result = await jobsService.parseJobFromDocumentAsync(file);
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Invalid file type. Only PDF, DOCX, DOC, TXT, and MD files are supported.',
        errors: ['Invalid file type']
      });
      
      expect(mockApiClient.upload).not.toHaveBeenCalled();
    });

    it('returns error for file too large', async () => {
      const file = new File(['x'.repeat(11 * 1024 * 1024)], 'job.pdf', { type: 'application/pdf' });
      
      const result = await jobsService.parseJobFromDocumentAsync(file);
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        errors: ['File size too large']
      });
      
      expect(mockApiClient.upload).not.toHaveBeenCalled();
    });
  });

  describe('getTaskStatus', () => {
    it('successfully retrieves task status', async () => {
      const taskStatus = createMockTaskStatus('running', 75);
      const mockApiResponse: ApiResponse<typeof taskStatus> = {
        success: true,
        data: taskStatus
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.getTaskStatus('task-123');
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/tasks/task-123');
      expect(result).toEqual(mockApiResponse);
    });
  });

  describe('getTaskResult', () => {
    it('successfully retrieves task result', async () => {
      const jobEntity = createMockJobEntity();
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: jobEntity
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.getTaskResult('task-123');
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/tasks/task-123/result');
      expect(result).toEqual(mockApiResponse);
    });
  });

  describe('pollTaskUntilComplete', () => {
    it('successfully polls task until completion', async () => {
      const jobEntity = createMockJobEntity();
      
      // Mock task status progression: running -> completed
      const runningTaskStatus = createMockTaskStatus('running', 50);
      const completedTaskStatus = createMockTaskStatus('completed', 100);
      
      const statusResponses = [
        { success: true, data: runningTaskStatus },
        { success: true, data: completedTaskStatus }
      ];
      
      const resultResponse: ApiResponse<JobEntity> = {
        success: true,
        data: jobEntity
      };
      
      (mockApiClient.get as any)
        .mockResolvedValueOnce(statusResponses[0])
        .mockResolvedValueOnce(statusResponses[1])
        .mockResolvedValueOnce(resultResponse);
      
      const progressCallback = vi.fn();
      const resultPromise = jobsService.pollTaskUntilComplete('task-123', progressCallback);
      
      // Advance timers to trigger polling
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;
      
      expect(progressCallback).toHaveBeenCalledWith(50, 'running');
      expect(progressCallback).toHaveBeenCalledWith(100, 'completed');
      expect(result).toEqual(resultResponse);
    });

    it('returns error when task fails', async () => {
      const failedTaskStatus = {
        ...createMockTaskStatus('failed', 0),
        error_message: 'Task processing failed'
      };
      
      const statusResponse = { success: true, data: failedTaskStatus };
      (mockApiClient.get as any).mockResolvedValue(statusResponse);
      
      const result = await jobsService.pollTaskUntilComplete('task-123');
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Task processing failed',
        errors: ['Task processing failed']
      });
    });

    it('returns error when task is cancelled', async () => {
      const cancelledTaskStatus = createMockTaskStatus('cancelled', 25);
      
      const statusResponse = { success: true, data: cancelledTaskStatus };
      (mockApiClient.get as any).mockResolvedValue(statusResponse);
      
      const result = await jobsService.pollTaskUntilComplete('task-123');
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Task was cancelled',
        errors: ['Task was cancelled']
      });
    });

    it('returns timeout error when polling exceeds maxWaitTime', async () => {
      const runningTaskStatus = createMockTaskStatus('running', 50);
      const statusResponse = { success: true, data: runningTaskStatus };
      
      (mockApiClient.get as any).mockResolvedValue(statusResponse);
      
      const resultPromise = jobsService.pollTaskUntilComplete('task-123', undefined, 2000);
      
      // Advance timers beyond maxWaitTime
      await vi.advanceTimersByTimeAsync(3000);
      
      const result = await resultPromise;
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Task polling timeout reached',
        errors: ['Task polling timeout reached']
      });
    });

    it('handles errors during polling gracefully', async () => {
      const completedTaskStatus = createMockTaskStatus('completed', 100);
      const jobEntity = createMockJobEntity();
      
      // First call throws error, second succeeds
      (mockApiClient.get as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true, data: completedTaskStatus })
        .mockResolvedValueOnce({ success: true, data: jobEntity });
      
      const resultPromise = jobsService.pollTaskUntilComplete('task-123');
      
      // Advance timers to trigger polling
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;
      
      expect(result).toEqual({ success: true, data: jobEntity });
    });

    it('clears cache when result is successful', async () => {
      const completedTaskStatus = createMockTaskStatus('completed', 100);
      const jobEntity = createMockJobEntity();
      
      (mockApiClient.get as any)
        .mockResolvedValueOnce({ success: true, data: completedTaskStatus })
        .mockResolvedValueOnce({ success: true, data: jobEntity });
      
      const clearCachePatternSpy = vi.spyOn(jobsService as any, 'clearCachePattern');
      
      const resultPromise = jobsService.pollTaskUntilComplete('task-123');
      
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(clearCachePatternSpy).toHaveBeenCalledWith('listJobs');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('searchJobs');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('filterJobs');
    });
  });

  describe('createJob (backward compatibility)', () => {
    it('uses async flow and polls for completion', async () => {
      const taskResponse = { task_id: 'task-123', job_id: 'job-123' };
      const jobEntity = createMockJobEntity();
      const completedTaskStatus = createMockTaskStatus('completed', 100);
      
      // Mock createJobAsync response
      (mockApiClient.post as any).mockResolvedValueOnce({
        success: true,
        data: taskResponse
      });
      
      // Mock polling responses
      (mockApiClient.get as any)
        .mockResolvedValueOnce({ success: true, data: completedTaskStatus })
        .mockResolvedValueOnce({ success: true, data: jobEntity });
      
      const resultPromise = jobsService.createJob('https://example.com/job');
      
      // Advance timers to trigger polling
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/jobs', { job_url: 'https://example.com/job' });
      expect(result).toEqual({ success: true, data: jobEntity });
    });

    it('returns error when async task creation fails', async () => {
      (mockApiClient.post as any).mockResolvedValue({
        success: false,
        message: 'Invalid URL',
        errors: ['Invalid URL']
      });
      
      const result = await jobsService.createJob('https://example.com/job');
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Invalid URL',
        errors: ['Invalid URL']
      });
    });
  });

  describe('parseJobFromDocument (backward compatibility)', () => {
    it('uses async flow and polls for completion', async () => {
      const file = new File(['job content'], 'job.pdf', { type: 'application/pdf' });
      const taskResponse = { task_id: 'task-123', job_id: 'job-123' };
      const jobEntity = createMockJobEntity();
      const completedTaskStatus = createMockTaskStatus('completed', 100);
      
      // Mock parseJobFromDocumentAsync response
      (mockApiClient.upload as any).mockResolvedValueOnce({
        success: true,
        data: taskResponse
      });
      
      // Mock polling responses
      (mockApiClient.get as any)
        .mockResolvedValueOnce({ success: true, data: completedTaskStatus })
        .mockResolvedValueOnce({ success: true, data: jobEntity });
      
      const resultPromise = jobsService.parseJobFromDocument(file);
      
      // Advance timers to trigger polling
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;
      
      expect(mockApiClient.upload).toHaveBeenCalledWith('/api/job/parse-document', file);
      expect(result).toEqual({ success: true, data: jobEntity });
    });

    it('returns error when async document parsing fails', async () => {
      const file = new File(['job content'], 'job.pdf', { type: 'application/pdf' });
      
      (mockApiClient.upload as any).mockResolvedValue({
        success: false,
        message: 'Document parsing failed',
        errors: ['Document parsing failed']
      });
      
      const result = await jobsService.parseJobFromDocument(file);
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Document parsing failed',
        errors: ['Document parsing failed']
      });
    });
  });
});