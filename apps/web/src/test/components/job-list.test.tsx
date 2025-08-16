import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { JobList } from '@/components/job-list';
import { useJobsService } from '@/lib/services';
import { toast } from 'sonner';
import type { JobEntity, ApiResponse, PaginatedResponse } from '@/types/services';

// Mock dependencies
vi.mock('@/lib/services');
vi.mock('sonner');

const mockJobEntity: JobEntity = {
  id: 'job-123',
  user_id: 'user-123',
  title: 'Software Engineer',
  company: 'Tech Corp',
  job_details: {
    company: 'Tech Corp',
    title: 'Software Engineer',
    description: 'Great opportunity',
    link: 'https://example.com/job',
    location: ['San Francisco, CA'],
    salary: '$120,000 - $150,000'
  },
  status_info: {
    status: 'saved'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockJobEntity2: JobEntity = {
  id: 'job-456',
  user_id: 'user-123',
  title: 'Frontend Developer',
  company: 'Design Co',
  job_details: {
    company: 'Design Co',
    title: 'Frontend Developer',
    description: 'Creative role',
    link: 'https://example.com/job2',
    location: ['New York, NY'],
    salary: '$100,000 - $130,000'
  },
  status_info: {
    status: 'applied'
  },
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z'
};

const mockPaginatedResponse: PaginatedResponse<JobEntity> = {
  data: [mockJobEntity, mockJobEntity2],
  total: 2,
  page: 1,
  page_size: 10,
  has_next: false,
  has_previous: false
};

const mockJobsService = {
  listJobs: vi.fn(),
  isInitialized: true,
  initialize: vi.fn(),
  destroy: vi.fn()
};

describe('JobList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useJobsService).mockReturnValue(mockJobsService as any);
  });

  describe('Loading State', () => {
    it('shows loading spinner while fetching jobs', () => {
      // Mock a delayed response
      mockJobsService.listJobs.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<JobList />);
      
      expect(screen.getByText('Loading jobs...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no jobs are found', async () => {
      const emptyResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: {
          ...mockPaginatedResponse,
          data: [],
          total: 0
        }
      };
      
      mockJobsService.listJobs.mockResolvedValue(emptyResponse);
      
      render(<JobList />);
      
      await waitFor(() => {
        expect(screen.getByText('No jobs found')).toBeInTheDocument();
        expect(screen.getByText('Add your first job by clicking the "Add Job" button above')).toBeInTheDocument();
      });
    });
  });

  describe('Job Display', () => {
    beforeEach(() => {
      const successResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: mockPaginatedResponse
      };
      
      mockJobsService.listJobs.mockResolvedValue(successResponse);
    });

    it('displays jobs in table format by default', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('Software Engineer')).toBeInTheDocument();
        expect(screen.getByText('Tech Corp')).toBeInTheDocument();
        expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
        expect(screen.getByText('Design Co')).toBeInTheDocument();
      });
    });

    it('shows job count in description', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        expect(screen.getByText('2 jobs found')).toBeInTheDocument();
      });
    });

    it('displays job status badges with correct variants', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        const savedBadge = screen.getByText('saved');
        const appliedBadge = screen.getByText('applied');
        
        expect(savedBadge).toBeInTheDocument();
        expect(appliedBadge).toBeInTheDocument();
      });
    });

    it('formats dates correctly', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        expect(screen.getByText('1/1/2024')).toBeInTheDocument();
        expect(screen.getByText('1/2/2024')).toBeInTheDocument();
      });
    });

    it('displays external links when available', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        const externalLinks = screen.getAllByLabelText(/external link/i);
        expect(externalLinks).toHaveLength(2);
        
        expect(externalLinks[0]).toHaveAttribute('href', 'https://example.com/job');
        expect(externalLinks[1]).toHaveAttribute('href', 'https://example.com/job2');
      });
    });
  });

  describe('View Mode Toggle', () => {
    beforeEach(() => {
      const successResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: mockPaginatedResponse
      };
      
      mockJobsService.listJobs.mockResolvedValue(successResponse);
    });

    it('switches between table and card view', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
      
      // Switch to card view
      const cardViewButton = screen.getByRole('button', { name: /grid/i });
      fireEvent.click(cardViewButton);
      
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      
      // Should still show job information in cards
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    });

    it('shows correct button states for view modes', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        const tableButton = screen.getByRole('button', { name: /list/i });
        const cardButton = screen.getByRole('button', { name: /grid/i });
        
        // Table view should be active by default
        expect(tableButton).toHaveAttribute('data-state', 'active');
        expect(cardButton).toHaveAttribute('data-state', 'inactive');
      });
    });
  });

  describe('Status Filtering', () => {
    beforeEach(() => {
      const successResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: mockPaginatedResponse
      };
      
      mockJobsService.listJobs.mockResolvedValue(successResponse);
    });

    it('filters jobs by status', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        expect(mockJobsService.listJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
            page_size: 10
          })
        );
      });
      
      // Filter by 'active' status
      const activeTab = screen.getByRole('tab', { name: 'Active' });
      fireEvent.click(activeTab);
      
      await waitFor(() => {
        expect(mockJobsService.listJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            archived: false,
            page: 1,
            page_size: 10
          })
        );
      });
    });

    it('shows all filter options', () => {
      render(<JobList />);
      
      expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Archived' })).toBeInTheDocument();
    });

    it('maintains active filter state', async () => {
      render(<JobList />);
      
      const activeTab = screen.getByRole('tab', { name: 'Active' });
      fireEvent.click(activeTab);
      
      expect(activeTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Card View', () => {
    beforeEach(() => {
      const successResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: mockPaginatedResponse
      };
      
      mockJobsService.listJobs.mockResolvedValue(successResponse);
    });

    it('displays job information in card format', async () => {
      render(<JobList />);
      
      // Switch to card view
      await waitFor(() => {
        const cardViewButton = screen.getByRole('button', { name: /grid/i });
        fireEvent.click(cardViewButton);
      });
      
      // Check for card-specific elements
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
      expect(screen.getByText('$120,000 - $150,000')).toBeInTheDocument();
      expect(screen.getByText('Added 1/1/2024')).toBeInTheDocument();
    });

    it('shows location and salary when available', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        const cardViewButton = screen.getByRole('button', { name: /grid/i });
        fireEvent.click(cardViewButton);
      });
      
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
      expect(screen.getByText('New York, NY')).toBeInTheDocument();
      expect(screen.getByText('$120,000 - $150,000')).toBeInTheDocument();
      expect(screen.getByText('$100,000 - $130,000')).toBeInTheDocument();
    });

    it('provides view details and external link buttons', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        const cardViewButton = screen.getByRole('button', { name: /grid/i });
        fireEvent.click(cardViewButton);
      });
      
      const viewDetailsButtons = screen.getAllByText('View Details');
      expect(viewDetailsButtons).toHaveLength(2);
      
      const externalLinks = screen.getAllByLabelText(/external link/i);
      expect(externalLinks).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const errorResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: false,
        data: null as any,
        message: 'Failed to load jobs'
      };
      
      mockJobsService.listJobs.mockResolvedValue(errorResponse);
      
      render(<JobList />);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load jobs');
      });
    });

    it('handles network errors', async () => {
      mockJobsService.listJobs.mockRejectedValue(new Error('Network error'));
      
      render(<JobList />);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('An error occurred while loading jobs');
      });
    });

    it('handles missing jobs service', () => {
      vi.mocked(useJobsService).mockReturnValue(null);
      
      render(<JobList />);
      
      // Should not crash and should eventually show empty or loading state
      expect(screen.getByText('Loading jobs...')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('refetches jobs when refreshTrigger changes', async () => {
      const successResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: mockPaginatedResponse
      };
      
      mockJobsService.listJobs.mockResolvedValue(successResponse);
      
      const { rerender } = render(<JobList refreshTrigger={0} />);
      
      await waitFor(() => {
        expect(mockJobsService.listJobs).toHaveBeenCalledTimes(1);
      });
      
      // Change the refresh trigger
      rerender(<JobList refreshTrigger={1} />);
      
      await waitFor(() => {
        expect(mockJobsService.listJobs).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      const successResponse: ApiResponse<PaginatedResponse<JobEntity>> = {
        success: true,
        data: mockPaginatedResponse
      };
      
      mockJobsService.listJobs.mockResolvedValue(successResponse);
    });

    it('has proper table structure with headers', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Title' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Company' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Added' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
      });
    });

    it('has proper tab structure for filters', () => {
      render(<JobList />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Saved' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Applied' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Interviewing' })).toBeInTheDocument();
    });

    it('provides accessible external links', async () => {
      render(<JobList />);
      
      await waitFor(() => {
        const externalLinks = screen.getAllByLabelText(/external link/i);
        externalLinks.forEach(link => {
          expect(link).toHaveAttribute('target', '_blank');
          expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });
      });
    });
  });
});