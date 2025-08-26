import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
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

	projects: process.env.CI
		? [
				// Only run on Chromium in CI
				{
					name: 'chromium',
					use: { ...devices['Desktop Chrome'] }
				}
			]
		: [
				{
					name: 'chromium',
					use: { ...devices['Desktop Chrome'] }
				},
				{
					name: 'firefox',
					use: { ...devices['Desktop Firefox'] }
				},
				{
					name: 'webkit',
					use: { ...devices['Desktop Safari'] }
				},
				// Mobile viewports
				{
					name: 'Mobile Chrome',
					use: { ...devices['Pixel 5'] }
				},
				{
					name: 'Mobile Safari',
					use: { ...devices['iPhone 12'] }
				}
			],

	// Run your dev server before starting the tests
	webServer: {
		command: 'bun run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000
	}
});
