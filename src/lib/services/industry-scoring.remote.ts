import { command } from '$app/server';
import * as v from 'valibot';
import { requireAuth } from './utils';
import { detectIndustry, scoreForIndustry } from '$lib/ai';

// Industry detection schema
const detectIndustrySchema = v.object({
	jobDescription: v.string()
});

// Industry scoring schema
const scoreIndustryFitSchema = v.object({
	resumeContent: v.string(),
	jobDescription: v.string(),
	industry: v.optional(v.string())
});

// Detect industry from job description
export const detectJobIndustry = command(detectIndustrySchema, async ({ jobDescription }) => {
	requireAuth();

	try {
		const result = await detectIndustry(jobDescription);
		return {
			success: true,
			...result
		};
	} catch (error) {
		console.error('[detectJobIndustry] Failed:', error);
		return {
			success: false,
			primaryIndustry: 'General',
			relatedIndustries: [],
			confidence: 0
		};
	}
});

// Score resume for industry fit
export const scoreIndustryFit = command(
	scoreIndustryFitSchema,
	async ({ resumeContent, jobDescription, industry }) => {
		requireAuth();

		try {
			const result = await scoreForIndustry(resumeContent, jobDescription, industry);

			// Calculate weighted industry score
			const weightedScore = calculateWeightedScore(result);

			return {
				success: true,
				...result,
				weightedScore,
				industryInsights: generateIndustryInsights(result, industry)
			};
		} catch (error) {
			console.error('[scoreIndustryFit] Failed:', error);

			// Return a basic fallback score
			return {
				success: false,
				score: 50,
				weightedScore: 50,
				industryFit: {
					alignment: 50,
					terminology: [],
					missingElements: ['Unable to perform industry analysis']
				},
				domainExpertise: {
					level: 'intermediate' as const,
					strengths: [],
					gaps: []
				},
				certifications: {
					required: [],
					preferred: [],
					present: []
				},
				recommendations: ['Industry analysis unavailable'],
				industryInsights: []
			};
		}
	}
);

// Calculate weighted score based on industry factors
function calculateWeightedScore(result: any): number {
	const weights = {
		alignment: 0.35,
		expertise: 0.25,
		certifications: 0.2,
		terminology: 0.2
	};

	// Expertise level scoring
	const expertiseScores: Record<string, number> = {
		entry: 25,
		intermediate: 50,
		senior: 75,
		expert: 100
	};

	// Calculate certification score
	const certScore =
		result.certifications.present.length > 0
			? (result.certifications.present.filter((c: string) =>
					result.certifications.required.includes(c)
				).length /
					Math.max(result.certifications.required.length, 1)) *
				100
			: 0;

	// Calculate terminology coverage
	const termScore =
		result.industryFit.terminology.length > 0
			? Math.min((result.industryFit.terminology.length / 10) * 100, 100)
			: 0;

	const expertiseLevel = result.domainExpertise.level as string;
	const expertiseScore = expertiseScores[expertiseLevel] || 50;

	const weightedScore =
		result.industryFit.alignment * weights.alignment +
		expertiseScore * weights.expertise +
		certScore * weights.certifications +
		termScore * weights.terminology;

	return Math.round(weightedScore);
}

// Generate industry-specific insights
function generateIndustryInsights(result: any, industry?: string): string[] {
	const insights = [];

	// Alignment insights
	if (result.industryFit.alignment >= 80) {
		insights.push(`Excellent alignment with ${industry || 'industry'} requirements`);
	} else if (result.industryFit.alignment >= 60) {
		insights.push(`Good fit for ${industry || 'industry'} positions`);
	} else {
		insights.push(`Consider strengthening ${industry || 'industry'}-specific experience`);
	}

	// Expertise insights
	if (result.domainExpertise.level === 'expert') {
		insights.push('Demonstrates deep domain expertise');
	} else if (result.domainExpertise.level === 'senior') {
		insights.push('Shows strong industry experience');
	}

	// Certification insights
	if (result.certifications.required.length > 0) {
		const missingCerts = result.certifications.required.filter(
			(cert: string) => !result.certifications.present.includes(cert)
		);
		if (missingCerts.length > 0) {
			insights.push(`Missing critical certifications: ${missingCerts.join(', ')}`);
		} else {
			insights.push('All required certifications present');
		}
	}

	// Terminology insights
	if (result.industryFit.missingElements.length > 0) {
		insights.push(
			`Add industry terms: ${result.industryFit.missingElements.slice(0, 3).join(', ')}`
		);
	}

	return insights;
}

// Get industry-specific requirements
export const getIndustryRequirements = command(
	v.object({ industry: v.string() }),
	async ({ industry }) => {
		requireAuth();

		// Industry-specific requirements database
		const requirements: Record<string, any> = {
			Technology: {
				criticalSkills: ['Programming', 'Software Development', 'Agile', 'Git'],
				importantCertifications: ['AWS', 'Azure', 'Google Cloud', 'Scrum Master'],
				keyTerms: ['CI/CD', 'DevOps', 'Microservices', 'API', 'Cloud', 'Docker'],
				experienceFactors: ['GitHub contributions', 'Open source', 'Tech stack']
			},
			Healthcare: {
				criticalSkills: ['HIPAA Compliance', 'Patient Care', 'EMR/EHR', 'Clinical'],
				importantCertifications: ['BLS', 'ACLS', 'RN', 'CNA', 'Medical License'],
				keyTerms: ['Patient safety', 'Clinical protocols', 'Healthcare regulations'],
				experienceFactors: ['Clinical hours', 'Patient outcomes', 'Compliance']
			},
			Finance: {
				criticalSkills: ['Financial Analysis', 'Risk Management', 'Compliance', 'Excel'],
				importantCertifications: ['CPA', 'CFA', 'FRM', 'Series 7', 'Series 66'],
				keyTerms: ['ROI', 'P&L', 'Regulatory compliance', 'Portfolio', 'Risk assessment'],
				experienceFactors: ['AUM', 'Deal size', 'Client portfolio', 'Revenue impact']
			},
			Marketing: {
				criticalSkills: ['Digital Marketing', 'SEO/SEM', 'Analytics', 'Content Strategy'],
				importantCertifications: [
					'Google Ads',
					'Google Analytics',
					'HubSpot',
					'Facebook Blueprint'
				],
				keyTerms: ['ROI', 'KPI', 'Conversion', 'CTR', 'CAC', 'LTV', 'Funnel'],
				experienceFactors: ['Campaign performance', 'Lead generation', 'Brand growth']
			},
			Education: {
				criticalSkills: ['Curriculum Development', 'Classroom Management', 'Assessment'],
				importantCertifications: ['Teaching License', 'Special Education', 'ESL/TESOL'],
				keyTerms: ['Differentiated instruction', 'Student outcomes', 'IEP', 'Common Core'],
				experienceFactors: ['Student achievement', 'Class size', 'Grade levels']
			},
			Manufacturing: {
				criticalSkills: ['Lean Manufacturing', 'Six Sigma', 'Quality Control', 'Safety'],
				importantCertifications: ['Six Sigma', 'PMP', 'OSHA', 'ISO 9001'],
				keyTerms: ['Lean', 'Kaizen', 'JIT', 'SPC', 'TPM', 'OEE', '5S'],
				experienceFactors: ['Production volume', 'Quality metrics', 'Cost reduction']
			}
		};

		return (
			requirements[industry] || {
				criticalSkills: [],
				importantCertifications: [],
				keyTerms: [],
				experienceFactors: []
			}
		);
	}
);
