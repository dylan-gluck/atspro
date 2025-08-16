import type { ApiClient, RequestConfig, ApiResponse, ServiceErrorType } from '@/types/services';
import { ServiceError } from '@/types/services';

export class ApiClientImpl implements ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, null, config);
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, null, config);
  }

  async upload<T>(url: string, file: File, config?: RequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request<T>('POST', url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        // Remove Content-Type to let browser set it with boundary
      }
    });
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseURL}${url}`;
    const headers = { ...this.defaultHeaders, ...config?.headers };
    
    // Remove Content-Type for FormData
    if (data instanceof FormData) {
      delete headers['Content-Type'];
    }

    let attempt = 0;
    const maxRetries = config?.retries ?? 3;

    while (attempt <= maxRetries) {
      try {
        const controller = new AbortController();
        let timeoutId: NodeJS.Timeout | undefined;

        // Set up timeout if specified
        if (config?.timeout) {
          timeoutId = setTimeout(() => {
            controller.abort();
          }, config.timeout);
        }

        const response = await fetch(fullUrl, {
          method,
          headers,
          body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
          signal: controller.signal
        });

        // Clear timeout if request completes
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Parse response
        let result: any;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          result = await response.json();
        } else if (contentType?.includes('text/')) {
          result = { data: await response.text() };
        } else {
          // Handle binary data (like file downloads)
          result = { data: await response.blob() };
        }

        const apiResponse: ApiResponse<T> = {
          data: result.data || result,
          success: response.ok,
          message: result.message,
          errors: result.errors
        };

        // If response is not ok and we have retries left, retry for certain status codes
        if (!response.ok && attempt < maxRetries) {
          const shouldRetry = this.shouldRetry(response.status);
          if (shouldRetry) {
            attempt++;
            await this.delay(Math.min(1000 * Math.pow(2, attempt), 5000)); // Exponential backoff
            continue;
          }
        }

        return apiResponse;

      } catch (error) {
        // If this is the last attempt or error is not retryable, throw
        if (attempt >= maxRetries || !this.isRetryableError(error)) {
          return {
            data: null as T,
            success: false,
            message: this.getErrorMessage(error),
            errors: [this.getErrorMessage(error)]
          };
        }

        attempt++;
        await this.delay(Math.min(1000 * Math.pow(2, attempt), 5000));
      }
    }

    // This should never be reached, but just in case
    return {
      data: null as T,
      success: false,
      message: 'Maximum retries exceeded',
      errors: ['Maximum retries exceeded']
    };
  }

  private shouldRetry(status: number): boolean {
    // Retry on 5xx server errors and specific 4xx errors
    return status >= 500 || status === 429 || status === 408;
  }

  private isRetryableError(error: any): boolean {
    if (error.name === 'AbortError') return false; // Don't retry timeouts
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return true; // Network errors
    }
    return false;
  }

  private getErrorMessage(error: any): string {
    if (error.name === 'AbortError') {
      return 'Request timeout';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to set auth token
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Method to remove auth token
  removeAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  // Method to set custom headers
  setHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }
}

// Singleton instance factory
let apiClientInstance: ApiClientImpl | null = null;

export function getApiClient(): ApiClientImpl {
  if (!apiClientInstance) {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    apiClientInstance = new ApiClientImpl(baseURL);
  }
  return apiClientInstance;
}

// Helper to reset the singleton (useful for testing)
export function resetApiClient(): void {
  apiClientInstance = null;
}