import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import type { Resume } from '$lib/types/resume';
import type { UserResume } from '$lib/types/user-resume';
import type { UserJob } from '$lib/types/user-job';
import type { Job } from '$lib/types/job';

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
			issuer: z.string(),
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
	const isPDF = fileType === 'application/pdf';

	const result = await generateObject({
		model: openai('gpt-4.1-mini'),
		schema: ResumeSchema,
		system:
			'Extract all information from this resume. Return structured data with contact info, summary, work experience, education, certifications, and skills.',
		prompt: isPDF
			? [
					{
						role: 'user' as const,
						content: [
							{ type: 'text' as const, text: 'Extract information from this resume PDF:' },
							{
								type: 'file' as const,
								data: content, // base64 string or Buffer
								mediaType: 'application/pdf' as const
							}
						]
					}
				]
			: (content as string)
	});

	return result.object;
}

// Extract job from content
export async function extractJob(content: string): Promise<Job> {
	const result = await generateObject({
		model: openai('gpt-4.1-mini'),
		schema: JobSchema,
		system: 'Extract job information',
		prompt: content
	});

	return result.object;
}

// Optimize resume for job
export async function optimizeResume(
	resume: UserResume | Resume,
	job: UserJob | Job
): Promise<Resume & { score: number; keywords: string[] }> {
	const resumeXML = `<resume>${JSON.stringify(resume)}</resume>`;
	const jobXML = `<job_description>${JSON.stringify(job)}</job_description>`;

	const result = await generateObject({
		model: openai('gpt-4.1'),
		schema: ResumeSchema.extend({
			score: z.number().min(0).max(100),
			keywords: z.array(z.string())
		}),
		system: `Create an ATS-optimized version of resume based on job_description:

Please help me transform my resume to maximize ATS compatibility by:
1. Rewriting section content for better ATS readability
2. Incorporating key terminology from the job description throughout
3. Reformatting any elements that might cause parsing issues
4. Enhancing content to emphasize relevant skills and experiences

Please maintain the authenticity of my experience while optimizing for ATS systems.`,
		prompt: `${resumeXML} ${jobXML}`
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
		model: openai('gpt-4.1'),
		system: `Write a compelling cover letter that is ${toneMap[tone]}`,
		prompt: `Resume: ${JSON.stringify(resume)}\n\nJob: ${JSON.stringify(job)}`
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
