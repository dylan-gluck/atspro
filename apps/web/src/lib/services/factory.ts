import type { ServiceContainer } from '@/types/services';
import { getApiClient } from './api-client';
import { AuthServiceImpl } from './auth';
import { UserServiceImpl } from './user';
import { ResumeServiceImpl } from './resume';
import { JobsServiceImpl } from './jobs';
import { NotificationServiceImpl } from './notifications';

export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Partial<ServiceContainer> = {};
  private initialized = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  async initializeServices(): Promise<ServiceContainer> {
    if (this.initialized && this.isFullyInitialized()) {
      return this.services as ServiceContainer;
    }

    try {
      // Get API client instance
      const apiClient = getApiClient();

      // Initialize services with dependencies
      // AuthService has no dependencies on other services
      this.services.authService = new AuthServiceImpl(apiClient);
      
      // Other services depend on AuthService
      this.services.userService = new UserServiceImpl(apiClient, this.services.authService);
      this.services.resumeService = new ResumeServiceImpl(apiClient, this.services.authService);
      this.services.jobsService = new JobsServiceImpl(apiClient, this.services.authService);
      this.services.notificationService = new NotificationServiceImpl(apiClient, this.services.authService);

      // Initialize all services
      await Promise.all([
        this.services.authService!.initialize(),
        this.services.userService!.initialize(),
        this.services.resumeService!.initialize(),
        this.services.jobsService!.initialize(),
        this.services.notificationService!.initialize()
      ]);

      this.initialized = true;
      
      // Set up authentication token management
      await this.setupAuthTokenManagement();

      return this.services as ServiceContainer;
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getServices(): ServiceContainer {
    if (!this.isFullyInitialized()) {
      throw new Error('Services not initialized. Call initializeServices() first.');
    }
    return this.services as ServiceContainer;
  }

  async destroyServices(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Destroy all services
      await Promise.all([
        this.services.authService?.destroy(),
        this.services.userService?.destroy(),
        this.services.resumeService?.destroy(),
        this.services.jobsService?.destroy(),
        this.services.notificationService?.destroy()
      ]);

      this.services = {};
      this.initialized = false;
    } catch (error) {
      console.error('Failed to destroy services:', error);
    }
  }

  private isFullyInitialized(): boolean {
    return !!(
      this.services.authService &&
      this.services.userService &&
      this.services.resumeService &&
      this.services.jobsService &&
      this.services.notificationService &&
      this.initialized
    );
  }

  private async setupAuthTokenManagement(): Promise<void> {
    if (!this.services.authService) {
      return;
    }

    try {
      // Get current session to set up auth token
      const session = await this.services.authService.getSession();
      
      if (session.success && session.data?.session?.token) {
        const apiClient = getApiClient();
        apiClient.setAuthToken(session.data.session.token);
      }

      // Set up automatic token refresh/management if needed
      // This would depend on better-auth's token refresh mechanism
    } catch (error) {
      console.warn('Failed to setup auth token management:', error);
    }
  }

  // Method to refresh auth token across all services
  async refreshAuthToken(): Promise<void> {
    if (!this.services.authService) {
      return;
    }

    try {
      const session = await this.services.authService.getSession();
      
      if (session.success && session.data?.session?.token) {
        const apiClient = getApiClient();
        apiClient.setAuthToken(session.data.session.token);
      } else {
        // No valid session, remove token
        const apiClient = getApiClient();
        apiClient.removeAuthToken();
      }
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
      // Remove token on error
      const apiClient = getApiClient();
      apiClient.removeAuthToken();
    }
  }

  // Method to check if services are healthy
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<keyof ServiceContainer, boolean>;
  }> {
    const serviceHealth = {
      authService: false,
      userService: false,
      resumeService: false,
      jobsService: false,
      notificationService: false
    };

    if (!this.isFullyInitialized()) {
      return {
        healthy: false,
        services: serviceHealth
      };
    }

    try {
      // Check each service's initialization status
      serviceHealth.authService = this.services.authService?.isInitialized ?? false;
      serviceHealth.userService = this.services.userService?.isInitialized ?? false;
      serviceHealth.resumeService = this.services.resumeService?.isInitialized ?? false;
      serviceHealth.jobsService = this.services.jobsService?.isInitialized ?? false;
      serviceHealth.notificationService = this.services.notificationService?.isInitialized ?? false;

      const allHealthy = Object.values(serviceHealth).every(healthy => healthy);

      return {
        healthy: allHealthy,
        services: serviceHealth
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        healthy: false,
        services: serviceHealth
      };
    }
  }

  // Method to reinitialize specific service
  async reinitializeService<K extends keyof ServiceContainer>(
    serviceName: K
  ): Promise<void> {
    if (!this.services[serviceName]) {
      throw new Error(`Service ${serviceName} not found`);
    }

    try {
      await this.services[serviceName]!.destroy();
      await this.services[serviceName]!.initialize();
    } catch (error) {
      console.error(`Failed to reinitialize ${serviceName}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const serviceFactory = ServiceFactory.getInstance();

// Helper function to get initialized services
export async function getServices(): Promise<ServiceContainer> {
  return serviceFactory.initializeServices();
}

// Helper function to get services if already initialized
export function getServicesSync(): ServiceContainer {
  return serviceFactory.getServices();
}

// Hook for React components to use services
export function useServiceFactory() {
  return {
    getServices: () => getServices(),
    getServicesSync: () => getServicesSync(),
    healthCheck: () => serviceFactory.healthCheck(),
    refreshAuthToken: () => serviceFactory.refreshAuthToken(),
    destroyServices: () => serviceFactory.destroyServices()
  };
}