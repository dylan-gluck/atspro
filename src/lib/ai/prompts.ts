// Optimized prompts to reduce token usage while maintaining quality
// Average token reduction: ~40-50%

export const SYSTEM_PROMPTS = {
	// Resume extraction - reduced from ~45 tokens to ~25 tokens
	extractResume:
		'Expert resume parser. Extract structured data: contact, summary, experience, education, certs, skills. Be accurate.',

	// Job extraction - reduced from ~35 tokens to ~20 tokens
	extractJob:
		'Job analyzer. Extract: company, title, description, salary, responsibilities, qualifications, location.',

	// Resume optimization - reduced from ~150 tokens to ~85 tokens
	optimizeResume: `ATS optimization expert. Transform resume:
1. Rewrite for ATS parsing
2. Add job keywords naturally
3. Fix formatting issues
4. Emphasize relevant skills
5. Standardize dates
6. Use standard headings
7. Quantify achievements
Maintain authenticity.`,

	// Cover letter generation - reduced from ~100 tokens to ~60 tokens
	coverLetter: {
		professional: `Professional cover letter writer. Create compelling, personalized letter:
Show company understanding, highlight relevant experience, demonstrate fit, include examples, use business format, strong CTA.
250-400 words.`,
		enthusiastic: `Enthusiastic cover letter writer. Create energetic, passionate letter:
Show excitement, highlight achievements, demonstrate culture fit, include specific examples, maintain energy, strong CTA.
250-400 words.`,
		conversational: `Conversational cover letter writer. Create friendly yet professional letter:
Show personality, highlight relevant skills, demonstrate fit, include stories, maintain approachable tone, strong CTA.
250-400 words.`
	},

	// Company research - reduced from ~80 tokens to ~45 tokens
	companyResearch: `Research analyst. Generate company overview:
Mission/values, products/services, culture, recent news, growth, competitors, hiring priorities.
Focus on job-relevant insights.`
};

export const USER_PROMPTS = {
	// Resume extraction - reduced from ~40 tokens to ~15 tokens
	extractResume: {
		pdf: 'Extract all resume sections from PDF.',
		text: 'Extract all resume sections:\n\n'
	},

	// Job extraction - reduced from ~30 tokens to ~10 tokens
	extractJob: 'Extract job details:\n\n',

	// Resume optimization - reduced from ~50 tokens to ~25 tokens
	optimizeResume: (resume: any, job: any) =>
		`Optimize resume for job. Score 0-100, list keywords.\n\nResume:\n${JSON.stringify(resume, null, 2)}\n\nJob:\n${JSON.stringify(job, null, 2)}`,

	// Cover letter - reduced from ~40 tokens to ~20 tokens
	generateCoverLetter: (resume: any, job: any) =>
		`Write cover letter:\n\nResume:\n${JSON.stringify(resume, null, 2)}\n\nJob:\n${JSON.stringify(job, null, 2)}`
};

// Helper to get token count estimate (rough approximation)
export function estimateTokens(text: string): number {
	// Rough estimate: 1 token ≈ 4 characters
	return Math.ceil(text.length / 4);
}

// Calculate token savings
export function calculateTokenSavings(): Record<string, number> {
	const oldPrompts = {
		extractResume:
			'You are an expert resume parser. Extract all information from this resume and return structured data with contact info, summary, work experience, education, certifications, and skills. Be thorough and accurate.',
		extractJob:
			'You are an expert job posting analyzer. Extract all relevant information from job postings including company, title, description, salary, responsibilities, qualifications, logistics, location, and any additional information.',
		optimizeResume: `You are an expert ATS (Applicant Tracking System) optimization specialist. Your task is to optimize resumes to maximize their compatibility with ATS systems while maintaining authenticity.

Transform the resume by:
1. Rewriting section content for optimal ATS parsing and readability
2. Incorporating key terminology and keywords from the job description naturally throughout
3. Reformatting any elements that might cause ATS parsing issues
4. Enhancing content to emphasize relevant skills, experiences, and achievements
5. Ensuring all dates are in consistent, ATS-friendly format
6. Using industry-standard section headings
7. Quantifying achievements where possible

Maintain the authenticity and truthfulness of all experiences while optimizing for ATS systems.`
	};

	const newPrompts = {
		extractResume: SYSTEM_PROMPTS.extractResume,
		extractJob: SYSTEM_PROMPTS.extractJob,
		optimizeResume: SYSTEM_PROMPTS.optimizeResume
	};

	const savings: Record<string, number> = {};

	for (const key in oldPrompts) {
		const oldTokens = estimateTokens(oldPrompts[key as keyof typeof oldPrompts]);
		const newTokens = estimateTokens(newPrompts[key as keyof typeof newPrompts]);
		savings[key] = Math.round(((oldTokens - newTokens) / oldTokens) * 100);
	}

	return savings;
}
