import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

/**
 * Singleton database pool instance
 * This ensures we only have one pool across the entire application
 */
let pool: Pool | null = null;

/**
 * Get environment variables lazily to support test environments
 */
function getEnvVars() {
	// In test environment, use process.env directly
	if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
		return {
			DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/atspro_test',
			dev: true
		};
	}

	// In normal environment, import from SvelteKit
	const { DATABASE_URL } = require('$env/static/private');
	const { dev } = require('$app/environment');
	return { DATABASE_URL, dev };
}

/**
 * Get the database pool configuration
 */
function getPoolConfig(): PoolConfig {
	const { DATABASE_URL, dev } = getEnvVars();

	if (!DATABASE_URL) {
		throw new Error('DATABASE_URL environment variable is not set');
	}

	// Parse connection string for better error handling
	const isProduction = !dev;

	return {
		connectionString: DATABASE_URL,
		// Connection pool configuration
		max: isProduction ? 20 : 10, // Maximum number of clients in the pool
		min: isProduction ? 5 : 2, // Minimum number of clients in the pool
		idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
		connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
		maxUses: 7500, // Close and recreate a connection after it has been used 7500 times

		// SSL configuration for production
		...(isProduction && {
			ssl: {
				rejectUnauthorized: false
			}
		}),

		// Better error handling
		application_name: 'atspro-app',

		// Statement timeout to prevent long-running queries
		statement_timeout: 30000, // 30 seconds

		// Query timeout
		query_timeout: 30000 // 30 seconds
	};
}

/**
 * Get or create the singleton database pool
 */
export function getPool(): Pool {
	if (!pool) {
		const config = getPoolConfig();
		pool = new Pool(config);

		// Add error handling for the pool
		pool.on('error', (err: Error) => {
			console.error('Unexpected database pool error:', err);
		});

		// Add connect event listener for debugging
		if (process.env.NODE_ENV === 'development') {
			pool.on('connect', () => {
				console.log('[DB Pool] Client connected');
			});

			pool.on('acquire', () => {
				console.log('[DB Pool] Client acquired from pool');
			});

			pool.on('remove', () => {
				console.log('[DB Pool] Client removed from pool');
			});
		}

		// Log pool creation
		console.log('[DB Pool] Database pool created with config:', {
			max: config.max,
			min: config.min,
			idleTimeoutMillis: config.idleTimeoutMillis,
			connectionTimeoutMillis: config.connectionTimeoutMillis
		});
	}

	return pool;
}

/**
 * Close the database pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
	if (pool) {
		console.log('[DB Pool] Closing database pool...');
		await pool.end();
		pool = null;
		console.log('[DB Pool] Database pool closed');
	}
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
	if (!pool) {
		return null;
	}

	return {
		totalCount: pool.totalCount,
		idleCount: pool.idleCount,
		waitingCount: pool.waitingCount
	};
}

/**
 * Health check for the database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
	try {
		const dbPool = getPool();
		const result = await dbPool.query('SELECT 1 as health');
		return result.rows[0]?.health === 1;
	} catch (error) {
		console.error('Database health check failed:', error);
		return false;
	}
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
	// Handle graceful shutdown
	const shutdown = async (signal: string) => {
		console.log(`[DB Pool] Received ${signal}, starting graceful shutdown...`);
		await closePool();
		process.exit(0);
	};

	// Register shutdown handlers
	process.on('SIGTERM', () => shutdown('SIGTERM'));
	process.on('SIGINT', () => shutdown('SIGINT'));

	// Handle uncaught errors
	process.on('unhandledRejection', (reason, promise) => {
		console.error('[DB Pool] Unhandled Rejection at:', promise, 'reason:', reason);
	});
}
