import {
	pgTable,
	text,
	uuid,
	integer,
	boolean,
	jsonb,
	timestamp,
	index,
	check
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { userJobs } from './user-jobs';

export const documentTypeEnum = ['resume', 'cover', 'research', 'prep'] as const;
export type DocumentType = (typeof documentTypeEnum)[number];

export const jobDocuments = pgTable(
	'jobDocuments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		jobId: uuid('jobId')
			.notNull()
			.references(() => userJobs.id, { onDelete: 'cascade' }),
		type: text('type').$type<DocumentType>().notNull(),
		content: text('content').notNull(),
		contentMarkdown: text('contentMarkdown'),
		atsScore: integer('atsScore'),
		version: integer('version').notNull().default(1),
		isActive: boolean('isActive').notNull().default(true),
		metadata: jsonb('metadata').$type<Record<string, any>>(),
		createdAt: timestamp('createdAt').notNull().defaultNow(),
		updatedAt: timestamp('updatedAt')
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [
		index('idx_jobDocuments_jobId').on(table.jobId),
		index('idx_jobDocuments_type').on(table.type),
		index('idx_jobDocuments_jobId_type_isActive').on(table.jobId, table.type, table.isActive),
		index('idx_jobDocuments_createdAt').on(table.createdAt),
		index('idx_job_documents_ats_score')
			.on(table.atsScore)
			.where(sql`${table.atsScore} IS NOT NULL`),
		check('type_check', sql`${table.type} IN ('resume', 'cover', 'research', 'prep')`)
	]
);

export const jobDocumentsRelations = relations(jobDocuments, ({ one }) => ({
	job: one(userJobs, {
		fields: [jobDocuments.jobId],
		references: [userJobs.id]
	})
}));

export type JobDocument = typeof jobDocuments.$inferSelect;
export type NewJobDocument = typeof jobDocuments.$inferInsert;
