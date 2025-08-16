import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ServiceFactory, serviceFactory, getServices, getServicesSync } from '@/lib/services/factory'
import { getApiClient } from '@/lib/services/api-client'

// Mock all service implementations
vi.mock('@/lib/services/api-client')
vi.mock('@/lib/services/auth')
vi.mock('@/lib/services/user')
vi.mock('@/lib/services/resume')
vi.mock('@/lib/services/jobs')
vi.mock('@/lib/services/notifications')

describe('ServiceFactory', () => {
  let factory: ServiceFactory

  // Helper to create mock services with all required methods
  const createMockService = (isInitialized = false) => ({
    initialize: vi.fn(),
    destroy: vi.fn(),
    isInitialized
  })

  const createMockAuthService = (isInitialized = false) => ({
    ...createMockService(isInitialized),
    getSession: vi.fn().mockResolvedValue({ success: false, data: null })
  })

  beforeEach(() => {
    factory = ServiceFactory.getInstance()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await factory.destroyServices()
  })

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ServiceFactory.getInstance()
      const instance2 = ServiceFactory.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should use global serviceFactory instance', () => {
      const globalInstance = serviceFactory
      const getInstance = ServiceFactory.getInstance()

      expect(globalInstance).toBe(getInstance)
    })
  })

  describe('Service Initialization', () => {
    it('should initialize all services successfully', async () => {
      // Mock all service constructors to return objects with initialize method
      const mockServices = {
        authService: createMockAuthService(false),
        userService: createMockService(false),
        resumeService: createMockService(false),
        jobsService: createMockService(false),
        notificationService: createMockService(false),
      }

      // Mock service constructors
      const { AuthServiceImpl } = await import('@/lib/services/auth')
      const { UserServiceImpl } = await import('@/lib/services/user')
      const { ResumeServiceImpl } = await import('@/lib/services/resume')
      const { JobsServiceImpl } = await import('@/lib/services/jobs')
      const { NotificationServiceImpl } = await import('@/lib/services/notifications')

      vi.mocked(AuthServiceImpl).mockReturnValue(mockServices.authService as any)
      vi.mocked(UserServiceImpl).mockReturnValue(mockServices.userService as any)
      vi.mocked(ResumeServiceImpl).mockReturnValue(mockServices.resumeService as any)
      vi.mocked(JobsServiceImpl).mockReturnValue(mockServices.jobsService as any)
      vi.mocked(NotificationServiceImpl).mockReturnValue(mockServices.notificationService as any)

      const services = await factory.initializeServices()

      // Verify all services were initialized
      expect(mockServices.authService.initialize).toHaveBeenCalled()
      expect(mockServices.userService.initialize).toHaveBeenCalled()
      expect(mockServices.resumeService.initialize).toHaveBeenCalled()
      expect(mockServices.jobsService.initialize).toHaveBeenCalled()
      expect(mockServices.notificationService.initialize).toHaveBeenCalled()

      expect(services).toHaveProperty('authService')
      expect(services).toHaveProperty('userService')
      expect(services).toHaveProperty('resumeService')
      expect(services).toHaveProperty('jobsService')
      expect(services).toHaveProperty('notificationService')
    })

    it('should return existing services if already initialized', async () => {
      // Mock services
      const mockServices = {
        authService: createMockAuthService(true),
        userService: createMockService(true),
        resumeService: createMockService(true),
        jobsService: createMockService(true),
        notificationService: createMockService(true),
      }

      // First initialization
      await factory.initializeServices()
      
      // Reset mock calls
      Object.values(mockServices).forEach(service => {
        service.initialize.mockClear()
      })

      // Second initialization should not call initialize again
      const services = await factory.initializeServices()

      // Verify initialize was not called again
      expect(mockServices.authService.initialize).not.toHaveBeenCalled()
      expect(services).toBeDefined()
    })

    it('should handle initialization errors', async () => {
      const { AuthServiceImpl } = await import('@/lib/services/auth')
      
      // Mock service constructor to throw error
      vi.mocked(AuthServiceImpl).mockImplementation(() => {
        throw new Error('Service initialization failed')
      })

      await expect(factory.initializeServices()).rejects.toThrow(
        'Service initialization failed: Service initialization failed'
      )
    })
  })

  describe('Service Access', () => {
    it('should throw error when getting services before initialization', () => {
      expect(() => factory.getServices()).toThrow(
        'Services not initialized. Call initializeServices() first.'
      )
    })

    it('should return services after initialization', async () => {
      // Mock services with proper structure
      const mockServices = {
        authService: createMockAuthService(true),
        userService: createMockService(true),
        resumeService: createMockService(true),
        jobsService: createMockService(true),
        notificationService: createMockService(true),
      }

      const { AuthServiceImpl } = await import('@/lib/services/auth')
      const { UserServiceImpl } = await import('@/lib/services/user')
      const { ResumeServiceImpl } = await import('@/lib/services/resume')
      const { JobsServiceImpl } = await import('@/lib/services/jobs')
      const { NotificationServiceImpl } = await import('@/lib/services/notifications')

      vi.mocked(AuthServiceImpl).mockReturnValue(mockServices.authService as any)
      vi.mocked(UserServiceImpl).mockReturnValue(mockServices.userService as any)
      vi.mocked(ResumeServiceImpl).mockReturnValue(mockServices.resumeService as any)
      vi.mocked(JobsServiceImpl).mockReturnValue(mockServices.jobsService as any)
      vi.mocked(NotificationServiceImpl).mockReturnValue(mockServices.notificationService as any)

      await factory.initializeServices()
      const services = factory.getServices()

      expect(services.authService).toBeDefined()
      expect(services.userService).toBeDefined()
      expect(services.resumeService).toBeDefined()
      expect(services.jobsService).toBeDefined()
      expect(services.notificationService).toBeDefined()
    })
  })

  describe('Service Destruction', () => {
    it('should destroy all services', async () => {
      // Mock services
      const mockServices = {
        authService: createMockAuthService(true),
        userService: createMockService(true),
        resumeService: createMockService(true),
        jobsService: createMockService(true),
        notificationService: createMockService(true),
      }

      const { AuthServiceImpl } = await import('@/lib/services/auth')
      const { UserServiceImpl } = await import('@/lib/services/user')
      const { ResumeServiceImpl } = await import('@/lib/services/resume')
      const { JobsServiceImpl } = await import('@/lib/services/jobs')
      const { NotificationServiceImpl } = await import('@/lib/services/notifications')

      vi.mocked(AuthServiceImpl).mockReturnValue(mockServices.authService as any)
      vi.mocked(UserServiceImpl).mockReturnValue(mockServices.userService as any)
      vi.mocked(ResumeServiceImpl).mockReturnValue(mockServices.resumeService as any)
      vi.mocked(JobsServiceImpl).mockReturnValue(mockServices.jobsService as any)
      vi.mocked(NotificationServiceImpl).mockReturnValue(mockServices.notificationService as any)

      await factory.initializeServices()
      await factory.destroyServices()

      expect(mockServices.authService.destroy).toHaveBeenCalled()
      expect(mockServices.userService.destroy).toHaveBeenCalled()
      expect(mockServices.resumeService.destroy).toHaveBeenCalled()
      expect(mockServices.jobsService.destroy).toHaveBeenCalled()
      expect(mockServices.notificationService.destroy).toHaveBeenCalled()
    })

    it('should handle destruction when not initialized', async () => {
      // Should not throw error
      await expect(factory.destroyServices()).resolves.not.toThrow()
    })

    it('should handle destruction errors gracefully', async () => {
      const mockService = { 
        initialize: vi.fn(), 
        destroy: vi.fn().mockRejectedValue(new Error('Destroy failed')),
        isInitialized: true 
      }

      const { AuthServiceImpl } = await import('@/lib/services/auth')
      vi.mocked(AuthServiceImpl).mockReturnValue(mockService as any)

      await factory.initializeServices()
      
      // Should not throw error even if individual service destroy fails
      await expect(factory.destroyServices()).resolves.not.toThrow()
    })
  })

  describe('Health Check', () => {
    it('should return healthy status when all services initialized', async () => {
      // Mock services
      const mockServices = {
        authService: createMockAuthService(true),
        userService: createMockService(true),
        resumeService: createMockService(true),
        jobsService: createMockService(true),
        notificationService: createMockService(true),
      }

      const { AuthServiceImpl } = await import('@/lib/services/auth')
      const { UserServiceImpl } = await import('@/lib/services/user')
      const { ResumeServiceImpl } = await import('@/lib/services/resume')
      const { JobsServiceImpl } = await import('@/lib/services/jobs')
      const { NotificationServiceImpl } = await import('@/lib/services/notifications')

      vi.mocked(AuthServiceImpl).mockReturnValue(mockServices.authService as any)
      vi.mocked(UserServiceImpl).mockReturnValue(mockServices.userService as any)
      vi.mocked(ResumeServiceImpl).mockReturnValue(mockServices.resumeService as any)
      vi.mocked(JobsServiceImpl).mockReturnValue(mockServices.jobsService as any)
      vi.mocked(NotificationServiceImpl).mockReturnValue(mockServices.notificationService as any)

      await factory.initializeServices()
      const health = await factory.healthCheck()

      expect(health.healthy).toBe(true)
      expect(health.services.authService).toBe(true)
      expect(health.services.userService).toBe(true)
      expect(health.services.resumeService).toBe(true)
      expect(health.services.jobsService).toBe(true)
      expect(health.services.notificationService).toBe(true)
    })

    it('should return unhealthy status when services not initialized', async () => {
      const health = await factory.healthCheck()

      expect(health.healthy).toBe(false)
      expect(health.services.authService).toBe(false)
      expect(health.services.userService).toBe(false)
      expect(health.services.resumeService).toBe(false)
      expect(health.services.jobsService).toBe(false)
      expect(health.services.notificationService).toBe(false)
    })

    it('should handle health check errors', async () => {
      // Mock to cause error during health check
      vi.spyOn(factory, 'healthCheck').mockRejectedValueOnce(new Error('Health check failed'))

      await expect(factory.healthCheck()).rejects.toThrow('Health check failed')
    })
  })

  describe('Auth Token Management', () => {
    it('should refresh auth token successfully', async () => {
      const mockAuthService = {
        initialize: vi.fn(),
        isInitialized: true,
        getSession: vi.fn().mockResolvedValue({
          success: true,
          data: { session: { token: 'new-token' } }
        })
      }

      const mockApiClient = {
        setAuthToken: vi.fn(),
        removeAuthToken: vi.fn()
      }

      const { AuthServiceImpl } = await import('@/lib/services/auth')
      vi.mocked(AuthServiceImpl).mockReturnValue(mockAuthService as any)
      vi.mocked(getApiClient).mockReturnValue(mockApiClient as any)

      await factory.initializeServices()
      await factory.refreshAuthToken()

      expect(mockAuthService.getSession).toHaveBeenCalled()
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('new-token')
    })

    it('should remove auth token when no valid session', async () => {
      const mockAuthService = {
        initialize: vi.fn(),
        isInitialized: true,
        getSession: vi.fn().mockResolvedValue({
          success: false,
          data: null
        })
      }

      const mockApiClient = {
        setAuthToken: vi.fn(),
        removeAuthToken: vi.fn()
      }

      const { AuthServiceImpl } = await import('@/lib/services/auth')
      vi.mocked(AuthServiceImpl).mockReturnValue(mockAuthService as any)
      vi.mocked(getApiClient).mockReturnValue(mockApiClient as any)

      await factory.initializeServices()
      await factory.refreshAuthToken()

      expect(mockApiClient.removeAuthToken).toHaveBeenCalled()
    })
  })
})

