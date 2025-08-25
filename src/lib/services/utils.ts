import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';

// Rate limiter implementation
const rateLimiter = new Map<string, number[]>();

export function checkRateLimit(
  userId: string,
  limit: number,
  window: number,
  action: string = 'default'
) {
  const now = Date.now();
  const key = `${userId}:${action}:${limit}:${window}`;
  const timestamps = rateLimiter.get(key) || [];
  
  // Filter out old timestamps outside the window
  const recent = timestamps.filter(t => t > now - window);
  
  if (recent.length >= limit) {
    error(429, 'Too many requests. Please wait before trying again.');
  }
  
  recent.push(now);
  rateLimiter.set(key, recent);
}

// Authentication helper
export function requireAuth() {
  const { locals } = getRequestEvent();
  const userId = locals.user?.id;
  
  if (!userId) {
    error(401, 'Unauthorized');
  }
  
  return userId;
}

// Error codes for consistent error handling
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // AI/Processing errors
  AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  GENERATION_FAILED: 'GENERATION_FAILED',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

// File validation helper
export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSize: number = 10 * 1024 * 1024 // 10MB default
) {
  if (!file) {
    error(400, 'No file provided');
  }

  if (!allowedTypes.includes(file.type)) {
    error(400, `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  if (file.size > maxSize) {
    error(400, `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`);
  }
}

// Logging helper
export function logActivity(
  action: string,
  userId: string,
  metadata?: Record<string, any>
) {
  // In production, this would send to a logging service
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action,
    userId,
    metadata
  }));
}

// Performance monitoring helper
export function measurePerformance<T>(
  operation: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logActivity('performance', operation, { duration });
      });
    }
    
    const duration = performance.now() - start;
    logActivity('performance', operation, { duration });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logActivity('performance_error', operation, { duration, error: String(error) });
    throw error;
  }
}

// Clean and format markdown content
export function formatMarkdown(content: string): string {
  return content
    .trim()
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double
    .replace(/^\s+/gm, '') // Remove leading whitespace from lines
    .replace(/\s+$/gm, ''); // Remove trailing whitespace from lines
}