import { drizzle } from 'drizzle-orm/node-postgres';
import { getPool } from './pool';
import * as schema from './schema';

export const db = drizzle({
	client: getPool(),
	schema
});

export type DrizzleDB = typeof db;
