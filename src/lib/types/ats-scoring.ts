export interface FormattingAnalysis {
	hasProperHeaders: boolean;
	hasContactInfo: boolean;
	hasBulletPoints: boolean;
	isWellStructured: boolean;
	hasNoTables: boolean;
	hasNoImages: boolean;
	hasNoComplexFormatting: boolean;
}

export interface SectionAnalysis {
	hasSummary: boolean;
	hasExperience: boolean;
	hasEducation: boolean;
	hasSkills: boolean;
	hasCertifications: boolean;
	hasProjects: boolean;
}

export interface ATSAnalysis {
	totalJobKeywords: number;
	matchedKeywords: number;
	keywordList: string[];
	formatting: FormattingAnalysis;
	achievements: number;
	actionVerbs: number;
	sections: SectionAnalysis;
	keywordDensity: number;
}
