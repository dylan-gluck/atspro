import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { useRouter, usePathname } from 'next/navigation';
import { useServices } from '@/lib/services';

// Mock the hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock('@/lib/services', () => ({
  useServices: vi.fn(),
}));

describe('OnboardingGuard Component', () => {
  const mockPush = vi.fn();
  const mockRouter = { push: mockPush };

  const mockServices = {
    authService: {
      getCurrentUser: vi.fn(),
    },
    userService: {
      hasResumeId: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    vi.mocked(useServices).mockReturnValue(mockServices);
  });

  it('renders loading state while services are not available', () => {
    vi.mocked(useServices).mockReturnValue(null);
    vi.mocked(usePathname).mockReturnValue('/');

    render(
      <OnboardingGuard>
        <div>Protected Content</div>
      </OnboardingGuard>
    );

    expect(screen.getByText('Checking account status...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when on onboarding page', async () => {
    vi.mocked(usePathname).mockReturnValue('/onboarding');

    render(
      <OnboardingGuard>
        <div>Onboarding Content</div>
      </OnboardingGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Onboarding Content')).toBeInTheDocument();
    });
  });

  it('renders children when on sign-in page', async () => {
    vi.mocked(usePathname).mockReturnValue('/sign-in');

    render(
      <OnboardingGuard>
        <div>Sign In Content</div>
      </OnboardingGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Sign In Content')).toBeInTheDocument();
    });
  });

  it('renders children when on sign-up page', async () => {
    vi.mocked(usePathname).mockReturnValue('/sign-up');

    render(
      <OnboardingGuard>
        <div>Sign Up Content</div>
      </OnboardingGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Sign Up Content')).toBeInTheDocument();
    });
  });

  it('renders children when user has resume_id', async () => {
    vi.mocked(usePathname).mockReturnValue('/');
    mockServices.authService.getCurrentUser.mockResolvedValue({
      success: true,
      data: { id: 'user1', email: 'test@example.com' },
    });
    mockServices.userService.hasResumeId.mockResolvedValue(true);

    render(
      <OnboardingGuard>
        <div>Dashboard Content</div>
      </OnboardingGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
  });

  it('redirects to onboarding when user has no resume_id', async () => {
    vi.mocked(usePathname).mockReturnValue('/');
    mockServices.authService.getCurrentUser.mockResolvedValue({
      success: true,
      data: { id: 'user1', email: 'test@example.com' },
    });
    mockServices.userService.hasResumeId.mockResolvedValue(false);

    render(
      <OnboardingGuard>
        <div>Dashboard Content</div>
      </OnboardingGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding');
    });

    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('does not redirect when user is not authenticated', async () => {
    vi.mocked(usePathname).mockReturnValue('/');
    mockServices.authService.getCurrentUser.mockResolvedValue({
      success: false,
      data: null,
    });

    render(
      <OnboardingGuard>
        <div>Dashboard Content</div>
      </OnboardingGuard>
    );

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });

    // Should render children and let middleware handle redirect
    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
  });

  it('handles errors gracefully', async () => {
    vi.mocked(usePathname).mockReturnValue('/');
    mockServices.authService.getCurrentUser.mockRejectedValue(new Error('Auth error'));

    // Mock console.error to avoid cluttering test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <OnboardingGuard>
        <div>Dashboard Content</div>
      </OnboardingGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error checking onboarding status:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('handles getCurrentUser returning no data', async () => {
    vi.mocked(usePathname).mockReturnValue('/');
    mockServices.authService.getCurrentUser.mockResolvedValue({
      success: true,
      data: null,
    });

    render(
      <OnboardingGuard>
        <div>Dashboard Content</div>
      </OnboardingGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows loading state while checking onboarding status', async () => {
    vi.mocked(usePathname).mockReturnValue('/');
    
    // Create a promise that we can control
    let resolveAuth: any;
    const authPromise = new Promise((resolve) => {
      resolveAuth = resolve;
    });
    
    mockServices.authService.getCurrentUser.mockReturnValue(authPromise);

    render(
      <OnboardingGuard>
        <div>Dashboard Content</div>
      </OnboardingGuard>
    );

    // Should show loading state initially
    expect(screen.getByText('Checking account status...')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();

    // Resolve the promise
    resolveAuth({
      success: true,
      data: { id: 'user1', email: 'test@example.com' },
    });

    mockServices.userService.hasResumeId.mockResolvedValue(true);

    // Should eventually show content
    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
  });
});