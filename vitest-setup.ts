import { vi } from 'vitest';
import type { Navigation, Page } from '@sveltejs/kit';

// Mock the app context for remote functions
global.app = {
	hooks: {
		transport: {
			encode: (value) => JSON.stringify(value),
			decode: (value) => JSON.parse(value)
		}
	}
};

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

// Mock $app/server for remote functions
vi.mock('$app/server', () => ({
	query: (schema, handler) => {
		// If only one argument (the handler function), return it
		if (typeof schema === 'function' && !handler) {
			return schema;
		}
		// Otherwise return the handler (second argument)
		return handler || schema;
	},
	command: (schema, handler) => {
		// If only one argument (the handler function), return it
		if (typeof schema === 'function' && !handler) {
			return schema;
		}
		// Otherwise return the handler (second argument)
		return handler || schema;
	},
	form: (schema, handler) => {
		// Handle both form(handler) and form(schema, handler) signatures
		if (typeof schema === 'function' && !handler) {
			return schema;
		}
		return handler || schema;
	},
	getRequestEvent: vi.fn()
}));

// Mock better-auth/svelte-kit
vi.mock('better-auth/svelte-kit', () => ({
	sveltekitCookies: vi.fn(() => ({}))
}));

// Mock database pool
vi.mock('$lib/db/pool', () => ({
	getPool: vi.fn(() => ({
		query: vi.fn(),
		end: vi.fn()
	}))
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
