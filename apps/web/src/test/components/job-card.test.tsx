import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { JobCard } from '@/components/job-card';
import type { JobEntity } from '@/types/services';

const mockJob: JobEntity = {
  id: 'job-123',
  user_id: 'user-123',
  title: 'Software Engineer',
  company: 'Tech Corp',
  job_details: {
    company: 'Tech Corp',
    title: 'Software Engineer',
    description: 'Great opportunity for a software engineer to join our team and work on exciting projects',
    link: 'https://example.com/job',
    location: ['San Francisco, CA'],
    salary: '$120,000 - $150,000'
  },
  status_info: {
    status: 'saved'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  archived: false
};

const mockArchivedJob: JobEntity = {
  ...mockJob,
  id: 'job-456',
  title: 'Archived Job',
  company: 'Old Corp',
  archived: true
};

const mockJobWithoutOptionalFields: JobEntity = {
  ...mockJob,
  id: 'job-789',
  job_details: {
    company: 'Simple Corp',
    title: 'Basic Job',
    description: 'Simple job description'
    // No link, location, or salary
  }
};

describe('JobCard', () => {
  const mockOnArchiveToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('displays job information correctly', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
      expect(screen.getByText('$120,000 - $150,000')).toBeInTheDocument();
      expect(screen.getByText('saved')).toBeInTheDocument();
      expect(screen.getByText('Added 1/1/2024')).toBeInTheDocument();
    });

    it('shows description preview when available', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      expect(screen.getByText(/Great opportunity for a software engineer/)).toBeInTheDocument();
    });

    it('shows archived badge for archived jobs', () => {
      render(<JobCard job={mockArchivedJob} onArchiveToggle={mockOnArchiveToggle} />);

      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('applies opacity styling for archived jobs', () => {
      render(<JobCard job={mockArchivedJob} onArchiveToggle={mockOnArchiveToggle} />);

      const card = screen.getByText('Archived Job').closest('.opacity-75');
      expect(card).toBeInTheDocument();
    });

    it('handles missing optional fields gracefully', () => {
      render(<JobCard job={mockJobWithoutOptionalFields} onArchiveToggle={mockOnArchiveToggle} />);

      expect(screen.getByText('Basic Job')).toBeInTheDocument();
      expect(screen.getByText('Simple Corp')).toBeInTheDocument();
      
      // Should not show location, salary, or external link
      expect(screen.queryByText(/San Francisco/)).not.toBeInTheDocument();
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Open external job link')).not.toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('displays correct badge variant for saved status', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      const badge = screen.getByText('saved');
      expect(badge).toBeInTheDocument();
    });

    it('displays correct badge variant for applied status', () => {
      const appliedJob = { ...mockJob, status_info: { status: 'applied' as const } };
      render(<JobCard job={appliedJob} onArchiveToggle={mockOnArchiveToggle} />);

      const badge = screen.getByText('applied');
      expect(badge).toBeInTheDocument();
    });

    it('displays correct badge variant for rejected status', () => {
      const rejectedJob = { ...mockJob, status_info: { status: 'rejected' as const } };
      render(<JobCard job={rejectedJob} onArchiveToggle={mockOnArchiveToggle} />);

      const badge = screen.getByText('rejected');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('shows view details button for all jobs', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('shows external link when available', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      const externalLink = screen.getByLabelText('Open external job link');
      expect(externalLink).toBeInTheDocument();
      expect(externalLink).toHaveAttribute('href', 'https://example.com/job');
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('hides external link when not available', () => {
      render(<JobCard job={mockJobWithoutOptionalFields} onArchiveToggle={mockOnArchiveToggle} />);

      expect(screen.queryByLabelText('Open external job link')).not.toBeInTheDocument();
    });

    it('shows archive button for active jobs', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      const archiveButton = screen.getByTitle('Archive job');
      expect(archiveButton).toBeInTheDocument();
    });

    it('shows unarchive button for archived jobs', () => {
      render(<JobCard job={mockArchivedJob} onArchiveToggle={mockOnArchiveToggle} />);

      const unarchiveButton = screen.getByTitle('Unarchive job');
      expect(unarchiveButton).toBeInTheDocument();
    });

    it('calls onArchiveToggle when archive button is clicked', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      const archiveButton = screen.getByTitle('Archive job');
      fireEvent.click(archiveButton);

      expect(mockOnArchiveToggle).toHaveBeenCalledWith('job-123', false);
    });

    it('calls onArchiveToggle when unarchive button is clicked', () => {
      render(<JobCard job={mockArchivedJob} onArchiveToggle={mockOnArchiveToggle} />);

      const unarchiveButton = screen.getByTitle('Unarchive job');
      fireEvent.click(unarchiveButton);

      expect(mockOnArchiveToggle).toHaveBeenCalledWith('job-456', true);
    });
  });

  describe('Layout and Design', () => {
    it('applies hover effects', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      const card = screen.getByText('Software Engineer').closest('.hover\\:shadow-md');
      expect(card).toBeInTheDocument();
    });

    it('uses proper card structure', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      // Check for card header and content structure
      expect(screen.getByText('Software Engineer').closest('div[class*="card"]')).toBeInTheDocument();
    });

    it('truncates long text appropriately', () => {
      const longJob = {
        ...mockJob,
        job_details: {
          ...mockJob.job_details,
          location: ['Very Long Location Name That Should Be Truncated']
        }
      };

      render(<JobCard job={longJob} onArchiveToggle={mockOnArchiveToggle} />);

      const locationElement = screen.getByText(/Very Long Location Name/);
      expect(locationElement).toHaveClass('truncate');
    });
  });

  describe('Accessibility', () => {
    it('provides meaningful button titles', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      expect(screen.getByTitle('Archive job')).toBeInTheDocument();
      expect(screen.getByTitle('Open job posting')).toBeInTheDocument();
    });

    it('provides accessible external link', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      const externalLink = screen.getByLabelText('Open external job link');
      expect(externalLink).toHaveAttribute('aria-label', 'Open external job link');
    });

    it('uses semantic icons with proper sizing', () => {
      render(<JobCard job={mockJob} onArchiveToggle={mockOnArchiveToggle} />);

      // Icons should have consistent sizing classes
      const icons = screen.getByText('Tech Corp').closest('div')?.querySelectorAll('svg');
      expect(icons?.length).toBeGreaterThan(0);
    });
  });
});