import type {
  BetterAuthUser,
  BetterAuthSession,
  UserProfile,
  FullUserProfile,
  UserSettings,
  Subscription,
  ResumeVersion,
  OptimizationResult,
  JobEntity,
  JobStatus,
  JobDocument,
  Notification,
  NotificationPreferences,
  Resume,
  Job
} from './database';

// Re-export database types for use by services
export type {
  BetterAuthUser,
  BetterAuthSession,
  UserProfile,
  FullUserProfile,
  UserSettings,
  Subscription,
  ResumeVersion,
  OptimizationResult,
  JobEntity,
  JobStatus,
  JobDocument,
  Notification,
  NotificationPreferences,
  Resume,
  Job
};

// Base service interface
export interface BaseService {
  isInitialized: boolean;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

// Pagination interface
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

// Request configuration
export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

// API Client interface
export interface ApiClient {
  get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  upload<T>(url: string, file: File, config?: RequestConfig): Promise<ApiResponse<T>>;
}

// UserService Interface
export interface UserService extends BaseService {
  // Profile Management (works with better-auth user + extended profile)
  getFullProfile(): Promise<ApiResponse<FullUserProfile>>;
  getProfile(): Promise<ApiResponse<UserProfile>>;
  updateProfile(profile: Partial<UserProfile>): Promise<ApiResponse<UserProfile>>;
  deleteProfile(): Promise<ApiResponse<void>>;

  // Settings Management
  getSettings(): Promise<ApiResponse<UserSettings>>;
  updateSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>>;

  // Subscription Management
  getSubscription(): Promise<ApiResponse<Subscription>>;
  updateSubscription(plan: string): Promise<ApiResponse<Subscription>>;
  cancelSubscription(): Promise<ApiResponse<void>>;

  // Better-Auth Integration (delegated to AuthService)
  getCurrentUser(): Promise<ApiResponse<BetterAuthUser | null>>;
  updateUserName(name: string): Promise<ApiResponse<BetterAuthUser>>;
  updateUserEmail(email: string): Promise<ApiResponse<BetterAuthUser>>;

  // Onboarding Methods
  updateResumeId(resumeId: string): Promise<ApiResponse<UserProfile>>;
  hasResumeId(): Promise<boolean>;
  getResumeId(): Promise<string | null>;
}

// ResumeService Interface
export interface ResumeService extends BaseService {
  // Resume Management
  getResume(): Promise<ApiResponse<ResumeVersion>>;
  updateResume(resumeData: Resume): Promise<ApiResponse<ResumeVersion>>;
  createResume(resumeData: Resume): Promise<ApiResponse<ResumeVersion>>;
  deleteResume(): Promise<ApiResponse<void>>;

  // Version Management
  getVersions(): Promise<ApiResponse<ResumeVersion[]>>;
  restoreVersion(version: number): Promise<ApiResponse<ResumeVersion>>;

  // File Operations
  parseResume(file: File): Promise<ApiResponse<Resume>>;
  uploadResume(file: File): Promise<ApiResponse<Resume>>;
  exportResume(format: 'pdf' | 'docx' | 'txt'): Promise<ApiResponse<Blob>>;

  // Optimization
  optimizeForJob(jobId: string): Promise<ApiResponse<OptimizationResult>>;
  getOptimizations(): Promise<ApiResponse<OptimizationResult[]>>;
  getOptimization(id: string): Promise<ApiResponse<OptimizationResult>>;

