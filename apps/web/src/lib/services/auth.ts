import type { 
  AuthService, 
  ApiClient, 
  ApiResponse, 
  BetterAuthUser, 
  BetterAuthSession 
} from '@/types/services';
import { BaseServiceImpl } from './base';
import { authClient } from '@/lib/auth-client';

export class AuthServiceImpl extends BaseServiceImpl implements AuthService {
  
  constructor(apiClient: ApiClient) {
    super(apiClient);
  }

  protected async onInitialize(): Promise<void> {
    // Initialize better-auth client if needed
    // Most initialization is handled by better-auth internally
  }

  protected async onDestroy(): Promise<void> {
    // Clean up any subscriptions or listeners
  }

  // Authentication (delegates to better-auth)
  async signIn(email: string, password: string): Promise<ApiResponse<BetterAuthSession | null>> {
    try {
      const result = await authClient.signIn.email({
        email,
        password
      });

      if (result.error) {
        return {
          data: null,
          success: false,
          message: result.error.message || 'Sign in failed',
          errors: [result.error.message || 'Sign in failed']
        };
      }

      const data = result.data;
      if (!data || !data.user) {
        return {
          data: null,
          success: false,
          message: 'No session returned',
          errors: ['No session returned']
        };
      }

      // Transform to our expected format - better-auth sign-in returns user + token
      const session: BetterAuthSession = {
        user: data.user as BetterAuthUser,
        session: {
          id: data.token, // Use token as session ID
          userId: data.user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          token: data.token,
          ipAddress: null,
          userAgent: null
        }
      };

      return {
        data: session,
        success: true,
        message: 'Signed in successfully'
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        message: error instanceof Error ? error.message : 'Sign in failed',
        errors: [error instanceof Error ? error.message : 'Sign in failed']
      };
    }
  }

