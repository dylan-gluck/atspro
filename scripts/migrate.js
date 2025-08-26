#!/usr/bin/env node

/**
 * Database Migration Script
 *
 * This script manages database migrations by:
 * 1. Creating a migrations tracking table if it doesn't exist
 * 2. Reading all migration files from the migrations directory
 * 3. Checking which migrations have already been applied
 * 4. Running new migrations in order
 * 5. Recording migration execution in the tracking table
 *
 * Usage:
 *   bun run migrate          # Run all pending migrations
 *   bun run migrate:status   # Show migration status
 *   bun run migrate:rollback # Rollback last migration (if supported)
 */

import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m'
};

// Database connection
const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

/**
 * Calculate SHA256 checksum of file content
 */
async function calculateChecksum(content) {
	return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
	const migrationTableSQL = `
		CREATE TABLE IF NOT EXISTS migrations (
			id VARCHAR(255) PRIMARY KEY,
			filename VARCHAR(255) NOT NULL UNIQUE,
			checksum VARCHAR(64) NOT NULL,
			executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			execution_time_ms INTEGER,
			success BOOLEAN NOT NULL DEFAULT true,
			error_message TEXT,
			rolled_back BOOLEAN NOT NULL DEFAULT false,
			rolled_back_at TIMESTAMP WITH TIME ZONE
		);

		CREATE INDEX IF NOT EXISTS idx_migrations_filename ON migrations(filename);
		CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations(executed_at DESC);
	`;

	try {
		await pool.query(migrationTableSQL);
		console.log(`${colors.green}✓${colors.reset} Migrations table ready`);
	} catch (error) {
		console.error(
			`${colors.red}✗ Failed to create migrations table:${colors.reset}`,
			error.message
		);
		throw error;
	}
}

/**
 * Get list of all migration files
 */
async function getMigrationFiles() {
	const migrationsDir = path.join(__dirname, '..', 'migrations');

	try {
		const files = await fs.readdir(migrationsDir);
		return files
			.filter((file) => file.endsWith('.sql'))
			.sort() // Sort by filename (which includes numeric prefix)
			.map((filename) => ({
				filename,
				filepath: path.join(migrationsDir, filename),
				id: filename.replace('.sql', '')
			}));
	} catch (error) {
		console.error(
			`${colors.red}✗ Failed to read migrations directory:${colors.reset}`,
			error.message
		);
		throw error;
	}
}

/**
 * Get list of applied migrations from database
 */
async function getAppliedMigrations() {
	try {
		const result = await pool.query(`
			SELECT id, filename, checksum, executed_at, success
			FROM migrations
			WHERE success = true AND rolled_back = false
			ORDER BY filename ASC
		`);
		return result.rows;
	} catch (error) {
		// Table might not exist yet
		if (error.code === '42P01') {
			return [];
		}
		throw error;
	}
}

/**
 * Run a single migration
 */
async function runMigration(migration) {
	const startTime = Date.now();
	const client = await pool.connect();

	console.log(
		`${colors.cyan}→${colors.reset} Running migration: ${colors.bright}${migration.filename}${colors.reset}`
	);

	try {
		// Read migration file
		const content = await fs.readFile(migration.filepath, 'utf8');
		const checksum = await calculateChecksum(content);

		// Check if this migration should be skipped (for initial setup)
		if (
			migration.filename.includes('create_betterauth_tables') ||
			migration.filename.includes('create_atspro_tables')
		) {
			// Check if main tables already exist
			const tableCheck = await client.query(`
				SELECT EXISTS (
					SELECT FROM information_schema.tables 
					WHERE table_schema = 'public' 
					AND table_name = 'user'
				) as user_exists,
				EXISTS (
					SELECT FROM information_schema.tables 
					WHERE table_schema = 'public' 
					AND table_name = 'userJobs'
				) as jobs_exists
			`);

			if (tableCheck.rows[0].user_exists && tableCheck.rows[0].jobs_exists) {
				// Tables already exist, mark migration as already applied
				await pool.query(
					`
					INSERT INTO migrations (id, filename, checksum, execution_time_ms, success)
					VALUES ($1, $2, $3, 0, true)
					ON CONFLICT (filename) DO NOTHING
				`,
					[migration.id, migration.filename, checksum]
				);

				console.log(`${colors.yellow}⚠${colors.reset} Migration skipped (tables already exist)`);
				return { success: true, executionTime: 0, skipped: true };
			}
		}

		// Start transaction
		await client.query('BEGIN');

		// Execute migration
		await client.query(content);

		// Record migration in tracking table
		const executionTime = Date.now() - startTime;
		await client.query(
			`
			INSERT INTO migrations (id, filename, checksum, execution_time_ms, success)
			VALUES ($1, $2, $3, $4, true)
		`,
			[migration.id, migration.filename, checksum, executionTime]
		);

		// Commit transaction
		await client.query('COMMIT');

		console.log(`${colors.green}✓${colors.reset} Migration completed in ${executionTime}ms`);

		return { success: true, executionTime };
	} catch (error) {
		// Rollback transaction
		await client.query('ROLLBACK');

		// Try to record failed migration
		try {
			await pool.query(
				`
				INSERT INTO migrations (id, filename, checksum, execution_time_ms, success, error_message)
				VALUES ($1, $2, $3, $4, false, $5)
				ON CONFLICT (filename) DO UPDATE
				SET error_message = $5, success = false
			`,
				[migration.id, migration.filename, 'error', Date.now() - startTime, error.message]
			);
		} catch (recordError) {
			// Ignore error recording failures
		}

		console.error(`${colors.red}✗ Migration failed:${colors.reset}`, error.message);
		return { success: false, error: error.message };
	} finally {
		client.release();
	}
}

