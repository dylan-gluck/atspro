export interface Job {
	company: string;
	title: string;
	description: string;
	salary?: string | null;
	responsibilities?: string[] | null;
	qualifications?: string[] | null;
	logistics?: string[] | null;
	location?: string[] | null;
	additional_info?: string[] | null;
	link?: string | null;
}

export interface JobDocument {
	type: 'resume' | 'cover' | 'research' | 'prep';
	content: string;
}
