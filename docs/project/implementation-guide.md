# ATSPro Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the ATSPro data model, service architecture, and API integration patterns in the Next.js frontend application.

## Phase 1: Database Schema Implementation

### PostgreSQL Schema Setup

**Note**: Better-auth has already created the core authentication tables (`user`, `session`, `account`, `verification`). We only need to create the ATSPro-specific tables.

1. **Create migration files** for ATSPro tables:

```bash
cd apps/api
# Create new migration for profiles, settings, subscriptions
alembic revision --autogenerate -m "Create ATSPro user extensions (profiles, settings, subscriptions)"
```

2. **Review generated migration** and ensure it matches the additional tables in `data-model.md`:
   - `profiles` table (references better-auth `user.id`)
   - `settings` table (references better-auth `user.id`)
   - `subscriptions` table (references better-auth `user.id`)

3. **Apply migration**:

```bash
alembic upgrade head
```

4. **Verify tables created**:

```bash
docker-compose exec postgres psql -U atspro_user -d atspro -c "\dt"
# Should show: user, session, account, verification, profiles, settings, subscriptions
```

### ArangoDB Collections Setup

1. **Create initialization script** at `apps/api/scripts/init_arango.py`:

```python
from arango import ArangoClient
from app.config import settings

def initialize_collections():
    client = ArangoClient()
    db = client.db(settings.ARANGO_DATABASE, username=settings.ARANGO_USERNAME, password=settings.ARANGO_PASSWORD)
    
    # Create document collections
    collections = ['resumes', 'jobs', 'optimized_resumes', 'documents']
    for collection_name in collections:
        if not db.has_collection(collection_name):
            db.create_collection(collection_name)
    
    # Create edge collections
    edge_collections = ['user_resumes', 'user_jobs', 'resume_optimization', 'job_documents']
    for collection_name in edge_collections:
        if not db.has_collection(collection_name):
            db.create_collection(collection_name, edge=True)
    
    # Create indexes (from data-model.md)
    db.collection('resumes').add_hash_index(fields=['user_id'])
    db.collection('jobs').add_hash_index(fields=['user_id'])
    # ... add other indexes

if __name__ == "__main__":
    initialize_collections()
```

2. **Run initialization**:

```bash
cd apps/api
uv run python scripts/init_arango.py
```

## Phase 2: TypeScript Types Implementation

### 1. Create Base Types

Create `apps/web/src/types/api.ts`:

```typescript
// Copy all base interfaces from service-architecture.md
export interface BaseService { ... }
export interface ApiResponse<T> { ... }
export interface PaginatedResponse<T> { ... }
export interface BaseEntity { ... }

// Better-Auth types
export interface BetterAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BetterAuthSession {
  user: BetterAuthUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string;
    userAgent?: string;
  };
}
```

### 2. Update Existing Types

Update `apps/web/src/types/index.ts`:

```typescript
export * from './api';
export * from './resume';
export * from './job';

// Add new exports
export type { 
  UserProfile, 
  UserSettings, 
  Subscription,
  ResumeVersion,
  OptimizationResult,
  JobEntity,
  JobDocument,
  BetterAuthUser,
  BetterAuthSession,
  FullUserProfile,
  Notification
} from './api';
```

### 3. Create Service Interface Types

Create `apps/web/src/types/services.ts`:

```typescript
// Copy all service interfaces from service-architecture.md
export interface UserService extends BaseService { ... }
export interface ResumeService extends BaseService { ... }
export interface JobsService extends BaseService { ... }
export interface AuthService extends BaseService { ... }
export interface NotificationService extends BaseService { ... }
```

## Phase 3: API Client Implementation

### 1. Create Better-Auth Client Wrapper

Create `apps/web/src/lib/auth-client-wrapper.ts`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"
});

// Export better-auth hooks for components
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useUser
} = authClient;
```

### 2. Create Base API Client

Create `apps/web/src/lib/api-client.ts`:

```typescript
// Copy ApiClient implementation from api-integration-patterns.md
export class ApiClientImpl implements ApiClient { ... }

// Modified for better-auth integration
export class BetterAuthApiClient extends ApiClientImpl {
  protected async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    // Get session from better-auth
    const session = await authClient.getSession();
    
    const headers = {
      ...config?.headers,
      ...(session && { Authorization: `Bearer ${session.token}` })
    };

    return super.request<T>(method, url, data, {
      ...config,
      headers
    });
  }
}

