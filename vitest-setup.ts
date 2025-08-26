import { vi } from 'vitest';
import type { Navigation, Page } from '@sveltejs/kit';

// Mock SvelteKit modules
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	replaceState: vi.fn(),
	pushState: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	afterNavigate: vi.fn()
}));

vi.mock('$app/stores', () => {
	const page = {
		subscribe: vi.fn(),
		set: vi.fn()
	};
	const navigating = {
		subscribe: vi.fn(),
		set: vi.fn()
	};
	const updated = {
		subscribe: vi.fn(),
		set: vi.fn()
	};

	return { page, navigating, updated };
});

vi.mock('$app/environment', () => ({
	browser: false,
	dev: true,
	building: false,
	version: 'test'
}));

// Mock $app/server for remote functions
vi.mock('$app/server', () => ({
	query: vi.fn((schema, handler) => {
		// Return the handler directly for testing
		return handler;
	}),
	command: vi.fn((schema, handler) => {
		// Return the handler directly for testing
		return handler;
	}),
	form: vi.fn((handler) => {
		// Return the handler directly for testing
		return handler;
	})
}));

// Mock fetch for server-side tests
global.fetch = vi.fn();

// Mock console to reduce noise in test output
global.console = {
	...console,
	log: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn()
};
