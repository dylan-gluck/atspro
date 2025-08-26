import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import type { Resume } from '$lib/types/resume';
import type { UserResume } from '$lib/types/user-resume';
import type { UserJob } from '$lib/types/user-job';
import type { Job } from '$lib/types/job';

// Initialize Anthropic with API key
const anthropic = createAnthropic({
	apiKey: ANTHROPIC_API_KEY
});

// Resume Schema for extraction
const ResumeSchema = z.object({
	contactInfo: z.object({
		fullName: z.string(),
		email: z.string().nullable(),
		phone: z.string().nullable(),
		address: z.string().nullable(),
		links: z.array(
			z.object({
				name: z.string(),
				url: z.string()
			})
		)
	}),
	summary: z.string().nullable(),
	workExperience: z.array(
		z.object({
			company: z.string(),
			position: z.string(),
			startDate: z.string().nullable(),
			endDate: z.string().nullable(),
			isCurrent: z.boolean(),
			description: z.string().nullable(),
			responsibilities: z.array(z.string()),
			skills: z.array(z.string())
		})
	),
	education: z.array(
		z.object({
			institution: z.string(),
			degree: z.string(),
			fieldOfStudy: z.string().nullable(),
			graduationDate: z.string().nullable(),
			gpa: z.number().nullable(),
			honors: z.array(z.string()),
			relevantCourses: z.array(z.string()),
			skills: z.array(z.string())
		})
	),
	certifications: z.array(
		z.object({
			name: z.string(),
			issuer: z.string().nullable(),
			dateObtained: z.string().nullable(),
			expirationDate: z.string().nullable(),
			credentialId: z.string().nullable()
		})
	),
	skills: z.array(z.string())
});

// Job Schema for extraction
const JobSchema = z.object({
	company: z.string(),
	title: z.string(),
	description: z.string(),
	salary: z.string().nullable(),
	responsibilities: z.array(z.string()).nullable(),
	qualifications: z.array(z.string()).nullable(),
	logistics: z.array(z.string()).nullable(),
	location: z.array(z.string()).nullable(),
	additionalInfo: z.array(z.string()).nullable(),
	link: z.string().nullable()
});

// Extract resume from file content
export async function extractResume(content: string | Buffer, fileType: string): Promise<Resume> {
	console.log('[AI extractResume] Starting extraction...');
	console.log('[AI extractResume] File type:', fileType);
	console.log('[AI extractResume] Content type:', typeof content);
	console.log('[AI extractResume] Content length:', content.length);

	const isPDF = fileType === 'application/pdf';
	console.log('[AI extractResume] Is PDF:', isPDF);

	try {
		console.log('[AI extractResume] Calling generateObject with Claude Sonnet...');
		const startTime = Date.now();

		const result = await generateObject({
			model: anthropic('claude-3-5-sonnet-20241022'),
			schema: ResumeSchema,
			messages: [
				{
					role: 'system' as const,
					content:
						'You are an expert resume parser. Extract all information from this resume and return structured data with contact info, summary, work experience, education, certifications, and skills. Be thorough and accurate.'
				},
				{
					role: 'user' as const,
					content: isPDF
						? [
								{
									type: 'text' as const,
									text: 'Extract all information from this resume PDF. Parse every section carefully including contact info, summary, all work experiences, education, certifications, and skills.'
								},
								{
									type: 'file' as const,
									data: content instanceof Buffer ? content : Buffer.from(content),
									mediaType: 'application/pdf' as const
								}
							]
						: [
								{
									type: 'text' as const,
									text: `Extract all information from this resume text. Parse every section carefully including contact info, summary, all work experiences, education, certifications, and skills.\n\nResume:\n${content}`
								}
							]
				}
			],
			output: 'object' as const
		});

		console.log('[AI extractResume] Claude responded after', Date.now() - startTime, 'ms');
		console.log(
			'[AI extractResume] Extracted object:',
			JSON.stringify(result.object).substring(0, 200) + '...'
		);

		return result.object;
	} catch (error) {
		console.error('[AI extractResume] Error during extraction:', error);
		throw error;
	}
}

