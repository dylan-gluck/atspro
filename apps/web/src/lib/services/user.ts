import type { 
  UserService, 
  ApiClient, 
  AuthService,
  ApiResponse, 
  BetterAuthUser,
  UserProfile,
  FullUserProfile,
  UserSettings,
  Subscription
} from '@/types/services';
import { BaseServiceImpl } from './base';

export class UserServiceImpl extends BaseServiceImpl implements UserService {
  private authService: AuthService;

  constructor(apiClient: ApiClient, authService: AuthService) {
    super(apiClient);
    this.authService = authService;
  }

  protected async onInitialize(): Promise<void> {
    // Ensure auth service is initialized
    if (!this.authService.isInitialized) {
      await this.authService.initialize();
    }
  }

  protected async onDestroy(): Promise<void> {
    // Clean up any subscriptions or listeners
  }

  // Profile Management (works with better-auth user + extended profile)
  async getFullProfile(): Promise<ApiResponse<FullUserProfile>> {
    const cacheKey = this.getCacheKey('getFullProfile');
    
    return this.withCache(cacheKey, async () => {
      // Get user from better-auth
      const userResponse = await this.authService.getCurrentUser();
      if (!userResponse.success || !userResponse.data) {
        return {
          data: { user: null } as any,
          success: false,
          message: 'User not authenticated',
          errors: ['User not authenticated']
        };
      }

      // Get extended profile from API
      const profileResponse = await this.apiClient.get<UserProfile>('/api/user/profile');
      
      return {
        data: {
          user: userResponse.data,
          profile: profileResponse.success ? profileResponse.data : undefined
        },
        success: true,
        message: 'Profile retrieved successfully'
      };
    });
  }

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    const cacheKey = this.getCacheKey('getProfile');
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<UserProfile>('/api/user/profile');
    });
  }

  async updateProfile(profile: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    const response = await this.apiClient.patch<UserProfile>('/api/user/profile', profile);
    
    if (response.success) {
      // Clear relevant caches
      this.clearCachePattern('Profile');
    }
    
    return response;
  }

  async deleteProfile(): Promise<ApiResponse<void>> {
    const response = await this.apiClient.delete<void>('/api/user/profile');
    
    if (response.success) {
      // Clear all caches
      this.cache.clear();
    }
    
    return response;
  }

  // Settings Management
  async getSettings(): Promise<ApiResponse<UserSettings>> {
    const cacheKey = this.getCacheKey('getSettings');
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<UserSettings>('/api/user/settings');
    });
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    const response = await this.apiClient.patch<UserSettings>('/api/user/settings', settings);
    
    if (response.success) {
      // Clear settings cache
      this.clearCachePattern('Settings');
    }
    
    return response;
  }

  // Subscription Management
  async getSubscription(): Promise<ApiResponse<Subscription>> {
    const cacheKey = this.getCacheKey('getSubscription');
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<Subscription>('/api/user/subscription');
    }, 60000); // Cache for 1 minute (subscription data changes less frequently)
  }

  async updateSubscription(plan: string): Promise<ApiResponse<Subscription>> {
    const response = await this.apiClient.post<Subscription>('/api/user/subscription', { plan });
    
    if (response.success) {
      // Clear subscription cache
      this.clearCachePattern('Subscription');
    }
    
    return response;
  }

  async cancelSubscription(): Promise<ApiResponse<void>> {
    const response = await this.apiClient.delete<void>('/api/user/subscription');
    
    if (response.success) {
      // Clear subscription cache
      this.clearCachePattern('Subscription');
    }
    
    return response;
  }

  // Better-Auth Integration (delegated to AuthService)
  async getCurrentUser(): Promise<ApiResponse<BetterAuthUser | null>> {
    return this.authService.getCurrentUser();
  }

  async updateUserName(name: string): Promise<ApiResponse<BetterAuthUser>> {
    const response = await this.authService.updateUser({ name });
    
    if (response.success) {
      // Clear profile-related caches since name changed
      this.clearCachePattern('Profile');
    }
    
    return response;
  }

  async updateUserEmail(email: string): Promise<ApiResponse<BetterAuthUser>> {
    const response = await this.authService.updateUser({ email });
    
    if (response.success) {
      // Clear profile-related caches since email changed
      this.clearCachePattern('Profile');
    }
    
    return response;
  }

  // Utility method to get current user ID
  async getCurrentUserId(): Promise<string | null> {
    try {
      const userResponse = await this.getCurrentUser();
      return userResponse.data?.id || null;
    } catch {
      return null;
    }
  }

  // Method to check if user has active subscription
  async hasActiveSubscription(): Promise<boolean> {
    try {
      const subscriptionResponse = await this.getSubscription();
      if (!subscriptionResponse.success || !subscriptionResponse.data) {
        return false;
      }
      
      const subscription = subscriptionResponse.data;
      return subscription.status === 'active' && 
             (!subscription.ends_at || new Date(subscription.ends_at) > new Date());
    } catch {
      return false;
    }
  }

  // Method to get user plan
  async getUserPlan(): Promise<'free' | 'premium' | 'enterprise'> {
    try {
      const subscriptionResponse = await this.getSubscription();
      if (!subscriptionResponse.success || !subscriptionResponse.data) {
        return 'free';
      }
      
      const subscription = subscriptionResponse.data;
      if (subscription.status === 'active') {
        return subscription.plan;
      }
      
      return 'free';
    } catch {
      return 'free';
    }
  }
}