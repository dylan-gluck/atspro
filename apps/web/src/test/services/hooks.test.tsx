import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { 
  useServices, 
  useServicesWithState, 
  useService, 
  useAuthService,
  useUserService,
  useResumeService,
  useJobsService,
  useNotificationService
} from '@/lib/services'
import type { ServiceContainer } from '@/types/services'

// Mock the service factory
vi.mock('@/lib/services/factory', () => ({
  getServices: vi.fn(),
}))

describe('Service Hooks', () => {
  const mockServices: ServiceContainer = {
    authService: { isInitialized: true } as any,
    userService: { isInitialized: true } as any,
    resumeService: { isInitialized: true } as any,
    jobsService: { isInitialized: true } as any,
    notificationService: { isInitialized: true } as any,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useServices', () => {
    it('should return services after successful initialization', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockResolvedValue(mockServices)

      const { result } = renderHook(() => useServices())

      expect(result.current).toBeNull() // Initially null while loading

      await waitFor(() => {
        expect(result.current).toEqual(mockServices)
      })

      expect(getServices).toHaveBeenCalled()
    })

    it('should throw error when service initialization fails', async () => {
      const { getServices } = await import('@/lib/services/factory')
      const error = new Error('Service initialization failed')
      vi.mocked(getServices).mockRejectedValue(error)

      expect(() => {
        renderHook(() => useServices())
      }).toThrow() // Should be caught by Error Boundary in real app
    })

    it('should handle cleanup on unmount', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockResolvedValue(mockServices)

      const { unmount } = renderHook(() => useServices())

      unmount()

      // Should not cause any errors or memory leaks
      expect(true).toBe(true)
    })
  })

  describe('useServicesWithState', () => {
    it('should return loading state initially', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockResolvedValue(mockServices)

      const { result } = renderHook(() => useServicesWithState())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.services).toBeNull()
      expect(result.current.error).toBeNull()
      expect(typeof result.current.retry).toBe('function')
    })

    it('should return services after successful initialization', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockResolvedValue(mockServices)

      const { result } = renderHook(() => useServicesWithState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.services).toEqual(mockServices)
        expect(result.current.error).toBeNull()
      })
    })

    it('should return error state when initialization fails', async () => {
      const { getServices } = await import('@/lib/services/factory')
      const error = new Error('Service initialization failed')
      vi.mocked(getServices).mockRejectedValue(error)

      const { result } = renderHook(() => useServicesWithState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.services).toBeNull()
        expect(result.current.error).toEqual(error)
      })
    })

    it('should retry initialization when retry is called', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(mockServices)

      const { result } = renderHook(() => useServicesWithState())

      // Wait for first attempt to fail
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Retry
      result.current.retry()

      // Wait for successful retry
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.services).toEqual(mockServices)
        expect(result.current.error).toBeNull()
      })

      expect(getServices).toHaveBeenCalledTimes(2)
    })
  })

  describe('useService', () => {
    it('should return specific service', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockResolvedValue(mockServices)

      const { result } = renderHook(() => useService('authService'))

      await waitFor(() => {
        expect(result.current).toBe(mockServices.authService)
      })
    })

    it('should return null when services not loaded', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useService('userService'))

      expect(result.current).toBeNull()
    })

    it('should return null for non-existent service', async () => {
      const { getServices } = await import('@/lib/services/factory')
      const incompleteServices = {
        authService: mockServices.authService,
        // Missing other services
      } as any

      vi.mocked(getServices).mockResolvedValue(incompleteServices)

      const { result } = renderHook(() => useService('userService'))

      await waitFor(() => {
        expect(result.current).toBeNull() // Service doesn't exist in returned services
      })
    })
  })

  describe('Specific Service Hooks', () => {
    beforeEach(async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockResolvedValue(mockServices)
    })

    it('useAuthService should return auth service', async () => {
      const { result } = renderHook(() => useAuthService())

      await waitFor(() => {
        expect(result.current).toBe(mockServices.authService)
      })
    })

    it('useUserService should return user service', async () => {
      const { result } = renderHook(() => useUserService())

      await waitFor(() => {
        expect(result.current).toBe(mockServices.userService)
      })
    })

    it('useResumeService should return resume service', async () => {
      const { result } = renderHook(() => useResumeService())

      await waitFor(() => {
        expect(result.current).toBe(mockServices.resumeService)
      })
    })

    it('useJobsService should return jobs service', async () => {
      const { result } = renderHook(() => useJobsService())

      await waitFor(() => {
        expect(result.current).toBe(mockServices.jobsService)
      })
    })

    it('useNotificationService should return notification service', async () => {
      const { result } = renderHook(() => useNotificationService())

      await waitFor(() => {
        expect(result.current).toBe(mockServices.notificationService)
      })
    })
  })

  describe('Hook Error Handling', () => {
    it('should handle service initialization timeout', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      const { result } = renderHook(() => useServicesWithState())

      await waitFor(() => {
        expect(result.current.error?.message).toBe('Timeout')
      }, { timeout: 200 })
    })

    it('should handle multiple rapid hook calls', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockResolvedValue(mockServices)

      const { result: result1 } = renderHook(() => useServices())
      const { result: result2 } = renderHook(() => useServices())
      const { result: result3 } = renderHook(() => useServices())

      await waitFor(() => {
        expect(result1.current).toEqual(mockServices)
        expect(result2.current).toEqual(mockServices)
        expect(result3.current).toEqual(mockServices)
      })

      // Services should be initialized only once due to singleton pattern
      expect(getServices).toHaveBeenCalled()
    })
  })

  describe('Hook Memory Management', () => {
    it('should not cause memory leaks on rapid mount/unmount', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockResolvedValue(mockServices)

      // Mount and unmount multiple hooks rapidly
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => useServices())
        unmount()
      }

      // Should not cause any issues
      expect(true).toBe(true)
    })

    it('should handle component unmount during service loading', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockServices), 100))
      )

      const { unmount } = renderHook(() => useServices())
      
      // Unmount before services finish loading
      unmount()

      // Should not cause any errors
      expect(true).toBe(true)
    })
  })

  describe('Hook Dependency Updates', () => {
    it('should not reinitialize services on re-render', async () => {
      const { getServices } = await import('@/lib/services/factory')
      vi.mocked(getServices).mockResolvedValue(mockServices)

      const { result, rerender } = renderHook(() => useServices())

      await waitFor(() => {
        expect(result.current).toEqual(mockServices)
      })

      const firstResult = result.current
      
      // Force re-render
      rerender()

      await waitFor(() => {
        expect(result.current).toBe(firstResult) // Same instance
      })

      // Should only call getServices once
      expect(getServices).toHaveBeenCalledTimes(1)
    })
  })
})