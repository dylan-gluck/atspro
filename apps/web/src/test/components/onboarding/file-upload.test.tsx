import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FileUpload } from '@/components/onboarding/file-upload';

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn((options) => {
    const mockGetRootProps = () => ({
      onDrop: options.onDrop,
      onClick: vi.fn(),
    });
    
    const mockGetInputProps = () => ({
      type: 'file',
      multiple: false,
      accept: options.accept,
    });

    return {
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: false,
      isDragReject: false,
      isDragAccept: false,
      fileRejections: [],
    };
  }),
}));

describe('FileUpload Component', () => {
  const mockOnFileUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area with default state', () => {
    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    expect(screen.getByText('Upload your resume')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop your resume, or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Supports PDF, DOCX, DOC, TXT, and MD files (max 10 MB)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose File' })).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<FileUpload onFileUpload={mockOnFileUpload} isLoading={true} />);
    
    // Should not show the file upload button when loading
    expect(screen.queryByRole('button', { name: 'Choose File' })).not.toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    const errorMessage = 'Failed to upload file';
    render(<FileUpload onFileUpload={mockOnFileUpload} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('disables upload when disabled prop is true', () => {
    render(<FileUpload onFileUpload={mockOnFileUpload} disabled={true} />);
    
    expect(screen.queryByRole('button', { name: 'Choose File' })).not.toBeInTheDocument();
  });

  it('accepts custom accept types', () => {
    const customAccept = { 'application/pdf': ['.pdf'] };
    render(<FileUpload onFileUpload={mockOnFileUpload} accept={customAccept} />);
    
    // Component should render without errors
    expect(screen.getByText('Upload your resume')).toBeInTheDocument();
  });

  it('accepts custom max size', () => {
    const customMaxSize = 5 * 1024 * 1024; // 5MB
    render(<FileUpload onFileUpload={mockOnFileUpload} maxSize={customMaxSize} />);
    
    expect(screen.getByText('Supports PDF, DOCX, DOC, TXT, and MD files (max 5 MB)')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    const { container } = render(<FileUpload onFileUpload={mockOnFileUpload} className={customClass} />);
    
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('shows drag active state', () => {
    const mockUseDropzone = vi.fn().mockReturnValue({
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: true,
      isDragReject: false,
      isDragAccept: false,
      fileRejections: [],
    });

    vi.mocked(require('react-dropzone').useDropzone).mockImplementation(mockUseDropzone);

    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    expect(screen.getByText('Drop your resume here')).toBeInTheDocument();
  });

  it('shows file rejection errors', () => {
    const fileRejections = [{
      file: new File(['test'], 'test.txt', { type: 'text/plain' }),
      errors: [{ message: 'File too large', code: 'file-too-large' }]
    }];

    const mockUseDropzone = vi.fn().mockReturnValue({
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
      isDragReject: false,
      isDragAccept: false,
      fileRejections,
    });

    vi.mocked(require('react-dropzone').useDropzone).mockImplementation(mockUseDropzone);

    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    expect(screen.getByText('Upload failed:')).toBeInTheDocument();
    expect(screen.getByText('test.txt: File too large')).toBeInTheDocument();
  });
});

describe('FileUpload File Handling', () => {
  const mockOnFileUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles successful file upload', async () => {
    mockOnFileUpload.mockResolvedValue(undefined);

    const mockUseDropzone = vi.fn().mockImplementation((options) => ({
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
      isDragReject: false,
      isDragAccept: false,
      fileRejections: [],
    }));

    vi.mocked(require('react-dropzone').useDropzone).mockImplementation(mockUseDropzone);

    render(<FileUpload onFileUpload={mockOnFileUpload} />);

    // Create a mock file
    const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    // Get the onDrop callback from the mock
    const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;
    
    // Simulate file drop
    await onDropCallback([file]);

    expect(mockOnFileUpload).toHaveBeenCalledWith(file);
  });

  it('handles file upload failure', async () => {
    mockOnFileUpload.mockRejectedValue(new Error('Upload failed'));

    const mockUseDropzone = vi.fn().mockImplementation((options) => ({
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
      isDragReject: false,
      isDragAccept: false,
      fileRejections: [],
    }));

    vi.mocked(require('react-dropzone').useDropzone).mockImplementation(mockUseDropzone);

    // Mock console.error to avoid cluttering test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<FileUpload onFileUpload={mockOnFileUpload} />);

    // Create a mock file
    const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    // Get the onDrop callback from the mock
    const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;
    
    // Simulate file drop
    await onDropCallback([file]);

    expect(mockOnFileUpload).toHaveBeenCalledWith(file);
    expect(consoleSpy).toHaveBeenCalledWith('Upload failed:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('ignores empty file arrays', async () => {
    const mockUseDropzone = vi.fn().mockImplementation((options) => ({
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
      isDragReject: false,
      isDragAccept: false,
      fileRejections: [],
    }));

    vi.mocked(require('react-dropzone').useDropzone).mockImplementation(mockUseDropzone);

    render(<FileUpload onFileUpload={mockOnFileUpload} />);

    // Get the onDrop callback from the mock
    const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;
    
    // Simulate drop with no files
    await onDropCallback([]);

    expect(mockOnFileUpload).not.toHaveBeenCalled();
  });

  it('does not upload when disabled', async () => {
    const mockUseDropzone = vi.fn().mockImplementation((options) => ({
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
      isDragReject: false,
      isDragAccept: false,
      fileRejections: [],
    }));

    vi.mocked(require('react-dropzone').useDropzone).mockImplementation(mockUseDropzone);

    render(<FileUpload onFileUpload={mockOnFileUpload} disabled={true} />);

    // Create a mock file
    const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    // Get the onDrop callback from the mock
    const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;
    
    // Simulate file drop
    await onDropCallback([file]);

    expect(mockOnFileUpload).not.toHaveBeenCalled();
  });
});