export class RetryableApiClient extends BetterAuthApiClient { ... }
export class RateLimitedApiClient extends RetryableApiClient { ... }
```

### 2. Create Error Handling

Create `apps/web/src/lib/errors.ts`:

```typescript
// Copy error handling from api-integration-patterns.md
export enum ServiceErrorType { ... }
export class ServiceError extends Error { ... }
export class ErrorTransformer { ... }
```

### 4. Update Authentication Integration

Update existing `apps/web/src/hooks/use-auth.ts` to work with better-auth:

```typescript
// Remove custom auth implementation, use better-auth hooks
export { useSession, useUser, signIn, signUp, signOut } from '@/lib/auth-client-wrapper';

// Add custom hooks that integrate with our service layer
export function useAuthWithProfile() {
  const { data: session, isPending } = useSession();
  const { userService } = useServices();
  
  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user && userService) {
      userService.getFullProfile().then(response => {
        if (response.success) {
          setProfile(response.data);
        }
        setLoading(false);
      });
    } else {
      setLoading(isPending);
    }
  }, [session, userService]);

  return {
    session,
    profile,
    loading: loading || isPending,
    isAuthenticated: !!session?.user
  };
}
```

## Phase 4: Service Layer Implementation

### 1. Create Base Service Implementation

Create `apps/web/src/services/base.ts`:

```typescript
// Copy BaseServiceImpl from service-architecture.md
export abstract class BaseServiceImpl implements BaseService { ... }
```

### 2. Implement Individual Services

Create each service in `apps/web/src/services/`:

#### UserService (`user.ts`)
```typescript
import { UserService, UserProfile, UserSettings, Subscription } from '@/types/services';
import { BaseServiceImpl } from './base';

export class UserServiceImpl extends BaseServiceImpl implements UserService {
  protected async onInitialize(): Promise<void> {
    // Initialize user service
  }

  protected async onDestroy(): Promise<void> {
    // Cleanup resources
  }

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return this.apiClient.get<UserProfile>('/api/user/profile');
  }

  async updateProfile(profile: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return this.apiClient.patch<UserProfile>('/api/user/profile', profile);
  }

  // ... implement other methods
}
```

#### ResumeService (`resume.ts`)
```typescript
import { ResumeService } from '@/types/services';
import { BaseServiceImpl } from './base';

export class ResumeServiceImpl extends BaseServiceImpl implements ResumeService {
  // Implement all ResumeService methods
}
```

#### JobsService (`jobs.ts`)
```typescript
import { JobsService } from '@/types/services';
import { BaseServiceImpl } from './base';

export class JobsServiceImpl extends BaseServiceImpl implements JobsService {
  // Implement all JobsService methods
}
```

#### AuthService (`auth.ts`)
```typescript
import { AuthService, BetterAuthUser, BetterAuthSession } from '@/types/services';
import { BaseServiceImpl } from './base';
import { authClient } from '@/lib/auth-client-wrapper';

export class AuthServiceImpl extends BaseServiceImpl implements AuthService {
  protected async onInitialize(): Promise<void> {
    // Better-auth handles initialization
  }

  protected async onDestroy(): Promise<void> {
    // Cleanup if needed
  }

  async signIn(email: string, password: string): Promise<ApiResponse<BetterAuthSession>> {
    try {
      const result = await authClient.signIn.email({ 
        email, 
        password 
      });
      
      if (result.data) {
        return { 
          data: result.data, 
          success: true 
        };
      } else {
        return { 
          data: null as any, 
          success: false, 
          message: result.error?.message || 'Sign in failed' 
        };
      }
    } catch (error) {
      throw new ServiceError(
        ServiceErrorType.AUTHENTICATION_ERROR,
        'Sign in failed',
        'SIGN_IN_FAILED',
        error
      );
    }
  }

