import { Pool } from 'pg';
import { readFileSync } from 'fs';

const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/atspro'
});

async function runMigration() {
	try {
		const sql = readFileSync('./migrations/003_add_markdown_columns.sql', 'utf-8');
		await pool.query(sql);
		console.log('✅ Migration completed successfully');
	} catch (error) {
		console.error('❌ Migration failed:', error);
	} finally {
		await pool.end();
	}
}

runMigration();
