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
			]
		},
		setupFiles: ['./vitest-setup.ts'],
		// Ensure mocks are resolved before module imports
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true
			}
		}
	},
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			$app: path.resolve('./src/app'),
			'$env/static/private': path.resolve('./src/test/mocks/env-private.ts'),
			'$app/environment': path.resolve('./src/test/mocks/app-environment.ts')
		}
	}
});
