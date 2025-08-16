import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Dashboard } from '@/components/dashboard'
import type { BetterAuthUser, UserProfile } from '@/types/database'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh
  })
}))

// Mock auth client
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signOut: vi.fn()
  }
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock services
const mockUserService = {
  getProfile: vi.fn()
}

vi.mock('@/lib/services', () => ({
  useUserService: () => mockUserService,
  useJobsService: () => null,
  useNotificationService: () => null
}))

// Mock the card components
vi.mock('@/components/profile-card', () => ({
  ProfileCard: ({ user, profile, className }: any) => (
    <div data-testid="profile-card" className={className}>
      Profile Card - {user.name} - {profile?.resume_id ? 'Has Resume' : 'No Resume'}
    </div>
  )
}))

vi.mock('@/components/stats-card', () => ({
  StatsCard: ({ className }: any) => (
    <div data-testid="stats-card" className={className}>
      Stats Card
    </div>
  )
}))

vi.mock('@/components/notification-card', () => ({
  NotificationCard: ({ className }: any) => (
    <div data-testid="notification-card" className={className}>
      Notification Card
    </div>
  )
}))

const mockUser: BetterAuthUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockProfile: UserProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  title: 'Software Engineer',
  location: 'San Francisco, CA',
  resume_id: 'resume-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the dashboard layout correctly', () => {
    mockUserService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile
    })

    render(<Dashboard user={mockUser} />)

    expect(screen.getByText('ATS Pro')).toBeInTheDocument()
    expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
    expect(screen.getByText('Recent Jobs')).toBeInTheDocument()
    expect(screen.getByText('Add Job')).toBeInTheDocument()
  })

  it('renders all dashboard cards', () => {
    mockUserService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile
    })

    render(<Dashboard user={mockUser} />)

    expect(screen.getByTestId('profile-card')).toBeInTheDocument()
    expect(screen.getByTestId('stats-card')).toBeInTheDocument()
    expect(screen.getByTestId('notification-card')).toBeInTheDocument()
  })

  it('loads user profile on mount', async () => {
    mockUserService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile
    })

    render(<Dashboard user={mockUser} />)

    await waitFor(() => {
      expect(mockUserService.getProfile).toHaveBeenCalled()
    })

    expect(screen.getByText('Profile Card - John Doe - Has Resume')).toBeInTheDocument()
  })

  it('handles profile loading failure gracefully', async () => {
    mockUserService.getProfile.mockResolvedValue({
      success: false,
      data: null,
      message: 'Profile not found',
      errors: ['Profile not found']
    })

    render(<Dashboard user={mockUser} />)

    await waitFor(() => {
      expect(mockUserService.getProfile).toHaveBeenCalled()
    })

    // Should still render with null profile
    expect(screen.getByText('Profile Card - John Doe - No Resume')).toBeInTheDocument()
  })

  it('handles user service unavailable', () => {
    // Mock the hook to return null
    vi.mocked(require('@/lib/services').useUserService).mockReturnValueOnce(null)

    render(<Dashboard user={mockUser} />)

    // Should still render the dashboard
    expect(screen.getByText('ATS Pro')).toBeInTheDocument()
    expect(screen.getByTestId('profile-card')).toBeInTheDocument()
  })

  it('signs out user when sign out button clicked', async () => {
    const { authClient } = await import('@/lib/auth-client')
    const { toast } = await import('sonner')
    
    mockUserService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile
    })

    vi.mocked(authClient.signOut).mockResolvedValue(undefined)

    render(<Dashboard user={mockUser} />)

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    await waitFor(() => {
      expect(authClient.signOut).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Signed out successfully')
    expect(mockPush).toHaveBeenCalledWith('/sign-in')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('handles sign out failure', async () => {
    const { authClient } = await import('@/lib/auth-client')
    const { toast } = await import('sonner')
    
    mockUserService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile
    })

    vi.mocked(authClient.signOut).mockRejectedValue(new Error('Sign out failed'))

    render(<Dashboard user={mockUser} />)

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    await waitFor(() => {
      expect(authClient.signOut).toHaveBeenCalled()
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to sign out')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('displays job management placeholder', () => {
    mockUserService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile
    })

    render(<Dashboard user={mockUser} />)

    expect(screen.getByText('Job Management')).toBeInTheDocument()
    expect(screen.getByText('Track and manage your job applications')).toBeInTheDocument()
    expect(screen.getByText('Job list and management features coming soon...')).toBeInTheDocument()
  })

  it('applies responsive grid classes correctly', () => {
    mockUserService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile
    })

    const { container } = render(<Dashboard user={mockUser} />)

    // Check for grid container with responsive classes
    const gridContainer = container.querySelector('.grid.gap-6.md\\:grid-cols-2.lg\\:grid-cols-3')
    expect(gridContainer).toBeInTheDocument()
  })

  it('passes correct props to card components', async () => {
    mockUserService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile
    })

    render(<Dashboard user={mockUser} />)

    await waitFor(() => {
      expect(screen.getByText('Profile Card - John Doe - Has Resume')).toBeInTheDocument()
    })

    // Check that cards receive appropriate className props
    expect(screen.getByTestId('profile-card')).toHaveClass('md:col-span-1')
    expect(screen.getByTestId('stats-card')).toHaveClass('md:col-span-1')
    expect(screen.getByTestId('notification-card')).toHaveClass('md:col-span-1', 'lg:col-span-1')
  })

  it('handles profile loading error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    mockUserService.getProfile.mockRejectedValue(new Error('Network error'))

    render(<Dashboard user={mockUser} />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load user profile:', expect.any(Error))
    })

    // Dashboard should still render
    expect(screen.getByText('ATS Pro')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  it('renders with minimal user information', () => {
    const minimalUser: BetterAuthUser = {
      id: 'user-2',
      name: '',
      email: 'minimal@example.com',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockUserService.getProfile.mockResolvedValue({
      success: true,
      data: null
    })

    render(<Dashboard user={minimalUser} />)

    expect(screen.getByText('ATS Pro')).toBeInTheDocument()
    expect(screen.getByText('Welcome,')).toBeInTheDocument() // Empty name
  })
})