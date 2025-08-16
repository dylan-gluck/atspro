import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UserServiceImpl } from '@/lib/services/user'
import type { ApiClient, AuthService } from '@/types/services'
import { 
  mockBetterAuthUser,
  mockUserProfile,
  mockUserSettings,
  mockSubscription,
  createMockApiResponse 
} from '../mocks'

describe('UserServiceImpl', () => {
  let userService: UserServiceImpl
  let mockApiClient: ApiClient
  let mockAuthService: AuthService

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      upload: vi.fn(),
    } as any

    mockAuthService = {
      isInitialized: true,
      initialize: vi.fn(),
      destroy: vi.fn(),
      getCurrentUser: vi.fn(),
      updateUser: vi.fn(),
    } as any

    userService = new UserServiceImpl(mockApiClient, mockAuthService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(userService.isInitialized).toBe(false)
      
      await userService.initialize()
      
      expect(userService.isInitialized).toBe(true)
    })

    it('should initialize auth service if not initialized', async () => {
      mockAuthService.isInitialized = false
      
      await userService.initialize()
      
      expect(mockAuthService.initialize).toHaveBeenCalled()
    })

    it('should destroy successfully', async () => {
      await userService.initialize()
      
      await userService.destroy()
      
      expect(userService.isInitialized).toBe(false)
    })
  })

  describe('Profile Management', () => {
    it('should get full profile successfully', async () => {
      vi.mocked(mockAuthService.getCurrentUser).mockResolvedValue(
        createMockApiResponse(mockBetterAuthUser)
      )
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(mockUserProfile)
      )

      const result = await userService.getFullProfile()

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled()
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/user/profile')
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        user: mockBetterAuthUser,
        profile: mockUserProfile,
      })
    })

    it('should handle unauthenticated user for full profile', async () => {
      vi.mocked(mockAuthService.getCurrentUser).mockResolvedValue(
        createMockApiResponse(null, false, 'User not authenticated')
      )

      const result = await userService.getFullProfile()

      expect(result.success).toBe(false)
      expect(result.message).toBe('User not authenticated')
    })

    it('should get profile successfully', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(mockUserProfile)
      )

      const result = await userService.getProfile()

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/user/profile')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUserProfile)
    })

    it('should update profile successfully', async () => {
      const updatedProfile = { ...mockUserProfile, title: 'Senior Engineer' }
      vi.mocked(mockApiClient.patch).mockResolvedValue(
        createMockApiResponse(updatedProfile)
      )

      const result = await userService.updateProfile({ title: 'Senior Engineer' })

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/user/profile', {
        title: 'Senior Engineer',
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedProfile)
    })

    it('should delete profile successfully', async () => {
      vi.mocked(mockApiClient.delete).mockResolvedValue(
        createMockApiResponse(undefined)
      )

      const result = await userService.deleteProfile()

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/user/profile')
      expect(result.success).toBe(true)
    })
  })

  describe('Settings Management', () => {
    it('should get settings successfully', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(mockUserSettings)
      )

      const result = await userService.getSettings()

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/user/settings')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUserSettings)
    })

    it('should update settings successfully', async () => {
      const updatedSettings = { ...mockUserSettings, theme: 'dark' as const }
      vi.mocked(mockApiClient.patch).mockResolvedValue(
        createMockApiResponse(updatedSettings)
      )

      const result = await userService.updateSettings({ theme: 'dark' })

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/user/settings', {
        theme: 'dark',
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedSettings)
    })
  })

  describe('Subscription Management', () => {
    it('should get subscription successfully', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(mockSubscription)
      )

      const result = await userService.getSubscription()

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/user/subscription')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSubscription)
    })

    it('should update subscription successfully', async () => {
      const updatedSubscription = { ...mockSubscription, plan: 'enterprise' as const }
      vi.mocked(mockApiClient.post).mockResolvedValue(
        createMockApiResponse(updatedSubscription)
      )

      const result = await userService.updateSubscription('enterprise')

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/user/subscription', {
        plan: 'enterprise',
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedSubscription)
    })

    it('should cancel subscription successfully', async () => {
      vi.mocked(mockApiClient.delete).mockResolvedValue(
        createMockApiResponse(undefined)
      )

      const result = await userService.cancelSubscription()

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/user/subscription')
      expect(result.success).toBe(true)
    })
  })

  describe('Better-Auth Integration', () => {
    it('should get current user', async () => {
      vi.mocked(mockAuthService.getCurrentUser).mockResolvedValue(
        createMockApiResponse(mockBetterAuthUser)
      )

      const result = await userService.getCurrentUser()

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockBetterAuthUser)
    })

    it('should update user name', async () => {
      const updatedUser = { ...mockBetterAuthUser, name: 'New Name' }
      vi.mocked(mockAuthService.updateUser).mockResolvedValue(
        createMockApiResponse(updatedUser)
      )

      const result = await userService.updateUserName('New Name')

      expect(mockAuthService.updateUser).toHaveBeenCalledWith({ name: 'New Name' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedUser)
    })

    it('should update user email', async () => {
      const updatedUser = { ...mockBetterAuthUser, email: 'new@example.com' }
      vi.mocked(mockAuthService.updateUser).mockResolvedValue(
        createMockApiResponse(updatedUser)
      )

      const result = await userService.updateUserEmail('new@example.com')

      expect(mockAuthService.updateUser).toHaveBeenCalledWith({ email: 'new@example.com' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedUser)
    })
  })

  describe('Utility Methods', () => {
    it('should get current user ID', async () => {
      vi.mocked(mockAuthService.getCurrentUser).mockResolvedValue(
        createMockApiResponse(mockBetterAuthUser)
      )

      const userId = await userService.getCurrentUserId()

      expect(userId).toBe('user_123')
    })

    it('should return null for no current user', async () => {
      vi.mocked(mockAuthService.getCurrentUser).mockResolvedValue(
        createMockApiResponse(null)
      )

      const userId = await userService.getCurrentUserId()

      expect(userId).toBeNull()
    })

    it('should handle error getting user ID', async () => {
      vi.mocked(mockAuthService.getCurrentUser).mockRejectedValue(
        new Error('Network error')
      )

      const userId = await userService.getCurrentUserId()

      expect(userId).toBeNull()
    })

    it('should check active subscription', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(mockSubscription)
      )

      const hasActive = await userService.hasActiveSubscription()

      expect(hasActive).toBe(true)
    })

    it('should return false for inactive subscription', async () => {
      const inactiveSubscription = { ...mockSubscription, status: 'inactive' as const }
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(inactiveSubscription)
      )

      const hasActive = await userService.hasActiveSubscription()

      expect(hasActive).toBe(false)
    })

    it('should return false for expired subscription', async () => {
      const expiredSubscription = { 
        ...mockSubscription, 
        ends_at: '2023-12-31T23:59:59Z' // Past date
      }
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(expiredSubscription)
      )

      const hasActive = await userService.hasActiveSubscription()

      expect(hasActive).toBe(false)
    })

    it('should handle subscription error', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(
        new Error('Network error')
      )

      const hasActive = await userService.hasActiveSubscription()

      expect(hasActive).toBe(false)
    })

    it('should get user plan', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(mockSubscription)
      )

      const plan = await userService.getUserPlan()

      expect(plan).toBe('premium')
    })

    it('should return free plan for no subscription', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(null, false)
      )

      const plan = await userService.getUserPlan()

      expect(plan).toBe('free')
    })

    it('should return free plan for inactive subscription', async () => {
      const inactiveSubscription = { ...mockSubscription, status: 'inactive' as const }
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(inactiveSubscription)
      )

      const plan = await userService.getUserPlan()

      expect(plan).toBe('free')
    })

    it('should handle error getting user plan', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(
        new Error('Network error')
      )

      const plan = await userService.getUserPlan()

      expect(plan).toBe('free')
    })
  })

  describe('Caching', () => {
    it('should cache profile data', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(mockUserProfile)
      )

      // First call
      await userService.getProfile()
      // Second call should use cache
      await userService.getProfile()

      expect(mockApiClient.get).toHaveBeenCalledTimes(1)
    })

    it('should clear cache after profile update', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(
        createMockApiResponse(mockUserProfile)
      )
      vi.mocked(mockApiClient.patch).mockResolvedValue(
        createMockApiResponse(mockUserProfile)
      )

      // Get profile (caches)
      await userService.getProfile()
      
      // Update profile (should clear cache)
      await userService.updateProfile({ title: 'New Title' })
      
      // Get profile again (should make new API call)
      await userService.getProfile()

      expect(mockApiClient.get).toHaveBeenCalledTimes(2)
    })
  })
})