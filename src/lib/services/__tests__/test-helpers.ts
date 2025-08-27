import { vi } from 'vitest';
import type { Session } from '$lib/auth';

// Mock session for testing
export const createMockSession = (userId: string = 'test-user-id'): Session => ({
	user: {
		id: userId,
		email: 'test@example.com',
		name: 'Test User',
		emailVerified: true,
		image: null,
		createdAt: new Date(),
		updatedAt: new Date()
	},
	session: {
		id: 'test-session-id',
		userId,
		expiresAt: new Date(Date.now() + 86400000),
		createdAt: new Date(),
		updatedAt: new Date(),
		token: 'test-token',
		ipAddress: '127.0.0.1',
		userAgent: 'test-agent'
	}
});

// Mock database functions
export const createMockDb = () => ({
	getUserResume: vi.fn(),
	createUserResume: vi.fn(),
	updateUserResume: vi.fn(),
	deleteUserResume: vi.fn(),
	getJob: vi.fn(),
	createUserJob: vi.fn(),
	updateJob: vi.fn(),
	updateJobStatus: vi.fn(),
	updateJobNotes: vi.fn(),
	deleteJob: vi.fn(),
	getJobDocuments: vi.fn(),
	createJobDocument: vi.fn(),
	getDocument: vi.fn(),
	deleteDocument: vi.fn(),
	getJobActivities: vi.fn(),
	createActivity: vi.fn(),
	jobs: {
		list: vi.fn()
	},
	transaction: vi.fn((callback) =>
		callback({
			createUserJob: vi.fn(),
			updateJob: vi.fn(),
			updateJobStatus: vi.fn(),
			updateJobNotes: vi.fn(),
			createJobDocument: vi.fn(),
			createActivity: vi.fn()
		})
	)
});

// Mock pool for database connections
export const createMockPool = () => ({
	query: vi.fn(),
	end: vi.fn(),
	connect: vi.fn()
});

// Mock AI functions
export const createMockAI = () => ({
	extractResume: vi.fn(),
	extractJob: vi.fn(),
	optimizeResume: vi.fn(),
	generateCoverLetter: vi.fn(),
	fetchJobContent: vi.fn()
});

// Mock request event for SvelteKit
export const createMockRequestEvent = (session?: Session | null) => ({
	request: {
		headers: new Headers({
			'content-type': 'application/json'
		})
	},
	locals: {
		user: session?.user || null
	},
	setHeaders: vi.fn(),
	cookies: {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
		serialize: vi.fn()
	},
	url: new URL('http://localhost'),
	params: {},
	route: { id: '/' },
	isDataRequest: false,
	platform: undefined
});

// Mock form data
export const createMockFormData = (data: Record<string, any> = {}) => {
	const formData = new FormData();
	Object.entries(data).forEach(([key, value]) => {
		if (value instanceof File) {
			formData.append(key, value);
		} else if (value !== null && value !== undefined) {
			formData.append(key, String(value));
		}
	});
	return formData;
};

// Mock file
export const createMockFile = (
	content: string,
	filename: string = 'test.pdf',
	type: string = 'application/pdf'
): File => {
	const blob = new Blob([content], { type });
	return new File([blob], filename, { type });
};

// Sample resume data for testing
export const sampleResumeData = {
	contactInfo: {
		fullName: 'John Doe',
		email: 'john@example.com',
		phone: '+1234567890',
		address: 'San Francisco, CA',
		links: [
			{ name: 'LinkedIn', url: 'https://linkedin.com/in/johndoe' },
			{ name: 'GitHub', url: 'https://github.com/johndoe' }
		]
	},
	summary: 'Experienced software engineer with expertise in web development',
	workExperience: [
		{
			position: 'Senior Software Engineer',
			company: 'Tech Corp',
			startDate: '2020-01',
			endDate: '2024-01',
			isCurrent: false,
			description: 'Led development of microservices architecture',
			responsibilities: [
				'Designed and implemented RESTful APIs',
				'Mentored junior developers',
				'Reduced system latency by 40%'
			]
		}
	],
	education: [
		{
			degree: 'Bachelor of Science',
			fieldOfStudy: 'Computer Science',
			institution: 'University of California',
			graduationDate: '2019',
			gpa: '3.8',
			honors: ['Cum Laude']
		}
	],
	certifications: [
		{
			name: 'AWS Certified Solutions Architect',
			issuer: 'Amazon Web Services',
			dateObtained: '2022-06'
		}
	],
	skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS']
};

// Sample job data for testing
export const sampleJobData = {
	company: 'Example Corp',
	title: 'Software Engineer',
	description: 'We are looking for a talented software engineer...',
	salary: '$120,000 - $150,000',
	location: ['San Francisco, CA', 'Remote'],
	responsibilities: [
		'Develop web applications',
		'Collaborate with product team',
		'Write clean, maintainable code'
	],
	qualifications: ['3+ years of experience', 'Strong JavaScript skills', 'Experience with React'],
	logistics: ['Full-time', 'Hybrid work'],
	additionalInfo: ['Great benefits', 'Stock options'],
	link: 'https://example.com/jobs/123'
};

// Error helpers for testing
export class TestError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'TestError';
	}
}

// Async delay helper for testing
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
