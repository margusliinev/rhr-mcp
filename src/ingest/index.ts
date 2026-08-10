import { db } from '../db';
import { log } from './log';

const startedAt = Date.now();

try {
    log(`Ingest finished in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
} finally {
    await db.destroy();
}
