import { pgTable, text, uuid, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { ContactInfo, WorkExperience, Education, Certification } from '$lib/types/resume';

export const userResume = pgTable(
	'userResume',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('userId').notNull().unique(),
		contactInfo: jsonb('contactInfo').notNull().$type<ContactInfo>(),
		summary: text('summary'),
		workExperience: jsonb('workExperience').notNull().default([]).$type<WorkExperience[]>(),
		education: jsonb('education').notNull().default([]).$type<Education[]>(),
		certifications: jsonb('certifications').notNull().default([]).$type<Certification[]>(),
		skills: text('skills').array().notNull().default([]),
		createdAt: timestamp('createdAt').notNull().defaultNow(),
		updatedAt: timestamp('updatedAt')
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [
		uniqueIndex('idx_userResume_userId').on(table.userId),
		index('idx_userResume_createdAt').on(table.createdAt)
	]
);

export const userResumeRelations = relations(userResume, ({ one }) => ({
	user: one(userResume, {
		fields: [userResume.userId],
		references: [userResume.userId]
	})
}));

export type UserResume = typeof userResume.$inferSelect;
export type NewUserResume = typeof userResume.$inferInsert;
