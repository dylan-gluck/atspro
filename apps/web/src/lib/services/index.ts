// Export all service implementations
export { AuthServiceImpl } from './auth';
export { UserServiceImpl } from './user';
export { ResumeServiceImpl } from './resume';
export { JobsServiceImpl } from './jobs';
export { NotificationServiceImpl } from './notifications';

// Export API client
export { ApiClientImpl, getApiClient, resetApiClient } from './api-client';

// Export base service classes and utilities
export { BaseServiceImpl, handleServiceCall, createServiceMethod } from './base';

// Export service factory and dependency injection
export { 
  ServiceFactory, 
  serviceFactory, 
  getServices, 
  getServicesSync, 
  useServiceFactory 
} from './factory';

// Export all types
export type * from '@/types/services';
export type * from '@/types/database';

// Export error types and classes as values (not just types)
export { ServiceError, ServiceErrorType } from '@/types/services';

// Re-export existing types for convenience
export type { Resume, Job, ContactInfo, WorkExperience, Education, Certification, Link } from '@/types';

// Helper function to create a React hook for accessing services
import { useEffect, useState } from 'react';
import type { ServiceContainer } from '@/types/services';
import { getServices } from './factory';

export function useServices(): ServiceContainer | null {
  const [services, setServices] = useState<ServiceContainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initServices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const servicesInstance = await getServices();
        
        if (mounted) {
          setServices(servicesInstance);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize services'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initServices();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    throw error; // Let React Error Boundary handle this
  }

  return isLoading ? null : services;
}

// Hook for getting services with loading state
export function useServicesWithState(): {
  services: ServiceContainer | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
} {
  const [services, setServices] = useState<ServiceContainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const initServices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const servicesInstance = await getServices();
      setServices(servicesInstance);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize services'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initServices();
  }, []);

  return {
    services,
    isLoading,
    error,
    retry: initServices
  };
}

// Hook for specific service access
export function useService<K extends keyof ServiceContainer>(
  serviceName: K
): ServiceContainer[K] | null {
  const services = useServices();
  return services ? services[serviceName] : null;
}

// Hook for auth service specifically (commonly used)
export function useAuthService() {
  return useService('authService');
}

// Hook for user service specifically
export function useUserService() {
  return useService('userService');
}

// Hook for resume service specifically
export function useResumeService() {
  return useService('resumeService');
}

// Hook for jobs service specifically
export function useJobsService() {
  return useService('jobsService');
}

// Hook for notification service specifically
export function useNotificationService() {
  return useService('notificationService');
}