import { Session } from '$lib/auth';
import type { Resume } from '$lib/types/resume';
import type { UserJob, JobDocument } from '$lib/types/user-job';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: Session.session;
			user: Session.user;
		}
		interface PageData {
			user?: Session.user;
			session?: Session.session;
			resume?: Resume | null;
			jobs?: UserJob[];
			job?: UserJob;
			documents?: JobDocument[];
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
