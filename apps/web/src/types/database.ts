// Base interfaces for database entities
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Better-Auth user type (matching actual better-auth response)
export interface BetterAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

// Better-Auth session type (matching actual better-auth response)
export interface BetterAuthSession {
  user: BetterAuthUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}

// Extended user profile information
export interface UserProfile extends BaseEntity {
  user_id: string; // References better-auth user.id
  phone?: string;
  location?: string;
  title?: string;
  bio?: string;
}

// Combined user data
export interface FullUserProfile {
  user: BetterAuthUser;
  profile?: UserProfile;
}

// User settings
export interface UserSettings extends BaseEntity {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  preferences: {
    auto_optimize: boolean;
    save_drafts: boolean;
    default_privacy: 'public' | 'private';
  };
}

// Subscription management
export interface Subscription extends BaseEntity {
  user_id: string;
  plan: 'free' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  starts_at: string;
  ends_at?: string;
  auto_renew: boolean;
  stripe_subscription_id?: string;
}

// Resume with versioning
export interface ResumeVersion extends BaseEntity {
  user_id: string; // References better-auth user.id
  version: number;
  is_active: boolean;
  resume_data: Resume; // Import from existing resume.ts
}

// Resume optimization results
export interface OptimizationResult extends BaseEntity {
  resume_id: string;
  job_id: string;
  user_id: string; // References better-auth user.id
  content: string;
  optimization_score: number;
  keywords_matched: string[];
  suggestions: string[];
}

// Job status information
export interface JobStatus {
  status: 'saved' | 'applied' | 'interviewing' | 'rejected' | 'offered';
  application_date?: string;
  notes?: string;
}

// Job entity with extended information
export interface JobEntity extends BaseEntity {
  user_id: string; // References better-auth user.id
  title: string;
  company: string;
  job_details: Job; // Import from existing job.ts
  status_info: JobStatus;
}

// Job documents (resumes, cover letters, portfolios)
export interface JobDocument extends BaseEntity {
  job_id: string;
  user_id: string; // References better-auth user.id
  type: 'resume' | 'cover_letter' | 'portfolio';
  filename: string;
  content?: string;
  file_url?: string;
}

// Notifications
export interface Notification extends BaseEntity {
  user_id: string; // References better-auth user.id
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'optimization' | 'job' | 'subscription';
  is_read: boolean;
  action_url?: string;
}

// Notification preferences
export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  categories: {
    system: boolean;
    optimization: boolean;
    job_updates: boolean;
    subscription: boolean;
  };
}

// Import existing types
import type { Resume } from './resume';
import type { Job } from './job';

// Re-export existing types for convenience
export type { Resume, ContactInfo, WorkExperience, Education, Certification, Link } from './resume';
export type { Job } from './job';