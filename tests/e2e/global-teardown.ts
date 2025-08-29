import { TestUserFactory } from './utils/test-user-factory';
import { Pool } from 'pg';

/**
 * Clean up test data after all tests complete
 */
async function cleanupTestData() {
	const pool = new Pool({
		connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro',
		max: 5,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 5000
	});

	try {
		// Remove all test users (email contains 'test-')
		const result = await pool.query(
			`DELETE FROM "user" 
			WHERE email LIKE 'test-%@example.com'
			AND email != 'jdoex@example.com'
			RETURNING email`
		);

		if (result.rows.length > 0) {
			console.log(`🧹 Cleaned up ${result.rows.length} test users`);
		}

		// Reset counters for permanent test user
		await pool.query(
			`UPDATE "user" SET
				monthly_optimizations_used = 0,
				monthly_ats_reports_used = 0,
				active_job_applications = 0,
				monthly_credits_reset_at = NOW() + INTERVAL '30 days'
			WHERE email = 'jdoex@example.com'`
		);

		console.log('✅ Reset permanent test user counters');
	} catch (error) {
		console.error('⚠️ Error cleaning up test data:', error);
		// Don't fail if cleanup has issues
	} finally {
		await pool.end();
	}
}

async function globalTeardown() {
	console.log('\n🧹 Running global test teardown...');

	// Clean factory-created users
	await TestUserFactory.cleanup();
	await TestUserFactory.close();

	// Clean general test data
	await cleanupTestData();

	console.log('✅ Test cleanup completed\n');
}

export default globalTeardown;
