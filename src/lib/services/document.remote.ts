import { query, form, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/db';
import {
	optimizeResume as optimizeResumeWithAI,
	generateCoverLetter as generateCoverLetterWithAI
} from '$lib/ai';
import { requireAuth, checkRateLimit, ErrorCodes, measurePerformance } from './utils';
import { getJob } from './job.remote';

// Get document content
export const getDocument = query(v.pipe(v.string(), v.uuid()), async (documentId) => {
	const userId = requireAuth();

	const doc = await db.getDocument(documentId);
	if (!doc) {
		error(404, 'Document not found');
	}

	// Verify ownership through job
	const job = await db.getJob(doc.jobId);
	if (!job || job.userId !== userId) {
		error(403, 'Access denied');
	}

	return doc;
});

// Optimize resume for job
const optimizeSchema = v.object({
	jobId: v.pipe(v.string(), v.uuid())
});

export const optimizeResume = command(optimizeSchema, async ({ jobId }) => {
	const userId = requireAuth();

	// Rate limit: 10 optimizations per hour
	checkRateLimit(userId, 10, 3600000, 'optimize_resume');

	// Verify ownership and get data
	const [resume, job] = await Promise.all([db.getUserResume(userId), db.getJob(jobId)]);

	if (!resume) {
		error(404, 'No resume found. Please upload a resume first.');
	}

	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}

	// Generate optimized resume with AI (with performance tracking)
	const optimized = await measurePerformance('optimize_resume', async () => {
		return await optimizeResumeWithAI(resume, job);
	});

	// Format optimized content as markdown
	const formattedContent = formatOptimizedResume(optimized);

	// Store as document
	const doc = await db.createJobDocument(jobId, 'resume', formattedContent, {
		atsScore: optimized.score,
		matchedKeywords: optimized.keywords,
		originalResumeId: resume.id
	});

	// Create activity
	await db.createActivity(jobId, 'document_generated', {
		type: 'resume',
		score: optimized.score,
		keywordCount: optimized.keywords.length
	});

	// Get all documents for response
	const documents = await db.getJobDocuments(jobId);

	// Refresh job details
	await getJob(jobId).refresh();

	return {
		documentId: doc.id,
		documents,
		optimizationScore: optimized.score,
		matchedKeywords: optimized.keywords,
		version: doc.version
	};
});

// Generate cover letter
const coverLetterSchema = v.object({
	jobId: v.pipe(v.string(), v.uuid()),
	tone: v.optional(v.picklist(['professional', 'enthusiastic', 'conversational']))
});

export const generateCoverLetter = command(
	coverLetterSchema,
	async ({ jobId, tone = 'professional' }) => {
		const userId = requireAuth();

		// Rate limit: 15 cover letters per hour
		checkRateLimit(userId, 15, 3600000, 'generate_cover');

		// Verify ownership and get data
		const [resume, job] = await Promise.all([db.getUserResume(userId), db.getJob(jobId)]);

		if (!resume) {
			error(404, 'No resume found. Please upload a resume first.');
		}

		if (!job || job.userId !== userId) {
			error(404, 'Job not found');
		}

		// Generate with AI
		const coverLetter = await measurePerformance('generate_cover_letter', async () => {
			return await generateCoverLetterWithAI(resume, job, tone);
		});

		// Store document
		const doc = await db.createJobDocument(jobId, 'cover', coverLetter, {
			tone,
			generatedFrom: {
				resumeId: resume.id,
				jobId: job.id
			}
		});

		// Create activity
		await db.createActivity(jobId, 'document_generated', {
			type: 'cover',
			tone
		});

		// Refresh job details
		await getJob(jobId).refresh();

		return {
			documentId: doc.id,
			type: 'cover',
			content: coverLetter,
			version: doc.version,
			tone
		};
	}
);

// Generate company research
const companyResearchSchema = v.object({
	jobId: v.pipe(v.string(), v.uuid())
});

