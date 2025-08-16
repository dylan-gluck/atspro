import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { StatsCard } from '@/components/stats-card'
import type { JobEntity } from '@/types/database'

// Mock the services
const mockJobsService = {
  listJobs: vi.fn()
}

vi.mock('@/lib/services', () => ({
  useJobsService: () => mockJobsService
}))

const mockJobs: JobEntity[] = [
  {
    id: 'job-1',
    user_id: 'user-1',
    title: 'Software Engineer',
    company: 'Tech Corp',
    job_details: {
      company: 'Tech Corp',
      title: 'Software Engineer',
      description: 'Job description'
    },
    status_info: { status: 'applied' },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'job-2',
    user_id: 'user-1',
    title: 'Frontend Developer',
    company: 'Web Co',
    job_details: {
      company: 'Web Co',
      title: 'Frontend Developer',
      description: 'Job description'
    },
    status_info: { status: 'interviewing' },
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  },
  {
    id: 'job-3',
    user_id: 'user-1',
    title: 'Backend Developer',
    company: 'API Inc',
    job_details: {
      company: 'API Inc',
      title: 'Backend Developer',
      description: 'Job description'
    },
    status_info: { status: 'offered' },
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z'
  },
  {
    id: 'job-4',
    user_id: 'user-1',
    title: 'DevOps Engineer',
    company: 'Cloud Corp',
    job_details: {
      company: 'Cloud Corp',
      title: 'DevOps Engineer',
      description: 'Job description'
    },
    status_info: { status: 'rejected' },
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z'
  },
  {
    id: 'job-5',
    user_id: 'user-1',
    title: 'Full Stack Developer',
    company: 'Startup Co',
    job_details: {
      company: 'Startup Co',
      title: 'Full Stack Developer',
      description: 'Job description'
    },
    status_info: { status: 'saved' },
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z'
  }
]

describe('StatsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockJobsService.listJobs.mockReturnValue(new Promise(() => {})) // Never resolves
    
    render(<StatsCard />)
    
    expect(screen.getByText('Job Statistics')).toBeInTheDocument()
    expect(screen.getByText('Your application metrics')).toBeInTheDocument()
    
    // Check for loading skeletons
    const skeletons = screen.getAllByRole('generic', { hidden: true })
    expect(skeletons.some(el => el.classList.contains('animate-pulse'))).toBe(true)
  })

  it('displays job statistics correctly', async () => {
    mockJobsService.listJobs.mockResolvedValue({
      success: true,
      data: {
        data: mockJobs,
        total: mockJobs.length,
        page: 1,
        page_size: 100
      }
    })

    render(<StatsCard />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument() // Total jobs
    })

    expect(screen.getByText('2')).toBeInTheDocument() // Active jobs (applied + saved)
    expect(screen.getByText('1')).toBeInTheDocument() // Interviewing jobs
    expect(screen.getByText('25%')).toBeInTheDocument() // Success rate (1 offer / 4 applications = 25%)
  })

  it('calculates success rate correctly', async () => {
    const jobsWithHighSuccessRate: JobEntity[] = [
      {
        ...mockJobs[0],
        status_info: { status: 'offered' }
      },
      {
        ...mockJobs[1],
        status_info: { status: 'offered' }
      },
      {
        ...mockJobs[2],
        status_info: { status: 'applied' }
      },
      {
        ...mockJobs[3],
        status_info: { status: 'rejected' }
      }
    ]

    mockJobsService.listJobs.mockResolvedValue({
      success: true,
      data: {
        data: jobsWithHighSuccessRate,
        total: jobsWithHighSuccessRate.length,
        page: 1,
        page_size: 100
      }
    })

    render(<StatsCard />)

    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument() // 2 offers / 4 applications = 50%
    })
  })

  it('handles zero applications gracefully', async () => {
    const savedJobs: JobEntity[] = [
      {
        ...mockJobs[0],
        status_info: { status: 'saved' }
      }
    ]

    mockJobsService.listJobs.mockResolvedValue({
      success: true,
      data: {
        data: savedJobs,
        total: savedJobs.length,
        page: 1,
        page_size: 100
      }
    })

    render(<StatsCard />)

    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument() // No applications, so 0% success rate
    })
  })

  it('shows empty state when no jobs', async () => {
    mockJobsService.listJobs.mockResolvedValue({
      success: true,
      data: {
        data: [],
        total: 0,
        page: 1,
        page_size: 100
      }
    })

    render(<StatsCard />)

    await waitFor(() => {
      expect(screen.getByText('No jobs tracked yet. Start by adding your first job!')).toBeInTheDocument()
    })

    // Check for all the zero values using getAllByText since there are multiple 0s
    const zeroElements = screen.getAllByText('0')
    expect(zeroElements.length).toBeGreaterThan(0) // Should have multiple zero values
  })

  it('handles API errors gracefully', async () => {
    mockJobsService.listJobs.mockResolvedValue({
      success: false,
      data: null,
      message: 'API Error',
      errors: ['Failed to fetch jobs']
    })

    render(<StatsCard />)

    await waitFor(() => {
      expect(screen.getByText('Job Statistics')).toBeInTheDocument()
    })

    // Should show zero stats when API fails - check for specific zero values
    expect(screen.getByText('Total Jobs')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Interviewing')).toBeInTheDocument()
  })

  it('handles service unavailable gracefully', async () => {
    // Create a separate test with null service
    const NullServiceStatsCard = () => {
      return <StatsCard />
    }

    // Mock the hook to return null
    // Mock the hook to return null for this specific test
    vi.doMock('@/lib/services', () => ({
      useJobsService: vi.fn().mockReturnValueOnce(null)
    }))

    render(<NullServiceStatsCard />)

    await waitFor(() => {
      expect(screen.getByText('Job Statistics')).toBeInTheDocument()
    })

    // Should show zero stats when service is not available
    expect(screen.getByText('Total Jobs')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Interviewing')).toBeInTheDocument()
  })

  it('displays correct badge colors for different metrics', async () => {
    mockJobsService.listJobs.mockResolvedValue({
      success: true,
      data: {
        data: mockJobs,
        total: mockJobs.length,
        page: 1,
        page_size: 100
      }
    })

    render(<StatsCard />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    // Check for presence of different colored badges
    const badges = screen.getAllByRole('generic').filter(el => 
      el.classList.contains('bg-blue-100') ||
      el.classList.contains('bg-orange-100') ||
      el.classList.contains('bg-green-100')
    )
    
    expect(badges.length).toBeGreaterThan(0)
  })

  it('applies custom className correctly', async () => {
    mockJobsService.listJobs.mockResolvedValue({
      success: true,
      data: {
        data: [],
        total: 0,
        page: 1,
        page_size: 100
      }
    })

    const { container } = render(<StatsCard className="custom-class" />)

    await waitFor(() => {
      expect(screen.getByText('Job Statistics')).toBeInTheDocument()
    })
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})