import { DATABASE_URL } from '$env/static/private';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { Pool } from 'pg';

export const auth = betterAuth({
	database: new Pool({
		connectionString: DATABASE_URL
	}),
	plugins: [sveltekitCookies(getRequestEvent)],
	emailAndPassword: {
		enabled: true
	}
});
