import { pgTable, text, uuid, timestamp, index, check } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { jobDocuments } from './job-documents';
import { jobActivity } from './job-activity';

export const jobStatusEnum = [
	'tracked',
	'applied',
	'interviewing',
	'offered',
	'rejected',
	'withdrawn'
] as const;
export type JobStatus = (typeof jobStatusEnum)[number];

export const userJobs = pgTable(
	'userJobs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('userId').notNull(),
		company: text('company').notNull(),
		title: text('title').notNull(),
		description: text('description').notNull(),
		salary: text('salary'),
		responsibilities: text('responsibilities').array(),
		qualifications: text('qualifications').array(),
		logistics: text('logistics').array(),
		location: text('location').array(),
		additionalInfo: text('additionalInfo').array(),
		link: text('link'),
		status: text('status').$type<JobStatus>().notNull().default('tracked'),
		notes: text('notes'),
		appliedAt: timestamp('appliedAt'),
		createdAt: timestamp('createdAt').notNull().defaultNow(),
		updatedAt: timestamp('updatedAt')
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [
		index('idx_userJobs_userId').on(table.userId),
		index('idx_userJobs_status').on(table.status),
		index('idx_userJobs_createdAt').on(table.createdAt),
		index('idx_userJobs_userId_status').on(table.userId, table.status),
		check(
			'status_check',
			sql`${table.status} IN ('tracked', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn')`
		)
	]
);

export const userJobsRelations = relations(userJobs, ({ many }) => ({
	documents: many(jobDocuments),
	activities: many(jobActivity)
}));

export type UserJob = typeof userJobs.$inferSelect;
export type NewUserJob = typeof userJobs.$inferInsert;
