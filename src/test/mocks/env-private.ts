/**
 * Mock for $env/static/private
 * Used in test environment via Vite alias resolution
 */
export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro_test';
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
export const BETTER_AUTH_SECRET =
	process.env.BETTER_AUTH_SECRET || 'test-secret-key-that-is-at-least-32-chars';
export const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:5173';
