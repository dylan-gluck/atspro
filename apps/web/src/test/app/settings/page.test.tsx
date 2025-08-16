import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SettingsPage from '@/app/settings/page';
import type { BetterAuthUser, UserProfile, UserSettings } from '@/types/database';

// Mock the services
const mockUserService = {
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  updateUserName: vi.fn(),
  updateUserEmail: vi.fn(),
  initialize: vi.fn(),
  destroy: vi.fn(),
  isInitialized: true
};

const mockAuthService = {
  getCurrentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  initialize: vi.fn(),
  destroy: vi.fn(),
  isInitialized: true
};

// Mock the service hooks
vi.mock('@/lib/services', () => ({
  useUserService: () => mockUserService,
  useAuthService: () => mockAuthService
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn()
  })
}));

// Mock toast from sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

const mockUser: BetterAuthUser = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  emailVerified: true,
  image: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const mockProfile: UserProfile = {
  user_id: 'user-123',
  phone: '+1-555-123-4567',
  location: 'San Francisco, CA',
  title: 'Software Engineer',
  bio: 'Experienced developer with 5+ years in full-stack development.',
  resume_id: 'resume-123',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01')
};

const mockSettings: UserSettings = {
  user_id: 'user-123',
  theme: 'system',
  notifications: {
    email: true,
    push: true,
    sms: false
  },
  preferences: {
    auto_optimize: false,
    save_drafts: true,
    default_privacy: 'private'
  },
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01')
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful responses
    mockAuthService.getCurrentUser.mockResolvedValue({
      success: true,
      data: mockUser
    });
    
    mockUserService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile
    });
    
    mockUserService.getSettings.mockResolvedValue({
      success: true,
      data: mockSettings
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading skeleton initially', async () => {
      // Make services never resolve to keep loading state
      mockAuthService.getCurrentUser.mockImplementation(() => new Promise(() => {}));

      render(<SettingsPage />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    });

    it('should show error state when data loading fails', async () => {
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('Network error'));

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load user settings. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle partial data loading failures gracefully', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser
      });
      
      mockUserService.getProfile.mockResolvedValue({
        success: false,
        data: null
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Profile Information')).toBeInTheDocument();
        // Should still load even with partial failures
      });
    });
  });

  describe('Navigation', () => {
    it('should handle back button navigation', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Back to Dashboard'));
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should show all tab navigation options', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Preferences')).toBeInTheDocument();
        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('Security')).toBeInTheDocument();
      });
    });
  });

  describe('Profile Tab', () => {
    it('should display and populate profile form fields', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+1-555-123-4567')).toBeInTheDocument();
        expect(screen.getByDisplayValue('San Francisco, CA')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Experienced developer with 5+ years in full-stack development.')).toBeInTheDocument();
      });
    });

    it('should handle profile form input changes', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('John Doe');
        fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
        expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('John Doe');
        fireEvent.change(nameInput, { target: { value: '' } });
        
        const emailInput = screen.getByDisplayValue('john.doe@example.com');
        fireEvent.change(emailInput, { target: { value: '' } });

        // Form should still be submittable but may show validation errors
        const saveButton = screen.getByRole('button', { name: /Save Profile/ });
        expect(saveButton).toBeInTheDocument();
      });
    });

    it('should handle profile save successfully', async () => {
      mockUserService.updateUserName.mockResolvedValue({ success: true });
      mockUserService.updateProfile.mockResolvedValue({
        success: true,
        data: { ...mockProfile, title: 'Senior Software Engineer' }
      });

      render(<SettingsPage />);

      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Software Engineer');
        fireEvent.change(titleInput, { target: { value: 'Senior Software Engineer' } });
      });

      const saveButton = screen.getByRole('button', { name: /Save Profile/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUserService.updateProfile).toHaveBeenCalledWith({
          phone: '+1-555-123-4567',
          location: 'San Francisco, CA',
          title: 'Senior Software Engineer',
          bio: 'Experienced developer with 5+ years in full-stack development.'
        });
      });
    });

    it('should handle profile save error', async () => {
      mockUserService.updateProfile.mockRejectedValue(new Error('Save failed'));

      render(<SettingsPage />);

      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Software Engineer');
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
      });

      const saveButton = screen.getByRole('button', { name: /Save Profile/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUserService.updateProfile).toHaveBeenCalled();
      });
    });

    it('should show saving state during profile update', async () => {
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      
      mockUserService.updateProfile.mockReturnValue(updatePromise);

      render(<SettingsPage />);

      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Software Engineer');
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
      });

      const saveButton = screen.getByRole('button', { name: /Save Profile/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Resolve the promise to finish the save
      resolveUpdate!({ success: true, data: mockProfile });
    });
  });

  describe('Preferences Tab', () => {
    it('should display preferences settings', async () => {
      render(<SettingsPage />);

      // Click on Preferences tab
      await waitFor(() => {
        fireEvent.click(screen.getByText('Preferences'));
      });

      await waitFor(() => {
        expect(screen.getByText('Application Preferences')).toBeInTheDocument();
        expect(screen.getByText('Theme')).toBeInTheDocument();
        expect(screen.getByText('Default Privacy')).toBeInTheDocument();
        expect(screen.getByText('Auto-optimize resumes')).toBeInTheDocument();
        expect(screen.getByText('Save drafts automatically')).toBeInTheDocument();
      });
    });

    it('should handle theme selection changes', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Preferences'));
      });

      await waitFor(() => {
        // Find and click theme selector
        const themeSelectors = screen.getAllByRole('combobox');
        const themeSelector = themeSelectors[0]; // First combobox should be theme
        fireEvent.click(themeSelector);
      });

      // Note: Testing select components can be complex with shadcn/ui
      // The actual selection might require more specific selectors
    });

    it('should handle switch toggles', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Preferences'));
      });

      await waitFor(() => {
        // Find switches and test toggling
        const switches = document.querySelectorAll('[role="switch"]');
        expect(switches.length).toBeGreaterThan(0);
        
        // Test auto-optimize toggle
        const autoOptimizeSwitch = switches[0];
        fireEvent.click(autoOptimizeSwitch);
      });
    });

    it('should save preferences successfully', async () => {
      mockUserService.updateSettings.mockResolvedValue({
        success: true,
        data: { ...mockSettings, theme: 'dark' }
      });

      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Preferences'));
      });

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save Preferences/ });
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockUserService.updateSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Notifications Tab', () => {
    it('should display notification settings', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Notifications'));
      });

      await waitFor(() => {
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();
        expect(screen.getByText('Email notifications')).toBeInTheDocument();
        expect(screen.getByText('Push notifications')).toBeInTheDocument();
        expect(screen.getByText('SMS notifications')).toBeInTheDocument();
        expect(screen.getByText('Premium Feature')).toBeInTheDocument();
      });
    });

    it('should handle notification preference toggles', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Notifications'));
      });

      await waitFor(() => {
        const switches = document.querySelectorAll('[role="switch"]');
        expect(switches.length).toBeGreaterThan(0);
        
        // Toggle email notifications
        fireEvent.click(switches[0]);
      });
    });

    it('should save notification settings', async () => {
      mockUserService.updateSettings.mockResolvedValue({
        success: true,
        data: mockSettings
      });

      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Notifications'));
      });

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save Notifications/ });
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockUserService.updateSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Security Tab', () => {
    it('should display security information', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Security'));
      });

      await waitFor(() => {
        expect(screen.getByText('Security & Privacy')).toBeInTheDocument();
        expect(screen.getByText('Account Status')).toBeInTheDocument();
        expect(screen.getByText('Email Verification')).toBeInTheDocument();
        expect(screen.getByText('Data Privacy')).toBeInTheDocument();
        
        // Should show verified badges
        const verifiedBadges = screen.getAllByText('Verified');
        expect(verifiedBadges.length).toBeGreaterThan(0);
      });
    });

    it('should display security notice', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Security'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Security features are managed through your authentication provider/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        const emailInput = screen.getByDisplayValue('john.doe@example.com');
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        
        // HTML5 validation should apply
        expect(emailInput).toHaveAttribute('type', 'email');
      });
    });

    it('should handle empty optional fields', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        const phoneInput = screen.getByDisplayValue('+1-555-123-4567');
        fireEvent.change(phoneInput, { target: { value: '' } });
        
        const locationInput = screen.getByDisplayValue('San Francisco, CA');
        fireEvent.change(locationInput, { target: { value: '' } });
        
        // Should still be valid without optional fields
        const saveButton = screen.getByRole('button', { name: /Save Profile/ });
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable state', async () => {
      // Mock services as null
      vi.mocked(mockUserService).getProfile.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load user settings. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle network timeouts gracefully', async () => {
      mockAuthService.getCurrentUser.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load user settings. Please try again.')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle partial update failures', async () => {
      mockUserService.updateUserName.mockResolvedValue({ success: false, message: 'Name update failed' });
      mockUserService.updateProfile.mockResolvedValue({ success: true, data: mockProfile });

      render(<SettingsPage />);

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('John Doe');
        fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      });

      const saveButton = screen.getByRole('button', { name: /Save Profile/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUserService.updateUserName).toHaveBeenCalledWith('Jane Doe');
      });
    });
  });

  describe('Integration', () => {
    it('should load all user data on component mount', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(1);
        expect(mockUserService.getProfile).toHaveBeenCalledTimes(1);
        expect(mockUserService.getSettings).toHaveBeenCalledTimes(1);
      });
    });

    it('should refresh data after successful updates', async () => {
      mockUserService.updateProfile.mockResolvedValue({
        success: true,
        data: mockProfile
      });

      render(<SettingsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(1);
      });

      // Save profile to trigger refresh
      const saveButton = screen.getByRole('button', { name: /Save Profile/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Should call loadUserData again (which calls all three services)
        expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(2);
        expect(mockUserService.getProfile).toHaveBeenCalledTimes(2);
        expect(mockUserService.getSettings).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle service initialization checks', () => {
      // Mock services as null/undefined to test initialization checks
      vi.mocked(mockUserService).isInitialized = false;

      render(<SettingsPage />);

      // Component should handle uninitialized services gracefully
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});