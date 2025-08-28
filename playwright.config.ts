import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	globalSetup: './tests/e2e/global-setup.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [['html'], ['list'], ['json', { outputFile: 'test-results/results.json' }]],
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},

	projects: [
		// Only use Chromium for now (other browsers need installation)
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],

	// Run your dev server before starting the tests
	webServer: process.env.CI
		? {
				command: 'bun run dev',
				url: 'http://localhost:5173',
				reuseExistingServer: false,
				timeout: 120 * 1000
			}
		: undefined // In dev, assume server is already running
});
