export interface Link {
	name: string;
	url: string;
}

export interface ContactInfo {
	fullName: string;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
	links: Link[];
}

export interface WorkExperience {
	company: string;
	position: string;
	startDate?: string | null;
	endDate?: string | null;
	isCurrent?: boolean;
	description?: string | null;
	responsibilities: string[];
	skills: string[];
}

export interface Education {
	institution: string;
	degree: string;
	fieldOfStudy?: string | null;
	graduationDate?: string | null;
	gpa?: number | null;
	honors: string[];
	relevantCourses: string[];
	skills: string[];
}

export interface Certification {
	name: string;
	issuer?: string | null;
	dateObtained?: string | null;
	expirationDate?: string | null;
	credentialId?: string | null;
}

export interface Resume {
	contactInfo: ContactInfo;
	summary?: string | null;
	workExperience: WorkExperience[];
	education: Education[];
	certifications: Certification[];
	skills: string[];
}
