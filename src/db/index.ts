import type { Database } from './schema';
import { SQL } from 'bun';
import { Kysely } from 'kysely';
import { PostgresJSDialect } from 'kysely-postgres-js';
import { env } from '../env';

const db = new Kysely<Database>({
    dialect: new PostgresJSDialect({
        postgres: new SQL(env.DATABASE_URL, { max: 10 })
    })
});

export { db };
