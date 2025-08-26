import { command } from '$app/server';
import * as v from 'valibot';
import { requireAuth } from './utils';

// ATS Scoring schema
const calculateATSScoreSchema = v.object({
	resumeContent: v.string(),
	jobDescription: v.string(),
	optimizedContent: v.optional(v.string())
});

export const calculateATSScore = command(
	calculateATSScoreSchema,
	async ({ resumeContent, jobDescription, optimizedContent }) => {
		requireAuth();

		// Parse and analyze original resume
		const originalAnalysis = analyzeContent(resumeContent, jobDescription);

		// Calculate scores
		const originalScore = calculateScore(originalAnalysis);

		// If optimized content provided, analyze it too
		let optimizedScore = 0;
		let optimizedAnalysis = null;
		if (optimizedContent) {
			optimizedAnalysis = analyzeContent(optimizedContent, jobDescription);
			optimizedScore = calculateScore(optimizedAnalysis);
		}

		// Generate recommendations
		const recommendations = generateRecommendations(originalAnalysis, jobDescription);

		return {
			originalScore,
			optimizedScore,
			analysis: {
				original: originalAnalysis,
				optimized: optimizedAnalysis
			},
			recommendations
		};
	}
);

// Analyze content against job description
function analyzeContent(content: string, jobDescription: string) {
	const contentLower = content.toLowerCase();
	const jobLower = jobDescription.toLowerCase();

	// Extract keywords from job description
	const jobKeywords = extractKeywords(jobDescription);
	const resumeKeywords = extractKeywords(content);

	// Calculate keyword matches
	const matchedKeywords = jobKeywords.filter((keyword) =>
		contentLower.includes(keyword.toLowerCase())
	);

	// Check for ATS-friendly formatting
	const formatting = analyzeFormatting(content);

	// Check for quantifiable achievements
	const achievements = findQuantifiableAchievements(content);

	// Check for action verbs
	const actionVerbs = findActionVerbs(content);

	// Check section headers
	const sections = analyzeSections(content);

	return {
		totalJobKeywords: jobKeywords.length,
		matchedKeywords: matchedKeywords.length,
		keywordList: matchedKeywords,
		formatting,
		achievements: achievements.length,
		actionVerbs: actionVerbs.length,
		sections,
		keywordDensity: calculateKeywordDensity(content, jobKeywords)
	};
}

// Calculate ATS score based on analysis
function calculateScore(analysis: any): number {
	let score = 0;

	// Keyword matching (40 points)
	const keywordRatio = analysis.matchedKeywords / Math.max(analysis.totalJobKeywords, 1);
	score += Math.min(keywordRatio * 40, 40);

	// Formatting (20 points)
	if (analysis.formatting.hasProperHeaders) score += 5;
	if (analysis.formatting.hasContactInfo) score += 5;
	if (analysis.formatting.hasBulletPoints) score += 5;
	if (analysis.formatting.isWellStructured) score += 5;

	// Quantifiable achievements (15 points)
	score += Math.min(analysis.achievements * 3, 15);

	// Action verbs (15 points)
	score += Math.min(analysis.actionVerbs * 1.5, 15);

	// Section completeness (10 points)
	if (analysis.sections.hasSummary) score += 2;
	if (analysis.sections.hasExperience) score += 3;
	if (analysis.sections.hasEducation) score += 2;
	if (analysis.sections.hasSkills) score += 3;

	return Math.round(score);
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
	// Common tech skills and keywords
	const techKeywords = [
		'javascript',
		'typescript',
		'python',
		'java',
		'react',
		'node',
		'angular',
		'vue',
		'aws',
		'docker',
		'kubernetes',
		'git',
		'agile',
		'scrum',
		'sql',
		'nosql',
		'api',
		'rest',
		'graphql',
		'microservices',
		'ci/cd',
		'devops',
		'cloud',
		'machine learning',
		'ai',
		'data',
		'analytics',
		'security',
		'testing'
	];

	// Business keywords
	const businessKeywords = [
		'leadership',
		'management',
		'strategy',
		'budget',
		'roi',
		'stakeholder',
		'project management',
		'cross-functional',
		'collaboration',
		'communication',
		'problem-solving',
		'analytical',
		'team',
		'deadline',
		'kpi',
		'metrics'
	];

	// Extract custom keywords from text (2+ word phrases and important terms)
	const words = text.toLowerCase().split(/\s+/);
	const customKeywords = new Set<string>();

	// Find technical terms and important phrases
	const textLower = text.toLowerCase();
	[...techKeywords, ...businessKeywords].forEach((keyword) => {
		if (textLower.includes(keyword)) {
			customKeywords.add(keyword);
		}
	});

	// Find capitalized multi-word terms (likely important)
	const capitalizedPhrases = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) || [];
	capitalizedPhrases.forEach((phrase) => {
		if (phrase.split(' ').length <= 3) {
			customKeywords.add(phrase.toLowerCase());
		}
	});

	return Array.from(customKeywords);
}

