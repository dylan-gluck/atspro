import type { Resume } from './resume';

// Extended type for userResume table data
export interface UserResume extends Resume {
	id: string;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}