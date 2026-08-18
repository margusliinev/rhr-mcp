import type { Database } from './schema';
import { FileMigrationProvider, Migrator } from 'kysely/migration';
import { PostgresJSDialect } from 'kysely-postgres-js';
import { promises as fs } from 'node:fs';
import { Kysely } from 'kysely';
import { env } from '../lib/env';
import { SQL } from 'bun';
import path from 'node:path';

const postgres = new SQL(env.DATABASE_URL, { max: 1 });
const dialect = new PostgresJSDialect({ postgres });
const db = new Kysely<Database>({ dialect });

const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
        fs,
        migrationFolder: path.join(import.meta.dirname, 'migrations'),
        path
    })
});

const { error, results } = await migrator.migrateToLatest();

for (const result of results ?? []) {
    if (result.status === 'Success') {
        process.stdout.write(`Migration "${result.migrationName}" completed\n`);
    } else if (result.status === 'NotExecuted') {
        process.stdout.write(`Migration "${result.migrationName}" skipped\n`);
    } else if (result.status === 'Error') {
        process.stderr.write(`Migration "${result.migrationName}" failed\n`);
    }
}

await db.destroy();

if (error) {
    throw error instanceof Error ? error : new Error('Database migration failed', { cause: error });
}