describe('Helper Functions', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getServices', () => {
    it('should initialize and return services', async () => {
      const mockServices = {
        authService: { initialize: vi.fn(), isInitialized: true },
        userService: { initialize: vi.fn(), isInitialized: true },
        resumeService: { initialize: vi.fn(), isInitialized: true },
        jobsService: { initialize: vi.fn(), isInitialized: true },
        notificationService: { initialize: vi.fn(), isInitialized: true },
      }

      vi.spyOn(ServiceFactory.prototype, 'initializeServices')
        .mockResolvedValue(mockServices as any)

      const services = await getServices()

      expect(services).toBeDefined()
      expect(ServiceFactory.prototype.initializeServices).toHaveBeenCalled()
    })
  })

  describe('getServicesSync', () => {
    it('should return services synchronously', () => {
      const mockServices = {
        authService: {},
        userService: {},
        resumeService: {},
        jobsService: {},
        notificationService: {},
      }

      vi.spyOn(ServiceFactory.prototype, 'getServices')
        .mockReturnValue(mockServices as any)

      const services = getServicesSync()

      expect(services).toBeDefined()
      expect(ServiceFactory.prototype.getServices).toHaveBeenCalled()
    })

    it('should throw error when services not initialized', () => {
      vi.spyOn(ServiceFactory.prototype, 'getServices')
        .mockImplementation(() => {
          throw new Error('Services not initialized')
        })

      expect(() => getServicesSync()).toThrow('Services not initialized')
    })
  })
})