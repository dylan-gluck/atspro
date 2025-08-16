import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobsServiceImpl } from '@/lib/services/jobs';
import type { ApiClient, AuthService, JobEntity, ApiResponse, PaginatedResponse } from '@/types/services';

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

describe('JobsService - Archive Functionality', () => {
  let jobsService: JobsServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    jobsService = new JobsServiceImpl(mockApiClient, mockAuthService);
  });

  describe('listJobs with archived parameter', () => {
    it('includes archived parameter in query when filtering for archived jobs', async () => {
      const mockJobs = [
        createMockJobEntity({ id: 'job-1', archived: true }),
        createMockJobEntity({ id: 'job-2', archived: true })
      ];
      
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          data: mockJobs,
          total: 2,
          page: 1,
          page_size: 10,
          has_next: false,
          has_previous: false
        }
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.listJobs({ archived: true });
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/jobs?archived=true');
      expect(result).toEqual(mockApiResponse);
    });

    it('includes archived parameter in query when filtering for active jobs', async () => {
      const mockJobs = [
        createMockJobEntity({ id: 'job-1', archived: false }),
        createMockJobEntity({ id: 'job-2', archived: false })
      ];
      
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          data: mockJobs,
          total: 2,
          page: 1,
          page_size: 10,
          has_next: false,
          has_previous: false
        }
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.listJobs({ archived: false });
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/jobs?archived=false');
      expect(result).toEqual(mockApiResponse);
    });

    it('omits archived parameter when not specified', async () => {
      const mockJobs = [createMockJobEntity()];
      
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          data: mockJobs,
          total: 1,
          page: 1,
          page_size: 10,
          has_next: false,
          has_previous: false
        }
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.listJobs();
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/jobs');
      expect(result).toEqual(mockApiResponse);
    });

    it('combines archived parameter with other filters', async () => {
      const mockJobs = [
        createMockJobEntity({ 
          id: 'job-1', 
          archived: true, 
          company: 'Tech Corp',
          status_info: { status: 'applied' }
        })
      ];
      
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          data: mockJobs,
          total: 1,
          page: 2,
          page_size: 5,
          has_next: false,
          has_previous: true
        }
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.listJobs({
        archived: true,
        status: 'applied',
        company: 'Tech Corp',
        page: 2,
        page_size: 5
      });
      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/jobs?status=applied&company=Tech+Corp&archived=true&page=2&page_size=5'
      );
      expect(result).toEqual(mockApiResponse);
    });
  });

  describe('archiveJob', () => {
    it('successfully archives a job', async () => {
      const archivedJob = createMockJobEntity({ archived: true });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: archivedJob
      };
      
      (mockApiClient.patch as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.archiveJob('job-123');
      
      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/jobs/job-123', { archived: true });
      expect(result).toEqual(mockApiResponse);
    });

    it('returns error for empty job ID', async () => {
      const result = await jobsService.archiveJob('');
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      });
      
      expect(mockApiClient.patch).not.toHaveBeenCalled();
    });
  });

  describe('unarchiveJob', () => {
    it('successfully unarchives a job', async () => {
      const unarchivedJob = createMockJobEntity({ archived: false });
      
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: unarchivedJob
      };
      
      (mockApiClient.patch as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.unarchiveJob('job-123');
      
      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/jobs/job-123', { archived: false });
      expect(result).toEqual(mockApiResponse);
    });

    it('returns error for empty job ID', async () => {
      const result = await jobsService.unarchiveJob('');
      
      expect(result).toEqual({
        data: null,
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      });
      
      expect(mockApiClient.patch).not.toHaveBeenCalled();
    });
  });

  describe('getArchivedJobs', () => {
    it('successfully retrieves archived jobs with default parameters', async () => {
      const archivedJobs = [
        createMockJobEntity({ id: 'job-1', archived: true }),
        createMockJobEntity({ id: 'job-2', archived: true })
      ];
      
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          data: archivedJobs,
          total: 2,
          page: 1,
          page_size: 10,
          has_next: false,
          has_previous: false
        }
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.getArchivedJobs();
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/jobs?archived=true');
      expect(result).toEqual(archivedJobs);
    });

    it('successfully retrieves archived jobs with custom pagination', async () => {
      const archivedJobs = [createMockJobEntity({ archived: true })];
      
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          data: archivedJobs,
          total: 15,
          page: 2,
          page_size: 5,
          has_next: true,
          has_previous: true
        }
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.getArchivedJobs({ page: 2, page_size: 5 });
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/jobs?archived=true&page=2&page_size=5');
      expect(result).toEqual(archivedJobs);
    });

    it('returns empty array on API failure', async () => {
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: false,
        data: null as any,
        message: 'Server error'
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.getArchivedJobs();
      
      expect(result).toEqual([]);
    });

    it('returns empty array on network error', async () => {
      (mockApiClient.get as any).mockRejectedValue(new Error('Network error'));
      
      const result = await jobsService.getArchivedJobs();
      
      expect(result).toEqual([]);
    });
  });

  describe('getActiveJobs', () => {
    it('successfully retrieves active jobs with default parameters', async () => {
      const activeJobs = [
        createMockJobEntity({ id: 'job-1', archived: false }),
        createMockJobEntity({ id: 'job-2', archived: false })
      ];
      
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          data: activeJobs,
          total: 2,
          page: 1,
          page_size: 10,
          has_next: false,
          has_previous: false
        }
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.getActiveJobs();
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/jobs?archived=false');
      expect(result).toEqual(activeJobs);
    });

    it('successfully retrieves active jobs with custom pagination', async () => {
      const activeJobs = [createMockJobEntity({ archived: false })];
      
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          data: activeJobs,
          total: 25,
          page: 3,
          page_size: 10,
          has_next: true,
          has_previous: true
        }
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.getActiveJobs({ page: 3, page_size: 10 });
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/jobs?archived=false&page=3&page_size=10');
      expect(result).toEqual(activeJobs);
    });

    it('returns empty array on API failure', async () => {
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: false,
        data: null as any,
        message: 'Server error'
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      const result = await jobsService.getActiveJobs();
      
      expect(result).toEqual([]);
    });

    it('returns empty array on network error', async () => {
      (mockApiClient.get as any).mockRejectedValue(new Error('Network error'));
      
      const result = await jobsService.getActiveJobs();
      
      expect(result).toEqual([]);
    });
  });

  describe('bulkArchiveJobs', () => {
    it('successfully archives multiple jobs', async () => {
      const mockApiResponse: ApiResponse<void> = {
        success: true,
        data: undefined
      };
      
      (mockApiClient.patch as any).mockResolvedValue(mockApiResponse);
      
      const jobIds = ['job-1', 'job-2', 'job-3'];
      const result = await jobsService.bulkArchiveJobs(jobIds);
      
      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/jobs/bulk-archive', {
        job_ids: jobIds,
        archived: true
      });
      expect(result).toEqual(mockApiResponse);
    });

    it('returns error for empty job IDs array', async () => {
      const result = await jobsService.bulkArchiveJobs([]);
      
      expect(result).toEqual({
        data: undefined,
        success: false,
        message: 'At least one job ID is required',
        errors: ['At least one job ID is required']
      });
      
      expect(mockApiClient.patch).not.toHaveBeenCalled();
    });

    it('clears cache on successful bulk archive', async () => {
      const mockApiResponse: ApiResponse<void> = {
        success: true,
        data: undefined
      };
      
      (mockApiClient.patch as any).mockResolvedValue(mockApiResponse);
      
      const clearCachePatternSpy = vi.spyOn(jobsService as any, 'clearCachePattern');
      
      await jobsService.bulkArchiveJobs(['job-1', 'job-2']);
      
      expect(clearCachePatternSpy).toHaveBeenCalledWith('getJob');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('listJobs');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('searchJobs');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('filterJobs');
    });

    it('does not clear cache on failed bulk archive', async () => {
      const mockApiResponse: ApiResponse<void> = {
        success: false,
        data: undefined,
        message: 'Bulk archive failed'
      };
      
      (mockApiClient.patch as any).mockResolvedValue(mockApiResponse);
      
      const clearCachePatternSpy = vi.spyOn(jobsService as any, 'clearCachePattern');
      
      await jobsService.bulkArchiveJobs(['job-1', 'job-2']);
      
      expect(clearCachePatternSpy).not.toHaveBeenCalled();
    });
  });

  describe('bulkUnarchiveJobs', () => {
    it('successfully unarchives multiple jobs', async () => {
      const mockApiResponse: ApiResponse<void> = {
        success: true,
        data: undefined
      };
      
      (mockApiClient.patch as any).mockResolvedValue(mockApiResponse);
      
      const jobIds = ['job-1', 'job-2', 'job-3'];
      const result = await jobsService.bulkUnarchiveJobs(jobIds);
      
      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/jobs/bulk-archive', {
        job_ids: jobIds,
        archived: false
      });
      expect(result).toEqual(mockApiResponse);
    });

    it('returns error for empty job IDs array', async () => {
      const result = await jobsService.bulkUnarchiveJobs([]);
      
      expect(result).toEqual({
        data: undefined,
        success: false,
        message: 'At least one job ID is required',
        errors: ['At least one job ID is required']
      });
      
      expect(mockApiClient.patch).not.toHaveBeenCalled();
    });

    it('clears cache on successful bulk unarchive', async () => {
      const mockApiResponse: ApiResponse<void> = {
        success: true,
        data: undefined
      };
      
      (mockApiClient.patch as any).mockResolvedValue(mockApiResponse);
      
      const clearCachePatternSpy = vi.spyOn(jobsService as any, 'clearCachePattern');
      
      await jobsService.bulkUnarchiveJobs(['job-1', 'job-2']);
      
      expect(clearCachePatternSpy).toHaveBeenCalledWith('getJob');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('listJobs');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('searchJobs');
      expect(clearCachePatternSpy).toHaveBeenCalledWith('filterJobs');
    });

    it('does not clear cache on failed bulk unarchive', async () => {
      const mockApiResponse: ApiResponse<void> = {
        success: false,
        data: undefined,
        message: 'Bulk unarchive failed'
      };
      
      (mockApiClient.patch as any).mockResolvedValue(mockApiResponse);
      
      const clearCachePatternSpy = vi.spyOn(jobsService as any, 'clearCachePattern');
      
      await jobsService.bulkUnarchiveJobs(['job-1', 'job-2']);
      
      expect(clearCachePatternSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    it('handles archived parameter correctly with other URL parameters', async () => {
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          data: [],
          total: 0,
          page: 1,
          page_size: 10,
          has_next: false,
          has_previous: false
        }
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      await jobsService.listJobs({
        status: 'applied',
        company: 'Big Tech Corp',
        archived: true,
        page: 1,
        page_size: 20
      });
      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/jobs?status=applied&company=Big+Tech+Corp&archived=true&page=1&page_size=20'
      );
    });

    it('handles special characters in company names with archived parameter', async () => {
      const mockApiResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          data: [],
          total: 0,
          page: 1,
          page_size: 10,
          has_next: false,
          has_previous: false
        }
      };
      
      (mockApiClient.get as any).mockResolvedValue(mockApiResponse);
      
      await jobsService.listJobs({
        company: 'AT&T Corp & Co.',
        archived: false
      });
      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/jobs?company=AT%26T+Corp+%26+Co.&archived=false'
      );
    });
  });
});