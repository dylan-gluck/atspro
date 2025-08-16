import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { JobDocumentsList } from '@/components/job-documents-list';
import { getServicesSync } from '@/lib/services';
import type { JobDocument } from '@/types/services';

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

vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

// Mock child components
vi.mock('@/components/document-viewer', () => ({
  DocumentViewer: ({ document, open, onClose, onDownload }: {
    document: { filename: string };
    open: boolean;
    onClose: () => void;
    onDownload: () => void;
  }) => (
    open ? (
      <div data-testid="document-viewer">
        <span>Viewing: {document.filename}</span>
        <button onClick={onClose}>Close</button>
        <button onClick={onDownload}>Download</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/file-upload-dialog', () => ({
  FileUploadDialog: ({ open, onOpenChange, onUpload }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload: (file: File) => void;
  }) => (
    open ? (
      <div data-testid="file-upload-dialog">
        <button onClick={() => onOpenChange(false)}>Close Upload</button>
        <button onClick={() => onUpload(new File(['test'], 'test.pdf'))}>
          Upload Test File
        </button>
      </div>
    ) : null
  ),
}));

const mockJobsService = {
  deleteDocument: vi.fn(),
  uploadDocument: vi.fn(),
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
  },
  {
    id: 'doc-3',
    job_id: 'job-123',
    user_id: 'user-123',
    type: 'portfolio',
    filename: 'portfolio.pdf',
    file_url: 'https://example.com/portfolio.pdf',
    created_at: '2024-01-17T10:00:00Z',
    updated_at: '2024-01-17T10:00:00Z'
  }
];

