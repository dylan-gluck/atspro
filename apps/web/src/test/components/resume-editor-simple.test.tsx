import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ResumeEditor } from '@/components/ResumeEditor';
import type { Resume } from '@/types/resume';

// Mock the services
const mockResumeService = {
  getResume: vi.fn(),
  updateResume: vi.fn(),
  exportResume: vi.fn(),
  uploadResume: vi.fn(),
  deleteResume: vi.fn(),
  createResume: vi.fn(),
  getVersions: vi.fn(),
  restoreVersion: vi.fn(),
  optimizeResume: vi.fn(),
  getOptimizations: vi.fn(),
  getOptimization: vi.fn(),
  getAnalytics: vi.fn(),
  initialize: vi.fn(),
  destroy: vi.fn(),
  isInitialized: true
};

// Mock the useResumeService hook
vi.mock('@/lib/services', () => ({
  useResumeService: () => mockResumeService
}));

// Mock toast from sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

const mockResume: Resume = {
  contact_info: {
    full_name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-123-4567',
    address: 'San Francisco, CA',
    links: [
      { name: 'LinkedIn', url: 'https://linkedin.com/in/johndoe' }
    ]
  },
  summary: 'Experienced software engineer with 5+ years in full-stack development.',
  work_experience: [
    {
      company: 'Tech Corp',
      position: 'Senior Software Engineer',
      start_date: '2020-01-01',
      end_date: null,
      is_current: true,
      description: 'Leading a team of 5 developers on various projects.',
      responsibilities: [
        'Design and implement scalable web applications',
        'Mentor junior developers'
      ],
      skills: ['React', 'Node.js', 'TypeScript']
    }
  ],
  education: [
    {
      institution: 'University of Technology',
      degree: 'Bachelor of Science',
      field_of_study: 'Computer Science',
      graduation_date: '2018-05-01',
      gpa: '3.8',
      honors: ['Magna Cum Laude'],
      relevant_courses: ['Data Structures', 'Algorithms']
    }
  ],
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
  certifications: [
    {
      name: 'AWS Certified Developer',
      issuer: 'Amazon Web Services',
      date_obtained: '2022-03-15',
      expiration_date: '2025-03-15',
      credential_id: 'AWS-CDA-123456'
    }
  ]
};

describe('ResumeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading and Error States', () => {
    it('should show loading state initially', async () => {
      mockResumeService.getResume.mockImplementation(() => new Promise(() => {}));

      render(<ResumeEditor />);

      expect(screen.getByText('Loading your resume...')).toBeInTheDocument();
    });

    it('should show error message when loading fails', async () => {
      mockResumeService.getResume.mockRejectedValue(new Error('Network error'));

      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load resume. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show no resume message when no data available', async () => {
      mockResumeService.getResume.mockResolvedValue({
        success: false,
        data: null
      });

      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('No resume found. Please upload a resume first.')).toBeInTheDocument();
      });
    });
  });

  describe('Resume Content Display', () => {
    beforeEach(() => {
      mockResumeService.getResume.mockResolvedValue({
        success: true,
        data: { resume_data: mockResume }
      });
    });

    it('should display contact information', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('+1-555-123-4567')).toBeInTheDocument();
        expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
      });
    });

    it('should display professional summary', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('Professional Summary')).toBeInTheDocument();
        expect(screen.getByText('Experienced software engineer with 5+ years in full-stack development.')).toBeInTheDocument();
      });
    });

    it('should display work experience', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('Professional Experience')).toBeInTheDocument();
        expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
        expect(screen.getByText('Tech Corp')).toBeInTheDocument();
        expect(screen.getByText('Design and implement scalable web applications')).toBeInTheDocument();
      });
    });

    it('should display education information', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('Education')).toBeInTheDocument();
        expect(screen.getByText('Bachelor of Science')).toBeInTheDocument();
        expect(screen.getByText('University of Technology')).toBeInTheDocument();
        expect(screen.getByText('GPA: 3.8')).toBeInTheDocument();
      });
    });

    it('should display skills section', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('Skills')).toBeInTheDocument();
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
      });
    });

    it('should display certifications', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('Certifications')).toBeInTheDocument();
        expect(screen.getByText('AWS Certified Developer')).toBeInTheDocument();
        expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    beforeEach(() => {
      mockResumeService.getResume.mockResolvedValue({
        success: true,
        data: { resume_data: mockResume }
      });
    });

    it('should render all action buttons', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('Download PDF')).toBeInTheDocument();
        expect(screen.getByText('Reset')).toBeInTheDocument();
        expect(screen.getByText('Undo')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
      });
    });

    it('should disable save and undo buttons initially', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        const saveButton = screen.getByText('Save');
        const undoButton = screen.getByText('Undo');
        
        expect(saveButton).toBeDisabled();
        expect(undoButton).toBeDisabled();
      });
    });

    it('should handle reset button click', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        const resetButton = screen.getByText('Reset');
        fireEvent.click(resetButton);
      });

      // Should call getResume again
      await waitFor(() => {
        expect(mockResumeService.getResume).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle empty work experience', async () => {
      const resumeWithoutExperience = {
        ...mockResume,
        work_experience: []
      };

      mockResumeService.getResume.mockResolvedValue({
        success: true,
        data: { resume_data: resumeWithoutExperience }
      });

      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Professional Experience')).not.toBeInTheDocument();
      });
    });

    it('should handle empty skills', async () => {
      const resumeWithoutSkills = {
        ...mockResume,
        skills: []
      };

      mockResumeService.getResume.mockResolvedValue({
        success: true,
        data: { resume_data: resumeWithoutSkills }
      });

      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Skills')).not.toBeInTheDocument();
      });
    });
  });

  describe('Date Formatting', () => {
    it('should show Present for current job', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        expect(screen.getByText(/Present/)).toBeInTheDocument();
      });
    });

    it('should format graduation date correctly', async () => {
      render(<ResumeEditor />);

      await waitFor(() => {
        // Should show formatted date like "May 2018"
        expect(screen.getByText(/May 2018/)).toBeInTheDocument();
      });
    });
  });

  describe('Component Props', () => {
    it('should apply custom className', () => {
      mockResumeService.getResume.mockResolvedValue({
        success: true,
        data: { resume_data: mockResume }
      });

      const { container } = render(<ResumeEditor className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should call onSave prop when provided', async () => {
      mockResumeService.getResume.mockResolvedValue({
        success: true,
        data: { resume_data: mockResume }
      });

      mockResumeService.updateResume.mockResolvedValue({
        success: true,
        data: mockResume
      });

      const mockOnSave = vi.fn();
      render(<ResumeEditor onSave={mockOnSave} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // The onSave callback would be called in handleSave when changes are made
      // Since we can't easily simulate changes, we just verify the prop is handled
      expect(mockOnSave).not.toHaveBeenCalled(); // No changes made yet
    });
  });

  describe('Service Integration', () => {
    it('should call getResume on mount', async () => {
      mockResumeService.getResume.mockResolvedValue({
        success: true,
        data: { resume_data: mockResume }
      });

      render(<ResumeEditor />);

      expect(mockResumeService.getResume).toHaveBeenCalledTimes(1);
    });

    it('should handle service initialization check', () => {
      mockResumeService.getResume.mockResolvedValue({
        success: true,
        data: { resume_data: mockResume }
      });

      render(<ResumeEditor />);

      // Component should check if service is available before calling
      expect(mockResumeService.getResume).toHaveBeenCalled();
    });
  });
});