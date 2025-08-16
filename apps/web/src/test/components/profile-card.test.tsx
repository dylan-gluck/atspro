import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ProfileCard } from '@/components/profile-card'
import type { BetterAuthUser, UserProfile } from '@/types/database'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
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

const mockProfileWithoutResume: UserProfile = {
  id: 'profile-2',
  user_id: 'user-1',
  title: 'Software Engineer',
  location: 'San Francisco, CA',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('ProfileCard', () => {
  it('renders user information correctly', () => {
    render(<ProfileCard user={mockUser} profile={mockProfile} />)
    
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    expect(screen.getByText('📍 San Francisco, CA')).toBeInTheDocument()
  })

  it('displays user initials in avatar when no image provided', () => {
    render(<ProfileCard user={mockUser} profile={mockProfile} />)
    
    const avatar = screen.getByText('JD')
    expect(avatar).toBeInTheDocument()
  })

  it('shows active resume status when resume_id exists', () => {
    render(<ProfileCard user={mockUser} profile={mockProfile} />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Your resume is uploaded and ready for optimization')).toBeInTheDocument()
    expect(screen.queryByText('Upload Resume')).not.toBeInTheDocument()
  })

  it('shows pending resume status when no resume_id', () => {
    render(<ProfileCard user={mockUser} profile={mockProfileWithoutResume} />)
    
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Upload your resume to get started with job matching')).toBeInTheDocument()
    expect(screen.getByText('Upload Resume')).toBeInTheDocument()
  })

  it('shows pending status when no profile provided', () => {
    render(<ProfileCard user={mockUser} profile={null} />)
    
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Upload Resume')).toBeInTheDocument()
  })

  it('navigates to onboarding when upload button clicked', () => {
    const originalLocation = window.location
    // @ts-expect-error - mocking window.location for test
    delete window.location
    // @ts-expect-error - mocking window.location for test
    window.location = { ...originalLocation, href: '' }

    render(<ProfileCard user={mockUser} profile={mockProfileWithoutResume} />)
    
    const uploadButton = screen.getByText('Upload Resume')
    fireEvent.click(uploadButton)
    
    expect(window.location.href).toBe('/onboarding')
    
    // @ts-expect-error - restoring window.location after test
    window.location = originalLocation
  })

  it('handles user without name gracefully', () => {
    const userWithoutName: BetterAuthUser = {
      ...mockUser,
      name: ''
    }

    render(<ProfileCard user={userWithoutName} profile={mockProfile} />)
    
    expect(screen.getByText('No name set')).toBeInTheDocument()
    expect(screen.getByText('J')).toBeInTheDocument() // Email initial
  })

  it('handles profile without optional fields', () => {
    const minimalProfile: UserProfile = {
      id: 'profile-3',
      user_id: 'user-1',
      resume_id: 'resume-123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    render(<ProfileCard user={mockUser} profile={minimalProfile} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument()
    expect(screen.queryByText('📍')).not.toBeInTheDocument()
  })

  it('applies custom className correctly', () => {
    const { container } = render(
      <ProfileCard user={mockUser} profile={mockProfile} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})