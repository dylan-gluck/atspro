import type { 
  BetterAuthUser, 
  BetterAuthSession, 
  UserProfile, 
  UserSettings,
  Subscription,
  ResumeVersion,
  OptimizationResult,
  JobEntity,
  JobDocument,
  Notification,
  Resume,
  Job
} from '@/types/services'

// Mock Better-Auth user
export const mockBetterAuthUser: BetterAuthUser = {
  id: 'user_123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  emailVerified: true,
  image: 'https://example.com/avatar.jpg',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
}

// Mock Better-Auth session
export const mockBetterAuthSession: BetterAuthSession = {
  user: mockBetterAuthUser,
  session: {
    id: 'session_123',
    userId: 'user_123',
    expiresAt: new Date('2024-12-31'),
    token: 'session_token_123',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 Test Browser',
  },
}

// Mock user profile
export const mockUserProfile: UserProfile = {
  id: 'profile_123',
  user_id: 'user_123',
  phone: '+1-555-0123',
  location: 'San Francisco, CA',
  title: 'Software Engineer',
  bio: 'Experienced full-stack developer',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

// Mock user settings
export const mockUserSettings: UserSettings = {
  id: 'settings_123',
  user_id: 'user_123',
  theme: 'light',
  notifications: {
    email: true,
    push: false,
    sms: false,
  },
  preferences: {
    auto_optimize: true,
    save_drafts: true,
    default_privacy: 'private',
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

// Mock subscription
export const mockSubscription: Subscription = {
  id: 'subscription_123',
  user_id: 'user_123',
  plan: 'premium',
  status: 'active',
  starts_at: '2025-01-01T00:00:00Z',
  ends_at: '2025-12-31T23:59:59Z',
  auto_renew: true,
  stripe_subscription_id: 'sub_stripe123',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
}

// Mock resume
export const mockResume: Resume = {
  contact_info: {
    full_name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    address: 'San Francisco, CA',
    links: [
      { name: 'LinkedIn', url: 'https://linkedin.com/in/johndoe' },
      { name: 'GitHub', url: 'https://github.com/johndoe' },
    ],
  },
  summary: 'Experienced software engineer with expertise in web development.',
  work_experience: [
    {
      company: 'TechCorp',
      position: 'Senior Software Engineer',
      start_date: '2022-01-01',
      end_date: null,
      is_current: true,
      description: 'Lead development of web applications',
      responsibilities: ['Develop features', 'Code review', 'Mentor junior developers'],
      skills: ['React', 'TypeScript', 'Node.js'],
    },
  ],
  education: [
    {
      institution: 'University of California',
      degree: 'Bachelor of Science',
      field_of_study: 'Computer Science',
      graduation_date: '2020-05-01',
      gpa: 3.8,
      honors: ['Magna Cum Laude'],
      relevant_courses: ['Data Structures', 'Algorithms'],
      skills: ['Java', 'Python', 'C++'],
    },
  ],
  certifications: [
    {
      name: 'AWS Certified Developer',
      issuer: 'Amazon Web Services',
      date_obtained: '2023-06-01',
      expiration_date: '2026-06-01',
      credential_id: 'aws_cert_123',
    },
  ],
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS'],
}

// Mock resume version
export const mockResumeVersion: ResumeVersion = {
  id: 'resume_123',
  user_id: 'user_123',
  version: 1,
  is_active: true,
  resume_data: mockResume,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

// Mock job
export const mockJob: Job = {
  company: 'TechStart Inc',
  title: 'Full Stack Developer',
  description: 'We are looking for a skilled Full Stack Developer...',
  salary: '$90,000 - $120,000',
  responsibilities: ['Develop web applications', 'Collaborate with team'],
  qualifications: ['3+ years experience', 'React/Node.js expertise'],
  logistics: ['Remote work available', 'Full-time position'],
  location: ['San Francisco, CA', 'Remote'],
  additional_info: ['Great benefits package', 'Flexible hours'],
  link: 'https://example.com/jobs/123',
}

// Mock job entity
export const mockJobEntity: JobEntity = {
  id: 'job_123',
  user_id: 'user_123',
  title: 'Full Stack Developer',
  company: 'TechStart Inc',
  job_details: mockJob,
  status_info: {
    status: 'applied',
    application_date: '2024-01-15T00:00:00Z',
    notes: 'Applied through company website',
  },
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

// Mock job document
export const mockJobDocument: JobDocument = {
  id: 'document_123',
  job_id: 'job_123',
  user_id: 'user_123',
  type: 'resume',
  filename: 'resume_optimized.pdf',
  content: 'Resume content...',
  file_url: 'https://example.com/documents/resume_optimized.pdf',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

// Mock optimization result
export const mockOptimizationResult: OptimizationResult = {
  id: 'optimization_123',
  resume_id: 'resume_123',
  job_id: 'job_123',
  user_id: 'user_123',
  content: 'Optimized resume content...',
  optimization_score: 85,
  keywords_matched: ['React', 'TypeScript', 'Full Stack'],
  suggestions: ['Highlight React experience', 'Add TypeScript projects'],
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

// Mock notification
export const mockNotification: Notification = {
  id: 'notification_123',
  user_id: 'user_123',
  title: 'Resume Optimized',
  message: 'Your resume has been optimized for the Full Stack Developer position.',
  type: 'success',
  category: 'optimization',
  is_read: false,
  action_url: '/optimizations/123',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

// Mock API responses
export const createMockApiResponse = <T>(data: T, success = true, message?: string) => ({
  data,
  success,
  message: message || (success ? 'Success' : 'Error'),
  errors: success ? undefined : [message || 'Error'],
})

export const createMockPaginatedResponse = <T>(
  data: T[], 
  page = 1, 
  pageSize = 10, 
  total?: number
) => ({
  data,
  total: total || data.length,
  page,
  page_size: pageSize,
  has_next: page * pageSize < (total || data.length),
  has_previous: page > 1,
})

// Mock fetch responses
export const createMockFetchResponse = (data: unknown, status = 200, ok = true) => ({
  ok,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
  headers: new Headers({ 'content-type': 'application/json' }),
})

// Mock file
export const createMockFile = (
  name = 'test.pdf',
  type = 'application/pdf',
  size = 1024
) => {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}