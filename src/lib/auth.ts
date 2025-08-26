import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { getPool } from './db/pool';

export const auth = betterAuth({
	database: getPool(),
	plugins: [sveltekitCookies(getRequestEvent)],
	emailAndPassword: {
		enabled: true
	}
});

export type Session = typeof auth.$Infer.Session;
