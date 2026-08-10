import { db } from '../db';
import { log } from '../log';
import { ingestAwards } from './awards';
import { loadNoticeDrafts } from './notices';
import { ingestOrganizations } from './organizations';
import { ingestProcurements } from './procurements';

const main = async () => {
    const startedAt = Date.now();
    log('Ingest started');

    const { organizationDrafts, procurementDrafts } = await loadNoticeDrafts();

    await ingestOrganizations(db, organizationDrafts);
    await ingestProcurements(db, procurementDrafts, organizationDrafts);
    await ingestAwards(db, procurementDrafts, organizationDrafts);

    log(`Ingest finished in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
};

try {
    await main();
} finally {
    await db.destroy();
}
