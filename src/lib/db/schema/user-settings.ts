import { pgTable, text, uuid, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userSettings = pgTable(
	'userSettings',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('userId').notNull().unique(),
		emailNotifications: boolean('emailNotifications').notNull().default(true),
		applicationUpdates: boolean('applicationUpdates').notNull().default(true),
		weeklyReports: boolean('weeklyReports').notNull().default(false),
		jobRecommendations: boolean('jobRecommendations').notNull().default(true),
		resumeTips: boolean('resumeTips').notNull().default(true),
		defaultJobStatus: text('defaultJobStatus').notNull().default('saved'),
		createdAt: timestamp('createdAt').notNull().defaultNow(),
		updatedAt: timestamp('updatedAt')
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [
		uniqueIndex('idx_userSettings_userId').on(table.userId),
		index('idx_userSettings_createdAt').on(table.createdAt)
	]
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
	user: one(userSettings, {
		fields: [userSettings.userId],
		references: [userSettings.userId]
	})
}));

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export const defaultUserSettings: Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> =
	{
		emailNotifications: true,
		applicationUpdates: true,
		weeklyReports: false,
		jobRecommendations: true,
		resumeTips: true,
		defaultJobStatus: 'saved'
	};
