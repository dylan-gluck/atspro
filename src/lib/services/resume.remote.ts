import { query, form, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/db';
import { extractResume as extractResumeWithAI } from '$lib/ai';
import { requireAuth, checkRateLimit, ErrorCodes, validateFile } from './utils';
import type { Resume } from '$lib/types/resume';

// Get current user's resume
export const getResume = query(async () => {
	const userId = requireAuth();

	const resume = await db.getUserResume(userId);
	if (!resume) return null;

	return resume;
});

// Extract resume from uploaded file
export const extractResume = form(async (data) => {
	console.log('[extractResume] Starting extraction...');
	console.log(
		'[extractResume] FormData entries:',
		Array.from(data.entries()).map(([k, v]) => {
			if (v && typeof v === 'object' && 'name' in v && 'size' in v) {
				return `${k}: File(${(v as File).name}, ${(v as File).size} bytes)`;
			}
			return `${k}: ${v}`;
		})
	);

	let userId: string;
	try {
		userId = requireAuth();
		console.log('[extractResume] User ID:', userId);
	} catch (authError) {
		console.error('[extractResume] Auth error:', authError);
		throw authError;
	}

	// Rate limit: 10 resume extractions per hour
	checkRateLimit(userId, 10, 3600000, 'extract_resume');

	// Check for existing resume
	const existing = await db.getUserResume(userId);
	if (existing) {
		console.log('[extractResume] User already has resume, returning error');
		error(400, 'You already have a resume. Please update it instead.');
	}

	const file = data.get('document') as File;
	console.log(
		'[extractResume] File:',
		file ? `${file.name} (${file.size} bytes, type: ${file.type})` : 'null'
	);
	if (!file) {
		error(400, 'No file provided');
	}

	// Validate file type and size
	const validTypes = ['application/pdf', 'text/markdown', 'text/plain'];
	validateFile(file, validTypes, 10 * 1024 * 1024); // 10MB max

	// Process file based on type
	let content: string | Buffer;
	if (file.type === 'application/pdf') {
		// Convert to Buffer for AI processing
		const buffer = await file.arrayBuffer();
		content = Buffer.from(buffer);
	} else {
		content = await file.text();
	}

	// Extract with AI
	console.log('[extractResume] Starting AI extraction...');
	const extracted = await extractResumeWithAI(content, file.type);
	console.log('[extractResume] AI extraction complete, fields:', Object.keys(extracted));

	// Store in database
	console.log('[extractResume] Storing in database...');
	const resume = await db.createUserResume(userId, extracted);
	console.log('[extractResume] Resume stored with ID:', resume.id);

	return {
		resumeId: resume.id,
		extractedFields: extracted
	};
});

// Update specific resume fields
const updateResumeSchema = v.object({
	contactInfo: v.optional(v.any()),
	summary: v.optional(v.string()),
	workExperience: v.optional(v.array(v.any())),
	education: v.optional(v.array(v.any())),
	certifications: v.optional(v.array(v.any())),
	skills: v.optional(v.array(v.string()))
});

export const updateResume = command(updateResumeSchema, async (updates) => {
	const userId = requireAuth();

	// Rate limit: 30 updates per hour
	checkRateLimit(userId, 30, 3600000, 'update_resume');

	// Ensure resume exists
	const existing = await db.getUserResume(userId);
	if (!existing) {
		error(404, 'No resume found. Please upload a resume first.');
	}

	const resume = await db.updateUserResume(userId, updates);

	// Refresh the query on success
	await getResume().refresh();

	return {
		id: resume.id,
		updatedFields: Object.keys(updates),
		updatedAt: resume.updatedAt
	};
});
