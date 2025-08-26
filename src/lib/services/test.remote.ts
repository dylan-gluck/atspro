import { query } from '$app/server';

export const testQuery = query(async () => {
	console.log('[testQuery] Called successfully');
	return { message: 'Remote functions are working!' };
});