import type { Kysely } from 'kysely';
import { sql } from 'kysely';

const up = async (db: Kysely<unknown>) => {
    await db.schema
        .createTable('organization')
        .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
        .addColumn('registryCode', 'text', (col) => col.notNull().unique())
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('city', 'text')
        .addColumn('country', 'text')
        .addColumn('street', 'text')
        .addColumn('postalZone', 'text')
        .addColumn('website', 'text')
        .addColumn('sizeCode', 'text')
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema
        .createTable('procurement')
        .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
        .addColumn('rhrId', 'text')
        .addColumn('eformsId', 'text')
        .addColumn('folderId', 'uuid', (col) => col.notNull().unique())
        .addColumn('title', 'text', (col) => col.notNull())
        .addColumn('description', 'text')
        .addColumn('type', 'text')
        .addColumn('procedureCode', 'text')
        .addColumn('mainCpv', 'text')
        .addColumn('estimatedValue', sql`numeric(18, 2)`)
        .addColumn('currency', 'text')
        .addColumn('frameworkType', 'text')
        .addColumn('regulatoryDomain', 'text')
        .addColumn('buyerActivity', 'text')
        .addColumn('periodStart', 'timestamptz')
        .addColumn('periodEnd', 'timestamptz')
        .addColumn('durationMonths', 'integer')
        .addColumn('submissionDeadline', 'timestamptz')
        .addColumn('status', 'text')
        .addColumn('publishedAt', 'timestamptz')
        .addColumn('documentsUrl', 'text')
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema.createIndex('procurement_rhrId_uidx').on('procurement').column('rhrId').unique().execute();
    await db.schema.createIndex('procurement_eformsId_uidx').on('procurement').column('eformsId').unique().execute();
    await db.schema.createIndex('procurement_mainCpv_idx').on('procurement').column('mainCpv').execute();

    await db.schema
        .createTable('procurementBuyer')
        .addColumn('procurementId', 'uuid', (col) => col.notNull().references('procurement.id').onDelete('cascade'))
        .addColumn('organizationId', 'uuid', (col) => col.notNull().references('organization.id').onDelete('cascade'))
        .addColumn('buyerType', 'text')
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addPrimaryKeyConstraint('procurementBuyer_pkey', ['procurementId', 'organizationId'])
        .execute();

    await db.schema.createIndex('procurementBuyer_organizationId_idx').on('procurementBuyer').column('organizationId').execute();

    await db.schema
        .createTable('lot')
        .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
        .addColumn('procurementId', 'uuid', (col) => col.notNull().references('procurement.id').onDelete('cascade'))
        .addColumn('lotCode', 'text', (col) => col.notNull())
        .addColumn('title', 'text')
        .addColumn('description', 'text')
        .addColumn('mainCpv', 'text')
        .addColumn('estimatedValue', sql`numeric(18, 2)`)
        .addColumn('currency', 'text')
        .addColumn('submissionDeadline', 'timestamptz')
        .addColumn('nutsCode', 'text')
        .addColumn('locationText', 'text')
        .addColumn('status', 'text')
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addUniqueConstraint('lot_procurementId_lotCode_uidx', ['procurementId', 'lotCode'])
        .execute();

    await db.schema.createIndex('lot_procurementId_idx').on('lot').column('procurementId').execute();

    await db.schema
        .createTable('award')
        .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
        .addColumn('lotId', 'uuid', (col) => col.notNull().references('lot.id').onDelete('cascade').unique())
        .addColumn('resultStatus', 'text')
        .addColumn('amount', sql`numeric(18, 2)`)
        .addColumn('currency', 'text')
        .addColumn('tendersCount', 'integer')
        .addColumn('smeTendersCount', 'integer')
        .addColumn('contractTitle', 'text')
        .addColumn('contractDate', 'timestamptz')
        .addColumn('frameworkMaxAmount', sql`numeric(18, 2)`)
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema
        .createTable('awardSupplier')
        .addColumn('awardId', 'uuid', (col) => col.notNull().references('award.id').onDelete('cascade'))
        .addColumn('organizationId', 'uuid', (col) => col.notNull().references('organization.id').onDelete('cascade'))
        .addColumn('isGroupLead', 'boolean', (col) => col.notNull().defaultTo(false))
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addPrimaryKeyConstraint('awardSupplier_pkey', ['awardId', 'organizationId'])
        .execute();

    await db.schema.createIndex('awardSupplier_organizationId_idx').on('awardSupplier').column('organizationId').execute();
};

const down = async (db: Kysely<unknown>) => {
    await db.schema.dropTable('awardSupplier').execute();
    await db.schema.dropTable('award').execute();
    await db.schema.dropTable('lot').execute();
    await db.schema.dropTable('procurementBuyer').execute();
    await db.schema.dropTable('procurement').execute();
    await db.schema.dropTable('organization').execute();
};

export { up, down };
