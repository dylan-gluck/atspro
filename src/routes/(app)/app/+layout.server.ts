import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// // Check if user is authenticated
	// if (!locals.user) {
	// 	redirect(308, '/auth/sign-in');
	// }

	return {
		user: locals.user,
		session: locals.session
	};
};
