import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// // Check if user is authenticated
	// if (!locals.user) {
	// 	redirect(401, '/auth/sign-in');
	// }

	// For now, skip onboarding check until we have proper database connection
	// TODO: Re-enable once database is connected
	// Check if user needs onboarding (no resume)
	// if (url.pathname !== '/onboarding' && !url.pathname.startsWith('/auth')) {
	// 	try {
	// 		const { db } = await import('$lib/db');
	// 		const resume = await db.getUserResume(locals.user.id);
	// 		if (!resume) {
	// 			redirect(303, '/onboarding');
	// 		}
	// 	} catch (error) {
	// 		console.error('Error checking resume:', error);
	// 	}
	// }

	return {
		user: locals.user,
		session: locals.session
	};
};
