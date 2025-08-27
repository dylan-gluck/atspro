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
import { SYSTEM_PROMPTS, USER_PROMPTS } from './prompts';

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
					content: SYSTEM_PROMPTS.extractResume
				},
				{
					role: 'user' as const,
					content: isPDF
						? [
								{
									type: 'text' as const,
									text: USER_PROMPTS.extractResume.pdf
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
									text: USER_PROMPTS.extractResume.text + content
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
				content: SYSTEM_PROMPTS.extractJob
			},
			{
				role: 'user' as const,
				content: [
					{
						type: 'text' as const,
						text: USER_PROMPTS.extractJob + content
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
				content: SYSTEM_PROMPTS.optimizeResume
			},
			{
				role: 'user' as const,
				content: [
					{
						type: 'text' as const,
						text: USER_PROMPTS.optimizeResume(resume, job)
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

	// Use model selector - cover letters need the powerful model
	const modelConfig = selectModel('generate_cover_letter');
	console.log(`[AI generateCoverLetter] Cache miss. Using model: ${modelConfig.name}`);

	const result = await generateText({
		model: anthropic(modelConfig.name),
		messages: [
			{
				role: 'system' as const,
				content: SYSTEM_PROMPTS.coverLetter[tone]
			},
			{
				role: 'user' as const,
				content: USER_PROMPTS.generateCoverLetter(resume, job)
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

// ATS Keyword Extraction Schema
const KeywordExtractionSchema = z.object({
	requiredSkills: z.array(z.string()),
	technologies: z.array(z.string()),
	certifications: z.array(z.string()),
	industryTerms: z.array(z.string()),
	softSkills: z.array(z.string()),
	experienceLevels: z.array(z.string()),
	actionVerbs: z.array(z.string()),
	criticalPhrases: z.array(z.string())
});

// Extract keywords from job description using AI
export async function extractATSKeywords(jobDescription: string): Promise<{
	requiredSkills: string[];
	technologies: string[];
	certifications: string[];
	industryTerms: string[];
	softSkills: string[];
	experienceLevels: string[];
	actionVerbs: string[];
	criticalPhrases: string[];
}> {
	// Create cache key
	const cacheKey = {
		content: jobDescription.substring(0, 1000),
		operation: 'extract_keywords'
	};

	// Check cache first
	const cached = jobCache.get(cacheKey);
	if (cached) {
		console.log('[AI extractATSKeywords] Cache hit!');
		return cached as any;
	}

	// Use haiku model for extraction (cost-effective)
	const modelConfig = selectModel('extract_keywords');
	console.log(`[AI extractATSKeywords] Using model: ${modelConfig.name}`);

	const result = await generateObject({
		model: anthropic(modelConfig.name),
		schema: KeywordExtractionSchema,
		messages: [
			{
				role: 'system' as const,
				content: SYSTEM_PROMPTS.extractKeywords
			},
			{
				role: 'user' as const,
				content: USER_PROMPTS.extractKeywords(jobDescription)
			}
		],
		output: 'object' as const
	});

	// Cache the result
	jobCache.set(cacheKey, result.object);
	return result.object;
}

// ATS Scoring Analysis Schema
const ATSScoringSchema = z.object({
	score: z.number().min(0).max(100),
	keywordMatch: z.object({
		matched: z.array(z.string()),
		missing: z.array(z.string()),
		percentage: z.number()
	}),
	formatting: z.object({
		score: z.number(),
		issues: z.array(z.string()),
		suggestions: z.array(z.string())
	}),
	sections: z.object({
		present: z.array(z.string()),
		missing: z.array(z.string()),
		quality: z.record(z.string(), z.number())
	}),
	achievements: z.object({
		quantified: z.number(),
		actionVerbs: z.array(z.string()),
		suggestions: z.array(z.string())
	}),
	recommendations: z.array(z.string())
});

// AI-powered ATS scoring
export async function scoreResumewithAI(
	resumeContent: string,
	jobDescription: string
): Promise<{
	score: number;
	keywordMatch: {
		matched: string[];
		missing: string[];
		percentage: number;
	};
	formatting: {
		score: number;
		issues: string[];
		suggestions: string[];
	};
	sections: {
		present: string[];
		missing: string[];
		quality: Record<string, number>;
	};
	achievements: {
		quantified: number;
		actionVerbs: string[];
		suggestions: string[];
	};
	recommendations: string[];
}> {
	// Create cache key
	const cacheKey = {
		resume: resumeContent.substring(0, 500),
		job: jobDescription.substring(0, 500),
		operation: 'score_ats'
	};

	// Check cache first
	const cached = optimizationCache.get(cacheKey);
	if (cached) {
		console.log('[AI scoreResumewithAI] Cache hit!');
		return cached as any;
	}

	// Use haiku model for scoring (cost-effective)
	const modelConfig = selectModel('score_ats');
	console.log(`[AI scoreResumewithAI] Using model: ${modelConfig.name}`);

	const result = await generateObject({
		model: anthropic(modelConfig.name),
		schema: ATSScoringSchema,
		messages: [
			{
				role: 'system' as const,
				content: SYSTEM_PROMPTS.scoreATS
			},
			{
				role: 'user' as const,
				content: USER_PROMPTS.scoreATS(resumeContent, jobDescription)
			}
		],
		output: 'object' as const
	});

	// Cache the result
	optimizationCache.set(cacheKey, result.object);
	return result.object;
}

// Industry Detection Schema
const IndustrySchema = z.object({
	primaryIndustry: z.string(),
	relatedIndustries: z.array(z.string()),
	confidence: z.number().min(0).max(1)
});

// Industry-Specific Scoring Schema
const IndustryScoreSchema = z.object({
	score: z.number().min(0).max(100),
	industryFit: z.object({
		alignment: z.number().min(0).max(100),
		terminology: z.array(z.string()),
		missingElements: z.array(z.string())
	}),
	domainExpertise: z.object({
		level: z.enum(['entry', 'intermediate', 'senior', 'expert']),
		strengths: z.array(z.string()),
		gaps: z.array(z.string())
	}),
	certifications: z.object({
		required: z.array(z.string()),
		preferred: z.array(z.string()),
		present: z.array(z.string())
	}),
	recommendations: z.array(z.string())
});

// Detect industry from job description
export async function detectIndustry(jobDescription: string): Promise<{
	primaryIndustry: string;
	relatedIndustries: string[];
	confidence: number;
}> {
	const cacheKey = {
		content: jobDescription.substring(0, 1000),
		operation: 'detect_industry'
	};

	const cached = jobCache.get(cacheKey);
	if (cached) {
		console.log('[AI detectIndustry] Cache hit!');
		return cached as any;
	}

	const modelConfig = selectModel('industry_detection');
	console.log(`[AI detectIndustry] Using model: ${modelConfig.name}`);

	const result = await generateObject({
		model: anthropic(modelConfig.name),
		schema: IndustrySchema,
		messages: [
			{
				role: 'system' as const,
				content:
					'Industry classifier. Identify primary and related industries from job description.'
			},
			{
				role: 'user' as const,
				content: `Identify industry from job:\n\n${jobDescription}`
			}
		],
		output: 'object' as const
	});

	jobCache.set(cacheKey, result.object);
	return result.object;
}

// Industry-specific scoring
export async function scoreForIndustry(
	resumeContent: string,
	jobDescription: string,
	industry?: string
): Promise<{
	score: number;
	industryFit: {
		alignment: number;
		terminology: string[];
		missingElements: string[];
	};
	domainExpertise: {
		level: 'entry' | 'intermediate' | 'senior' | 'expert';
		strengths: string[];
		gaps: string[];
	};
	certifications: {
		required: string[];
		preferred: string[];
		present: string[];
	};
	recommendations: string[];
}> {
	// Auto-detect industry if not provided
	let targetIndustry = industry;
	if (!targetIndustry) {
		const detected = await detectIndustry(jobDescription);
		targetIndustry = detected.primaryIndustry;
	}

	const cacheKey = {
		resume: resumeContent.substring(0, 500),
		job: jobDescription.substring(0, 500),
		industry: targetIndustry,
		operation: 'industry_score'
	};

	const cached = optimizationCache.get(cacheKey);
	if (cached) {
		console.log('[AI scoreForIndustry] Cache hit!');
		return cached as any;
	}

	const modelConfig = selectModel('industry_scoring');
	console.log(`[AI scoreForIndustry] Using model: ${modelConfig.name} for ${targetIndustry}`);

	const result = await generateObject({
		model: anthropic(modelConfig.name),
		schema: IndustryScoreSchema,
		messages: [
			{
				role: 'system' as const,
				content: SYSTEM_PROMPTS.industryScoring
			},
			{
				role: 'user' as const,
				content: USER_PROMPTS.industryScoring(resumeContent, jobDescription, targetIndustry)
			}
		],
		output: 'object' as const
	});

	optimizationCache.set(cacheKey, result.object);
	return result.object;
}
