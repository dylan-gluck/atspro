// Extended type for userJobs table data
export type JobStatus =
	| 'tracked'
	| 'applied'
	| 'interviewing'
	| 'offered'
	| 'rejected'
	| 'withdrawn';

export interface UserJob {
	id: string;
	userId: string;
	company: string;
	title: string;
	description: string;
	salary?: string | null;
	responsibilities?: string[] | null;
	qualifications?: string[] | null;
	logistics?: string[] | null;
	location?: string[] | null;
	additionalInfo?: string[] | null;
	link?: string | null;
	status: JobStatus;
	notes?: string | null;
	appliedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface JobDocument {
	id: string;
	jobId: string;
	type: 'resume' | 'cover' | 'research' | 'prep';
	content: string;
	version: number;
	isActive: boolean;
	metadata?: Record<string, any> | null;
	createdAt: Date;
	updatedAt: Date;
}

export type JobActivityType =
	| 'job_added'
	| 'status_change'
	| 'document_generated'
	| 'note_added'
	| 'applied'
	| 'interview_scheduled'
	| 'offer_received';

export interface JobActivity {
	id: string;
	jobId: string;
	type: JobActivityType;
	description: string;
	metadata?: Record<string, any> | null;
	createdAt: Date;
}