export const generateCompanyResearch = command(companyResearchSchema, async ({ jobId }) => {
	const userId = requireAuth();

	// Rate limit: 5 research documents per hour
	checkRateLimit(userId, 5, 3600000, 'generate_research');

	// Get job details
	const job = await db.getJob(jobId);
	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}

	// Generate research content
	const research = await generateCompanyResearchContent(job);

	// Store document
	const doc = await db.createJobDocument(jobId, 'research', research, {
		company: job.company,
		generatedAt: new Date().toISOString()
	});

	// Create activity
	await db.createActivity(jobId, 'document_generated', {
		type: 'research',
		company: job.company
	});

	// Refresh job details
	await getJob(jobId).refresh();

	return {
		documentId: doc.id,
		type: 'research',
		content: research,
		version: doc.version
	};
});

// Helper function to format optimized resume
function formatOptimizedResume(optimized: any): string {
	const { contactInfo, summary, workExperience, education, certifications, skills } = optimized;

	let content = `# ${contactInfo.fullName}\n\n`;

	if (contactInfo.email) content += `Email: ${contactInfo.email}\n`;
	if (contactInfo.phone) content += `Phone: ${contactInfo.phone}\n`;
	if (contactInfo.address) content += `Location: ${contactInfo.address}\n`;

	if (contactInfo.links?.length > 0) {
		content += '\n';
		contactInfo.links.forEach((link: any) => {
			content += `[${link.name}](${link.url})\n`;
		});
	}

	if (summary) {
		content += `\n## Summary\n${summary}\n`;
	}

	if (workExperience?.length > 0) {
		content += '\n## Work Experience\n';
		workExperience.forEach((exp: any) => {
			content += `\n### ${exp.position} at ${exp.company}\n`;
			if (exp.startDate || exp.endDate) {
				content += `${exp.startDate || ''} - ${exp.isCurrent ? 'Present' : exp.endDate || ''}\n`;
			}
			if (exp.description) {
				content += `\n${exp.description}\n`;
			}
			if (exp.responsibilities?.length > 0) {
				content += '\n';
				exp.responsibilities.forEach((resp: string) => {
					content += `- ${resp}\n`;
				});
			}
		});
	}

	if (education?.length > 0) {
		content += '\n## Education\n';
		education.forEach((edu: any) => {
			content += `\n### ${edu.degree} in ${edu.fieldOfStudy || 'General Studies'}\n`;
			content += `${edu.institution}`;
			if (edu.graduationDate) content += ` - ${edu.graduationDate}`;
			content += '\n';
			if (edu.gpa) content += `GPA: ${edu.gpa}\n`;
			if (edu.honors?.length > 0) {
				content += `Honors: ${edu.honors.join(', ')}\n`;
			}
		});
	}

	if (certifications?.length > 0) {
		content += '\n## Certifications\n';
		certifications.forEach((cert: any) => {
			content += `- **${cert.name}** - ${cert.issuer}`;
			if (cert.dateObtained) content += ` (${cert.dateObtained})`;
			content += '\n';
		});
	}

	if (skills?.length > 0) {
		content += `\n## Skills\n${skills.join(', ')}\n`;
	}

	return content;
}

// Helper function to generate company research
async function generateCompanyResearchContent(job: any): Promise<string> {
	// This would typically call an AI service or web scraping
	// For now, return a structured template
	return `# Company Research: ${job.company}

## About ${job.company}
[Company overview would be generated here based on web research]

## Role: ${job.title}
${job.description}

## Key Requirements
${job.qualifications?.map((q: string) => `- ${q}`).join('\n') || 'No specific requirements listed'}

## Company Culture Insights
[Culture insights would be generated here]

## Interview Preparation Tips
- Research recent company news and developments
- Prepare examples that match the job requirements
- Understand the company's products/services
- Review common interview questions for this role

## Salary Information
${job.salary || 'Salary information not available'}

## Location & Logistics
${job.location?.join(', ') || 'Location not specified'}
${job.logistics?.join('\n') || ''}

## Additional Notes
${job.additionalInfo?.join('\n') || 'No additional information available'}
`;
}
