import { describe, it, expect, beforeEach, vi } from 'vitest';
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

const mockJobEntity: JobEntity = {
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
  updated_at: '2024-01-01T00:00:00Z'
};

describe('JobsService - Document Parsing', () => {
  let jobsService: JobsServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    jobsService = new JobsServiceImpl(mockApiClient, mockAuthService);
  });

  describe('parseJobFromDocument', () => {
    it('successfully parses a PDF document', async () => {
      const mockFile = new File(['job description content'], 'job.pdf', { 
        type: 'application/pdf' 
      });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: mockJobEntity
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(mockApiClient.upload).toHaveBeenCalledWith(
        '/api/job/parse-document',
        mockFile
      );
      expect(result).toEqual(mockApiResponse);
    });

    it('successfully parses a DOCX document', async () => {
      const mockFile = new File(['job description content'], 'job.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: mockJobEntity
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(mockApiClient.upload).toHaveBeenCalledWith(
        '/api/job/parse-document',
        mockFile
      );
      expect(result.success).toBe(true);
    });

    it('successfully parses a text document', async () => {
      const mockFile = new File(['job description content'], 'job.txt', { 
        type: 'text/plain' 
      });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: mockJobEntity
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result.success).toBe(true);
      expect(mockApiClient.upload).toHaveBeenCalledWith(
        '/api/job/parse-document',
        mockFile
      );
    });

    it('successfully parses a markdown document', async () => {
      const mockFile = new File(['# Job Description\nGreat opportunity'], 'job.md', { 
        type: 'text/markdown' 
      });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: mockJobEntity
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result.success).toBe(true);
    });

    it('validates file is provided', async () => {
      const result = await jobsService.parseJobFromDocument(null as any);
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'File is required',
        errors: ['File is required']
      });
      
      expect(mockApiClient.upload).not.toHaveBeenCalled();
    });

    it('validates file type', async () => {
      const mockFile = new File(['content'], 'job.jpg', { 
        type: 'image/jpeg' 
      });
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Invalid file type. Only PDF, DOCX, DOC, TXT, and MD files are supported.',
        errors: ['Invalid file type']
      });
      
      expect(mockApiClient.upload).not.toHaveBeenCalled();
    });

    it('validates file size limit', async () => {
      // Create a file larger than 10MB
      const largeContent = 'a'.repeat(11 * 1024 * 1024); // 11MB
      const mockFile = new File([largeContent], 'large-job.pdf', { 
        type: 'application/pdf' 
      });
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        errors: ['File size too large']
      });
      
      expect(mockApiClient.upload).not.toHaveBeenCalled();
    });

    it('handles API client errors', async () => {
      const mockFile = new File(['job description'], 'job.pdf', { 
        type: 'application/pdf' 
      });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: false,
        data: null as any,
        message: 'Failed to parse document',
        errors: ['Document format not supported']
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result).toEqual(mockApiResponse);
      expect(mockApiClient.upload).toHaveBeenCalledWith(
        '/api/job/parse-document',
        mockFile
      );
    });

    it('handles network errors', async () => {
      const mockFile = new File(['job description'], 'job.pdf', { 
        type: 'application/pdf' 
      });
      
      (mockApiClient.upload as any).mockRejectedValue(new Error('Network error'));
      
      await expect(jobsService.parseJobFromDocument(mockFile)).rejects.toThrow('Network error');
    });

    it('clears cache on successful parsing', async () => {
      const mockFile = new File(['job description'], 'job.pdf', { 
        type: 'application/pdf' 
      });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: mockJobEntity
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      // Mock the cache clearing methods
      const clearCachePatternSpy = vi.spyOn(jobsService as any, 'clearCachePattern');
      
      await jobsService.parseJobFromDocument(mockFile);
      
      expect(clearCachePatternSpy).toHaveBeenCalledWith('listJobs');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('searchJobs');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('filterJobs');
    });

    it('does not clear cache on failed parsing', async () => {
      const mockFile = new File(['job description'], 'job.pdf', { 
        type: 'application/pdf' 
      });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: false,
        data: null as any,
        message: 'Parsing failed'
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      // Mock the cache clearing methods
      const clearCachePatternSpy = vi.spyOn(jobsService as any, 'clearCachePattern');
      
      await jobsService.parseJobFromDocument(mockFile);
      
      expect(clearCachePatternSpy).not.toHaveBeenCalled();
    });
  });

  describe('file type validation edge cases', () => {
    it('accepts legacy DOC files', async () => {
      const mockFile = new File(['job description'], 'job.doc', { 
        type: 'application/msword' 
      });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: mockJobEntity
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result.success).toBe(true);
    });

    it('rejects unsupported text formats', async () => {
      const mockFile = new File(['content'], 'job.rtf', { 
        type: 'application/rtf' 
      });
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid file type');
    });

    it('rejects unsupported Office formats', async () => {
      const mockFile = new File(['content'], 'job.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid file type');
    });
  });

  describe('file size validation edge cases', () => {
    it('accepts files exactly at the size limit', async () => {
      // Create a file exactly 10MB
      const exactContent = 'a'.repeat(10 * 1024 * 1024); // Exactly 10MB
      const mockFile = new File([exactContent], 'exact-size.pdf', { 
        type: 'application/pdf' 
      });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: mockJobEntity
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result.success).toBe(true);
      expect(mockApiClient.upload).toHaveBeenCalled();
    });

    it('rejects files just over the size limit', async () => {
      // Create a file just over 10MB
      const overContent = 'a'.repeat(10 * 1024 * 1024 + 1); // 10MB + 1 byte
      const mockFile = new File([overContent], 'over-size.pdf', { 
        type: 'application/pdf' 
      });
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('File size too large');
      expect(mockApiClient.upload).not.toHaveBeenCalled();
    });

    it('handles empty files', async () => {
      const mockFile = new File([], 'empty.pdf', { 
        type: 'application/pdf' 
      });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: mockJobEntity
      };
      
      (mockApiClient.upload as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.parseJobFromDocument(mockFile);
      
      expect(result.success).toBe(true);
      expect(mockApiClient.upload).toHaveBeenCalled();
    });
  });
});