// Analyze formatting for ATS compatibility
function analyzeFormatting(content: string): any {
	return {
		hasProperHeaders: /##?\s+(experience|education|skills|summary)/i.test(content),
		hasContactInfo: /email:|phone:|address:/i.test(content) || /@.*\./i.test(content),
		hasBulletPoints: /^[\s]*[-•*]\s+/m.test(content),
		isWellStructured: content.split('\n').length > 10 && /\n\n/.test(content),
		hasNoTables: !/<table/i.test(content),
		hasNoImages: !/<img/i.test(content),
		hasNoComplexFormatting: !/<(?!p|br|b|i|strong|em|h[1-6]|ul|li|ol)/i.test(content)
	};
}

// Find quantifiable achievements
function findQuantifiableAchievements(content: string): string[] {
	const patterns = [
		/\d+%/g, // Percentages
		/\$[\d,]+/g, // Dollar amounts
		/\d+\+?\s*(years?|months?|weeks?|days?)/gi, // Time periods
		/(increased|decreased|improved|reduced|saved|generated).*\d+/gi, // Impact metrics
		/\d+\s*(customers?|clients?|users?|projects?|teams?)/gi // Scale metrics
	];

	const achievements = new Set<string>();
	patterns.forEach((pattern) => {
		const matches = content.match(pattern) || [];
		matches.forEach((match) => achievements.add(match));
	});

	return Array.from(achievements);
}

// Find action verbs
function findActionVerbs(content: string): string[] {
	const actionVerbs = [
		'achieved',
		'administered',
		'analyzed',
		'built',
		'collaborated',
		'created',
		'designed',
		'developed',
		'directed',
		'established',
		'executed',
		'implemented',
		'improved',
		'increased',
		'initiated',
		'led',
		'managed',
		'organized',
		'performed',
		'planned',
		'produced',
		'resolved',
		'streamlined',
		'supervised'
	];

	const found = new Set<string>();
	const contentLower = content.toLowerCase();

	actionVerbs.forEach((verb) => {
		if (new RegExp(`\\b${verb}`, 'i').test(contentLower)) {
			found.add(verb);
		}
	});

	return Array.from(found);
}

// Analyze section structure
function analyzeSections(content: string): any {
	const contentLower = content.toLowerCase();
	return {
		hasSummary: /(summary|objective|profile)\s*[:|\n]/i.test(contentLower),
		hasExperience: /(experience|employment|work\s+history)\s*[:|\n]/i.test(contentLower),
		hasEducation: /(education|academic|qualification)\s*[:|\n]/i.test(contentLower),
		hasSkills: /(skills|expertise|competencies)\s*[:|\n]/i.test(contentLower),
		hasCertifications: /(certification|certificate|credential)\s*[:|\n]/i.test(contentLower),
		hasProjects: /(projects?|portfolio)\s*[:|\n]/i.test(contentLower)
	};
}

// Calculate keyword density
function calculateKeywordDensity(content: string, keywords: string[]): number {
	const words = content.toLowerCase().split(/\s+/).length;
	let keywordCount = 0;

	keywords.forEach((keyword) => {
		const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
		const matches = content.toLowerCase().match(regex);
		keywordCount += matches ? matches.length : 0;
	});

	return (keywordCount / words) * 100;
}

// Generate recommendations based on analysis
function generateRecommendations(analysis: any, jobDescription: string): string[] {
	const recommendations = [];

	// Keyword recommendations
	if (analysis.matchedKeywords < analysis.totalJobKeywords * 0.6) {
		recommendations.push(
			`Add more relevant keywords from the job description. You're missing ${
				analysis.totalJobKeywords - analysis.matchedKeywords
			} important keywords.`
		);
	}

	// Formatting recommendations
	if (!analysis.formatting.hasProperHeaders) {
		recommendations.push('Use standard section headers like "Experience", "Education", "Skills"');
	}

	if (!analysis.formatting.hasBulletPoints) {
		recommendations.push('Use bullet points to list achievements and responsibilities');
	}

	if (!analysis.formatting.hasContactInfo) {
		recommendations.push('Ensure your contact information is clearly visible at the top');
	}

	// Achievement recommendations
	if (analysis.achievements < 3) {
		recommendations.push(
			'Add more quantifiable achievements with specific numbers and percentages'
		);
	}

	// Action verb recommendations
	if (analysis.actionVerbs < 5) {
		recommendations.push(
			'Start bullet points with strong action verbs like "Led", "Developed", "Achieved"'
		);
	}

	// Section recommendations
	if (!analysis.sections.hasSummary) {
		recommendations.push('Add a professional summary section tailored to the job');
	}

	if (!analysis.sections.hasSkills) {
		recommendations.push(
			'Include a dedicated skills section with relevant technical and soft skills'
		);
	}

	// Keyword density
	if (analysis.keywordDensity < 1) {
		recommendations.push('Increase keyword density by naturally incorporating more relevant terms');
	} else if (analysis.keywordDensity > 5) {
		recommendations.push('Reduce keyword stuffing - your keyword density is too high');
	}

	return recommendations;
}
