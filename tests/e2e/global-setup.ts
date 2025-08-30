import { chromium } from '@playwright/test';
import http from 'http';
import { Pool } from 'pg';
import { hashPassword } from 'better-auth/crypto';
import fs from 'fs/promises';
import path from 'path';

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

/**
 * Seed test users for E2E tests
 */
async function seedTestUsers() {
	// Create a new pool connection for tests
	const pool = new Pool({
		connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro',
		max: 5,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 5000
	});

	try {
		// Load test user data
		const testUserDataPath = path.join(process.cwd(), '.test-data', 'user-data.json');
		const testUserData = JSON.parse(await fs.readFile(testUserDataPath, 'utf8'));

		// Check if the test user already exists
		const existingUserResult = await pool.query('SELECT id FROM "user" WHERE email = $1', [
			testUserData.email
		]);

		if (existingUserResult.rows.length === 0) {
			// Hash the password using Better-Auth's crypto
			const hashedPassword = await hashPassword(testUserData.password);

			// Create the user
			const userResult = await pool.query(
				`INSERT INTO "user" (
					id, 
					email, 
					name, 
					"emailVerified",
					subscription_tier,
					monthly_optimizations_used,
					monthly_ats_reports_used,
					active_job_applications,
					"createdAt",
					"updatedAt"
				) VALUES (
					'usr_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
					$1,
					$2,
					true,
					$3,
					$4,
					$5,
					$6,
					NOW(),
					NOW()
				) RETURNING id`,
				[
					testUserData.email,
					testUserData.name,
					testUserData.subscription.tier,
					testUserData.subscription.usage.monthly_optimizations_used,
					testUserData.subscription.usage.monthly_ats_reports_used,
					testUserData.subscription.usage.active_job_applications
				]
			);

			const userId = userResult.rows[0].id;

			// Create the account entry for password authentication
			await pool.query(
				`INSERT INTO "account" (
					id,
					"accountId",
					"providerId",
					"userId",
					password,
					"createdAt",
					"updatedAt"
				) VALUES (
					'acc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
					$1,
					'credential',
					$2,
					$3,
					NOW(),
					NOW()
				)`,
				[testUserData.email, userId, hashedPassword]
			);

			console.log('✅ Test user seeded successfully:', testUserData.email);
		} else {
			// Update existing user to ensure correct state
			await pool.query(
				`UPDATE "user" SET
					subscription_tier = $1,
					monthly_optimizations_used = $2,
					monthly_ats_reports_used = $3,
					active_job_applications = $4,
					"updatedAt" = NOW()
				WHERE email = $5`,
				[
					testUserData.subscription.tier,
					testUserData.subscription.usage.monthly_optimizations_used,
					testUserData.subscription.usage.monthly_ats_reports_used,
					testUserData.subscription.usage.active_job_applications,
					testUserData.email
				]
			);

			console.log('✅ Test user state reset:', testUserData.email);
		}

		// Seed additional test scenarios if needed
		const scenarios = testUserData.test_scenarios as Record<string, any>;
		for (const [scenarioName, scenario] of Object.entries(scenarios)) {
			const scenarioEmail = `test-${scenarioName}@example.com`;

			// Check if scenario user exists
			const existingScenarioResult = await pool.query('SELECT id FROM "user" WHERE email = $1', [
				scenarioEmail
			]);

			if (existingScenarioResult.rows.length === 0 && scenario.tier) {
				// Create scenario test user
				const scenarioHashedPassword = await hashPassword('TestPassword123!');

				const scenarioUserResult = await pool.query(
					`INSERT INTO "user" (
						id, 
						email, 
						name, 
						"emailVerified",
						subscription_tier,
						monthly_optimizations_used,
						monthly_ats_reports_used,
						active_job_applications,
						"createdAt",
						"updatedAt"
					) VALUES (
						'usr_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
						$1,
						$2,
						true,
						$3,
						$4,
						$5,
						$6,
						NOW(),
						NOW()
					) RETURNING id`,
					[
						scenarioEmail,
						`Test ${scenarioName.replace('_', ' ')}`,
						scenario.tier,
						scenario.usage?.monthly_optimizations_used || 0,
						scenario.usage?.monthly_ats_reports_used || 0,
						scenario.usage?.active_job_applications || 0
					]
				);

				const scenarioUserId = scenarioUserResult.rows[0].id;

				// Create account for scenario user
				await pool.query(
					`INSERT INTO "account" (
						id,
						"accountId",
						"providerId",
						"userId",
						password,
						"createdAt",
						"updatedAt"
					) VALUES (
						'acc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
						$1,
						'credential',
						$2,
						$3,
						NOW(),
						NOW()
					)`,
					[scenarioEmail, scenarioUserId, scenarioHashedPassword]
				);

				console.log(`✅ Scenario test user created: ${scenarioEmail}`);
			}
		}
	} catch (error) {
		console.error('⚠️ Error seeding test users:', error);
		// Don't fail the entire test run if seeding fails
		// Tests will handle authentication failures gracefully
	} finally {
		// Always close the pool connection
		await pool.end();
	}
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

	// Seed test users
	console.log('Seeding test users...');
	await seedTestUsers();

	// Return a teardown function for cleanup
	return async () => {
		// Cleanup will be handled by global-teardown.ts
	};
}

export default globalSetup;
