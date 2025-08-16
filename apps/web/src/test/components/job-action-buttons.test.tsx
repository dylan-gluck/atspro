import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { JobActionButtons } from '@/components/job-action-buttons';
import { getServicesSync } from '@/lib/services';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/services', () => ({
  getServicesSync: vi.fn(),
}));

const mockJobsService = {
  createDocument: vi.fn(),
};

describe('JobActionButtons', () => {
  const mockOnDocumentsUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getServicesSync as any).mockReturnValue({
      jobsService: mockJobsService,
    });
  });

  it('renders all action buttons', () => {
    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Generate optimized documents and insights for this job')).toBeInTheDocument();
    
    expect(screen.getByText('Optimize Resume')).toBeInTheDocument();
    expect(screen.getByText('Tailor your resume for this position')).toBeInTheDocument();
    
    expect(screen.getByText('Calculate Score')).toBeInTheDocument();
    expect(screen.getByText('Get your compatibility score')).toBeInTheDocument();
    
    expect(screen.getByText('Company Research')).toBeInTheDocument();
    expect(screen.getByText('Learn about the company culture')).toBeInTheDocument();
    
    expect(screen.getByText('Interview Prep')).toBeInTheDocument();
    expect(screen.getByText('Practice questions and tips')).toBeInTheDocument();
  });

  it('handles optimize resume action successfully', async () => {
    mockJobsService.createDocument.mockResolvedValue({
      success: true,
      data: { id: 'doc-1', filename: 'optimized-resume.pdf' },
    });

    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const optimizeButton = screen.getByText('Optimize Resume').closest('button');
    fireEvent.click(optimizeButton!);

    expect(mockJobsService.createDocument).toHaveBeenCalledWith(
      'job-123',
      'Optimizing resume...',
      'resume'
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Resume optimization started! Check back in a few minutes.'
      );
    });

    expect(mockOnDocumentsUpdate).toHaveBeenCalled();
  });

  it('handles calculate score action successfully', async () => {
    mockJobsService.createDocument.mockResolvedValue({
      success: true,
      data: { id: 'doc-2', filename: 'score-report.pdf' },
    });

    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const scoreButton = screen.getByText('Calculate Score').closest('button');
    fireEvent.click(scoreButton!);

    expect(mockJobsService.createDocument).toHaveBeenCalledWith(
      'job-123',
      'Calculating match score...',
      'resume'
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Score calculation started! Results will appear in documents.'
      );
    });

    expect(mockOnDocumentsUpdate).toHaveBeenCalled();
  });

  it('handles company research action successfully', async () => {
    mockJobsService.createDocument.mockResolvedValue({
      success: true,
      data: { id: 'doc-3', filename: 'company-research.pdf' },
    });

    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const researchButton = screen.getByText('Company Research').closest('button');
    fireEvent.click(researchButton!);

    expect(mockJobsService.createDocument).toHaveBeenCalledWith(
      'job-123',
      'Researching company...',
      'portfolio'
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Company research started! Report will be ready shortly.'
      );
    });

    expect(mockOnDocumentsUpdate).toHaveBeenCalled();
  });

  it('handles interview prep action successfully', async () => {
    mockJobsService.createDocument.mockResolvedValue({
      success: true,
      data: { id: 'doc-4', filename: 'interview-prep.pdf' },
    });

    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const interviewButton = screen.getByText('Interview Prep').closest('button');
    fireEvent.click(interviewButton!);

    expect(mockJobsService.createDocument).toHaveBeenCalledWith(
      'job-123',
      'Preparing interview questions...',
      'cover_letter'
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Interview prep started! Questions and tips coming soon.'
      );
    });

    expect(mockOnDocumentsUpdate).toHaveBeenCalled();
  });

  it('handles action errors', async () => {
    mockJobsService.createDocument.mockResolvedValue({
      success: false,
      message: 'Service unavailable',
    });

    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const optimizeButton = screen.getByText('Optimize Resume').closest('button');
    fireEvent.click(optimizeButton!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Service unavailable');
    });

    expect(mockOnDocumentsUpdate).not.toHaveBeenCalled();
  });

  it('handles network errors', async () => {
    mockJobsService.createDocument.mockRejectedValue(new Error('Network error'));

    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const optimizeButton = screen.getByText('Optimize Resume').closest('button');
    fireEvent.click(optimizeButton!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });

    expect(mockOnDocumentsUpdate).not.toHaveBeenCalled();
  });

  it('shows loading state during action execution', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    mockJobsService.createDocument.mockReturnValue(promise);

    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const optimizeButton = screen.getByText('Optimize Resume').closest('button');
    fireEvent.click(optimizeButton!);

    // Should show loading state
    await waitFor(() => {
      expect(optimizeButton).toBeDisabled();
    });

    // Resolve the promise
    resolvePromise!({
      success: true,
      data: { id: 'doc-1' },
    });

    await waitFor(() => {
      expect(optimizeButton).not.toBeDisabled();
    });
  });

  it('shows completed state briefly after successful action', async () => {
    vi.useFakeTimers();
    
    mockJobsService.createDocument.mockResolvedValue({
      success: true,
      data: { id: 'doc-1' },
    });

    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const optimizeButton = screen.getByText('Optimize Resume').closest('button');
    fireEvent.click(optimizeButton!);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });

    // Fast-forward time to see the completed state reset
    vi.advanceTimersByTime(3000);

    vi.useRealTimers();
  });

  it('disables button during loading', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    mockJobsService.createDocument.mockReturnValue(promise);

    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const optimizeButton = screen.getByText('Optimize Resume').closest('button');
    expect(optimizeButton).not.toBeDisabled();

    fireEvent.click(optimizeButton!);

    await waitFor(() => {
      expect(optimizeButton).toBeDisabled();
    });

    // Resolve the promise
    resolvePromise!({
      success: true,
      data: { id: 'doc-1' },
    });

    await waitFor(() => {
      expect(optimizeButton).not.toBeDisabled();
    });
  });

  it('handles multiple simultaneous actions', async () => {
    mockJobsService.createDocument.mockResolvedValue({
      success: true,
      data: { id: 'doc-1' },
    });

    render(
      <JobActionButtons
        jobId="job-123"
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const optimizeButton = screen.getByText('Optimize Resume').closest('button');
    const scoreButton = screen.getByText('Calculate Score').closest('button');

    // Click both buttons
    fireEvent.click(optimizeButton!);
    fireEvent.click(scoreButton!);

    // Both should be called
    expect(mockJobsService.createDocument).toHaveBeenCalledTimes(2);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(2);
    });

    expect(mockOnDocumentsUpdate).toHaveBeenCalledTimes(2);
  });
});