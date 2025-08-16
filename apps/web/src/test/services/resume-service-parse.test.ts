import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResumeServiceImpl } from '@/lib/services/resume';
import type { ApiClient, AuthService } from '@/types/services';

describe('ResumeService parseResume Method', () => {
  let resumeService: ResumeServiceImpl;
  let mockApiClient: ApiClient;
  let mockAuthService: AuthService;

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      upload: vi.fn(),
    };

    mockAuthService = {
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
      getBetterAuthClient: vi.fn(),
    };

    resumeService = new ResumeServiceImpl(mockApiClient, mockAuthService);
  });

  describe('file validation', () => {
    it('accepts valid PDF file', async () => {
      const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
      const mockResumeData = { id: 'resume123', title: 'Software Engineer' };

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: true,
        data: mockResumeData,
      });

      const result = await resumeService.parseResume(file);

      expect(mockApiClient.upload).toHaveBeenCalledWith('/api/parse', file);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResumeData);
    });

    it('accepts valid DOCX file', async () => {
      const file = new File(['test content'], 'resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const mockResumeData = { id: 'resume123', title: 'Software Engineer' };

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: true,
        data: mockResumeData,
      });

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(true);
    });

    it('accepts valid DOC file', async () => {
      const file = new File(['test content'], 'resume.doc', { type: 'application/msword' });
      const mockResumeData = { id: 'resume123', title: 'Software Engineer' };

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: true,
        data: mockResumeData,
      });

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(true);
    });

    it('accepts valid TXT file', async () => {
      const file = new File(['test content'], 'resume.txt', { type: 'text/plain' });
      const mockResumeData = { id: 'resume123', title: 'Software Engineer' };

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: true,
        data: mockResumeData,
      });

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(true);
    });

    it('accepts valid MD file', async () => {
      const file = new File(['test content'], 'resume.md', { type: 'text/markdown' });
      const mockResumeData = { id: 'resume123', title: 'Software Engineer' };

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: true,
        data: mockResumeData,
      });

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(true);
    });

    it('rejects invalid file type', async () => {
      const file = new File(['test content'], 'resume.jpg', { type: 'image/jpeg' });

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid file type. Please upload a PDF, DOC, DOCX, TXT, or MD file.');
      expect(result.errors).toContain('Invalid file type');
      expect(mockApiClient.upload).not.toHaveBeenCalled();
    });

    it('rejects file larger than 10MB', async () => {
      const largeContent = 'a'.repeat(11 * 1024 * 1024); // 11MB
      const file = new File([largeContent], 'resume.pdf', { type: 'application/pdf' });

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(false);
      expect(result.message).toBe('File size too large. Maximum size is 10MB.');
      expect(result.errors).toContain('File size too large');
      expect(mockApiClient.upload).not.toHaveBeenCalled();
    });

    it('accepts file exactly at 10MB limit', async () => {
      const maxContent = 'a'.repeat(10 * 1024 * 1024); // Exactly 10MB
      const file = new File([maxContent], 'resume.pdf', { type: 'application/pdf' });
      const mockResumeData = { id: 'resume123', title: 'Software Engineer' };

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: true,
        data: mockResumeData,
      });

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(true);
      expect(mockApiClient.upload).toHaveBeenCalledWith('/api/parse', file);
    });
  });

  describe('API integration', () => {
    it('successfully parses resume and clears cache', async () => {
      const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
      const mockResumeData = { id: 'resume123', title: 'Software Engineer' };

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: true,
        data: mockResumeData,
      });

      const clearCacheSpy = vi.spyOn(resumeService as any, 'clearCachePattern');

      const result = await resumeService.parseResume(file);

      expect(mockApiClient.upload).toHaveBeenCalledWith('/api/parse', file);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResumeData);
      expect(clearCacheSpy).toHaveBeenCalledWith('resume');
      expect(clearCacheSpy).toHaveBeenCalledWith('Resume');
    });

    it('handles API failure', async () => {
      const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: false,
        message: 'Parse failed',
        data: null as unknown,
      });

      const clearCacheSpy = vi.spyOn(resumeService as any, 'clearCachePattern');

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Parse failed');
      expect(clearCacheSpy).not.toHaveBeenCalled();
    });

    it('handles network error', async () => {
      const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });

      vi.mocked(mockApiClient.upload).mockRejectedValue(new Error('Network error'));

      await expect(resumeService.parseResume(file)).rejects.toThrow('Network error');
    });

    it('does not clear cache on API failure', async () => {
      const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: false,
        message: 'Server error',
        data: null as unknown,
      });

      const clearCacheSpy = vi.spyOn(resumeService as any, 'clearCachePattern');

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(false);
      expect(clearCacheSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles empty file', async () => {
      const file = new File([''], 'resume.pdf', { type: 'application/pdf' });
      const mockResumeData = { id: 'resume123', title: 'Software Engineer' };

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: true,
        data: mockResumeData,
      });

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(true);
      expect(mockApiClient.upload).toHaveBeenCalledWith('/api/parse', file);
    });

    it('handles file with no extension', async () => {
      const file = new File(['test content'], 'resume', { type: 'application/pdf' });
      const mockResumeData = { id: 'resume123', title: 'Software Engineer' };

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: true,
        data: mockResumeData,
      });

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(true);
    });

    it('handles file with special characters in name', async () => {
      const file = new File(['test content'], 'résumé-v2.0 (final).pdf', { type: 'application/pdf' });
      const mockResumeData = { id: 'resume123', title: 'Software Engineer' };

      vi.mocked(mockApiClient.upload).mockResolvedValue({
        success: true,
        data: mockResumeData,
      });

      const result = await resumeService.parseResume(file);

      expect(result.success).toBe(true);
      expect(mockApiClient.upload).toHaveBeenCalledWith('/api/parse', file);
    });
  });
});