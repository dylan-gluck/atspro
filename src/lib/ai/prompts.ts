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
1. Rewriting section content for better ATS readability
2. Incorporating key terminology from the job description throughout
3. Reformatting any elements that might cause parsing issues
4. Enhancing content to emphasize relevant skills and experiences
Maintain authenticity while optimizing for ATS systems.`,

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
Focus on job-relevant insights.`,

	// ATS keyword extraction - new prompt
	extractKeywords: `Extract critical keywords for ATS matching:
Required skills, technologies, certifications, industry terms, soft skills, experience levels.
Return as structured list.`,

	// ATS scoring - new prompt
	scoreATS: `ATS scoring expert. Analyze resume-job match:
Keyword coverage, formatting compliance, section completeness, quantified achievements.
Return detailed analysis.`,

	// Industry-specific scoring
	industryScoring: `Industry expert. Score resume for specific industry:
Relevant terminology, industry standards, required certifications, domain expertise.
Apply industry-specific weights.`
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
		`Write cover letter:\n\nResume:\n${JSON.stringify(resume, null, 2)}\n\nJob:\n${JSON.stringify(job, null, 2)}`,

	// ATS keyword extraction
	extractKeywords: (jobDescription: string) =>
		`Extract ATS keywords from job:\n\n${jobDescription}`,

	// ATS scoring
	scoreATS: (resume: string, job: string) =>
		`Score resume ATS compatibility:\n\nResume:\n${resume}\n\nJob:\n${job}`,

	// Industry-specific scoring
	industryScoring: (resume: string, job: string, industry: string) =>
		`Score resume for ${industry} industry:\n\nResume:\n${resume}\n\nJob:\n${job}`
};
