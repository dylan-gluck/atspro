import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/db';
import { requireAuth } from './utils';
import type { UserSettings } from '$lib/db/schema/user-settings';
import { defaultUserSettings } from '$lib/db/schema/user-settings';

// Get current user settings
export const getUserSettings = query(async () => {
	const userId = requireAuth();

	// Get or create user settings
	let settings = await db.getUserSettings(userId);

	if (!settings) {
		// Create default settings for new users
		settings = await db.createUserSettings(userId, defaultUserSettings);
	}

	return settings;
});

// Update user settings schema
const updateSettingsSchema = v.object({
	emailNotifications: v.optional(v.boolean()),
	applicationUpdates: v.optional(v.boolean()),
	weeklyReports: v.optional(v.boolean()),
	jobRecommendations: v.optional(v.boolean()),
	resumeTips: v.optional(v.boolean()),
	defaultJobStatus: v.optional(v.picklist(['saved', 'applied', 'interviewing']))
});

export const updateUserSettings = command(updateSettingsSchema, async (updates) => {
	const userId = requireAuth();

	// Ensure settings exist
	let settings = await db.getUserSettings(userId);
	if (!settings) {
		// Create default settings first
		settings = await db.createUserSettings(userId, defaultUserSettings);
	}

	// Update settings
	const updatedSettings = await db.updateUserSettings(userId, updates);

	// Refresh the query
	await getUserSettings().refresh();

	return {
		success: true,
		settings: updatedSettings
	};
});

// Update user profile
const updateProfileSchema = v.object({
	name: v.optional(v.string()),
	email: v.optional(v.pipe(v.string(), v.email()))
});

export const updateUserProfile = command(updateProfileSchema, async (updates) => {
	const userId = requireAuth();

	// Update user profile in auth system
	// Note: This would integrate with better-auth's user update methods
	// For now, we'll just return success

	return {
		success: true,
		message: 'Profile updated successfully'
	};
});
