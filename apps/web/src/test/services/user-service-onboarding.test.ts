import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserServiceImpl } from '@/lib/services/user';
import type { ApiClient, AuthService } from '@/types/services';

describe('UserService Onboarding Methods', () => {
  let userService: UserServiceImpl;
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

    userService = new UserServiceImpl(mockApiClient, mockAuthService);
  });

  describe('updateResumeId', () => {
    it('updates profile with resume_id successfully', async () => {
      const resumeId = 'resume123';
      const mockProfile = {
        id: 'profile1',
        user_id: 'user1',
        resume_id: resumeId,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      vi.mocked(mockApiClient.patch).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const result = await userService.updateResumeId(resumeId);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/user/profile', {
        resume_id: resumeId,
      });
      expect(result.success).toBe(true);
      expect(result.data.resume_id).toBe(resumeId);
    });

    it('handles update failure', async () => {
      const resumeId = 'resume123';

      vi.mocked(mockApiClient.patch).mockResolvedValue({
        success: false,
        message: 'Update failed',
        data: null as any,
      });

      const result = await userService.updateResumeId(resumeId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Update failed');
    });

    it('clears cache on successful update', async () => {
      const resumeId = 'resume123';
      const mockProfile = {
        id: 'profile1',
        user_id: 'user1',
        resume_id: resumeId,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      vi.mocked(mockApiClient.patch).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const clearCacheSpy = vi.spyOn(userService as any, 'clearCachePattern');

      await userService.updateResumeId(resumeId);

      expect(clearCacheSpy).toHaveBeenCalledWith('Profile');
      expect(clearCacheSpy).toHaveBeenCalledWith('FullProfile');
    });
  });

  describe('hasResumeId', () => {
    it('returns true when user has resume_id', async () => {
      const mockProfile = {
        id: 'profile1',
        user_id: 'user1',
        resume_id: 'resume123',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      vi.mocked(mockApiClient.get).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const result = await userService.hasResumeId();

      expect(result).toBe(true);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/user/profile');
    });

    it('returns false when user has no resume_id', async () => {
      const mockProfile = {
        id: 'profile1',
        user_id: 'user1',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      vi.mocked(mockApiClient.get).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const result = await userService.hasResumeId();

      expect(result).toBe(false);
    });

    it('returns false when profile request fails', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({
        success: false,
        message: 'Profile not found',
        data: null as any,
      });

      const result = await userService.hasResumeId();

      expect(result).toBe(false);
    });

    it('returns false when API call throws error', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(new Error('Network error'));

      const result = await userService.hasResumeId();

      expect(result).toBe(false);
    });
  });

  describe('getResumeId', () => {
    it('returns resume_id when available', async () => {
      const resumeId = 'resume123';
      const mockProfile = {
        id: 'profile1',
        user_id: 'user1',
        resume_id: resumeId,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      vi.mocked(mockApiClient.get).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const result = await userService.getResumeId();

      expect(result).toBe(resumeId);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/user/profile');
    });

    it('returns null when resume_id is not available', async () => {
      const mockProfile = {
        id: 'profile1',
        user_id: 'user1',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      vi.mocked(mockApiClient.get).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const result = await userService.getResumeId();

      expect(result).toBe(null);
    });

    it('returns null when profile request fails', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({
        success: false,
        message: 'Profile not found',
        data: null as any,
      });

      const result = await userService.getResumeId();

      expect(result).toBe(null);
    });

    it('returns null when API call throws error', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(new Error('Network error'));

      const result = await userService.getResumeId();

      expect(result).toBe(null);
    });

    it('returns null when profile data is null', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await userService.getResumeId();

      expect(result).toBe(null);
    });
  });
});