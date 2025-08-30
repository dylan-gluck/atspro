import { Pool } from 'pg';

async function fixSubscriptionMigration() {
	console.log('🔧 Fixing subscription tier migration...\n');

	// Use same connection as migrate script
	const pool = new Pool({
		connectionString: process.env.DATABASE_URL
	});

	try {
		// Start transaction
		await pool.query('BEGIN');

		// Step 1: Delete the failed migration record
		console.log('1. Removing failed migration record...');
		await pool.query(`DELETE FROM migrations WHERE id = '006_update_subscription_tiers'`);

		// Step 2: Drop the existing constraint
		console.log('2. Dropping existing constraint...');
		await pool.query(`ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_subscription_tier_check`);

		// Step 3: Update existing tier values
		console.log('3. Updating subscription tier values...');
		await pool.query(`
			UPDATE "user"
			SET subscription_tier = CASE
				WHEN subscription_tier = 'free' THEN 'applicant'
				WHEN subscription_tier = 'professional' THEN 'candidate'
				WHEN subscription_tier = 'premium' THEN 'executive'
				WHEN subscription_tier IS NULL THEN 'applicant'
				ELSE subscription_tier
			END
		`);

		// Step 4: Add the new constraint
		console.log('4. Adding new constraint...');
		await pool.query(`
			ALTER TABLE "user"
			ADD CONSTRAINT user_subscription_tier_check
			CHECK (subscription_tier IN ('applicant', 'candidate', 'executive'))
		`);

		// Step 5: Add usage tracking columns
		console.log('5. Adding usage tracking columns...');
		await pool.query(`
			ALTER TABLE "user"
			ADD COLUMN IF NOT EXISTS monthly_optimizations_used INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS monthly_ats_reports_used INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS active_job_applications INTEGER DEFAULT 0
		`);

		// Step 6: Create usage tracking table
		console.log('6. Creating subscription_usage table...');
		await pool.query(`
			CREATE TABLE IF NOT EXISTS subscription_usage (
				id TEXT PRIMARY KEY DEFAULT ('su_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
				user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
				feature TEXT NOT NULL,
				used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				metadata JSONB,
				created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Step 7: Create indexes
		console.log('7. Creating indexes...');
		await pool.query(`
			CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_feature 
			ON subscription_usage(user_id, feature)
		`);
		await pool.query(`
			CREATE INDEX IF NOT EXISTS idx_subscription_usage_used_at 
			ON subscription_usage(used_at)
		`);

		// Step 8: Record successful migration
		console.log('8. Recording successful migration...');
		await pool.query(`
			INSERT INTO migrations (id, filename, checksum, success, executed_at, execution_time_ms)
			VALUES (
				'006_update_subscription_tiers',
				'006_update_subscription_tiers.sql',
				'manual_fix',
				true,
				NOW(),
				0
			)
		`);

		// Commit transaction
		await pool.query('COMMIT');

		console.log('\n✅ Migration fixed successfully!');

		// Show current state
		const result = await pool.query(`
			SELECT subscription_tier, COUNT(*) as count 
			FROM "user" 
			GROUP BY subscription_tier
		`);

		console.log('\nCurrent subscription tier distribution:');
		result.rows.forEach((row) => {
			console.log(`  ${row.subscription_tier}: ${row.count} users`);
		});
	} catch (error) {
		// Rollback on error
		await pool.query('ROLLBACK');
		console.error('❌ Failed to fix migration:', error.message);
		process.exit(1);
	} finally {
		// Close the pool
		await pool.end();
	}
}

// Run the fix
fixSubscriptionMigration().catch(console.error);
