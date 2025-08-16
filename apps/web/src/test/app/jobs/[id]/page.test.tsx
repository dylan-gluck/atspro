import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import JobDetailsPage from '@/app/jobs/[id]/page';
import { getServicesSync } from '@/lib/services';
import type { JobEntity, JobDocument } from '@/types/services';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/services', () => ({
  getServicesSync: vi.fn(),
}));

// Mock child components
vi.mock('@/components/job-status-selector', () => ({
  JobStatusSelector: ({ currentStatus, onStatusChange }: any) => (
    <div data-testid="job-status-selector">
      <span>Status: {currentStatus}</span>
      <button onClick={() => onStatusChange('applied')}>Change Status</button>
    </div>
  ),
}));

vi.mock('@/components/job-action-buttons', () => ({
  JobActionButtons: ({ jobId, onDocumentsUpdate }: any) => (
    <div data-testid="job-action-buttons">
      <span>Job ID: {jobId}</span>
      <button onClick={onDocumentsUpdate}>Update Documents</button>
    </div>
  ),
}));

vi.mock('@/components/job-documents-list', () => ({
  JobDocumentsList: ({ jobId, documents, onDocumentsUpdate }: any) => (
    <div data-testid="job-documents-list">
      <span>Job ID: {jobId}</span>
      <span>Documents: {documents.length}</span>
      <button onClick={onDocumentsUpdate}>Update Documents</button>
    </div>
  ),
}));

const mockJob: JobEntity = {
  id: 'job-123',
  user_id: 'user-123',
  title: 'Senior Frontend Developer',
  company: 'Tech Corp',
  status_info: {
    status: 'saved',
    application_date: '2024-01-15T10:00:00Z',
    notes: 'Interesting position'
  },
  job_details: {
    title: 'Senior Frontend Developer',
    company: 'Tech Corp',
    description: 'We are looking for a skilled frontend developer...',
    salary: '$80,000 - $120,000',
    location: ['San Francisco, CA', 'Remote'],
    responsibilities: [
      'Develop user-facing features',
      'Optimize application performance',
      'Collaborate with design team'
    ],
    qualifications: [
      'Bachelor\'s degree in Computer Science',
      '5+ years React experience',
      'Strong JavaScript skills'
    ],
    additional_info: [
      'Great benefits package',
      'Flexible working hours'
    ],
    link: 'https://example.com/job',
    logistics: null
  },
  archived: false,
  created_at: '2024-01-10T10:00:00Z',
  updated_at: '2024-01-10T10:00:00Z'
};

const mockDocuments: JobDocument[] = [
  {
    id: 'doc-1',
    job_id: 'job-123',
    user_id: 'user-123',
    type: 'resume',
    filename: 'optimized-resume.pdf',
    content: '# Optimized Resume\n\nThis is the optimized resume content...',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'doc-2',
    job_id: 'job-123',
    user_id: 'user-123',
    type: 'cover_letter',
    filename: 'cover-letter.pdf',
    content: '# Cover Letter\n\nDear Hiring Manager...',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z'
  }
];

const mockJobsService = {
  getJob: vi.fn(),
  getDocuments: vi.fn(),
  updateStatus: vi.fn(),
};

