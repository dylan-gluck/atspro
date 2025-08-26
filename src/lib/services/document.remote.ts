import { query, form, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/db';
import {
	optimizeResume as optimizeResumeWithAI,
	generateCoverLetter as generateCoverLetterWithAI
} from '$lib/ai';
import { requireAuth, checkRateLimitV2, ErrorCodes, measurePerformance } from './utils';
import { getJob } from './job.remote';
import { calculateATSScore } from './scoring.remote';

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

	// Apply tier-based rate limiting
	await checkRateLimitV2('resume.optimize');

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

	// Format optimized content - always generate markdown from the structured data
	// Don't use optimized.markdown as it contains analysis/summary from AI
	const markdown = formatOptimizedResume(optimized);
	const html = formatOptimizedResumeAsHTML(optimized);

	// Calculate detailed ATS scores
	const atsAnalysis = await calculateATSScore({
		resumeContent: JSON.stringify(resume),
		jobDescription: JSON.stringify(job),
		optimizedContent: markdown
	});

	// Store document and create activity in a transaction for atomicity
	const doc = await db.transaction(async (tx) => {
		const newDoc = await tx.createJobDocument(jobId, 'resume', html, {
			atsScore: atsAnalysis.optimizedScore || optimized.score,
			originalScore: atsAnalysis.originalScore,
			matchedKeywords: optimized.keywords,
			originalResumeId: resume.id,
			markdown: markdown,
			atsAnalysis: atsAnalysis
		});

		// Create activity
		await tx.createActivity(jobId, 'document_generated', {
			type: 'resume',
			score: optimized.score,
			keywordCount: optimized.keywords.length
		});

		return newDoc;
	});

	// Get all documents for response
	const documents = await db.getJobDocuments(jobId);

	// Refresh job details
	await getJob(jobId).refresh();

	return {
		documentId: doc.id,
		documents,
		optimizationScore: atsAnalysis.optimizedScore || optimized.score,
		originalScore: atsAnalysis.originalScore,
		matchedKeywords: optimized.keywords,
		version: doc.version,
		atsAnalysis: atsAnalysis,
		recommendations: atsAnalysis.recommendations
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

		// Apply tier-based rate limiting
		await checkRateLimitV2('cover-letter.generate');

		// Verify ownership and get data
		const [resume, job] = await Promise.all([db.getUserResume(userId), db.getJob(jobId)]);

		if (!resume) {
			error(404, 'No resume found. Please upload a resume first.');
		}

		if (!job || job.userId !== userId) {
			error(404, 'Job not found');
		}

		// Generate with AI
		const coverLetterMarkdown = await measurePerformance('generate_cover_letter', async () => {
			return await generateCoverLetterWithAI(resume, job, tone);
		});

		// Convert markdown to HTML
		const { marked } = await import('marked');
		const coverLetterHTML = await marked(coverLetterMarkdown);

		// Store document and create activity in a transaction for atomicity
		const doc = await db.transaction(async (tx) => {
			const newDoc = await tx.createJobDocument(jobId, 'cover', coverLetterHTML, {
				tone,
				generatedFrom: {
					resumeId: resume.id,
					jobId: job.id
				},
				markdown: coverLetterMarkdown
			});

			// Create activity
			await tx.createActivity(jobId, 'document_generated', {
				type: 'cover',
				tone
			});

			return newDoc;
		});

		// Refresh job details
		await getJob(jobId).refresh();

		return {
			documentId: doc.id,
			type: 'cover',
			content: coverLetterHTML,
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

	// Apply tier-based rate limiting for AI analysis
	await checkRateLimitV2('ai.analyze');

	// Get job details
	const job = await db.getJob(jobId);
	if (!job || job.userId !== userId) {
		error(404, 'Job not found');
	}

	// Generate research content (markdown)
	const researchMarkdown = await generateCompanyResearchContent(job);

	// Convert markdown to HTML
	const { marked } = await import('marked');
	const researchHTML = await marked(researchMarkdown);

	// Store document and create activity in a transaction for atomicity
	const doc = await db.transaction(async (tx) => {
		const newDoc = await tx.createJobDocument(jobId, 'research', researchHTML, {
			company: job.company,
			generatedAt: new Date().toISOString(),
			markdown: researchMarkdown
		});

		// Create activity
		await tx.createActivity(jobId, 'document_generated', {
			type: 'research',
			company: job.company
		});

		return newDoc;
	});

	// Refresh job details
	await getJob(jobId).refresh();

	return {
		documentId: doc.id,
		type: 'research',
		content: researchHTML,
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

// Helper function to format optimized resume as HTML
function formatOptimizedResumeAsHTML(optimized: any): string {
	const { contactInfo, summary, workExperience, education, certifications, skills } = optimized;

	let html = `<div class="resume">`;
	html += `<header class="resume-header">`;
	html += `<h1>${contactInfo.fullName}</h1>`;
	html += `<div class="contact-info">`;

	if (contactInfo.email) html += `<span>Email: ${contactInfo.email}</span>`;
	if (contactInfo.phone) html += `<span>Phone: ${contactInfo.phone}</span>`;
	if (contactInfo.address) html += `<span>Location: ${contactInfo.address}</span>`;

	html += `</div>`;

	if (contactInfo.links?.length > 0) {
		html += `<div class="links">`;
		contactInfo.links.forEach((link: any) => {
			html += `<a href="${link.url}" target="_blank">${link.name}</a>`;
		});
		html += `</div>`;
	}
	html += `</header>`;

	if (summary) {
		html += `<section class="resume-section"><h2>Summary</h2><p>${summary}</p></section>`;
	}

	if (workExperience?.length > 0) {
		html += `<section class="resume-section"><h2>Work Experience</h2>`;
		workExperience.forEach((exp: any) => {
			html += `<div class="experience-item">`;
			html += `<h3>${exp.position} at ${exp.company}</h3>`;
			if (exp.startDate || exp.endDate) {
				html += `<p class="dates">${exp.startDate || ''} - ${exp.isCurrent ? 'Present' : exp.endDate || ''}</p>`;
			}
			if (exp.description) {
				html += `<p>${exp.description}</p>`;
			}
			if (exp.responsibilities?.length > 0) {
				html += `<ul>`;
				exp.responsibilities.forEach((resp: string) => {
					html += `<li>${resp}</li>`;
				});
				html += `</ul>`;
			}
			html += `</div>`;
		});
		html += `</section>`;
	}

	if (education?.length > 0) {
		html += `<section class="resume-section"><h2>Education</h2>`;
		education.forEach((edu: any) => {
			html += `<div class="education-item">`;
			html += `<h3>${edu.degree} in ${edu.fieldOfStudy || 'General Studies'}</h3>`;
			html += `<p>${edu.institution}`;
			if (edu.graduationDate) html += ` - ${edu.graduationDate}`;
			html += `</p>`;
			if (edu.gpa) html += `<p>GPA: ${edu.gpa}</p>`;
			if (edu.honors?.length > 0) {
				html += `<p>Honors: ${edu.honors.join(', ')}</p>`;
			}
			html += `</div>`;
		});
		html += `</section>`;
	}

	if (certifications?.length > 0) {
		html += `<section class="resume-section"><h2>Certifications</h2><ul>`;
		certifications.forEach((cert: any) => {
			html += `<li><strong>${cert.name}</strong> - ${cert.issuer}`;
			if (cert.dateObtained) html += ` (${cert.dateObtained})`;
			html += `</li>`;
		});
		html += `</ul></section>`;
	}

	if (skills?.length > 0) {
		html += `<section class="resume-section"><h2>Skills</h2><p>${skills.join(', ')}</p></section>`;
	}

	html += `</div>`;
	return html;
}

// Helper function to generate company research with AI
async function generateCompanyResearchContent(job: any): Promise<string> {
	// Import AI functions
	const { generateText } = await import('ai');
	const { createAnthropic } = await import('@ai-sdk/anthropic');
	const { ANTHROPIC_API_KEY } = await import('$env/static/private');
	const { selectModel } = await import('$lib/ai/model-selector');
	const { SYSTEM_PROMPTS } = await import('$lib/ai/prompts');

	const anthropic = createAnthropic({
		apiKey: ANTHROPIC_API_KEY
	});

	// Use model selector for cost optimization - research can use cheaper model
	const modelConfig = selectModel('company_research');
	console.log(`[AI generateCompanyResearch] Using model: ${modelConfig.name}`);

	try {
		// Generate comprehensive research using AI
		const result = await generateText({
			model: anthropic(modelConfig.name),
			messages: [
				{
					role: 'system' as const,
					content: SYSTEM_PROMPTS.companyResearch
				},
				{
					role: 'user' as const,
					content: `Generate a comprehensive research document for this job opportunity:

Company: ${job.company}
Role: ${job.title}
Description: ${job.description}
Location: ${job.location?.join(', ') || 'Not specified'}
Salary: ${job.salary || 'Not disclosed'}
Qualifications: ${job.qualifications?.join('\n') || 'Not specified'}

Provide actionable insights that would help a candidate succeed in their application and interview process.`
				}
			]
		});

		return result.text;
	} catch (error) {
		console.error('Error generating company research:', error);
		// Fallback to template if AI fails
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
}
