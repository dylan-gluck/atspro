import type { 
  NotificationService, 
  ApiClient, 
  AuthService,
  ApiResponse, 
  PaginatedResponse,
  Notification,
  NotificationPreferences
} from '@/types/services';
import { BaseServiceImpl } from './base';

export class NotificationServiceImpl extends BaseServiceImpl implements NotificationService {
  private authService: AuthService;
  private eventSource: EventSource | null = null;
  private isSubscribed = false;

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
    // Clean up real-time subscriptions
    await this.unsubscribe();
  }

  // Notification Management
  async getNotifications(params?: {
    is_read?: boolean;
    category?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    const cacheKey = this.getCacheKey('getNotifications', params);
    
    return this.withCache(cacheKey, async () => {
      const queryParams = new URLSearchParams();
      
      if (params?.is_read !== undefined) {
        queryParams.append('is_read', params.is_read.toString());
      }
      if (params?.category) queryParams.append('category', params.category);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
      
      const url = `/api/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return this.apiClient.get<PaginatedResponse<Notification>>(url);
    }, 30000); // Cache for 30 seconds (notifications change frequently)
  }

  async markAsRead(id: string): Promise<ApiResponse<void>> {
    if (!id) {
      return {
        data: undefined,
        success: false,
        message: 'Notification ID is required',
        errors: ['Notification ID is required']
      };
    }

    const response = await this.apiClient.patch<void>(`/api/notifications/${id}/read`);
    
    if (response.success) {
      // Clear notification caches
      this.clearCachePattern('getNotifications');
    }
    
    return response;
  }

  async markAllAsRead(): Promise<ApiResponse<void>> {
    const response = await this.apiClient.patch<void>('/api/notifications/read-all');
    
    if (response.success) {
      // Clear notification caches
      this.clearCachePattern('getNotifications');
    }
    
    return response;
  }

  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    if (!id) {
      return {
        data: undefined,
        success: false,
        message: 'Notification ID is required',
        errors: ['Notification ID is required']
      };
    }

    const response = await this.apiClient.delete<void>(`/api/notifications/${id}`);
    
    if (response.success) {
      // Clear notification caches
      this.clearCachePattern('getNotifications');
    }
    
    return response;
  }

  // Real-time Notifications
  async subscribe(): Promise<void> {
    if (this.isSubscribed || typeof window === 'undefined') {
      return;
    }

    try {
      // Get current user to ensure authentication
      const userResponse = await this.authService.getCurrentUser();
      if (!userResponse.success || !userResponse.data) {
        throw new Error('User not authenticated');
      }

      // Create Server-Sent Events connection
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      this.eventSource = new EventSource(`${baseURL}/api/notifications/stream`, {
        withCredentials: true
      });

      this.eventSource.onopen = () => {
        this.isSubscribed = true;
        console.log('Notification stream connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          this.handleRealtimeNotification(notification);
        } catch (error) {
          console.error('Failed to parse notification:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('Notification stream error:', error);
        this.isSubscribed = false;
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.subscribe().catch(console.error);
          }
        }, 5000);
      };

    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
      throw error;
    }
  }

  async unsubscribe(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isSubscribed = false;
  }

  private handleRealtimeNotification(notification: Notification): void {
    // Clear notification caches when new notifications arrive
    this.clearCachePattern('getNotifications');
    
    // Emit custom event for components to listen to
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('newNotification', {
        detail: notification
      });
      window.dispatchEvent(customEvent);
    }

    // Show browser notification if permissions are granted
    if (typeof window !== 'undefined' && 
        'Notification' in window && 
        Notification.permission === 'granted') {
      
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id // Prevent duplicate notifications
      });
    }
  }

  // Preferences
  async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    const cacheKey = this.getCacheKey('getPreferences');
    
    return this.withCache(cacheKey, async () => {
      return this.apiClient.get<NotificationPreferences>('/api/notifications/preferences');
    });
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> {
    const response = await this.apiClient.patch<NotificationPreferences>(
      '/api/notifications/preferences', 
      preferences
    );
    
    if (response.success) {
      // Clear preferences cache
      this.clearCachePattern('getPreferences');
    }
    
    return response;
  }

  // Push Notifications
  async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  async subscribeToPush(): Promise<ApiResponse<void>> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return {
        data: undefined,
        success: false,
        message: 'Push notifications not supported',
        errors: ['Push notifications not supported']
      };
    }

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.ready;
      
      // Get push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      // Send subscription to server
      const response = await this.apiClient.post<void>('/api/notifications/push/subscribe', {
        subscription: subscription.toJSON()
      });

      return response;
    } catch (error) {
      return {
        data: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Push subscription failed',
        errors: [error instanceof Error ? error.message : 'Push subscription failed']
      };
    }
  }

  async unsubscribeFromPush(): Promise<ApiResponse<void>> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return {
        data: undefined,
        success: false,
        message: 'Push notifications not supported',
        errors: ['Push notifications not supported']
      };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove subscription from server
      return this.apiClient.delete<void>('/api/notifications/push/unsubscribe');
    } catch (error) {
      return {
        data: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Push unsubscription failed',
        errors: [error instanceof Error ? error.message : 'Push unsubscription failed']
      };
    }
  }

  // Utility methods
  async getUnreadCount(): Promise<number> {
    try {
      const response = await this.getNotifications({ is_read: false, page: 1, page_size: 1 });
      return response.success ? response.data.total : 0;
    } catch {
      return 0;
    }
  }

  async getNotificationsByCategory(category: string): Promise<Notification[]> {
    try {
      const response = await this.getNotifications({ category });
      return response.success ? response.data.data : [];
    } catch {
      return [];
    }
  }

  async hasUnreadNotifications(): Promise<boolean> {
    const count = await this.getUnreadCount();
    return count > 0;
  }

  // Method to check if real-time notifications are supported
  isRealtimeSupported(): boolean {
    return typeof window !== 'undefined' && 'EventSource' in window;
  }

  // Method to check if push notifications are supported
  isPushSupported(): boolean {
    return typeof window !== 'undefined' && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
  }

  // Method to get current subscription status
  getSubscriptionStatus(): {
    realtime: boolean;
    push: boolean;
  } {
    return {
      realtime: this.isSubscribed,
      push: this.isPushSupported() // Would need to check actual push subscription status
    };
  }
}