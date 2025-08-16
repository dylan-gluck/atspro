import type { 
  JobsService, 
  ApiClient, 
  AuthService,
  ApiResponse, 
  PaginatedResponse,
  JobEntity,
  JobStatus,
  JobDocument,
  Job
} from '@/types/services';
import { BaseServiceImpl } from './base';

export class JobsServiceImpl extends BaseServiceImpl implements JobsService {
  private authService: AuthService;

  constructor(apiClient: ApiClient, authService: AuthService) {
    super(apiClient);
    this.authService = authService;
  }

  protected async onInitialize(): Promise<void> {
    // Ensure auth service is initialized
    if (!this.authService.isInitialized) {
      await this.authService.initialize();
    }
  }

  protected async onDestroy(): Promise<void> {
    // Clean up any subscriptions or listeners
  }

  // Job Management
  async listJobs(params?: {
    status?: string;
    company?: string;
    archived?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<JobEntity>>> {
    const cacheKey = this.getCacheKey('listJobs', params);
    
    return this.withCache(cacheKey, async () => {
      const queryParams = new URLSearchParams();
      
      if (params?.status) queryParams.append('status', params.status);
      if (params?.company) queryParams.append('company', params.company);
      if (params?.archived !== undefined) queryParams.append('archived', params.archived.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
      
      const url = `/api/jobs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return this.apiClient.get<PaginatedResponse<JobEntity>>(url);
    }, 60000); // Cache for 1 minute
  }
  
  async getJob(id: string): Promise<ApiResponse<JobEntity>> {
    if (!id) {
      return {
        data: null as unknown as JobEntity,
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      };
    }

    const cacheKey = this.getCacheKey('getJob', id);
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<JobEntity>(`/api/jobs/${id}`);
    });
  }

  async createJob(jobUrl: string): Promise<ApiResponse<JobEntity>> {
    if (!jobUrl) {
      return {
        data: null as unknown as JobEntity,
        success: false,
        message: 'Job URL is required',
        errors: ['Job URL is required']
      };
    }

    // Basic URL validation
    try {
      new URL(jobUrl);
    } catch {
      return {
        data: null as unknown as JobEntity,
        success: false,
        message: 'Invalid URL format',
        errors: ['Invalid URL format']
      };
    }

    const response = await this.apiClient.post<JobEntity>('/api/jobs', { job_url: jobUrl });
    
    if (response.success) {
      // Clear job list caches
      this.clearCachePattern('listJobs');
      this.clearCachePattern('searchJobs');
      this.clearCachePattern('filterJobs');
    }
    
    return response;
  }

  async parseJobFromDocument(file: File): Promise<ApiResponse<JobEntity>> {
    if (!file) {
      return {
        data: null as unknown as JobEntity,
        success: false,
        message: 'File is required',
        errors: ['File is required']
      };
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        data: null as unknown as JobEntity,
        success: false,
        message: 'Invalid file type. Only PDF, DOCX, DOC, TXT, and MD files are supported.',
        errors: ['Invalid file type']
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        data: null as unknown as JobEntity,
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        errors: ['File size too large']
      };
    }

    const response = await this.apiClient.upload<JobEntity>('/api/job/parse-document', file);
    
    if (response.success) {
      // Clear job list caches
      this.clearCachePattern('listJobs');
      this.clearCachePattern('searchJobs');
      this.clearCachePattern('filterJobs');
    }
    
    return response;
  }

  async updateJob(id: string, updates: Partial<JobEntity>): Promise<ApiResponse<JobEntity>> {
    if (!id) {
      return {
        data: null as unknown as JobEntity,
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      };
    }

    const response = await this.apiClient.patch<JobEntity>(`/api/jobs/${id}`, updates);
    
    if (response.success) {
      // Clear job-related caches
      this.clearCachePattern('getJob');
      this.clearCachePattern('listJobs');
      this.clearCachePattern('searchJobs');
      this.clearCachePattern('filterJobs');
    }
    
    return response;
  }

  async deleteJob(id: string): Promise<ApiResponse<void>> {
    if (!id) {
      return {
        data: undefined,
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      };
    }

    const response = await this.apiClient.delete<void>(`/api/jobs/${id}`);
    
    if (response.success) {
      // Clear job-related caches
      this.clearCachePattern('getJob');
      this.clearCachePattern('listJobs');
      this.clearCachePattern('searchJobs');
      this.clearCachePattern('filterJobs');
      this.clearCachePattern('getDocuments');
    }
    
    return response;
  }

  // Job Status Management
  async updateStatus(id: string, status: JobStatus): Promise<ApiResponse<JobEntity>> {
    if (!id) {
      return {
        data: null as unknown as JobEntity,
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      };
    }

    const response = await this.apiClient.patch<JobEntity>(`/api/jobs/${id}/status`, status);
    
    if (response.success) {
      // Clear job-related caches
      this.clearCachePattern('getJob');
      this.clearCachePattern('listJobs');
      this.clearCachePattern('searchJobs');
      this.clearCachePattern('filterJobs');
    }
    
    return response;
  }

  async bulkUpdateStatus(jobIds: string[], status: JobStatus): Promise<ApiResponse<void>> {
    if (!jobIds.length) {
      return {
        data: undefined,
        success: false,
        message: 'At least one job ID is required',
        errors: ['At least one job ID is required']
      };
    }

    const response = await this.apiClient.patch<void>('/api/jobs/bulk-status', {
      job_ids: jobIds,
      status
    });
    
    if (response.success) {
      // Clear job-related caches
      this.clearCachePattern('getJob');
      this.clearCachePattern('listJobs');
      this.clearCachePattern('searchJobs');
      this.clearCachePattern('filterJobs');
    }
    
    return response;
  }

  // Document Management
  async getDocuments(jobId: string): Promise<ApiResponse<JobDocument[]>> {
    if (!jobId) {
      return {
        data: [],
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      };
    }

    const cacheKey = this.getCacheKey('getDocuments', jobId);
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<JobDocument[]>(`/api/jobs/${jobId}/documents`);
    });
  }

  async uploadDocument(jobId: string, file: File, type: JobDocument['type']): Promise<ApiResponse<JobDocument>> {
    if (!jobId) {
      return {
        data: null as unknown as JobDocument,
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      };
    }

    // Validate file type based on document type
    const allowedTypes: Record<JobDocument['type'], string[]> = {
      resume: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ],
      cover_letter: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ],
      portfolio: [
        'application/pdf',
        'application/zip',
        'image/jpeg',
        'image/png'
      ]
    };

    if (!allowedTypes[type].includes(file.type)) {
      return {
        data: null as unknown as JobDocument,
        success: false,
        message: `Invalid file type for ${type}`,
        errors: [`Invalid file type for ${type}`]
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        data: null as unknown as JobDocument,
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        errors: ['File size too large']
      };
    }

    const response = await this.apiClient.upload<JobDocument>(`/api/jobs/${jobId}/documents?type=${type}`, file);
    
    if (response.success) {
      // Clear document cache
      this.clearCachePattern('getDocuments');
    }
    
    return response;
  }

  async createDocument(jobId: string, content: string, type: JobDocument['type']): Promise<ApiResponse<JobDocument>> {
    if (!jobId) {
      return {
        data: null as unknown as JobDocument,
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      };
    }

    if (!content.trim()) {
      return {
        data: null as unknown as JobDocument,
        success: false,
        message: 'Document content is required',
        errors: ['Document content is required']
      };
    }

    const response = await this.apiClient.post<JobDocument>(`/api/jobs/${jobId}/documents`, {
      content,
      type
    });
    
    if (response.success) {
      // Clear document cache
      this.clearCachePattern('getDocuments');
    }
    
    return response;
  }

  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    if (!documentId) {
      return {
        data: undefined,
        success: false,
        message: 'Document ID is required',
        errors: ['Document ID is required']
      };
    }

    const response = await this.apiClient.delete<void>(`/api/documents/${documentId}`);
    
    if (response.success) {
      // Clear document cache
      this.clearCachePattern('getDocuments');
    }
    
    return response;
  }

  // Job Analysis
  async analyzeJob(jobUrl: string): Promise<ApiResponse<Job>> {
    if (!jobUrl) {
      return {
        data: null as unknown as Job,
        success: false,
        message: 'Job URL is required',
        errors: ['Job URL is required']
      };
    }

    // Basic URL validation
    try {
      new URL(jobUrl);
    } catch {
      return {
        data: null as unknown as Job,
        success: false,
        message: 'Invalid URL format',
        errors: ['Invalid URL format']
      };
    }

    // Don't cache job analysis as it may change
    return this.apiClient.post<Job>('/api/jobs/analyze', { job_url: jobUrl });
  }

  async getJobInsights(id: string): Promise<ApiResponse<{
    skill_match: number;
    experience_match: number;
    missing_skills: string[];
    recommendations: string[];
  }>> {
    if (!id) {
      return {
        data: null as unknown as {
          skill_match: number;
          experience_match: number;
          missing_skills: string[];
          recommendations: string[];
        },
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      };
    }

    const cacheKey = this.getCacheKey('getJobInsights', id);
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<{
        skill_match: number;
        experience_match: number;
        missing_skills: string[];
        recommendations: string[];
      }>(`/api/jobs/${id}/insights`);
    }, 300000); // Cache for 5 minutes
  }

  // Search & Filtering
  async searchJobs(query: string): Promise<ApiResponse<JobEntity[]>> {
    if (!query.trim()) {
      return {
        data: [],
        success: true,
        message: 'Empty search query'
      };
    }

    const cacheKey = this.getCacheKey('searchJobs', query);
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<JobEntity[]>(`/api/jobs/search?q=${encodeURIComponent(query)}`);
    }, 60000); // Cache for 1 minute
  }

  async filterJobs(filters: {
    status?: string[];
    company?: string[];
    location?: string[];
    salary_range?: [number, number];
    date_range?: [string, string];
  }): Promise<ApiResponse<JobEntity[]>> {
    const cacheKey = this.getCacheKey('filterJobs', filters);
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.post<JobEntity[]>('/api/jobs/filter', filters);
    }, 60000); // Cache for 1 minute
  }

  // Utility methods
  async getJobsByStatus(status: JobStatus['status']): Promise<JobEntity[]> {
    try {
      const response = await this.listJobs({ status });
      return response.success ? response.data.data : [];
    } catch {
      return [];
    }
  }

  async getJobCount(): Promise<number> {
    try {
      const response = await this.listJobs({ page: 1, page_size: 1 });
      return response.success ? response.data.total : 0;
    } catch {
      return 0;
    }
  }

  async getRecentJobs(limit = 10): Promise<JobEntity[]> {
    try {
      const response = await this.listJobs({ page: 1, page_size: limit });
      if (response.success) {
        return response.data.data.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return [];
    } catch {
      return [];
    }
  }

  async getJobsByCompany(company: string): Promise<JobEntity[]> {
    try {
      const response = await this.listJobs({ company });
      return response.success ? response.data.data : [];
    } catch {
      return [];
    }
  }

  // Archive/Unarchive specific methods
  async archiveJob(id: string): Promise<ApiResponse<JobEntity>> {
    return this.updateJob(id, { archived: true });
  }

  async unarchiveJob(id: string): Promise<ApiResponse<JobEntity>> {
    return this.updateJob(id, { archived: false });
  }

  async getArchivedJobs(params?: {
    page?: number;
    page_size?: number;
  }): Promise<JobEntity[]> {
    try {
      const response = await this.listJobs({ 
        ...params, 
        archived: true 
      });
      return response.success ? response.data.data : [];
    } catch {
      return [];
    }
  }

  async getActiveJobs(params?: {
    page?: number;
    page_size?: number;
  }): Promise<JobEntity[]> {
    try {
      const response = await this.listJobs({ 
        ...params, 
        archived: false 
      });
      return response.success ? response.data.data : [];
    } catch {
      return [];
    }
  }

  async bulkArchiveJobs(jobIds: string[]): Promise<ApiResponse<void>> {
    if (!jobIds.length) {
      return {
        data: undefined,
        success: false,
        message: 'At least one job ID is required',
        errors: ['At least one job ID is required']
      };
    }

    const response = await this.apiClient.patch<void>('/api/jobs/bulk-archive', {
      job_ids: jobIds,
      archived: true
    });
    
    if (response.success) {
      // Clear job-related caches
      this.clearCachePattern('getJob');
      this.clearCachePattern('listJobs');
      this.clearCachePattern('searchJobs');
      this.clearCachePattern('filterJobs');
    }
    
    return response;
  }

  async bulkUnarchiveJobs(jobIds: string[]): Promise<ApiResponse<void>> {
    if (!jobIds.length) {
      return {
        data: undefined,
        success: false,
        message: 'At least one job ID is required',
        errors: ['At least one job ID is required']
      };
    }

    const response = await this.apiClient.patch<void>('/api/jobs/bulk-archive', {
      job_ids: jobIds,
      archived: false
    });
    
    if (response.success) {
      // Clear job-related caches
      this.clearCachePattern('getJob');
      this.clearCachePattern('listJobs');
      this.clearCachePattern('searchJobs');
      this.clearCachePattern('filterJobs');
    }
    
    return response;
  }
}