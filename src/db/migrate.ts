import type { Database } from './schema';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SQL } from 'bun';
import { Kysely } from 'kysely';
import { PostgresJSDialect } from 'kysely-postgres-js';
import { FileMigrationProvider, Migrator } from 'kysely/migration';
import { env } from '../env';

const db = new Kysely<Database>({
    dialect: new PostgresJSDialect({
        postgres: new SQL(env.DATABASE_URL, { max: 1 })
    })
});

const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(import.meta.dirname, 'migrations')
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