  async signUp(email: string, password: string, name: string): Promise<ApiResponse<BetterAuthUser | null>> {
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name
      });

      if (result.error) {
        return {
          data: null,
          success: false,
          message: result.error.message || 'Sign up failed',
          errors: [result.error.message || 'Sign up failed']
        };
      }

      const user = result.data?.user as BetterAuthUser;
      if (!user) {
        return {
          data: null,
          success: false,
          message: 'No user returned',
          errors: ['No user returned']
        };
      }

      return {
        data: user,
        success: true,
        message: 'Account created successfully'
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        message: error instanceof Error ? error.message : 'Sign up failed',
        errors: [error instanceof Error ? error.message : 'Sign up failed']
      };
    }
  }

  async signOut(): Promise<ApiResponse<void>> {
    try {
      await authClient.signOut();

      return {
        data: undefined,
        success: true,
        message: 'Signed out successfully'
      };
    } catch (error) {
      return {
        data: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Sign out failed',
        errors: [error instanceof Error ? error.message : 'Sign out failed']
      };
    }
  }

  // Session Management (delegates to better-auth)
  async getSession(): Promise<ApiResponse<BetterAuthSession | null>> {
    try {
      const sessionData = await authClient.getSession();
      
      if (!sessionData || !sessionData.data) {
        return {
          data: null,
          success: true,
          message: 'No active session'
        };
      }

      // Transform to our expected format if we have valid session data
      const data = sessionData.data;
      if (data?.user && data?.session) {
        const session: BetterAuthSession = {
          user: data.user as BetterAuthUser,
          session: data.session
        };
        
        return {
          data: session,
          success: true,
          message: 'Session retrieved'
        };
      }

      return {
        data: null,
        success: true,
        message: 'No active session'
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get session',
        errors: [error instanceof Error ? error.message : 'Failed to get session']
      };
    }
  }

  async validateSession(): Promise<boolean> {
    try {
      const sessionData = await authClient.getSession();
      return !!(sessionData?.data?.user && sessionData?.data?.session);
    } catch {
      return false;
    }
  }

  // User Management (delegates to better-auth)
  async getCurrentUser(): Promise<ApiResponse<BetterAuthUser | null>> {
    try {
      const sessionData = await authClient.getSession();
      
      return {
        data: sessionData?.data?.user || null,
        success: true,
        message: sessionData?.data?.user ? 'User retrieved' : 'No user found'
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get user',
        errors: [error instanceof Error ? error.message : 'Failed to get user']
      };
    }
  }

  async updateUser(data: { name?: string; email?: string }): Promise<ApiResponse<BetterAuthUser | null>> {
    try {
      // Better-auth update methods - handle name and email separately
      let result;
      
      if (data.name) {
        result = await authClient.updateUser({
          name: data.name
        });
      }
      
      // Email updates are not supported through updateUser, would need separate endpoint
      if (data.email) {
        return {
          data: null,
          success: false,
          message: 'Email updates require separate verification flow',
          errors: ['Email updates require separate verification flow']
        };
      }

      if (result?.error) {
        return {
          data: null,
          success: false,
          message: result.error.message || 'Update failed',
          errors: [result.error.message || 'Update failed']
        };
      }

      // Better-auth updateUser returns { status: boolean }, not user data
      // So we need to fetch the updated user
      const userResponse = await this.getCurrentUser();
      if (!userResponse.success || !userResponse.data) {
        return {
          data: null,
          success: false,
          message: 'Failed to get updated user data',
          errors: ['Failed to get updated user data']
        };
      }

      // Clear cache since user data changed
      this.clearCachePattern('user');

      return {
        data: userResponse.data,
        success: true,
        message: 'User updated successfully'
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        message: error instanceof Error ? error.message : 'Update failed',
        errors: [error instanceof Error ? error.message : 'Update failed']
      };
    }
  }

  async deleteAccount(): Promise<ApiResponse<void>> {
    try {
      // Better-auth doesn't have built-in account deletion
      // This would typically be handled by a custom API endpoint
      return this.apiClient.delete('/api/user/delete-account');
    } catch (error) {
      return {
        data: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Account deletion failed',
        errors: [error instanceof Error ? error.message : 'Account deletion failed']
      };
    }
  }

  // Email Verification (delegates to better-auth)
  async sendVerificationEmail(): Promise<ApiResponse<void>> {
    try {
      // Get current user's email first
      const userResponse = await this.getCurrentUser();
      if (!userResponse.success || !userResponse.data?.email) {
        return {
          data: undefined,
          success: false,
          message: 'No authenticated user found',
          errors: ['No authenticated user found']
        };
      }

      const result = await authClient.sendVerificationEmail({
        email: userResponse.data.email
      });
      
      if (result.error) {
        return {
          data: undefined,
          success: false,
          message: result.error.message || 'Failed to send verification email',
          errors: [result.error.message || 'Failed to send verification email']
        };
      }

      return {
        data: undefined,
        success: true,
        message: 'Verification email sent'
      };
    } catch (error) {
      return {
        data: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send verification email',
        errors: [error instanceof Error ? error.message : 'Failed to send verification email']
      };
    }
  }

  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    try {
      const result = await authClient.verifyEmail({
        query: { token }
      });

      if (result.error) {
        return {
          data: undefined,
          success: false,
          message: result.error.message || 'Email verification failed',
          errors: [result.error.message || 'Email verification failed']
        };
      }

      return {
        data: undefined,
        success: true,
        message: 'Email verified successfully'
      };
    } catch (error) {
      return {
        data: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Email verification failed',
        errors: [error instanceof Error ? error.message : 'Email verification failed']
      };
    }
  }

  // Password Management (delegates to better-auth)
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true
      });

      if (result.error) {
        return {
          data: undefined,
          success: false,
          message: result.error.message || 'Password change failed',
          errors: [result.error.message || 'Password change failed']
        };
      }

      return {
        data: undefined,
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      return {
        data: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Password change failed',
        errors: [error instanceof Error ? error.message : 'Password change failed']
      };
    }
  }

  async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    try {
      const result = await authClient.forgetPassword({
        email,
        redirectTo: '/reset-password'
      });

      if (result.error) {
        return {
          data: undefined,
          success: false,
          message: result.error.message || 'Password reset request failed',
          errors: [result.error.message || 'Password reset request failed']
        };
      }

      return {
        data: undefined,
        success: true,
        message: 'Password reset email sent'
      };
    } catch (error) {
      return {
        data: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Password reset request failed',
        errors: [error instanceof Error ? error.message : 'Password reset request failed']
      };
    }
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const result = await authClient.resetPassword({
        newPassword: newPassword,
        token: token
      });

      if (result.error) {
        return {
          data: undefined,
          success: false,
          message: result.error.message || 'Password reset failed',
          errors: [result.error.message || 'Password reset failed']
        };
      }

      return {
        data: undefined,
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      return {
        data: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Password reset failed',
        errors: [error instanceof Error ? error.message : 'Password reset failed']
      };
    }
  }

  // Better-Auth Client Access
  getBetterAuthClient() {
    return authClient;
  }
}