describe('JobDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({ id: 'job-123' });
    (getServicesSync as any).mockReturnValue({
      jobsService: mockJobsService,
    });
  });

  it('renders loading skeleton initially', () => {
    mockJobsService.getJob.mockImplementation(() => new Promise(() => {})); // Never resolves
    mockJobsService.getDocuments.mockImplementation(() => new Promise(() => {}));

    render(<JobDetailsPage />);

    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton')).toBeTruthy();
  });

  it('renders job details successfully', async () => {
    mockJobsService.getJob.mockResolvedValue({
      success: true,
      data: mockJob,
    });
    mockJobsService.getDocuments.mockResolvedValue({
      success: true,
      data: mockDocuments,
    });

    render(<JobDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Developer')).toBeInTheDocument();
    });

    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('$80,000 - $120,000')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA, Remote')).toBeInTheDocument();
    expect(screen.getByText('Applied January 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('We are looking for a skilled frontend developer...')).toBeInTheDocument();
  });

  it('renders job responsibilities and qualifications', async () => {
    mockJobsService.getJob.mockResolvedValue({
      success: true,
      data: mockJob,
    });
    mockJobsService.getDocuments.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<JobDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Responsibilities')).toBeInTheDocument();
    });

    expect(screen.getByText('Develop user-facing features')).toBeInTheDocument();
    expect(screen.getByText('Optimize application performance')).toBeInTheDocument();
    
    expect(screen.getByText('Qualifications')).toBeInTheDocument();
    expect(screen.getByText('Bachelor\'s degree in Computer Science')).toBeInTheDocument();
    expect(screen.getByText('5+ years React experience')).toBeInTheDocument();
  });

  it('handles job loading error', async () => {
    mockJobsService.getJob.mockResolvedValue({
      success: false,
      message: 'Job not found',
    });
    mockJobsService.getDocuments.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<JobDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Job not found')).toBeInTheDocument();
    });

    expect(toast.error).toHaveBeenCalledWith('Job not found');
  });

  it('handles missing job ID', () => {
    (useParams as any).mockReturnValue({ id: undefined });

    render(<JobDetailsPage />);

    expect(screen.getByText('Job not found')).toBeInTheDocument();
  });

  it('updates job status successfully', async () => {
    const updatedJob = { ...mockJob, status_info: { ...mockJob.status_info, status: 'applied' as const } };
    
    mockJobsService.getJob.mockResolvedValue({
      success: true,
      data: mockJob,
    });
    mockJobsService.getDocuments.mockResolvedValue({
      success: true,
      data: [],
    });
    mockJobsService.updateStatus.mockResolvedValue({
      success: true,
      data: updatedJob,
    });

    render(<JobDetailsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-status-selector')).toBeInTheDocument();
    });

    const changeStatusButton = screen.getByText('Change Status');
    fireEvent.click(changeStatusButton);

    await waitFor(() => {
      expect(mockJobsService.updateStatus).toHaveBeenCalledWith('job-123', {
        status: 'applied',
        application_date: expect.any(String),
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Status updated to applied');
  });

  it('handles status update error', async () => {
    mockJobsService.getJob.mockResolvedValue({
      success: true,
      data: mockJob,
    });
    mockJobsService.getDocuments.mockResolvedValue({
      success: true,
      data: [],
    });
    mockJobsService.updateStatus.mockResolvedValue({
      success: false,
      message: 'Failed to update status',
    });

    render(<JobDetailsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-status-selector')).toBeInTheDocument();
    });

    const changeStatusButton = screen.getByText('Change Status');
    fireEvent.click(changeStatusButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update status');
    });
  });

  it('renders child components with correct props', async () => {
    mockJobsService.getJob.mockResolvedValue({
      success: true,
      data: mockJob,
    });
    mockJobsService.getDocuments.mockResolvedValue({
      success: true,
      data: mockDocuments,
    });

    render(<JobDetailsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-status-selector')).toBeInTheDocument();
    });

    expect(screen.getByTestId('job-action-buttons')).toBeInTheDocument();
    expect(screen.getByText('Job ID: job-123')).toBeInTheDocument();
    
    expect(screen.getByTestId('job-documents-list')).toBeInTheDocument();
    expect(screen.getByText('Documents: 2')).toBeInTheDocument();
  });

  it('handles documents update callback', async () => {
    mockJobsService.getJob.mockResolvedValue({
      success: true,
      data: mockJob,
    });
    mockJobsService.getDocuments.mockResolvedValue({
      success: true,
      data: mockDocuments,
    });

    render(<JobDetailsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-documents-list')).toBeInTheDocument();
    });

    // Simulate documents update
    const updateButton = screen.getByText('Update Documents');
    fireEvent.click(updateButton);

    // Should call getJob and getDocuments again
    await waitFor(() => {
      expect(mockJobsService.getJob).toHaveBeenCalledTimes(2);
      expect(mockJobsService.getDocuments).toHaveBeenCalledTimes(2);
    });
  });

  it('renders external link when available', async () => {
    mockJobsService.getJob.mockResolvedValue({
      success: true,
      data: mockJob,
    });
    mockJobsService.getDocuments.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<JobDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('View Original Posting')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /view original posting/i });
    expect(link).toHaveAttribute('href', 'https://example.com/job');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('handles documents loading failure gracefully', async () => {
    mockJobsService.getJob.mockResolvedValue({
      success: true,
      data: mockJob,
    });
    mockJobsService.getDocuments.mockResolvedValue({
      success: false,
      message: 'Failed to load documents',
    });

    render(<JobDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Developer')).toBeInTheDocument();
    });

    // Should still render the job details even if documents fail
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByTestId('job-documents-list')).toBeInTheDocument();
    expect(screen.getByText('Documents: 0')).toBeInTheDocument();
  });
});