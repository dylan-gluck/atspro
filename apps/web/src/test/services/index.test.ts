import { describe, it, expect } from 'vitest'

// Import all services and types to ensure they can be imported without errors
describe('Service Library Exports', () => {
  it('should export all service implementations', async () => {
    const serviceModule = await import('@/lib/services')
    
    expect(serviceModule.AuthServiceImpl).toBeDefined()
    expect(serviceModule.UserServiceImpl).toBeDefined()
    expect(serviceModule.ResumeServiceImpl).toBeDefined()
    expect(serviceModule.JobsServiceImpl).toBeDefined()
    expect(serviceModule.NotificationServiceImpl).toBeDefined()
  })

  it('should export API client', async () => {
    const serviceModule = await import('@/lib/services')
    
    expect(serviceModule.ApiClientImpl).toBeDefined()
    expect(serviceModule.getApiClient).toBeDefined()
    expect(serviceModule.resetApiClient).toBeDefined()
  })

  it('should export base service classes', async () => {
    const serviceModule = await import('@/lib/services')
    
    expect(serviceModule.BaseServiceImpl).toBeDefined()
    expect(serviceModule.handleServiceCall).toBeDefined()
    expect(serviceModule.createServiceMethod).toBeDefined()
  })

  it('should export service factory', async () => {
    const serviceModule = await import('@/lib/services')
    
    expect(serviceModule.ServiceFactory).toBeDefined()
    expect(serviceModule.serviceFactory).toBeDefined()
    expect(serviceModule.getServices).toBeDefined()
    expect(serviceModule.getServicesSync).toBeDefined()
    expect(serviceModule.useServiceFactory).toBeDefined()
  })

  it('should export React hooks', async () => {
    const serviceModule = await import('@/lib/services')
    
    expect(serviceModule.useServices).toBeDefined()
    expect(serviceModule.useServicesWithState).toBeDefined()
    expect(serviceModule.useService).toBeDefined()
    expect(serviceModule.useAuthService).toBeDefined()
    expect(serviceModule.useUserService).toBeDefined()
    expect(serviceModule.useResumeService).toBeDefined()
    expect(serviceModule.useJobsService).toBeDefined()
    expect(serviceModule.useNotificationService).toBeDefined()
  })
})

describe('Type Exports', () => {
  it('should export all service types', async () => {
    const typesModule = await import('@/types/services')
    
    // Test that types can be imported (TypeScript compilation will catch issues)
    expect(typeof typesModule).toBe('object')
  })

  it('should export all database types', async () => {
    const typesModule = await import('@/types/database')
    
    // Test that types can be imported (TypeScript compilation will catch issues)
    expect(typeof typesModule).toBe('object')
  })
})

describe('Service Architecture Validation', () => {
  it('should have consistent service interface implementation', async () => {
    const { 
      AuthServiceImpl, 
      UserServiceImpl, 
      ResumeServiceImpl, 
      JobsServiceImpl, 
      NotificationServiceImpl 
    } = await import('@/lib/services')

    // All service implementations should have these methods
    const requiredMethods = ['initialize', 'destroy']

    // Check AuthService
    const authService = new AuthServiceImpl({} as any)
    requiredMethods.forEach(method => {
      expect(authService[method as keyof typeof authService]).toBeDefined()
    })

    // Check UserService  
    const userService = new UserServiceImpl({} as any, {} as any)
    requiredMethods.forEach(method => {
      expect(userService[method as keyof typeof userService]).toBeDefined()
    })

    // Check ResumeService
    const resumeService = new ResumeServiceImpl({} as any, {} as any)
    requiredMethods.forEach(method => {
      expect(resumeService[method as keyof typeof resumeService]).toBeDefined()
    })

    // Check JobsService
    const jobsService = new JobsServiceImpl({} as any, {} as any)
    requiredMethods.forEach(method => {
      expect(jobsService[method as keyof typeof jobsService]).toBeDefined()
    })

    // Check NotificationService
    const notificationService = new NotificationServiceImpl({} as any, {} as any)
    requiredMethods.forEach(method => {
      expect(notificationService[method as keyof typeof notificationService]).toBeDefined()
    })
  })

  it('should have proper service dependency injection', async () => {
    const { ServiceFactory } = await import('@/lib/services')
    
    const factory = ServiceFactory.getInstance()
    
    // Factory should be a singleton
    const factory2 = ServiceFactory.getInstance()
    expect(factory).toBe(factory2)
    
    // Factory should have required methods
    expect(factory.initializeServices).toBeDefined()
    expect(factory.getServices).toBeDefined()
    expect(factory.destroyServices).toBeDefined()
    expect(factory.healthCheck).toBeDefined()
    expect(factory.refreshAuthToken).toBeDefined()
  })
})

describe('Integration Test Preparation', () => {
  it('should be ready for integration testing', async () => {
    const { getApiClient, resetApiClient } = await import('@/lib/services')
    
    // Reset API client for clean state
    resetApiClient()
    
    // Get fresh API client
    const apiClient = getApiClient()
    expect(apiClient).toBeDefined()
    
    // Should have all required methods
    expect(apiClient.get).toBeDefined()
    expect(apiClient.post).toBeDefined()
    expect(apiClient.put).toBeDefined()
    expect(apiClient.patch).toBeDefined()
    expect(apiClient.delete).toBeDefined()
    expect(apiClient.upload).toBeDefined()
  })
})

describe('Error Handling Consistency', () => {
  it('should have consistent error types across services', async () => {
    const servicesModule = await import('@/lib/services')
    const { ServiceError, ServiceErrorType } = servicesModule
    
    // ServiceError should be constructable
    const error = new ServiceError(
      ServiceErrorType.NETWORK_ERROR,
      'Test error',
      'TEST_CODE'
    )
    
    expect(error).toBeInstanceOf(Error)
    expect(error.type).toBe(ServiceErrorType.NETWORK_ERROR)
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_CODE')
    expect(error.name).toBe('ServiceError')
  })

  it('should have all required error types', async () => {
    const servicesModule = await import('@/lib/services')
    const { ServiceErrorType } = servicesModule
    
    const requiredErrorTypes = [
      'NETWORK_ERROR',
      'VALIDATION_ERROR', 
      'AUTHENTICATION_ERROR',
      'AUTHORIZATION_ERROR',
      'NOT_FOUND',
      'SERVER_ERROR',
      'TIMEOUT_ERROR',
      'CACHE_ERROR'
    ]
    
    requiredErrorTypes.forEach(type => {
      expect(ServiceErrorType[type as keyof typeof ServiceErrorType]).toBeDefined()
    })
  })
})