  async signUp(email: string, password: string, name: string): Promise<ApiResponse<BetterAuthUser>> {
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name
      });
      
      if (result.data) {
        return { 
          data: result.data.user, 
          success: true 
        };
      } else {
        return { 
          data: null as any, 
          success: false, 
          message: result.error?.message || 'Sign up failed' 
        };
      }
    } catch (error) {
      throw new ServiceError(
        ServiceErrorType.AUTHENTICATION_ERROR,
        'Sign up failed',
        'SIGN_UP_FAILED',
        error
      );
    }
  }

  async signOut(): Promise<ApiResponse<void>> {
    try {
      await authClient.signOut();
      return { data: undefined as any, success: true };
    } catch (error) {
      throw new ServiceError(
        ServiceErrorType.AUTHENTICATION_ERROR,
        'Sign out failed',
        'SIGN_OUT_FAILED',
        error
      );
    }
  }

  async getSession(): Promise<ApiResponse<BetterAuthSession | null>> {
    try {
      const session = await authClient.getSession();
      return { 
        data: session, 
        success: true 
      };
    } catch (error) {
      return { 
        data: null, 
        success: false, 
        message: 'Failed to get session' 
      };
    }
  }

  async validateSession(): Promise<boolean> {
    try {
      const session = await authClient.getSession();
      return !!session;
    } catch {
      return false;
    }
  }

  async getCurrentUser(): Promise<ApiResponse<BetterAuthUser | null>> {
    try {
      const session = await this.getSession();
      return {
        data: session.data?.user || null,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        message: 'Failed to get current user'
      };
    }
  }

  getBetterAuthClient() {
    return authClient;
  }

  // Implement other methods by delegating to better-auth client
}
```

#### NotificationService (`notifications.ts`)
```typescript
import { NotificationService } from '@/types/services';
import { BaseServiceImpl } from './base';

export class NotificationServiceImpl extends BaseServiceImpl implements NotificationService {
  // Implement all NotificationService methods
}
```

### 3. Create Service Factory

Create `apps/web/src/services/index.ts`:

```typescript
// Copy ServiceFactory from service-architecture.md
export class ServiceFactory { ... }
export function useServices(): ServiceContainer { ... }
```

## Phase 5: Validation Layer

### 1. Install Zod

```bash
cd apps/web
pnpm add zod
```

### 2. Create Validation Schemas

Create `apps/web/src/lib/validation.ts`:

```typescript
// Copy validation schemas from api-integration-patterns.md
export const ContactInfoSchema = z.object({ ... });
export const ResumeSchema = z.object({ ... });
export class ValidationHelper { ... }
```

### 3. Update Service Implementations

Add validation to service methods:

```typescript
// In ResumeServiceImpl
async updateResume(resumeData: Resume): Promise<ApiResponse<ResumeVersion>> {
  const validatedData = ValidationHelper.validateRequest(ResumeSchema, resumeData);
  // ... rest of implementation
}
```

## Phase 6: Caching Implementation

### 1. Create Cache System

Create `apps/web/src/lib/cache.ts`:

```typescript
// Copy caching implementation from api-integration-patterns.md
export class MultiLevelCache { ... }
```

### 2. Integrate Cache in Base Service

Update `apps/web/src/services/base.ts`:

```typescript
export abstract class BaseServiceImpl implements BaseService {
  protected cache: MultiLevelCache;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
    this.cache = new MultiLevelCache({
      ttl: 300000, // 5 minutes
      maxSize: 100,
      strategy: 'lru'
    });
  }

  // Use withCache helper for cacheable operations
}
```

## Phase 7: React Integration

### 1. Create Service Provider

Create `apps/web/src/contexts/services.tsx`:

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ServiceContainer, ServiceFactory } from '@/services';

const ServicesContext = createContext<ServiceContainer | null>(null);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<ServiceContainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initServices = async () => {
      try {
        const serviceFactory = ServiceFactory.getInstance();
        const initializedServices = await serviceFactory.initializeServices();
        setServices(initializedServices);
      } catch (error) {
        console.error('Failed to initialize services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initServices();
  }, []);

  if (isLoading) {
    return <div>Loading services...</div>;
  }

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): ServiceContainer {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  return services;
}
```

### 2. Update Layout

Update `apps/web/src/app/layout.tsx`:

```typescript
import { ServicesProvider } from '@/contexts/services';
import { SessionProvider } from '@/contexts/session';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ServicesProvider>
            {children}
          </ServicesProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

### 2.1. Create Better-Auth Session Provider

Create `apps/web/src/contexts/session.tsx`:

```typescript
'use client';

import { SessionProvider as BetterAuthSessionProvider } from 'better-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <BetterAuthSessionProvider>
      {children}
    </BetterAuthSessionProvider>
  );
}
```

### 3. Create Custom Hooks

Update `apps/web/src/hooks/use-user.ts` (integrates with better-auth):

```typescript
import { useState, useEffect } from 'react';
import { useServices } from '@/contexts/services';
import { useSession } from '@/lib/auth-client-wrapper';
import { FullUserProfile, UserProfile } from '@/types/services';

