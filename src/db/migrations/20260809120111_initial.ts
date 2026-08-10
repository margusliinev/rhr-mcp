import type { Kysely } from 'kysely';
import { sql } from 'kysely';

const up = async (db: Kysely<unknown>) => {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`.execute(db);

    await db.schema
        .createTable('organization')
        .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
        .addColumn('registryCode', 'text', (col) => col.notNull().unique())
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('city', 'text')
        .addColumn('country', 'text')
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await sql`CREATE INDEX idx_organization_name_trgm ON organization USING gin ("name" gin_trgm_ops)`.execute(db);
    await sql`CREATE INDEX idx_organization_registry_trgm ON organization USING gin ("registryCode" gin_trgm_ops)`.execute(db);

    await db.schema
        .createTable('procurement')
        .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
        .addColumn('rhrId', 'text')
        .addColumn('folderId', 'uuid', (col) => col.notNull().unique())
        .addColumn('eformsId', 'text')
        .addColumn('title', 'text', (col) => col.notNull())
        .addColumn('description', 'text')
        .addColumn('status', 'text')
        .addColumn('type', 'text')
        .addColumn('procedureCode', 'text')
        .addColumn('mainCpv', 'text')
        .addColumn('estimatedValue', sql`numeric(18, 2)`)
        .addColumn('currency', 'text')
        .addColumn('frameworkType', 'text')
        .addColumn('buyerActivity', 'text')
        .addColumn('periodStart', 'timestamptz')
        .addColumn('periodEnd', 'timestamptz')
        .addColumn('submissionDeadline', 'timestamptz')
        .addColumn('documentsUrl', 'text')
        .addColumn('publishedAt', 'timestamptz')
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema.createIndex('uidx_procurement_rhr_id').on('procurement').column('rhrId').unique().execute();
    await db.schema.createIndex('uidx_procurement_eforms_id').on('procurement').column('eformsId').unique().execute();
    await db.schema.createIndex('idx_procurement_main_cpv').on('procurement').column('mainCpv').execute();
    await db.schema.createIndex('idx_procurement_published').on('procurement').columns(['publishedAt', 'title']).execute();
    await sql`CREATE INDEX idx_procurement_title_trgm ON procurement USING gin ("title" gin_trgm_ops)`.execute(db);
    await sql`CREATE INDEX idx_procurement_description_trgm ON procurement USING gin ("description" gin_trgm_ops)`.execute(db);

    await db.schema
        .createTable('procurementBuyer')
        .addColumn('procurementId', 'uuid', (col) => col.notNull().references('procurement.id').onDelete('cascade'))
        .addColumn('organizationId', 'uuid', (col) => col.notNull().references('organization.id').onDelete('cascade'))
        .addColumn('buyerType', 'text')
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addPrimaryKeyConstraint('procurementBuyer_pkey', ['procurementId', 'organizationId'])
        .execute();

    await db.schema.createIndex('idx_procurement_buyer_org').on('procurementBuyer').column('organizationId').execute();

    await db.schema
        .createTable('lot')
        .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
        .addColumn('procurementId', 'uuid', (col) => col.notNull().references('procurement.id').onDelete('cascade'))
        .addColumn('lotCode', 'text', (col) => col.notNull())
        .addColumn('title', 'text')
        .addColumn('description', 'text')
        .addColumn('status', 'text')
        .addColumn('mainCpv', 'text')
        .addColumn('estimatedValue', sql`numeric(18, 2)`)
        .addColumn('currency', 'text')
        .addColumn('nutsCode', 'text')
        .addColumn('locationText', 'text')
        .addColumn('submissionDeadline', 'timestamptz')
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addUniqueConstraint('lot_procurementId_lotCode_uidx', ['procurementId', 'lotCode'])
        .execute();

    await db.schema.createIndex('idx_lot_main_cpv').on('lot').column('mainCpv').execute();

    await db.schema
        .createTable('award')
        .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
        .addColumn('lotId', 'uuid', (col) => col.notNull().references('lot.id').onDelete('cascade').unique())
        .addColumn('resultStatus', 'text')
        .addColumn('amount', sql`numeric(18, 2)`)
        .addColumn('currency', 'text')
        .addColumn('contractTitle', 'text')
        .addColumn('contractDate', 'timestamptz')
        .addColumn('tendersCount', 'integer')
        .addColumn('smeTendersCount', 'integer')
        .addColumn('frameworkMaxAmount', sql`numeric(18, 2)`)
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema.createIndex('idx_award_date_amount').on('award').columns(['contractDate', 'amount']).execute();

    await db.schema
        .createTable('awardSupplier')
        .addColumn('awardId', 'uuid', (col) => col.notNull().references('award.id').onDelete('cascade'))
        .addColumn('organizationId', 'uuid', (col) => col.notNull().references('organization.id').onDelete('cascade'))
        .addColumn('isGroupLead', 'boolean', (col) => col.notNull().defaultTo(false))
        .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updatedAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addPrimaryKeyConstraint('awardSupplier_pkey', ['awardId', 'organizationId'])
        .execute();

    await db.schema.createIndex('idx_award_supplier_org').on('awardSupplier').column('organizationId').execute();
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