// Extract job from content
export async function extractJob(content: string): Promise<Job> {
	const result = await generateObject({
		model: anthropic('claude-3-5-sonnet-20241022'),
		schema: JobSchema,
		messages: [
			{
				role: 'system' as const,
				content:
					'You are an expert job posting analyzer. Extract all relevant information from job postings including company, title, description, salary, responsibilities, qualifications, logistics, location, and any additional information.'
			},
			{
				role: 'user' as const,
				content: [
					{
						type: 'text' as const,
						text: `Extract all information from this job posting. Be thorough and capture all details about the position, requirements, and company.\n\nJob Posting:\n${content}`
					}
				]
			}
		],
		output: 'object' as const
	});

	return result.object;
}

// Optimize resume for job
export async function optimizeResume(
	resume: UserResume | Resume,
	job: UserJob | Job
): Promise<Resume & { score: number; keywords: string[] }> {
	const result = await generateObject({
		model: anthropic('claude-3-5-sonnet-20241022'),
		schema: ResumeSchema.extend({
			score: z.number().min(0).max(100),
			keywords: z.array(z.string())
		}),
		messages: [
			{
				role: 'system' as const,
				content: `You are an expert ATS (Applicant Tracking System) optimization specialist. Your task is to optimize resumes to maximize their compatibility with ATS systems while maintaining authenticity.

Transform the resume by:
1. Rewriting section content for optimal ATS parsing and readability
2. Incorporating key terminology and keywords from the job description naturally throughout
3. Reformatting any elements that might cause ATS parsing issues
4. Enhancing content to emphasize relevant skills, experiences, and achievements
5. Ensuring all dates are in consistent, ATS-friendly format
6. Using industry-standard section headings
7. Quantifying achievements where possible

Maintain the authenticity and truthfulness of all experiences while optimizing for ATS systems.`
			},
			{
				role: 'user' as const,
				content: [
					{
						type: 'text' as const,
						text: `Optimize this resume for the given job description. Include an ATS compatibility score (0-100) and list the most important keywords incorporated.

Resume:
${JSON.stringify(resume, null, 2)}

Job Description:
${JSON.stringify(job, null, 2)}`
					}
				]
			}
		],
		output: 'object' as const
	});

	return result.object;
}

// Generate cover letter
export async function generateCoverLetter(
	resume: UserResume | Resume,
	job: UserJob | Job,
	tone: 'professional' | 'enthusiastic' | 'conversational' = 'professional'
): Promise<string> {
	const toneMap = {
		professional: 'formal and professional',
		enthusiastic: 'energetic and passionate',
		conversational: 'friendly yet professional'
	};

	const result = await generateText({
		model: anthropic('claude-3-5-sonnet-20241022'),
		messages: [
			{
				role: 'system' as const,
				content: `You are an expert cover letter writer who creates compelling, personalized cover letters that are ${toneMap[tone]}. Write cover letters that:

1. Demonstrate clear understanding of the company and role
2. Highlight relevant experiences and achievements from the resume
3. Show enthusiasm and cultural fit
4. Include specific examples and quantifiable results
5. Follow professional business letter format
6. Maintain the specified tone throughout
7. End with a strong call to action

The cover letter should be concise (250-400 words) and impactful.`
			},
			{
				role: 'user' as const,
				content: `Write a compelling cover letter for this job application:

Resume:
${JSON.stringify(resume, null, 2)}

Job:
${JSON.stringify(job, null, 2)}`
			}
		]
	});

	return result.text;
}

// Fetch job content from URL
export async function fetchJobContent(url: string): Promise<string> {
	const response = await fetch(url);
	const html = await response.text();

	// Basic HTML stripping
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
