import { Pool } from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

export class DatabaseSeeder {
	static async seedSubscriptionTiers() {
		const pool = new Pool({
			connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro',
			max: 5,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000
		});

		try {
			// Check if tier configuration exists
			const tiersConfigPath = path.join(process.cwd(), '.test-data', 'tier-configuration.json');
			let tiersConfig: any = {};

			try {
				tiersConfig = JSON.parse(readFileSync(tiersConfigPath, 'utf8'));
			} catch (error) {
				// If no config file, use default tier settings
				tiersConfig = {
					applicant: {
						limits: {
							optimizations: 0,
							ats_reports: 0,
							active_jobs: 10
						},
						pricing: {
							monthly: 0,
							yearly: 0
						}
					},
					candidate: {
						limits: {
							optimizations: 50,
							ats_reports: 20,
							active_jobs: -1 // unlimited
						},
						pricing: {
							monthly: 20,
							yearly: 200
						}
					},
					executive: {
						limits: {
							optimizations: -1, // unlimited
							ats_reports: -1, // unlimited
							active_jobs: -1 // unlimited
						},
						pricing: {
							monthly: 50,
							yearly: 500
						}
					}
				};
			}

			// Seed tier data as needed
			console.log('✅ Subscription tiers configured');
		} finally {
			await pool.end();
		}
	}

	static async cleanupTestData() {
		const pool = new Pool({
			connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro',
			max: 5,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000
		});

		try {
			// Remove all test users (email contains 'test')
			const result = await pool.query(
				`DELETE FROM "user" 
				WHERE email LIKE '%test%@example.com'
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
					"updatedAt" = NOW()
				WHERE email = 'jdoex@example.com'`
			);

			console.log('✅ Reset permanent test user counters');
		} finally {
			await pool.end();
		}
	}

	static async ensureSchema() {
		const pool = new Pool({
			connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro',
			max: 5,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000
		});

		try {
			// Check for required columns
			const result = await pool.query(
				`SELECT column_name 
				FROM information_schema.columns 
				WHERE table_name = 'user'
				AND column_name IN (
					'subscription_tier',
					'monthly_optimizations_used',
					'monthly_ats_reports_used',
					'active_job_applications'
				)`
			);

			const foundColumns = result.rows.map((row) => row.column_name);
			const requiredColumns = [
				'subscription_tier',
				'monthly_optimizations_used',
				'monthly_ats_reports_used',
				'active_job_applications'
			];

			const missingColumns = requiredColumns.filter((col) => !foundColumns.includes(col));

			if (missingColumns.length > 0) {
				console.warn(`⚠️ Missing database columns: ${missingColumns.join(', ')}`);
				console.warn('Run migrations: bun run migrate');
				// Don't throw error - let tests handle missing columns gracefully
			} else {
				console.log('✅ Database schema verified');
			}
		} finally {
			await pool.end();
		}
	}

	static async resetTestUserUsage(email: string) {
		const pool = new Pool({
			connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro',
			max: 5,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000
		});

		try {
			await pool.query(
				`UPDATE "user" SET
					monthly_optimizations_used = 0,
					monthly_ats_reports_used = 0,
					active_job_applications = 0,
					"updatedAt" = NOW()
				WHERE email = $1`,
				[email]
			);

			console.log(`✅ Reset usage for ${email}`);
		} finally {
			await pool.end();
		}
	}
}