export function useUser() {
  const { data: session, isPending } = useSession();
  const { userService } = useServices();
  const [fullProfile, setFullProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user || !userService) {
        setLoading(isPending);
        return;
      }

      try {
        const response = await userService.getFullProfile();
        if (response.success) {
          setFullProfile(response.data);
        } else {
          setError(new Error(response.message));
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [session, userService, isPending]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userService) throw new Error('User service not available');

    try {
      const response = await userService.updateProfile(updates);
      if (response.success) {
        // Refresh full profile
        const fullResponse = await userService.getFullProfile();
        if (fullResponse.success) {
          setFullProfile(fullResponse.data);
        }
        return response.data;
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateUserName = async (name: string) => {
    if (!userService) throw new Error('User service not available');

    try {
      const response = await userService.updateUserName(name);
      if (response.success) {
        // Refresh full profile
        const fullResponse = await userService.getFullProfile();
        if (fullResponse.success) {
          setFullProfile(fullResponse.data);
        }
        return response.data;
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    // Better-auth user data
    user: session?.user || null,
    session,
    
    // Extended profile data
    profile: fullProfile?.profile || null,
    fullProfile,
    
    // State
    loading: loading || isPending,
    error,
    isAuthenticated: !!session?.user,
    
    // Actions
    updateProfile,
    updateUserName,
    refetch: () => loadProfile()
  };
}
```

Create similar hooks for other services:
- `apps/web/src/hooks/use-resume.ts`
- `apps/web/src/hooks/use-jobs.ts`
- `apps/web/src/hooks/use-auth.ts` (already updated above)
- `apps/web/src/hooks/use-notifications.ts`

## Phase 8: Testing Implementation

### 1. Install Testing Dependencies

```bash
cd apps/web
pnpm add -D @testing-library/react @testing-library/jest-dom vitest jsdom
```

### 2. Configure Testing

Create `apps/web/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
```

Create `apps/web/src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});
```

### 3. Create Service Tests

Create `apps/web/src/services/__tests__/user.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserServiceImpl } from '../user';
import { ApiClient } from '@/lib/api-client';

describe('UserService', () => {
  let userService: UserServiceImpl;
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      upload: vi.fn(),
    };

    userService = new UserServiceImpl(mockApiClient);
  });

  it('should get user profile', async () => {
    const mockProfile = {
      id: '1',
      full_name: 'John Doe',
      email: 'john@example.com',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    vi.mocked(mockApiClient.get).mockResolvedValueOnce({
      data: mockProfile,
      success: true,
    });

    const result = await userService.getProfile();
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProfile);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/user/profile');
  });

  // Add more tests for other methods
});
```

### 4. Create Hook Tests

Create `apps/web/src/hooks/__tests__/use-user.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useUser } from '../use-user';
import { ServicesProvider } from '@/contexts/services';

// Mock the services
vi.mock('@/contexts/services');

