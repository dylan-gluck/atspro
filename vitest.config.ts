import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'tests/**/*'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			exclude: [
				'node_modules/',
				'src/**/*.test.ts',
				'src/**/*.spec.ts',
				'.svelte-kit/',
				'build/',
				'dist/',
				'vite.config.ts',
				'vitest.config.ts',
				'playwright.config.ts'
			],
			// Thresholds disabled during development
			// Enable these when test coverage improves
			// thresholds: {
			// 	branches: 80,
			// 	functions: 80,
			// 	lines: 80,
			// 	statements: 80
			// }
		},
		setupFiles: ['./vitest-setup.ts']
	},
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			$app: path.resolve('./src/app')
		}
	}
});