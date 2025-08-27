import { pgTable, text, uuid, jsonb, timestamp, index, check } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { userJobs } from './user-jobs';

export const activityTypeEnum = [
	'status_change',
	'document_generated',
	'note_added',
	'applied',
	'interview_scheduled',
	'offer_received',
	'job_added'
] as const;
export type ActivityType = (typeof activityTypeEnum)[number];

export const jobActivity = pgTable(
	'jobActivity',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		jobId: uuid('jobId')
			.notNull()
			.references(() => userJobs.id, { onDelete: 'cascade' }),
		type: text('type').$type<ActivityType>().notNull(),
		description: text('description').notNull(),
		metadata: jsonb('metadata').$type<Record<string, any>>(),
		createdAt: timestamp('createdAt').notNull().defaultNow()
	},
	(table) => [
		index('idx_jobActivity_jobId').on(table.jobId),
		index('idx_jobActivity_type').on(table.type),
		index('idx_jobActivity_createdAt').on(table.createdAt),
		index('idx_jobActivity_jobId_createdAt').on(table.jobId, table.createdAt),
		check(
			'type_check',
			sql`${table.type} IN ('status_change', 'document_generated', 'note_added', 'applied', 'interview_scheduled', 'offer_received', 'job_added')`
		)
	]
);

export const jobActivityRelations = relations(jobActivity, ({ one }) => ({
	job: one(userJobs, {
		fields: [jobActivity.jobId],
		references: [userJobs.id]
	})
}));

export type JobActivity = typeof jobActivity.$inferSelect;
export type NewJobActivity = typeof jobActivity.$inferInsert;
