import type { 
  ResumeService, 
  ApiClient, 
  AuthService,
  ApiResponse, 
  ResumeVersion,
  OptimizationResult,
  Resume
} from '@/types/services';
import { BaseServiceImpl } from './base';

export class ResumeServiceImpl extends BaseServiceImpl implements ResumeService {
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

  // Resume Management
  async getResume(): Promise<ApiResponse<ResumeVersion>> {
    const cacheKey = this.getCacheKey('getResume');
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<ResumeVersion>('/api/resume');
    });
  }

  async updateResume(resumeData: Resume): Promise<ApiResponse<ResumeVersion>> {
    const response = await this.apiClient.put<ResumeVersion>('/api/resume', resumeData);
    
    if (response.success) {
      // Clear resume-related caches
      this.clearCachePattern('resume');
      this.clearCachePattern('Resume');
      this.clearCachePattern('versions');
      this.clearCachePattern('analytics');
    }
    
    return response;
  }

  async createResume(resumeData: Resume): Promise<ApiResponse<ResumeVersion>> {
    const response = await this.apiClient.post<ResumeVersion>('/api/resume', resumeData);
    
    if (response.success) {
      // Clear resume-related caches
      this.clearCachePattern('resume');
      this.clearCachePattern('Resume');
      this.clearCachePattern('versions');
    }
    
    return response;
  }

  async deleteResume(): Promise<ApiResponse<void>> {
    const response = await this.apiClient.delete<void>('/api/resume');
    
    if (response.success) {
      // Clear all resume-related caches
      this.cache.clear();
    }
    
    return response;
  }

  // Version Management
  async getVersions(): Promise<ApiResponse<ResumeVersion[]>> {
    const cacheKey = this.getCacheKey('getVersions');
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<ResumeVersion[]>('/api/resume/versions');
    }, 120000); // Cache for 2 minutes
  }

  async restoreVersion(version: number): Promise<ApiResponse<ResumeVersion>> {
    const response = await this.apiClient.post<ResumeVersion>('/api/resume/restore', { version });
    
    if (response.success) {
      // Clear resume-related caches since we restored a version
      this.clearCachePattern('resume');
      this.clearCachePattern('Resume');
      this.clearCachePattern('versions');
    }
    
    return response;
  }

  // Task status polling
  async getTaskStatus(taskId: string): Promise<ApiResponse<{
    id: string;
    status: string;
    progress: number;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    task_type: string;
    user_id: string;
    priority: number;
    error_message?: string;
    result_id?: string;
    estimated_duration_ms?: number;
    max_retries: number;
    retry_count: number;
  }>> {
    return this.apiClient.get(`/api/tasks/${taskId}`);
  }

  async getTaskResult(taskId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/api/tasks/${taskId}/result`);
  }

  async pollTaskUntilComplete(
    taskId: string, 
    onProgress?: (progress: number, status: string) => void,
    maxWaitTime: number = 300000 // 5 minutes default
  ): Promise<ApiResponse<any>> {
    const startTime = Date.now();
    const pollInterval = 1000; // Poll every second

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const statusResponse = await this.getTaskStatus(taskId);
        
        if (!statusResponse.success) {
          return {
            data: null,
            success: false,
            message: statusResponse.message || 'Failed to get task status',
            errors: statusResponse.errors || ['Failed to get task status']
          };
        }

        const task = statusResponse.data;
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(task.progress, task.status);
        }

        // Check if task is complete
        if (task.status === 'completed') {
          // Get the result
          const resultResponse = await this.getTaskResult(taskId);
          return resultResponse;
        } else if (task.status === 'failed') {
          return {
            data: null,
            success: false,
            message: task.error_message || 'Task failed',
            errors: [task.error_message || 'Task failed']
          };
        } else if (task.status === 'cancelled') {
          return {
            data: null,
            success: false,
            message: 'Task was cancelled',
            errors: ['Task was cancelled']
          };
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('Error polling task status:', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    // Timeout reached
    return {
      data: null,
      success: false,
      message: 'Task polling timeout reached',
      errors: ['Task polling timeout reached']
    };
  }

  // File Operations
  async parseResume(file: File): Promise<ApiResponse<{ task_id: string; resume_id: string }>> {
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
        data: null as unknown as { task_id: string; resume_id: string },
        success: false,
        message: 'Invalid file type. Please upload a PDF, DOC, DOCX, TXT, or MD file.',
        errors: ['Invalid file type']
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        data: null as unknown as { task_id: string; resume_id: string },
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        errors: ['File size too large']
      };
    }

    // Get current user for authentication header
    const userResponse = await this.authService.getCurrentUser();
    if (!userResponse.success || !userResponse.data) {
      return {
        data: null as unknown as { task_id: string; resume_id: string },
        success: false,
        message: 'User not authenticated',
        errors: ['User not authenticated']
      };
    }

    const userId = userResponse.data.id;
    const response = await this.apiClient.upload<{ task_id: string; resume_id: string }>('/api/parse', file, {
      headers: {
        'X-User-Id': userId
      }
    });
    
    if (response.success) {
      // Clear resume caches since we have new content
      this.clearCachePattern('resume');
      this.clearCachePattern('Resume');
    }
    
    return response;
  }

  async uploadResume(file: File): Promise<ApiResponse<Resume>> {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        data: null as unknown as Resume,
        success: false,
        message: 'Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.',
        errors: ['Invalid file type']
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        data: null as unknown as Resume,
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        errors: ['File size too large']
      };
    }

    const response = await this.apiClient.upload<Resume>('/api/resume/upload', file);
    
    if (response.success) {
      // Clear resume caches since we uploaded new content
      this.clearCachePattern('resume');
      this.clearCachePattern('Resume');
    }
    
    return response;
  }

  async exportResume(format: 'pdf' | 'docx' | 'txt'): Promise<ApiResponse<Blob>> {
    // Don't cache file exports as they might contain dynamic data
    return this.apiClient.get<Blob>(`/api/resume/export?format=${format}`);
  }

  // Optimization
  async optimizeForJob(jobId: string): Promise<ApiResponse<OptimizationResult>> {
    if (!jobId) {
      return {
        data: null as unknown as OptimizationResult,
        success: false,
        message: 'Job ID is required',
        errors: ['Job ID is required']
      };
    }

    const response = await this.apiClient.post<OptimizationResult>('/api/resume/optimize', { job_id: jobId });
    
    if (response.success) {
      // Clear optimization caches
      this.clearCachePattern('optimization');
      this.clearCachePattern('Optimization');
      this.clearCachePattern('analytics');
    }
    
    return response;
  }

  async getOptimizations(): Promise<ApiResponse<OptimizationResult[]>> {
    const cacheKey = this.getCacheKey('getOptimizations');
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<OptimizationResult[]>('/api/resume/optimizations');
    }, 60000); // Cache for 1 minute
  }

  async getOptimization(id: string): Promise<ApiResponse<OptimizationResult>> {
    if (!id) {
      return {
        data: null as unknown as OptimizationResult,
        success: false,
        message: 'Optimization ID is required',
        errors: ['Optimization ID is required']
      };
    }

    const cacheKey = this.getCacheKey('getOptimization', id);
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<OptimizationResult>(`/api/resume/optimizations/${id}`);
    });
  }

  // Analytics
  async getResumeAnalytics(): Promise<ApiResponse<{
    total_optimizations: number;
    avg_score: number;
    top_skills: string[];
    optimization_history: Array<{date: string; score: number}>;
  }>> {
    const cacheKey = this.getCacheKey('getResumeAnalytics');
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<{
        total_optimizations: number;
        avg_score: number;
        top_skills: string[];
        optimization_history: Array<{date: string; score: number}>;
      }>('/api/resume/analytics');
    }, 300000); // Cache for 5 minutes
  }

  // Utility methods
  async hasResume(): Promise<boolean> {
    try {
      const response = await this.getResume();
      return response.success && !!response.data;
    } catch {
      return false;
    }
  }

  async getActiveResumeId(): Promise<string | null> {
    try {
      const response = await this.getResume();
      if (response.success && response.data) {
        return response.data.id;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getResumeSkills(): Promise<string[]> {
    try {
      const response = await this.getResume();
      if (response.success && response.data?.resume_data?.skills) {
        return response.data.resume_data.skills;
      }
      return [];
    } catch {
      return [];
    }
  }

  async getOptimizationHistory(): Promise<OptimizationResult[]> {
    try {
      const response = await this.getOptimizations();
      if (response.success && response.data) {
        return response.data.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return [];
    } catch {
      return [];
    }
  }

  // Method to check if optimization is available for current plan
  async canOptimize(): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // This would typically check with the user service for subscription status
      // For now, return a basic implementation
      const hasResume = await this.hasResume();
      if (!hasResume) {
        return {
          allowed: false,
          reason: 'No resume found. Please upload or create a resume first.'
        };
      }

      return { allowed: true };
    } catch {
      return {
        allowed: false,
        reason: 'Unable to verify optimization availability.'
      };
    }
  }
}