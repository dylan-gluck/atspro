import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import OnboardingPage from '@/app/onboarding/page';
import { useRouter } from 'next/navigation';
import { useServices } from '@/lib/services';

// Mock the hooks and components
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/services', () => ({
  useServices: vi.fn(),
}));

vi.mock('@/components/onboarding/file-upload', () => ({
  FileUpload: ({ onFileUpload, isLoading, error, disabled }: {
    onFileUpload: (file: File) => void;
    isLoading: boolean;
    error: string | null;
    disabled: boolean;
  }) => (
    <div data-testid="file-upload">
      <div>FileUpload Component</div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {disabled && <div>Disabled</div>}
      <button onClick={() => onFileUpload(new File(['test'], 'test.pdf', { type: 'application/pdf' }))}>
        Mock Upload
      </button>
    </div>
  ),
}));

describe('OnboardingPage', () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };

  const mockServices = {
    resumeService: {
      parseResume: vi.fn(),
    },
    userService: {
      updateResumeId: vi.fn(),
    },
    jobsService: {},
    authService: {},
    notificationService: {},
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    vi.mocked(useServices).mockReturnValue(mockServices as any);
  });

  it('renders onboarding page content', () => {
    render(<OnboardingPage />);

    expect(screen.getByText('Welcome to ATSPro')).toBeInTheDocument();
    expect(screen.getByText("Let's start by uploading your resume to unlock the power of AI-driven optimization")).toBeInTheDocument();
    expect(screen.getByText('Upload Your Resume')).toBeInTheDocument();
    expect(screen.getByText("We'll analyze your resume and help you optimize it for any job application")).toBeInTheDocument();
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('renders feature highlights', () => {
    render(<OnboardingPage />);

    expect(screen.getByText('Smart Parsing')).toBeInTheDocument();
    expect(screen.getByText('Our AI extracts and structures your resume data accurately')).toBeInTheDocument();
    expect(screen.getByText('ATS Optimization')).toBeInTheDocument();
    expect(screen.getByText('Optimize your resume for Applicant Tracking Systems')).toBeInTheDocument();
    expect(screen.getByText('Job Matching')).toBeInTheDocument();
    expect(screen.getByText('Get tailored recommendations for each job application')).toBeInTheDocument();
  });

  it('renders loading state when services are not available', () => {
    vi.mocked(useServices).mockReturnValue(null);

    render(<OnboardingPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Welcome to ATSPro')).not.toBeInTheDocument();
  });

  it('handles successful file upload', async () => {
    const mockResumeData = { id: 'resume123', title: 'Software Engineer' };
    mockServices.resumeService.parseResume.mockResolvedValue({
      success: true,
      data: mockResumeData,
    });
    mockServices.userService.updateResumeId.mockResolvedValue({
      success: true,
      data: { resume_id: 'resume123' },
    });

    render(<OnboardingPage />);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockServices.resumeService.parseResume).toHaveBeenCalledWith(
        expect.any(File)
      );
    });

    await waitFor(() => {
      expect(mockServices.userService.updateResumeId).toHaveBeenCalledWith('resume123');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('handles resume parsing failure', async () => {
    mockServices.resumeService.parseResume.mockResolvedValue({
      success: false,
      message: 'Failed to parse resume',
    });

    render(<OnboardingPage />);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to parse resume')).toBeInTheDocument();
    });

    expect(mockServices.userService.updateResumeId).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles profile update failure', async () => {
    const mockResumeData = { id: 'resume123', title: 'Software Engineer' };
    mockServices.resumeService.parseResume.mockResolvedValue({
      success: true,
      data: mockResumeData,
    });
    mockServices.userService.updateResumeId.mockResolvedValue({
      success: false,
      message: 'Failed to update profile',
    });

    render(<OnboardingPage />);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to update profile')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles resume data without id', async () => {
    const mockResumeData = { title: 'Software Engineer' }; // No id field
    mockServices.resumeService.parseResume.mockResolvedValue({
      success: true,
      data: mockResumeData,
    });

    render(<OnboardingPage />);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockServices.resumeService.parseResume).toHaveBeenCalledWith(
        expect.any(File)
      );
    });

    // Should redirect even without updating profile (since no id)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    expect(mockServices.userService.updateResumeId).not.toHaveBeenCalled();
  });

  it('handles network errors', async () => {
    mockServices.resumeService.parseResume.mockRejectedValue(new Error('Network error'));

    // Mock console.error to avoid cluttering test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<OnboardingPage />);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Resume upload failed:', expect.any(Error));
    expect(mockPush).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('handles services not available error', async () => {
    render(<OnboardingPage />);

    // Simulate services becoming null during upload
    vi.mocked(useServices).mockReturnValue(null);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Services not available. Please refresh the page.')).toBeInTheDocument();
    });
  });

  it('shows loading state during upload', async () => {
    // Create a promise that we can control
    let resolveUpload!: (value: unknown) => void;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });
    
    mockServices.resumeService.parseResume.mockReturnValue(uploadPromise);

    render(<OnboardingPage />);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    // Resolve the promise
    resolveUpload({
      success: true,
      data: { id: 'resume123' },
    });

    mockServices.userService.updateResumeId.mockResolvedValue({
      success: true,
      data: { resume_id: 'resume123' },
    });

    // Should eventually redirect
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('disables upload during loading', async () => {
    // Create a promise that we can control
    let resolveUpload!: (value: unknown) => void;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });
    
    mockServices.resumeService.parseResume.mockReturnValue(uploadPromise);

    render(<OnboardingPage />);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    // Should show disabled state
    await waitFor(() => {
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    // Resolve the promise
    resolveUpload({
      success: true,
      data: { id: 'resume123' },
    });

    mockServices.userService.updateResumeId.mockResolvedValue({
      success: true,
      data: { resume_id: 'resume123' },
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});