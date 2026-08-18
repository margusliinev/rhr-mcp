import type { Database } from './schema';
import { PostgresJSDialect } from 'kysely-postgres-js';
import { Kysely } from 'kysely';
import { env } from '../lib/env';
import { SQL } from 'bun';

const postgres = new SQL(env.DATABASE_URL, { max: 10 });
const dialect = new PostgresJSDialect({ postgres });
const db = new Kysely<Database>({ dialect });

export { db };
