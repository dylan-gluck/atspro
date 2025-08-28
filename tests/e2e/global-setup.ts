import { chromium } from '@playwright/test';
import http from 'http';

/**
 * Check if the development server is running
 */
async function checkDevServer(port: number = 5173): Promise<boolean> {
	return new Promise((resolve) => {
		const options = {
			hostname: 'localhost',
			port: port,
			path: '/',
			method: 'GET',
			timeout: 2000
		};

		const req = http.request(options, (res) => {
			// Any response means server is running
			resolve(true);
		});

		req.on('error', () => {
			resolve(false);
		});

		req.on('timeout', () => {
			req.destroy();
			resolve(false);
		});

		req.end();
	});
}

async function globalSetup() {
	// Only check dev server when not in CI (CI starts its own server)
	if (!process.env.CI) {
		console.log('Checking if dev server is running on port 5173...');
		const isRunning = await checkDevServer(5173);

		if (!isRunning) {
			console.error('\n❌ Error: Development server is not running!');
			console.error('Please start the dev server first with: bun run dev\n');
			process.exit(1);
		}

		console.log('✅ Dev server is running\n');
	}

	// Optional: You can also set up browser context here for auth state
	// const browser = await chromium.launch();
	// const context = await browser.newContext();
	// // ... perform authentication ...
	// await context.storageState({ path: 'tests/e2e/.auth/user.json' });
	// await browser.close();
}

export default globalSetup;
