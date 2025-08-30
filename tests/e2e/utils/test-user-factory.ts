import { Pool } from 'pg';
import { hashPassword } from 'better-auth/crypto';

interface TestUser {
	name: string;
	email: string;
	password: string;
}

export class TestUserFactory {
	private static userPool: Map<string, TestUser> = new Map();

	static async getOrCreateUser(
		context: 'auth' | 'subscription' | 'resume' | 'job',
		variant?: string
	): Promise<TestUser> {
		const key = `${context}${variant ? `-${variant}` : ''}`;

		// Return existing user for this context
		if (this.userPool.has(key)) {
			return this.userPool.get(key)!;
		}

		// Create new user for this context
		const timestamp = Date.now();
		const user: TestUser = {
			name: `Test ${context} ${timestamp}`,
			email: `test-${context}-${timestamp}@example.com`,
			password: 'TestPassword123!'
		};

		// Insert into database
		const pool = new Pool({
			connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro',
			max: 5,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000
		});

		try {
			const hashedPassword = await hashPassword(user.password);

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
					'candidate',
					0,
					0,
					0,
					NOW(),
					NOW()
				) RETURNING id`,
				[user.email, user.name]
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
				[user.email, userId, hashedPassword]
			);

			console.log(`✅ Test user created: ${user.email}`);
		} finally {
			await pool.end();
		}

		this.userPool.set(key, user);
		return user;
	}

	static async cleanup() {
		// Delete all test users created by factory
		const pool = new Pool({
			connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro',
			max: 5,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000
		});

		try {
			for (const user of this.userPool.values()) {
				// First delete accounts
				await pool.query(`DELETE FROM "account" WHERE "accountId" = $1`, [user.email]);

				// Then delete user
				await pool.query(`DELETE FROM "user" WHERE email = $1`, [user.email]);

				console.log(`🧹 Cleaned up test user: ${user.email}`);
			}
		} finally {
			await pool.end();
		}

		this.userPool.clear();
	}
}
