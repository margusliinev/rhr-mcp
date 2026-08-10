import type { McpServer } from '@modelcontextprotocol/server';
import { db } from '../../db';
import { getAwardInputSchema, getOrganizationInputSchema, getProcurementInputSchema } from '../schemas/get';
import {
    awardSummary,
    findOrganization,
    findProcurement,
    json,
    lotSummary,
    notFound,
    organizationSummary,
    procurementSummary,
    loggedTool
} from '../util';

const registerGetTools = (server: McpServer) => {
    server.registerTool(
        'get-organization',
        {
            description: 'Get an organization by id or registry code.',
            inputSchema: getOrganizationInputSchema,
            annotations: { readOnlyHint: true }
        },
        loggedTool('get-organization', async (args) => {
            const organization = await findOrganization(args);
            return organization == null ? notFound('Organization') : json(organization);
        })
    );

    server.registerTool(
        'get-procurement',
        {
            description: 'Get a procurement with buyers, lots, and award summaries.',
            inputSchema: getProcurementInputSchema,
            annotations: { readOnlyHint: true }
        },
        loggedTool('get-procurement', async (args) => {
            const procurement = await findProcurement(args);
            if (procurement == null) {
                return notFound('Procurement');
            }

            const buyersQuery = db
                .selectFrom('procurementBuyer')
                .innerJoin('organization', 'organization.id', 'procurementBuyer.organizationId')
                .select([
                    'procurementBuyer.buyerType',
                    'organization.id as organizationId',
                    'organization.registryCode',
                    'organization.name',
                    'organization.city',
                    'organization.country'
                ])
                .where('procurementBuyer.procurementId', '=', procurement.id)
                .orderBy('organization.name')
                .execute();

            const lotsQuery = db.selectFrom('lot').selectAll().where('procurementId', '=', procurement.id).orderBy('lotCode').execute();

            const awardsQuery = db
                .selectFrom('award')
                .innerJoin('lot', 'lot.id', 'award.lotId')
                .select(['award.id', 'award.lotId', 'award.resultStatus', 'award.amount', 'award.currency', 'award.contractDate'])
                .where('lot.procurementId', '=', procurement.id)
                .execute();

            const [buyerRows, lots, awardRows] = await Promise.all([buyersQuery, lotsQuery, awardsQuery]);

            return json({
                procurement,
                buyers: buyerRows.map((row) => ({
                    buyerType: row.buyerType,
                    organization: organizationSummary({
                        id: row.organizationId,
                        registryCode: row.registryCode,
                        name: row.name,
                        city: row.city,
                        country: row.country
                    })
                })),
                lots,
                awards: awardRows.map((row) => awardSummary(row))
            });
        })
    );

    server.registerTool(
        'get-award',
        {
            description: 'Get an award with suppliers, lot, and procurement summary.',
            inputSchema: getAwardInputSchema,
            annotations: { readOnlyHint: true }
        },
        loggedTool('get-award', async ({ id }) => {
            const award = await db.selectFrom('award').selectAll().where('id', '=', id).executeTakeFirst();
            if (award == null) {
                return notFound('Award');
            }

            const lotQuery = db.selectFrom('lot').selectAll().where('id', '=', award.lotId).executeTakeFirstOrThrow();

            const suppliersQuery = db
                .selectFrom('awardSupplier')
                .innerJoin('organization', 'organization.id', 'awardSupplier.organizationId')
                .select([
                    'awardSupplier.isGroupLead',
                    'organization.id as organizationId',
                    'organization.registryCode',
                    'organization.name',
                    'organization.city',
                    'organization.country'
                ])
                .where('awardSupplier.awardId', '=', award.id)
                .orderBy('awardSupplier.isGroupLead', 'desc')
                .orderBy('organization.name')
                .execute();

            const [lot, supplierRows] = await Promise.all([lotQuery, suppliersQuery]);

            const procurement = await db
                .selectFrom('procurement')
                .select(['id', 'rhrId', 'folderId', 'title', 'status', 'type', 'mainCpv'])
                .where('id', '=', lot.procurementId)
                .executeTakeFirstOrThrow();

            return json({
                award,
                lot: lotSummary(lot),
                procurement: procurementSummary(procurement),
                suppliers: supplierRows.map((row) => ({
                    isGroupLead: row.isGroupLead,
                    organization: organizationSummary({
                        id: row.organizationId,
                        registryCode: row.registryCode,
                        name: row.name,
                        city: row.city,
                        country: row.country
                    })
                }))
            });
        })
    );
};

export { registerGetTools };
