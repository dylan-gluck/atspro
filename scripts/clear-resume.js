import { Pool } from 'pg';

const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

async function clearResume() {
	try {
		const result = await pool.query(
			`DELETE FROM "userResume" WHERE "userId" = 'uhEoGIi5hsL7DloSeo7sLlXsx43zd7bH'`
		);
		console.log('Deleted', result.rowCount, 'resume(s)');
		await pool.end(); // Close the pool properly
		process.exit(0);
	} catch (error) {
		console.error('Error deleting resume:', error);
		await pool.end(); // Close the pool properly on error
		process.exit(1);
	}
}

clearResume();