/**
 * Show migration status
 */
async function showStatus() {
	console.log(`\n${colors.bright}Migration Status${colors.reset}`);
	console.log('='.repeat(50));

	const allMigrations = await getMigrationFiles();
	const appliedMigrations = await getAppliedMigrations();
	const appliedMap = new Map(appliedMigrations.map((m) => [m.filename, m]));

	let pendingCount = 0;

	for (const migration of allMigrations) {
		const applied = appliedMap.get(migration.filename);
		if (applied) {
			const date = new Date(applied.executed_at).toLocaleString();
			console.log(`${colors.green}✓${colors.reset} ${migration.filename} (applied: ${date})`);
		} else {
			console.log(`${colors.yellow}○${colors.reset} ${migration.filename} (pending)`);
			pendingCount++;
		}
	}

	console.log('='.repeat(50));
	console.log(
		`Total: ${allMigrations.length} | Applied: ${appliedMigrations.length} | Pending: ${pendingCount}\n`
	);

	return pendingCount;
}

/**
 * Main migration runner
 */
async function migrate() {
	console.log(`\n${colors.bright}Database Migration${colors.reset}`);
	console.log('='.repeat(50));

	try {
		// Ensure migrations table exists
		await createMigrationsTable();

		// Get all migrations and check which are applied
		const allMigrations = await getMigrationFiles();
		const appliedMigrations = await getAppliedMigrations();
		const appliedFilenames = new Set(appliedMigrations.map((m) => m.filename));

		// Filter pending migrations
		const pendingMigrations = allMigrations.filter((m) => !appliedFilenames.has(m.filename));

		if (pendingMigrations.length === 0) {
			console.log(`${colors.green}✓${colors.reset} All migrations are up to date!`);
			return;
		}

		console.log(
			`Found ${colors.yellow}${pendingMigrations.length}${colors.reset} pending migration(s)\n`
		);

		// Run each pending migration
		let successCount = 0;
		let failCount = 0;

		for (const migration of pendingMigrations) {
			const result = await runMigration(migration);
			if (result.success) {
				successCount++;
			} else {
				failCount++;
				// Stop on first failure
				break;
			}
		}

		// Summary
		console.log('\n' + '='.repeat(50));
		if (failCount > 0) {
			console.log(`${colors.red}✗ Migration failed!${colors.reset}`);
			console.log(`Completed: ${successCount} | Failed: ${failCount}`);
			process.exit(1);
		} else {
			console.log(`${colors.green}✓ All migrations completed successfully!${colors.reset}`);
			console.log(`Completed: ${successCount} migration(s)`);
		}
	} catch (error) {
		console.error(`${colors.red}✗ Migration error:${colors.reset}`, error.message);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

/**
 * Rollback last migration (if rollback SQL is provided)
 */
async function rollback() {
	console.log(`\n${colors.bright}Migration Rollback${colors.reset}`);
	console.log('='.repeat(50));

	try {
		// Get last successful migration
		const result = await pool.query(`
			SELECT id, filename
			FROM migrations
			WHERE success = true AND rolled_back = false
			ORDER BY executed_at DESC
			LIMIT 1
		`);

		if (result.rows.length === 0) {
			console.log(`${colors.yellow}No migrations to rollback${colors.reset}`);
			return;
		}

		const migration = result.rows[0];
		console.log(
			`${colors.yellow}⚠ Rollback not implemented for: ${migration.filename}${colors.reset}`
		);
		console.log('Manual rollback may be required.');
	} catch (error) {
		console.error(`${colors.red}✗ Rollback error:${colors.reset}`, error.message);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

// Parse command line arguments
const command = process.argv[2];

switch (command) {
	case 'status':
		await showStatus();
		await pool.end();
		break;
	case 'rollback':
		await rollback();
		break;
	default:
		await migrate();
		break;
}
