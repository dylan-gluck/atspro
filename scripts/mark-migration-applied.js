#!/usr/bin/env node

/**
 * Mark a migration as applied without running it
 * Useful for existing databases where tables already exist
 */

import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

async function calculateChecksum(content) {
	return crypto.createHash('sha256').update(content).digest('hex');
}

async function markApplied(filename) {
	try {
		const filepath = path.join(__dirname, '..', 'migrations', filename);
		const content = await fs.readFile(filepath, 'utf8');
		const checksum = await calculateChecksum(content);
		const id = filename.replace('.sql', '');

		const result = await pool.query(
			`
			INSERT INTO migrations (id, filename, checksum, execution_time_ms, success)
			VALUES ($1, $2, $3, 0, true)
			ON CONFLICT (filename) DO UPDATE
			SET checksum = $3, success = true
			RETURNING *
		`,
			[id, filename, checksum]
		);

		console.log(`✓ Marked ${filename} as applied`);
		return result.rows[0];
	} catch (error) {
		console.error(`✗ Failed to mark ${filename} as applied:`, error.message);
		throw error;
	}
}

// Mark the betterauth tables migration as applied
await markApplied('000_create_betterauth_tables.sql');
await pool.end();
