/**
 * AI-related type definitions
 */

export type AITask =
	| 'extract_resume'
	| 'extract_job'
	| 'parse_document'
	| 'score_ats'
	| 'score_match'
	| 'classify_skills'
	| 'company_research'
	| 'industry_analysis'
	| 'optimize_resume'
	| 'generate_cover_letter'
	| 'tailor_resume'
	| 'rewrite_summary'
	| 'craft_bullets'
	| 'default';

export interface ModelConfig {
	provider: 'anthropic' | 'openai';
	name: string;
	costPerMillion: {
		input: number;
		output: number;
	};
	maxTokens: number;
	capabilities: string[];
	speed: 'very-fast' | 'fast' | 'medium' | 'slow';
	quality: 'good' | 'very-good' | 'excellent';
}

export interface AIResponse {
	content: string;
	usage?: {
		inputTokens: number;
		outputTokens: number;
	};
	model: string;
	cached?: boolean;
}
