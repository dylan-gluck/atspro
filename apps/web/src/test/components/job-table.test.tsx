import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { JobTable } from '@/components/job-table';
import type { JobEntity } from '@/types/services';

const mockJob: JobEntity = {
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

describe('JobTable', () => {
  const mockOnSort = vi.fn();
  const mockOnArchiveToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders table headers correctly', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      expect(screen.getByRole('columnheader', { name: /title/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /company/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /added/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    });

    it('displays job information correctly', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
      expect(screen.getByText('$120,000 - $150,000')).toBeInTheDocument();
      expect(screen.getByText('saved')).toBeInTheDocument();
      expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    });

    it('shows archived badge for archived jobs', () => {
      render(
        <JobTable
          jobs={[mockArchivedJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('displays external link when available', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      const externalLink = screen.getByLabelText('Open external job link');
      expect(externalLink).toBeInTheDocument();
      expect(externalLink).toHaveAttribute('href', 'https://example.com/job');
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Sorting', () => {
    it('calls onSort when header is clicked', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      const titleHeader = screen.getByRole('button', { name: /title/i });
      fireEvent.click(titleHeader);

      expect(mockOnSort).toHaveBeenCalledWith('title');
    });

    it('shows correct sort icon for active sort field', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="title"
          sortOrder="asc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      // Should show up arrow for ascending order
      const titleHeader = screen.getByRole('button', { name: /title/i });
      expect(titleHeader).toContainHTML('ChevronUp');
    });

    it('shows default icon for inactive sort fields', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="title"
          sortOrder="asc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      // Should show default down arrow for non-active fields
      const companyHeader = screen.getByRole('button', { name: /company/i });
      expect(companyHeader).toContainHTML('ChevronDown');
    });
  });

  describe('Actions', () => {
    it('shows view button for all jobs', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
    });

    it('shows archive button for active jobs', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      const archiveButton = screen.getByTitle('Archive job');
      expect(archiveButton).toBeInTheDocument();
    });

    it('shows unarchive button for archived jobs', () => {
      render(
        <JobTable
          jobs={[mockArchivedJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      const unarchiveButton = screen.getByTitle('Unarchive job');
      expect(unarchiveButton).toBeInTheDocument();
    });

    it('calls onArchiveToggle when archive button is clicked', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      const archiveButton = screen.getByTitle('Archive job');
      fireEvent.click(archiveButton);

      expect(mockOnArchiveToggle).toHaveBeenCalledWith('job-123', false);
    });

    it('calls onArchiveToggle when unarchive button is clicked', () => {
      render(
        <JobTable
          jobs={[mockArchivedJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      const unarchiveButton = screen.getByTitle('Unarchive job');
      fireEvent.click(unarchiveButton);

      expect(mockOnArchiveToggle).toHaveBeenCalledWith('job-456', true);
    });
  });

  describe('Accessibility', () => {
    it('has proper table structure', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('rowgroup')).toBeInTheDocument(); // tbody
    });

    it('has clickable headers for sorting', () => {
      render(
        <JobTable
          jobs={[mockJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      const headers = ['title', 'company', 'status', 'added'];
      headers.forEach(header => {
        expect(screen.getByRole('button', { name: new RegExp(header, 'i') })).toBeInTheDocument();
      });
    });

    it('provides meaningful button titles', () => {
      render(
        <JobTable
          jobs={[mockJob, mockArchivedJob]}
          sortField="date"
          sortOrder="desc"
          onSort={mockOnSort}
          onArchiveToggle={mockOnArchiveToggle}
        />
      );

      expect(screen.getByTitle('Archive job')).toBeInTheDocument();
      expect(screen.getByTitle('Unarchive job')).toBeInTheDocument();
      expect(screen.getByTitle('Open job posting')).toBeInTheDocument();
    });
  });
});