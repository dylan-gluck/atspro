import type { BaseService, ApiClient, ApiResponse } from '@/types/services';
import { ServiceError, ServiceErrorType } from '@/types/services';

// Base service implementation
export abstract class BaseServiceImpl implements BaseService {
  protected apiClient: ApiClient;
  protected cache: Map<string, any>;
  public isInitialized = false;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
    this.cache = new Map();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.onInitialize();
    this.isInitialized = true;
  }

  async destroy(): Promise<void> {
    if (!this.isInitialized) return;
    await this.onDestroy();
    this.cache.clear();
    this.isInitialized = false;
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onDestroy(): Promise<void>;

  protected getCacheKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  protected setCache<T>(key: string, value: T, ttl = 300000): void {
    this.cache.set(key, { value, expires: Date.now() + ttl });
  }

  protected getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  protected async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 300000
  ): Promise<T> {
    const cached = this.getCache<T>(key);
    if (cached) return cached;

    const result = await fetcher();
    this.setCache(key, result, ttl);
    return result;
  }

  protected clearCachePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Error handling wrapper for service operations
export async function handleServiceCall<T>(
  operation: () => Promise<ApiResponse<T>>
): Promise<T> {
  try {
    const response = await operation();
    
    if (!response.success) {
      throw new ServiceError(
        ServiceErrorType.SERVER_ERROR,
        response.message || 'Operation failed',
        'OPERATION_FAILED',
        response.errors
      );
    }
    
    return response.data;
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }
    
    if (error instanceof Error) {
      throw new ServiceError(
        ServiceErrorType.NETWORK_ERROR,
        error.message,
        'NETWORK_ERROR'
      );
    }
    
    throw new ServiceError(
      ServiceErrorType.SERVER_ERROR,
      'Unknown error occurred',
      'UNKNOWN_ERROR'
    );
  }
}

// Utility for handling service operations with proper error handling
export function createServiceMethod<T extends any[], R>(
  operation: (...args: T) => Promise<ApiResponse<R>>
) {
  return async (...args: T): Promise<ApiResponse<R>> => {
    try {
      return await operation(...args);
    } catch (error) {
      if (error instanceof ServiceError) {
        return {
          data: null as R,
          success: false,
          message: error.message,
          errors: [error.message]
        };
      }
      
      if (error instanceof Error) {
        return {
          data: null as R,
          success: false,
          message: error.message,
          errors: [error.message]
        };
      }
      
      return {
        data: null as R,
        success: false,
        message: 'Unknown error occurred',
        errors: ['Unknown error occurred']
      };
    }
  };
}

// Utility for unwrapping service responses (for internal use)
export function unwrapServiceResponse<T>(
  operation: () => Promise<ApiResponse<T>>
): Promise<T> {
  return handleServiceCall(operation);
}