  // Analytics
  getResumeAnalytics(): Promise<ApiResponse<{
    total_optimizations: number;
    avg_score: number;
    top_skills: string[];
    optimization_history: Array<{date: string; score: number}>;
  }>>;
}

// JobsService Interface
export interface JobsService extends BaseService {
  // Job Management
  listJobs(params?: {
    status?: string;
    company?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<JobEntity>>>;
  
  getJob(id: string): Promise<ApiResponse<JobEntity>>;
  createJob(jobUrl: string): Promise<ApiResponse<JobEntity>>;
  parseJobFromDocument(file: File): Promise<ApiResponse<JobEntity>>;
  updateJob(id: string, updates: Partial<JobEntity>): Promise<ApiResponse<JobEntity>>;
  deleteJob(id: string): Promise<ApiResponse<void>>;

  // Job Status Management
  updateStatus(id: string, status: JobStatus): Promise<ApiResponse<JobEntity>>;
  bulkUpdateStatus(jobIds: string[], status: JobStatus): Promise<ApiResponse<void>>;

  // Document Management
  getDocuments(jobId: string): Promise<ApiResponse<JobDocument[]>>;
  uploadDocument(jobId: string, file: File, type: JobDocument['type']): Promise<ApiResponse<JobDocument>>;
  createDocument(jobId: string, content: string, type: JobDocument['type']): Promise<ApiResponse<JobDocument>>;
  deleteDocument(documentId: string): Promise<ApiResponse<void>>;

  // Job Analysis
  analyzeJob(jobUrl: string): Promise<ApiResponse<Job>>;
  getJobInsights(id: string): Promise<ApiResponse<{
    skill_match: number;
    experience_match: number;
    missing_skills: string[];
    recommendations: string[];
  }>>;

  // Search & Filtering
  searchJobs(query: string): Promise<ApiResponse<JobEntity[]>>;
  filterJobs(filters: {
    status?: string[];
    company?: string[];
    location?: string[];
    salary_range?: [number, number];
    date_range?: [string, string];
  }): Promise<ApiResponse<JobEntity[]>>;

  // Archive Management
  archiveJob(id: string): Promise<ApiResponse<JobEntity>>;
  unarchiveJob(id: string): Promise<ApiResponse<JobEntity>>;
  bulkArchiveJobs(jobIds: string[]): Promise<ApiResponse<void>>;
  bulkUnarchiveJobs(jobIds: string[]): Promise<ApiResponse<void>>;
}

// AuthService Interface
export interface AuthService extends BaseService {
  // Authentication (delegates to better-auth)
  signIn(email: string, password: string): Promise<ApiResponse<BetterAuthSession>>;
  signUp(email: string, password: string, name: string): Promise<ApiResponse<BetterAuthUser>>;
  signOut(): Promise<ApiResponse<void>>;

  // Session Management (delegates to better-auth)
  getSession(): Promise<ApiResponse<BetterAuthSession | null>>;
  validateSession(): Promise<boolean>;

  // User Management (delegates to better-auth)
  getCurrentUser(): Promise<ApiResponse<BetterAuthUser | null>>;
  updateUser(data: { name?: string; email?: string }): Promise<ApiResponse<BetterAuthUser>>;
  deleteAccount(): Promise<ApiResponse<void>>;

  // Email Verification (delegates to better-auth)
  sendVerificationEmail(): Promise<ApiResponse<void>>;
  verifyEmail(token: string): Promise<ApiResponse<void>>;

  // Password Management (delegates to better-auth)
  changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>>;
  requestPasswordReset(email: string): Promise<ApiResponse<void>>;
  confirmPasswordReset(token: string, newPassword: string): Promise<ApiResponse<void>>;

  // Better-Auth Client Access
  getBetterAuthClient(): any; // Type will be properly typed in implementation
}

// NotificationService Interface
export interface NotificationService extends BaseService {
  // Notification Management
  getNotifications(params?: {
    is_read?: boolean;
    category?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Notification>>>;

  markAsRead(id: string): Promise<ApiResponse<void>>;
  markAllAsRead(): Promise<ApiResponse<void>>;
  deleteNotification(id: string): Promise<ApiResponse<void>>;

  // Real-time Notifications
  subscribe(): Promise<void>;
  unsubscribe(): Promise<void>;

  // Preferences
  getPreferences(): Promise<ApiResponse<NotificationPreferences>>;
  updatePreferences(preferences: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>>;

  // Push Notifications
  requestPushPermission(): Promise<boolean>;
  subscribeToPush(): Promise<ApiResponse<void>>;
  unsubscribeFromPush(): Promise<ApiResponse<void>>;
}

// Service Container
export interface ServiceContainer {
  userService: UserService;
  resumeService: ResumeService;
  jobsService: JobsService;
  authService: AuthService;
  notificationService: NotificationService;
}

// Error types
export enum ServiceErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CACHE_ERROR = 'CACHE_ERROR'
}

export class ServiceError extends Error {
  public type: ServiceErrorType;
  public code: string;
  public details?: any;

  constructor(type: ServiceErrorType, message: string, code: string, details?: any) {
    super(message);
    this.type = type;
    this.code = code;
    this.details = details;
    this.name = 'ServiceError';
  }
}