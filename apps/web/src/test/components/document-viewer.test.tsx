import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DocumentViewer } from '@/components/document-viewer';
import type { JobDocument } from '@/types/services';

const mockDocument: JobDocument = {
  id: 'doc-1',
  job_id: 'job-123',
  user_id: 'user-123',
  type: 'resume',
  filename: 'optimized-resume.pdf',
  content: '# Optimized Resume\n\n**John Doe**\n\n*Software Engineer*\n\n## Experience\n\n- Senior Developer at TechCorp\n- Built amazing features\n\n## Skills\n\n- JavaScript\n- React\n- TypeScript',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z'
};

describe('DocumentViewer', () => {
  const mockOnClose = vi.fn();
  const mockOnDownload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders document information correctly', () => {
    render(
      <DocumentViewer
        document={mockDocument}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('optimized-resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('Resume')).toBeInTheDocument();
    expect(screen.getByText(/Created January 15, 2024/)).toBeInTheDocument();
  });

  it('renders markdown content as formatted HTML', () => {
    render(
      <DocumentViewer
        document={mockDocument}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // Check for formatted content
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    render(
      <DocumentViewer
        document={mockDocument}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onDownload when download button clicked', () => {
    render(
      <DocumentViewer
        document={mockDocument}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);

    expect(mockOnDownload).toHaveBeenCalled();
  });

  it('shows download button only when content is available', () => {
    const { rerender } = render(
      <DocumentViewer
        document={mockDocument}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Download PDF')).toBeInTheDocument();

    // Document without content
    const documentWithoutContent = {
      ...mockDocument,
      content: undefined,
    };

    rerender(
      <DocumentViewer
        document={documentWithoutContent}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
  });

  it('handles document with file URL but no content', () => {
    const documentWithFileUrl = {
      ...mockDocument,
      content: undefined,
      file_url: 'https://example.com/resume.pdf',
    };

    render(
      <DocumentViewer
        document={documentWithFileUrl}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('This document is stored as a file. Click download to view the content.')).toBeInTheDocument();
    expect(screen.getByText('Download File')).toBeInTheDocument();
  });

  it('handles document with no content and no file URL', () => {
    const emptyDocument = {
      ...mockDocument,
      content: undefined,
      file_url: undefined,
    };

    render(
      <DocumentViewer
        document={emptyDocument}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('No content available for this document.')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <DocumentViewer
        document={mockDocument}
        open={false}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.queryByText('optimized-resume.pdf')).not.toBeInTheDocument();
  });

  it('renders different document type badges correctly', () => {
    const { rerender } = render(
      <DocumentViewer
        document={{ ...mockDocument, type: 'resume' }}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Resume')).toBeInTheDocument();

    rerender(
      <DocumentViewer
        document={{ ...mockDocument, type: 'cover_letter' }}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Cover Letter')).toBeInTheDocument();

    rerender(
      <DocumentViewer
        document={{ ...mockDocument, type: 'portfolio' }}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Portfolio')).toBeInTheDocument();
  });

  it('formats creation date correctly', () => {
    render(
      <DocumentViewer
        document={mockDocument}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // Check that the date is formatted (exact format may vary based on locale)
    expect(screen.getByText(/Created January 15, 2024 at \d{1,2}:\d{2}/)).toBeInTheDocument();
  });

  it('handles markdown formatting correctly', () => {
    const documentWithComplexMarkdown = {
      ...mockDocument,
      content: '# Main Title\n\n## Subtitle\n\n### Sub-subtitle\n\n**Bold text**\n\n*Italic text*\n\n`Code text`\n\n- List item 1\n- List item 2\n\nParagraph 1\n\nParagraph 2'
    };

    render(
      <DocumentViewer
        document={documentWithComplexMarkdown}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // The content should be processed and rendered
    expect(screen.getByText('Main Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Sub-subtitle')).toBeInTheDocument();
  });

  it('handles very long content with scrolling', () => {
    const longContent = Array(100).fill('This is a long line of content.\n').join('');
    const documentWithLongContent = {
      ...mockDocument,
      content: longContent,
    };

    render(
      <DocumentViewer
        document={documentWithLongContent}
        open={true}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // Content should be rendered in a scrollable container
    const contentContainer = screen.getByText(/This is a long line of content/).closest('div');
    expect(contentContainer).toHaveClass('overflow-auto');
  });
});