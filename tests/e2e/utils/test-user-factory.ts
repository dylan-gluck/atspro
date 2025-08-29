import { Pool } from 'pg';
import { hashPassword } from 'better-auth/crypto';
import type { TestUser } from './auth-helpers';

export interface TestUserWithId extends TestUser {
	id: string;
}

export class TestUserFactory {
	private static userPool: Map<string, TestUserWithId> = new Map();
	private static pool: Pool | null = null;

	/**
	 * Initialize the database pool for test user factory
	 */
	private static getPool(): Pool {
		if (!this.pool) {
			this.pool = new Pool({
				connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro',
				max: 5,
				idleTimeoutMillis: 30000,
				connectionTimeoutMillis: 5000
			});
		}
		return this.pool;
	}

	/**
	 * Get or create a test user for a specific context
	 * @param context - The test context (auth, subscription, resume, job)
	 * @param variant - Optional variant for the context
	 * @returns Test user with credentials
	 */
	static async getOrCreateUser(
		context: 'auth' | 'subscription' | 'resume' | 'job',
		variant?: string
	): Promise<TestUserWithId> {
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

		const pool = this.getPool();

		try {
			// Hash the password
			const hashedPassword = await hashPassword(user.password);

			// Insert into database
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

			// Create account for password authentication
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

			const userWithId: TestUserWithId = {
				...user,
				id: userId
			};

			this.userPool.set(key, userWithId);
			console.log(`✅ Created test user: ${user.email}`);
			return userWithId;
		} catch (error) {
			console.error(`Failed to create test user for ${key}:`, error);
			throw error;
		}
	}

	/**
	 * Update a test user's subscription tier
	 * @param userId - The user ID
	 * @param tier - The subscription tier
	 */
	static async updateUserTier(
		userId: string,
		tier: 'applicant' | 'candidate' | 'executive'
	): Promise<void> {
		const pool = this.getPool();

		await pool.query(
			`UPDATE "user" SET
				subscription_tier = $1,
				"updatedAt" = NOW()
			WHERE id = $2`,
			[tier, userId]
		);
	}

	/**
	 * Update a test user's usage counters
	 * @param userId - The user ID
	 * @param usage - Usage counters to update
	 */
	static async updateUserUsage(
		userId: string,
		usage: {
			monthly_optimizations_used?: number;
			monthly_ats_reports_used?: number;
			active_job_applications?: number;
		}
	): Promise<void> {
		const pool = this.getPool();

		const updates: string[] = [];
		const values: any[] = [];
		let paramCount = 1;

		if (usage.monthly_optimizations_used !== undefined) {
			updates.push(`monthly_optimizations_used = $${paramCount++}`);
			values.push(usage.monthly_optimizations_used);
		}

		if (usage.monthly_ats_reports_used !== undefined) {
			updates.push(`monthly_ats_reports_used = $${paramCount++}`);
			values.push(usage.monthly_ats_reports_used);
		}

		if (usage.active_job_applications !== undefined) {
			updates.push(`active_job_applications = $${paramCount++}`);
			values.push(usage.active_job_applications);
		}

		if (updates.length > 0) {
			updates.push(`"updatedAt" = NOW()`);
			values.push(userId);

			await pool.query(`UPDATE "user" SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);
		}
	}

	/**
	 * Clean up all test users created by the factory
	 */
	static async cleanup(): Promise<void> {
		const pool = this.getPool();

		// Delete all test users created by factory
		for (const user of this.userPool.values()) {
			try {
				await pool.query('DELETE FROM "user" WHERE email = $1', [user.email]);
				console.log(`🧹 Deleted test user: ${user.email}`);
			} catch (error) {
				console.error(`Failed to delete test user ${user.email}:`, error);
			}
		}

		this.userPool.clear();
	}

	/**
	 * Close the database pool
	 */
	static async close(): Promise<void> {
		if (this.pool) {
			await this.pool.end();
			this.pool = null;
		}
	}
}
