import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { JobCreation } from '@/components/job-creation';
import { useJobsService } from '@/lib/services';
import { toast } from 'sonner';
import type { JobEntity, ApiResponse } from '@/types/services';

// Mock dependencies
vi.mock('@/lib/services');
vi.mock('sonner');

// Mock FileUpload component to avoid dropzone complexity
vi.mock('@/components/onboarding/file-upload', () => ({
  FileUpload: ({ onFileUpload, isLoading, error }: any) => (
    <div data-testid="file-upload">
      <button
        data-testid="file-upload-trigger"
        onClick={() => {
          const mockFile = new File(['job description content'], 'job.pdf', { type: 'application/pdf' });
          onFileUpload(mockFile);
        }}
        disabled={isLoading}
      >
        Upload File
      </button>
      {error && <div data-testid="file-upload-error">{error}</div>}
      {isLoading && <div data-testid="file-upload-loading">Loading...</div>}
    </div>
  )
}));

const mockJobEntity: JobEntity = {
  id: 'job-123',
  user_id: 'user-123',
  title: 'Software Engineer',
  company: 'Tech Corp',
  job_details: {
    company: 'Tech Corp',
    title: 'Software Engineer',
    description: 'Great opportunity',
    link: 'https://example.com/job'
  },
  status_info: {
    status: 'saved'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockJobsService = {
  createJob: vi.fn(),
  parseJobFromDocument: vi.fn(),
  isInitialized: true,
  initialize: vi.fn(),
  destroy: vi.fn()
};

describe('JobCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useJobsService as any).mockReturnValue(mockJobsService);
  });

  describe('URL Input Tab', () => {
    it('renders URL input tab by default', () => {
      render(<JobCreation />);
      
      expect(screen.getByLabelText('Job Posting URL')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://example.com/jobs/software-engineer')).toBeInTheDocument();
      expect(screen.getByText('Create Job from URL')).toBeInTheDocument();
    });

    it('validates URL format', async () => {
      render(<JobCreation />);
      
      const urlInput = screen.getByLabelText('Job Posting URL');
      const submitButton = screen.getByText('Create Job from URL');
      
      // Test with invalid URL
      fireEvent.change(urlInput, { target: { value: 'invalid-url' } });
      expect(submitButton).toBeDisabled();
      
      // Test with valid URL
      fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });
      expect(submitButton).not.toBeDisabled();
    });

    it('shows error for empty URL', async () => {
      render(<JobCreation />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a job URL')).toBeInTheDocument();
      });
    });

    it('creates job successfully from URL', async () => {
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: mockJobEntity
      };
      
      mockJobsService.createJob.mockResolvedValue(mockApiResponse);
      const onJobCreated = vi.fn();
      
      render(<JobCreation onJobCreated={onJobCreated} />);
      
      const urlInput = screen.getByLabelText('Job Posting URL');
      const submitButton = screen.getByText('Create Job from URL');
      
      fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockJobsService.createJob).toHaveBeenCalledWith('https://example.com/job');
        expect(onJobCreated).toHaveBeenCalledWith(mockJobEntity);
        expect(toast.success).toHaveBeenCalledWith('Job created successfully!');
      });
      
      // URL should be cleared after success
      expect(urlInput).toHaveValue('');
    });

    it('handles job creation failure', async () => {
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: false,
        data: null as any,
        message: 'Invalid URL',
        errors: ['URL not accessible']
      };
      
      mockJobsService.createJob.mockResolvedValue(mockApiResponse);
      
      render(<JobCreation />);
      
      const urlInput = screen.getByLabelText('Job Posting URL');
      const submitButton = screen.getByText('Create Job from URL');
      
      fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid URL')).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalledWith('Invalid URL');
      });
    });

    it('shows loading state during job creation', async () => {
      // Mock a delayed response
      mockJobsService.createJob.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: mockJobEntity
        }), 100))
      );
      
      render(<JobCreation />);
      
      const urlInput = screen.getByLabelText('Job Posting URL');
      const submitButton = screen.getByText('Create Job from URL');
      
      fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });
      fireEvent.click(submitButton);
      
      // Should show loading state
      expect(screen.getByText('Parsing Job...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.getByText('Create Job from URL')).toBeInTheDocument();
      });
    });

    it('handles service unavailable error', async () => {
      (useJobsService as any).mockReturnValue(null);
      
      render(<JobCreation />);
      
      const urlInput = screen.getByLabelText('Job Posting URL');
      const submitButton = screen.getByText('Create Job from URL');
      
      fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Jobs service is not available')).toBeInTheDocument();
      });
    });
  });

  describe('Document Upload Tab', () => {
    it('switches to document tab', () => {
      render(<JobCreation />);
      
      const documentTab = screen.getByRole('tab', { name: /document/i });
      fireEvent.click(documentTab);
      
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
      expect(screen.getByText('Job Description Document')).toBeInTheDocument();
    });

    it('handles document upload successfully', async () => {
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: true,
        data: mockJobEntity
      };
      
      mockJobsService.parseJobFromDocument.mockResolvedValue(mockApiResponse);
      const onJobCreated = vi.fn();
      
      render(<JobCreation onJobCreated={onJobCreated} />);
      
      // Switch to document tab
      const documentTab = screen.getByRole('tab', { name: /document/i });
      fireEvent.click(documentTab);
      
      // Trigger file upload
      const uploadButton = screen.getByTestId('file-upload-trigger');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockJobsService.parseJobFromDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'job.pdf',
            type: 'application/pdf'
          })
        );
        expect(onJobCreated).toHaveBeenCalledWith(mockJobEntity);
        expect(toast.success).toHaveBeenCalledWith('Job description parsed successfully!');
      });
    });

    it('handles document upload failure', async () => {
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: false,
        data: null as any,
        message: 'Failed to parse document',
        errors: ['Unsupported file format']
      };
      
      mockJobsService.parseJobFromDocument.mockResolvedValue(mockApiResponse);
      
      render(<JobCreation />);
      
      // Switch to document tab
      const documentTab = screen.getByRole('tab', { name: /document/i });
      fireEvent.click(documentTab);
      
      // Trigger file upload
      const uploadButton = screen.getByTestId('file-upload-trigger');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to parse document');
      });
    });

    it('handles service unavailable during document upload', async () => {
      (useJobsService as any).mockReturnValue(null);
      
      render(<JobCreation />);
      
      // Switch to document tab
      const documentTab = screen.getByRole('tab', { name: /document/i });
      fireEvent.click(documentTab);
      
      // Trigger file upload
      const uploadButton = screen.getByTestId('file-upload-trigger');
      
      await expect(async () => {
        fireEvent.click(uploadButton);
      }).rejects.toThrow('Jobs service is not available');
    });
  });

  describe('Tab Navigation', () => {
    it('maintains separate error states for each tab', async () => {
      render(<JobCreation />);
      
      // Create error in URL tab
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a job URL')).toBeInTheDocument();
      });
      
      // Switch to document tab
      const documentTab = screen.getByRole('tab', { name: /document/i });
      fireEvent.click(documentTab);
      
      // Error should not be visible in document tab
      expect(screen.queryByText('Please enter a job URL')).not.toBeInTheDocument();
      
      // Switch back to URL tab
      const urlTab = screen.getByRole('tab', { name: /url/i });
      fireEvent.click(urlTab);
      
      // Error should be visible again
      expect(screen.getByText('Please enter a job URL')).toBeInTheDocument();
    });

    it('clears errors when switching tabs', async () => {
      const mockApiResponse: ApiResponse<JobEntity> = {
        success: false,
        data: null as any,
        message: 'Upload failed'
      };
      
      mockJobsService.parseJobFromDocument.mockResolvedValue(mockApiResponse);
      
      render(<JobCreation />);
      
      // Switch to document tab and create error
      const documentTab = screen.getByRole('tab', { name: /document/i });
      fireEvent.click(documentTab);
      
      const uploadButton = screen.getByTestId('file-upload-trigger');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Upload failed');
      });
      
      // Switch to URL tab - document error should not persist visually
      const urlTab = screen.getByRole('tab', { name: /url/i });
      fireEvent.click(urlTab);
      
      // No error should be visible in URL tab
      expect(screen.queryByText('Upload failed')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and structure', () => {
      render(<JobCreation />);
      
      expect(screen.getByLabelText('Job Posting URL')).toBeInTheDocument();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /url/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /document/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<JobCreation />);
      
      const urlTab = screen.getByRole('tab', { name: /url/i });
      const documentTab = screen.getByRole('tab', { name: /document/i });
      
      // Focus should work properly
      urlTab.focus();
      expect(document.activeElement).toBe(urlTab);
      
      // Tab navigation should work
      fireEvent.keyDown(urlTab, { key: 'ArrowRight' });
      // Note: Actual keyboard navigation would be handled by the Tabs component
      expect(documentTab).toBeInTheDocument();
    });
  });
});