describe('useUser', () => {
  it('should load user profile on mount', async () => {
    const mockUserService = {
      getProfile: vi.fn().mockResolvedValue({
        success: true,
        data: { id: '1', full_name: 'John Doe' }
      })
    };

    vi.mocked(useServices).mockReturnValue({
      userService: mockUserService
    } as any);

    const { result } = renderHook(() => useUser(), {
      wrapper: ({ children }) => (
        <ServicesProvider>{children}</ServicesProvider>
      ),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile?.full_name).toBe('John Doe');
    expect(mockUserService.getProfile).toHaveBeenCalled();
  });
});
```

## Phase 9: Error Handling & Monitoring

### 1. Create Error Boundary

Create `apps/web/src/components/error-boundary.tsx`:

```typescript
'use client';

import React from 'react';
import { ServiceError, ServiceErrorType } from '@/lib/errors';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (error instanceof ServiceError) {
      // Handle service errors specifically
      if (error.type === ServiceErrorType.AUTHENTICATION_ERROR) {
        // Redirect to login
        window.location.href = '/sign-in';
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-semibold text-red-800">
            Something went wrong
          </h2>
          <p className="text-red-600">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 2. Create Global Error Handler

Create `apps/web/src/lib/error-handler.ts`:

```typescript
import { ServiceError, ServiceErrorType } from './errors';
import { toast } from 'sonner';

export class GlobalErrorHandler {
  static handle(error: Error | ServiceError): void {
    if (error instanceof ServiceError) {
      this.handleServiceError(error);
    } else {
      this.handleGenericError(error);
    }

    // Log to monitoring service
    this.logError(error);
  }

  private static handleServiceError(error: ServiceError): void {
    switch (error.type) {
      case ServiceErrorType.AUTHENTICATION_ERROR:
        toast.error('Authentication failed. Please sign in again.');
        window.location.href = '/sign-in';
        break;
      case ServiceErrorType.AUTHORIZATION_ERROR:
        toast.error('Access denied. You do not have permission for this action.');
        break;
      case ServiceErrorType.VALIDATION_ERROR:
        toast.error(`Validation failed: ${error.message}`);
        break;
      case ServiceErrorType.NOT_FOUND:
        toast.error('Resource not found.');
        break;
      case ServiceErrorType.NETWORK_ERROR:
        toast.error('Network error. Please check your connection.');
        break;
      case ServiceErrorType.RATE_LIMIT_EXCEEDED:
        toast.error('Too many requests. Please try again later.');
        break;
      default:
        toast.error('An error occurred. Please try again.');
    }
  }

  private static handleGenericError(error: Error): void {
    toast.error('An unexpected error occurred.');
  }

  private static logError(error: Error): void {
    // Send to monitoring service (Sentry, LogRocket, etc.)
    console.error('GlobalErrorHandler:', error);
  }
}
```

## Phase 10: Performance Optimization

### 1. Implement Request Deduplication

Create `apps/web/src/lib/request-deduplication.ts`:

```typescript
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Start new request
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

export const requestDeduplicator = new RequestDeduplicator();
```

### 2. Add Request Batching

Create `apps/web/src/lib/request-batcher.ts`:

```typescript
interface BatchRequest {
  url: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class RequestBatcher {
  private queue: BatchRequest[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly batchDelay = 10; // ms

  add<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject });
      this.scheduleFlush();
    });
  }

  private scheduleFlush(): void {
    if (this.timeoutId) return;

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  private async flush(): void {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue.length = 0;
    this.timeoutId = null;

    try {
      // Group by similar requests that can be batched
      const batchedRequests = this.groupBatchableRequests(batch);
      await Promise.all(batchedRequests.map(group => this.executeBatch(group)));
    } catch (error) {
      batch.forEach(req => req.reject(error));
    }
  }

  private groupBatchableRequests(requests: BatchRequest[]): BatchRequest[][] {
    // Simple implementation - could be more sophisticated
    const groups: BatchRequest[][] = [];
    const visited = new Set<number>();

    requests.forEach((req, index) => {
      if (visited.has(index)) return;

      const group = [req];
      visited.add(index);

      // Find similar requests
      requests.forEach((otherReq, otherIndex) => {
        if (visited.has(otherIndex)) return;
        if (this.canBatch(req.url, otherReq.url)) {
          group.push(otherReq);
          visited.add(otherIndex);
        }
      });

      groups.push(group);
    });

    return groups;
  }

  private canBatch(url1: string, url2: string): boolean {
    // Implementation depends on API design
    // Example: batch multiple profile requests
    return url1.includes('/api/profiles/') && url2.includes('/api/profiles/');
  }

  private async executeBatch(group: BatchRequest[]): Promise<void> {
    if (group.length === 1) {
      // Single request
      try {
        const response = await fetch(group[0].url);
        const data = await response.json();
        group[0].resolve(data);
      } catch (error) {
        group[0].reject(error);
      }
    } else {
      // Batch request
      const urls = group.map(req => req.url);
      try {
        const response = await fetch('/api/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls })
        });
        const results = await response.json();
        
        group.forEach((req, index) => {
          req.resolve(results[index]);
        });
      } catch (error) {
        group.forEach(req => req.reject(error));
      }
    }
  }
}

export const requestBatcher = new RequestBatcher();
```

## Phase 11: Security Implementation

### 1. Create CSRF Protection

Create `apps/web/src/lib/csrf.ts`:

```typescript
class CSRFProtection {
  private token: string | null = null;

  async getToken(): Promise<string> {
    if (!this.token) {
      const response = await fetch('/api/csrf-token');
      const data = await response.json();
      this.token = data.token;
    }
    return this.token;
  }

  async addToHeaders(headers: Record<string, string>): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      ...headers,
      'X-CSRF-Token': token
    };
  }
}

export const csrfProtection = new CSRFProtection();
```

### 2. Secure Token Storage

Update `apps/web/src/lib/auth-manager.ts` to use secure storage:

```typescript
class SecureStorage {
  private readonly key = 'atspro_auth';

  store(data: AuthTokens): void {
    // In production, consider using a secure storage library
    const encrypted = this.encrypt(JSON.stringify(data));
    localStorage.setItem(this.key, encrypted);
  }

  retrieve(): AuthTokens | null {
    try {
      const encrypted = localStorage.getItem(this.key);
      if (!encrypted) return null;
      
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  remove(): void {
    localStorage.removeItem(this.key);
  }

  private encrypt(data: string): string {
    // Simple XOR encryption - use proper encryption in production
    return btoa(data);
  }

  private decrypt(encrypted: string): string {
    return atob(encrypted);
  }
}
```

## Phase 12: Development & Deployment

### 1. Update package.json Scripts

Update `apps/web/package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "type-check": "tsc --noEmit"
  }
}
```

### 2. Create Development Environment Setup

Create `scripts/setup-dev.sh`:

```bash
#!/bin/bash

echo "Setting up ATSPro development environment..."

# Start databases
docker-compose up -d postgres arangodb redis

# Wait for databases
echo "Waiting for databases to start..."
sleep 10

# Initialize databases
echo "Initializing databases..."
cd apps/api
uv run python scripts/init_arango.py
alembic upgrade head

# Install dependencies
echo "Installing dependencies..."
cd ../..
pnpm install

# Build
echo "Building applications..."
pnpm build

echo "Development environment ready!"
echo "Run 'pnpm dev' to start development servers"
```

### 3. Create Testing Script

Create `scripts/test.sh`:

```bash
#!/bin/bash

echo "Running ATSPro tests..."

# API tests
echo "Running API tests..."
cd apps/api
uv run pytest --cov=app --cov-report=html

# Web tests
echo "Running web tests..."
cd ../web
pnpm test --coverage

echo "All tests completed!"
```

## Implementation Checklist

### Phase 1: Database Schema ✓
- [ ] PostgreSQL migrations created and applied
- [ ] ArangoDB collections and indexes created
- [ ] Database connections tested

### Phase 2: TypeScript Types ✓
- [ ] Base types implemented
- [ ] Service interfaces created
- [ ] Type exports configured

### Phase 3: API Client ✓
- [ ] Base API client implemented
- [ ] Authentication integration added
- [ ] Retry logic with exponential backoff
- [ ] Rate limiting implemented

### Phase 4: Service Layer ✓
- [ ] Base service class created
- [ ] All service implementations completed
- [ ] Service factory and DI container setup

### Phase 5: Validation ✓
- [ ] Zod schemas implemented
- [ ] Validation helpers created
- [ ] Services updated with validation

### Phase 6: Caching ✓
- [ ] Multi-level cache implementation
- [ ] Cache integration in services
- [ ] Cache configuration optimized

### Phase 7: React Integration ✓
- [ ] Service provider created
- [ ] Layout updated with providers
- [ ] Custom hooks implemented

### Phase 8: Testing ✓
- [ ] Test configuration setup
- [ ] Service tests implemented
- [ ] Hook tests implemented
- [ ] Coverage targets met (>80%)

### Phase 9: Error Handling ✓
- [ ] Error boundary implemented
- [ ] Global error handler created
- [ ] User-friendly error messages

### Phase 10: Performance ✓
- [ ] Request deduplication implemented
- [ ] Request batching added
- [ ] Performance monitoring setup

### Phase 11: Security ✓
- [ ] CSRF protection implemented
- [ ] Secure token storage
- [ ] Input validation and sanitization

### Phase 12: Development Setup ✓
- [ ] Development scripts created
- [ ] Testing automation setup
- [ ] Documentation updated

## Monitoring & Maintenance

### Performance Metrics to Track
- API response times
- Cache hit rates
- Error rates by service
- User session duration
- Bundle size and loading times

### Regular Maintenance Tasks
- Update dependencies monthly
- Review and rotate API keys quarterly
- Performance audit quarterly
- Security scan monthly
- Database cleanup (remove old sessions, logs)

### Scaling Considerations
- Implement service worker for offline support
- Add Redis clustering for high availability
- Consider API rate limiting by user tier
- Implement database connection pooling
- Add CDN for static assets