import { Session } from '$lib/auth';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: Session.session;
			user: Session.user;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