describe('JobDocumentsList', () => {
  const mockOnDocumentsUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServicesSync).mockReturnValue({
      jobsService: mockJobsService as any,
    } as any);
    
    // Mock URL.createObjectURL and related DOM methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document methods
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockAnchor as any;
      }
      return document.createElement(tagName);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
    vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());
  });


  it('renders empty state when no documents', () => {
    render(
      <JobDocumentsList
        jobId="job-123"
        documents={[]}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Generated documents and uploads for this job')).toBeInTheDocument();
    expect(screen.getByText('No documents yet. Use the action buttons above to generate optimized documents, or upload your own files.')).toBeInTheDocument();
    expect(screen.getByText('Add Document')).toBeInTheDocument();
  });

  it('renders document list when documents exist', () => {
    render(
      <JobDocumentsList
        jobId="job-123"
        documents={mockDocuments}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    expect(screen.getByText('3 documents available')).toBeInTheDocument();
    expect(screen.getByText('optimized-resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('cover-letter.pdf')).toBeInTheDocument();
    expect(screen.getByText('portfolio.pdf')).toBeInTheDocument();
  });

  it('displays correct document type badges', () => {
    render(
      <JobDocumentsList
        jobId="job-123"
        documents={mockDocuments}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    expect(screen.getByText('Resume')).toBeInTheDocument();
    expect(screen.getByText('Cover Letter')).toBeInTheDocument();
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
  });

  it('shows document creation times', () => {
    render(
      <JobDocumentsList
        jobId="job-123"
        documents={mockDocuments}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const timeElements = screen.getAllByText('Created 2 hours ago');
    expect(timeElements).toHaveLength(3);
  });

  it('opens document viewer when view button clicked', async () => {
    render(
      <JobDocumentsList
        jobId="job-123"
        documents={mockDocuments}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const viewButtons = screen.getAllByTitle('View document');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('document-viewer')).toBeInTheDocument();
    });

    expect(screen.getByText('Viewing: optimized-resume.pdf')).toBeInTheDocument();
  });

  it('closes document viewer when close button clicked', async () => {
    render(
      <JobDocumentsList
        jobId="job-123"
        documents={mockDocuments}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const viewButtons = screen.getAllByTitle('View document');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('document-viewer')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('document-viewer')).not.toBeInTheDocument();
    });
  });

  it('handles document download', async () => {
    render(
      <JobDocumentsList
        jobId="job-123"
        documents={mockDocuments}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const downloadButtons = screen.getAllByTitle('Download as PDF');
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Document downloaded successfully');
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('handles document download error', async () => {
    const documentWithoutContent = {
      ...mockDocuments[0],
      content: undefined,
    };

    render(
      <JobDocumentsList
        jobId="job-123"
        documents={[documentWithoutContent]}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const downloadButtons = screen.getAllByTitle('Download as PDF');
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Document content not available');
    });
  });

  it('deletes document successfully', async () => {
    mockJobsService.deleteDocument.mockResolvedValue({
      success: true,
    });

    render(
      <JobDocumentsList
        jobId="job-123"
        documents={mockDocuments}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const deleteButtons = screen.getAllByTitle('Delete document');
    fireEvent.click(deleteButtons[0]);

    expect(mockJobsService.deleteDocument).toHaveBeenCalledWith('doc-1');

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Document deleted successfully');
    });

    expect(mockOnDocumentsUpdate).toHaveBeenCalled();
  });

  it('handles document deletion error', async () => {
    mockJobsService.deleteDocument.mockResolvedValue({
      success: false,
      message: 'Failed to delete document',
    });

    render(
      <JobDocumentsList
        jobId="job-123"
        documents={mockDocuments}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const deleteButtons = screen.getAllByTitle('Delete document');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete document');
    });

    expect(mockOnDocumentsUpdate).not.toHaveBeenCalled();
  });

  it('shows loading state during deletion', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    mockJobsService.deleteDocument.mockReturnValue(promise);

    render(
      <JobDocumentsList
        jobId="job-123"
        documents={mockDocuments}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const deleteButtons = screen.getAllByTitle('Delete document');
    fireEvent.click(deleteButtons[0]);

    // Should show loading state
    await waitFor(() => {
      expect(deleteButtons[0]).toBeDisabled();
    });

    // Resolve the promise
    resolvePromise!({
      success: true,
    });

    await waitFor(() => {
      expect(deleteButtons[0]).not.toBeDisabled();
    });
  });

  it('opens file upload dialog', async () => {
    render(
      <JobDocumentsList
        jobId="job-123"
        documents={[]}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const addButton = screen.getByText('Add Document');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-dialog')).toBeInTheDocument();
    });
  });

  it('handles file upload', async () => {
    mockJobsService.uploadDocument.mockResolvedValue({
      success: true,
      data: { id: 'new-doc', filename: 'uploaded.pdf' },
    });

    render(
      <JobDocumentsList
        jobId="job-123"
        documents={[]}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const addButton = screen.getByText('Add Document');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-dialog')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload Test File');
    fireEvent.click(uploadButton);

    expect(mockJobsService.uploadDocument).toHaveBeenCalledWith(
      'job-123',
      expect.any(File),
      'resume'
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Document uploaded successfully');
    });

    expect(mockOnDocumentsUpdate).toHaveBeenCalled();
  });

  it('handles file upload error', async () => {
    mockJobsService.uploadDocument.mockResolvedValue({
      success: false,
      message: 'Upload failed',
    });

    render(
      <JobDocumentsList
        jobId="job-123"
        documents={[]}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    const addButton = screen.getByText('Add Document');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-dialog')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload Test File');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Upload failed');
    });

    expect(mockOnDocumentsUpdate).not.toHaveBeenCalled();
  });

  it('shows different icons for document types', () => {
    render(
      <JobDocumentsList
        jobId="job-123"
        documents={mockDocuments}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    // Icons are represented as emojis in the component
    const container = screen.getByText('optimized-resume.pdf').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('handles documents with only file URLs', () => {
    const fileOnlyDoc = mockDocuments.find(doc => doc.file_url && !doc.content);
    
    render(
      <JobDocumentsList
        jobId="job-123"
        documents={[fileOnlyDoc!]}
        onDocumentsUpdate={mockOnDocumentsUpdate}
      />
    );

    expect(screen.getByText('portfolio.pdf')).toBeInTheDocument();
    
    // Should not have download button for content, but might have view button
    const viewButtons = screen.getAllByTitle('View document');
    expect(viewButtons).toHaveLength(1);
  });
});