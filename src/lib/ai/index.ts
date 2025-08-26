import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { ANTHROPIC_API_KEY } from '$env/static/private';
// OPENAI_API_KEY is optional - only needed if using OpenAI models
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
import type { Resume } from '$lib/types/resume';
import type { UserResume } from '$lib/types/user-resume';
import type { UserJob } from '$lib/types/user-job';
import type { Job } from '$lib/types/job';
import { selectModel, usageTracker } from './model-selector';
import type { AITask } from './types';
import { resumeCache, jobCache, optimizationCache, coverLetterCache } from './cache';

// Initialize AI providers
const anthropic = createAnthropic({
	apiKey: ANTHROPIC_API_KEY
});

const openai = createOpenAI({
	apiKey: OPENAI_API_KEY || 'sk-dummy' // Use dummy key if not configured
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

	// Create cache key from content hash
	const cacheKey = {
		content: content.toString().substring(0, 1000), // Use first 1000 chars for cache key
		fileType,
		isPDF
	};

	// Check cache first
	const cached = resumeCache.get(cacheKey);
	if (cached) {
		console.log('[AI extractResume] Cache hit! Returning cached result');
		return cached as Resume;
	}

	try {
		// Use model selector for cost optimization
		const modelConfig = selectModel('extract_resume');
		console.log(
			`[AI extractResume] Cache miss. Using model: ${modelConfig.name} (cost: $${modelConfig.costPerMillion.input}/$${modelConfig.costPerMillion.output} per 1M tokens)`
		);
		const startTime = Date.now();

		const result = await generateObject({
			model: anthropic(modelConfig.name),
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

		// Cache the result
		resumeCache.set(cacheKey, result.object);
		console.log('[AI extractResume] Result cached for future use');

		return result.object;
	} catch (error) {
		console.error('[AI extractResume] Error during extraction:', error);
		throw error;
	}
}

// Extract job from content
export async function extractJob(content: string): Promise<Job> {
	// Create cache key from content hash
	const cacheKey = {
		content: content.substring(0, 1000), // Use first 1000 chars for cache key
		operation: 'extract_job'
	};

	// Check cache first
	const cached = jobCache.get(cacheKey);
	if (cached) {
		console.log('[AI extractJob] Cache hit! Returning cached result');
		return cached as Job;
	}

	// Use model selector for cost optimization
	const modelConfig = selectModel('extract_job');
	console.log(`[AI extractJob] Cache miss. Using model: ${modelConfig.name}`);

	const result = await generateObject({
		model: anthropic(modelConfig.name),
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

	// Cache the result
	jobCache.set(cacheKey, result.object);
	console.log('[AI extractJob] Result cached for future use');

	return result.object;
}

// Optimize resume for job
export async function optimizeResume(
	resume: UserResume | Resume,
	job: UserJob | Job
): Promise<Resume & { score: number; keywords: string[]; markdown?: string }> {
	// Create cache key from resume and job content
	const cacheKey = {
		resumeId: JSON.stringify(resume).substring(0, 500),
		jobId: JSON.stringify(job).substring(0, 500),
		operation: 'optimize_resume'
	};

	// Check cache first
	const cached = optimizationCache.get(cacheKey);
	if (cached) {
		console.log('[AI optimizeResume] Cache hit! Returning cached result');
		return cached as Resume & { score: number; keywords: string[]; markdown?: string };
	}

	// Use model selector - optimization needs the powerful model
	const modelConfig = selectModel('optimize_resume');
	console.log(`[AI optimizeResume] Cache miss. Using model: ${modelConfig.name}`);

	const result = await generateObject({
		model: anthropic(modelConfig.name),
		schema: ResumeSchema.extend({
			score: z.number().min(0).max(100),
			keywords: z.array(z.string()),
			markdown: z.string().optional()
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

	// Cache the result
	optimizationCache.set(cacheKey, result.object);
	console.log('[AI optimizeResume] Result cached for future use');

	return result.object;
}

// Generate cover letter
export async function generateCoverLetter(
	resume: UserResume | Resume,
	job: UserJob | Job,
	tone: 'professional' | 'enthusiastic' | 'conversational' = 'professional'
): Promise<string> {
	// Create cache key from resume, job and tone
	const cacheKey = {
		resumeId: JSON.stringify(resume).substring(0, 500),
		jobId: JSON.stringify(job).substring(0, 500),
		tone,
		operation: 'generate_cover_letter'
	};

	// Check cache first
	const cached = coverLetterCache.get(cacheKey);
	if (cached) {
		console.log('[AI generateCoverLetter] Cache hit! Returning cached result');
		return cached as string;
	}

	const toneMap = {
		professional: 'formal and professional',
		enthusiastic: 'energetic and passionate',
		conversational: 'friendly yet professional'
	};

	// Use model selector - cover letters need the powerful model
	const modelConfig = selectModel('generate_cover_letter');
	console.log(`[AI generateCoverLetter] Cache miss. Using model: ${modelConfig.name}`);

	const result = await generateText({
		model: anthropic(modelConfig.name),
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

	// Cache the result
	coverLetterCache.set(cacheKey, result.text);
	console.log('[AI generateCoverLetter] Result cached for future use');

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
