import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthServiceImpl } from '@/lib/services/auth'
import { ApiClientImpl } from '@/lib/services/api-client'
import { authClient } from '@/lib/auth-client'
import { 
  mockBetterAuthUser, 
  mockBetterAuthSession, 
  createMockApiResponse 
} from '../mocks'

// Mock the auth client
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
    getSession: vi.fn(),
    updateUser: vi.fn(),
    sendVerificationEmail: vi.fn(),
    verifyEmail: vi.fn(),
    changePassword: vi.fn(),
    forgetPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}))

describe('AuthServiceImpl', () => {
  let authService: AuthServiceImpl
  let mockApiClient: ApiClientImpl

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      upload: vi.fn(),
    } as any

    authService = new AuthServiceImpl(mockApiClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(authService.isInitialized).toBe(false)
      
      await authService.initialize()
      
      expect(authService.isInitialized).toBe(true)
    })

    it('should destroy successfully', async () => {
      await authService.initialize()
      expect(authService.isInitialized).toBe(true)
      
      await authService.destroy()
      
      expect(authService.isInitialized).toBe(false)
    })
  })

  describe('Authentication', () => {
    it('should sign in successfully', async () => {
      vi.mocked(authClient.signIn.email).mockResolvedValue({
        data: {
          user: mockBetterAuthUser,
          token: 'session_token_123'
        },
        error: null,
      })

      const result = await authService.signIn('test@example.com', 'password123')

      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
      expect(result.data?.user).toEqual(mockBetterAuthUser)
      expect(result.data?.session.token).toBe('session_token_123')
      expect(result.message).toBe('Signed in successfully')
    })

    it('should handle sign in error', async () => {
      vi.mocked(authClient.signIn.email).mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      })

      const result = await authService.signIn('test@example.com', 'wrongpassword')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid credentials')
      expect(result.errors).toEqual(['Invalid credentials'])
    })

    it('should handle sign in exception', async () => {
      vi.mocked(authClient.signIn.email).mockRejectedValue(new Error('Network error'))

      const result = await authService.signIn('test@example.com', 'password123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Network error')
    })

    it('should sign up successfully', async () => {
      vi.mocked(authClient.signUp.email).mockResolvedValue({
        data: { user: mockBetterAuthUser },
        error: null,
      })

      const result = await authService.signUp('test@example.com', 'password123', 'Test User')

      expect(authClient.signUp.email).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockBetterAuthUser)
      expect(result.message).toBe('Account created successfully')
    })

    it('should handle sign up error', async () => {
      vi.mocked(authClient.signUp.email).mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' },
      })

      const result = await authService.signUp('test@example.com', 'password123', 'Test User')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Email already exists')
    })

    it('should sign out successfully', async () => {
      vi.mocked(authClient.signOut).mockResolvedValue(undefined)

      const result = await authService.signOut()

      expect(authClient.signOut).toHaveBeenCalledWith()
      expect(result.success).toBe(true)
      expect(result.message).toBe('Signed out successfully')
    })

    it('should handle sign out error', async () => {
      vi.mocked(authClient.signOut).mockRejectedValue(new Error('Sign out failed'))

      const result = await authService.signOut()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Sign out failed')
    })
  })

  describe('Session Management', () => {
    it('should get session successfully', async () => {
      vi.mocked(authClient.getSession).mockResolvedValue({
        data: mockBetterAuthSession
      })

      const result = await authService.getSession()

      expect(authClient.getSession).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockBetterAuthSession)
      expect(result.message).toBe('Session retrieved')
    })

    it('should handle no session', async () => {
      vi.mocked(authClient.getSession).mockResolvedValue({
        data: null
      })

      const result = await authService.getSession()

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
      expect(result.message).toBe('No active session')
    })

    it('should validate session successfully', async () => {
      vi.mocked(authClient.getSession).mockResolvedValue({
        data: mockBetterAuthSession
      })

      const isValid = await authService.validateSession()

      expect(isValid).toBe(true)
    })

    it('should return false for invalid session', async () => {
      vi.mocked(authClient.getSession).mockResolvedValue({
        data: null
      })

      const isValid = await authService.validateSession()

      expect(isValid).toBe(false)
    })

    it('should handle session validation error', async () => {
      vi.mocked(authClient.getSession).mockRejectedValue(new Error('Session error'))

      const isValid = await authService.validateSession()

      expect(isValid).toBe(false)
    })
  })

  describe('User Management', () => {
    it('should get current user successfully', async () => {
      vi.mocked(authClient.getSession).mockResolvedValue({
        data: mockBetterAuthSession
      })

      const result = await authService.getCurrentUser()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockBetterAuthUser)
      expect(result.message).toBe('User retrieved')
    })

    it('should handle no current user', async () => {
      vi.mocked(authClient.getSession).mockResolvedValue({
        data: null
      })

      const result = await authService.getCurrentUser()

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
      expect(result.message).toBe('No user found')
    })

    it('should update user name successfully', async () => {
      const updatedUser = { ...mockBetterAuthUser, name: 'Updated Name' }
      vi.mocked(authClient.updateUser).mockResolvedValue({
        data: { status: true },
        error: null,
      })
      // Mock getCurrentUser to return updated user
      vi.mocked(authClient.getSession).mockResolvedValue({
        data: { user: updatedUser, session: mockBetterAuthSession.session }
      })

      const result = await authService.updateUser({ name: 'Updated Name' })

      expect(authClient.updateUser).toHaveBeenCalledWith({
        name: 'Updated Name',
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedUser)
      expect(result.message).toBe('User updated successfully')
    })

    it('should update user email successfully', async () => {
      const result = await authService.updateUser({ 
        email: 'updated@example.com' 
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Email updates require separate verification flow')
    })

    it('should handle user update error', async () => {
      vi.mocked(authClient.updateUser).mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      })

      const result = await authService.updateUser({ name: 'New Name' })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Update failed')
    })

    it('should delete account successfully', async () => {
      vi.mocked(mockApiClient.delete).mockResolvedValue(
        createMockApiResponse(undefined, true, 'Account deleted')
      )

      const result = await authService.deleteAccount()

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/user/delete-account')
      expect(result.success).toBe(true)
    })
  })

  describe('Email Verification', () => {
    it('should send verification email successfully', async () => {
      // Mock getCurrentUser to return user with email
      vi.mocked(authClient.getSession).mockResolvedValue({
        data: mockBetterAuthSession
      })
      vi.mocked(authClient.sendVerificationEmail).mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await authService.sendVerificationEmail()

      expect(authClient.sendVerificationEmail).toHaveBeenCalledWith({
        email: mockBetterAuthUser.email
      })
      expect(result.success).toBe(true)
      expect(result.message).toBe('Verification email sent')
    })

    it('should handle verification email error', async () => {
      // Mock no authenticated user
      vi.mocked(authClient.getSession).mockResolvedValue({
        data: null
      })

      const result = await authService.sendVerificationEmail()

      expect(result.success).toBe(false)
      expect(result.message).toBe('No authenticated user found')
    })

    it('should verify email successfully', async () => {
      vi.mocked(authClient.verifyEmail).mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await authService.verifyEmail('verification-token')

      expect(authClient.verifyEmail).toHaveBeenCalledWith({
        query: { token: 'verification-token' },
      })
      expect(result.success).toBe(true)
      expect(result.message).toBe('Email verified successfully')
    })
  })

  describe('Password Management', () => {
    it('should change password successfully', async () => {
      vi.mocked(authClient.changePassword).mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await authService.changePassword('currentPass', 'newPass')

      expect(authClient.changePassword).toHaveBeenCalledWith({
        currentPassword: 'currentPass',
        newPassword: 'newPass',
        revokeOtherSessions: true,
      })
      expect(result.success).toBe(true)
      expect(result.message).toBe('Password changed successfully')
    })

    it('should request password reset successfully', async () => {
      vi.mocked(authClient.forgetPassword).mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await authService.requestPasswordReset('test@example.com')

      expect(authClient.forgetPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        redirectTo: '/reset-password',
      })
      expect(result.success).toBe(true)
      expect(result.message).toBe('Password reset email sent')
    })

    it('should confirm password reset successfully', async () => {
      vi.mocked(authClient.resetPassword).mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await authService.confirmPasswordReset('reset-token', 'newPassword')

      expect(authClient.resetPassword).toHaveBeenCalledWith({
        token: 'reset-token',
        newPassword: 'newPassword',
      })
      expect(result.success).toBe(true)
      expect(result.message).toBe('Password reset successfully')
    })
  })

  describe('Better-Auth Client Access', () => {
    it('should return better-auth client', () => {
      const client = authService.getBetterAuthClient()

      expect(client).toBe(authClient)
    })
  })
})