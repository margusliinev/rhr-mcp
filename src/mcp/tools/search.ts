import type { McpServer } from '@modelcontextprotocol/server';
import { sql } from 'kysely';
import { db } from '../../db';
import { searchAwardsInputSchema, searchOrganizationsInputSchema, searchProcurementsInputSchema } from '../schemas/search';
import { json, lotSummary, procurementSummary } from '../util';

const registerSearchTools = (server: McpServer) => {
    server.registerTool(
        'search-organizations',
        {
            description: 'Search organizations by name or registry code.',
            inputSchema: searchOrganizationsInputSchema,
            annotations: { readOnlyHint: true }
        },
        async ({ query, limit }) => {
            const pattern = `%${query}%`;
            const organizations = await db
                .selectFrom('organization')
                .selectAll()
                .where((eb) => eb.or([eb('name', 'ilike', pattern), eb('registryCode', 'ilike', pattern)]))
                .orderBy('name')
                .limit(limit)
                .execute();

            return json(organizations);
        }
    );

    server.registerTool(
        'search-procurements',
        {
            description: 'Search and filter procurements by text, status, CPV, value, deadlines, and buyer.',
            inputSchema: searchProcurementsInputSchema,
            annotations: { readOnlyHint: true }
        },
        async ({
            query,
            status,
            type,
            procedureCode,
            buyerActivity,
            frameworkType,
            mainCpv,
            cpvPrefix,
            minEstimatedValue,
            maxEstimatedValue,
            submissionDeadlineFrom,
            submissionDeadlineTo,
            publishedFrom,
            publishedTo,
            buyerRegistryCode,
            limit
        }) => {
            let procurementsQuery = db.selectFrom('procurement').selectAll();

            if (query != null) {
                const pattern = `%${query}%`;
                procurementsQuery = procurementsQuery.where((eb) =>
                    eb.or([eb('title', 'ilike', pattern), eb('description', 'ilike', pattern)])
                );
            }
            if (status != null) {
                procurementsQuery = procurementsQuery.where('status', '=', status);
            }
            if (type != null) {
                procurementsQuery = procurementsQuery.where('type', '=', type);
            }
            if (procedureCode != null) {
                procurementsQuery = procurementsQuery.where('procedureCode', '=', procedureCode);
            }
            if (buyerActivity != null) {
                procurementsQuery = procurementsQuery.where('buyerActivity', '=', buyerActivity);
            }
            if (frameworkType != null) {
                procurementsQuery = procurementsQuery.where('frameworkType', '=', frameworkType);
            }
            if (mainCpv != null) {
                procurementsQuery = procurementsQuery.where('mainCpv', '=', mainCpv);
            }
            if (cpvPrefix != null) {
                procurementsQuery = procurementsQuery.where('mainCpv', 'like', `${cpvPrefix}%`);
            }
            if (minEstimatedValue != null) {
                procurementsQuery = procurementsQuery.where('estimatedValue', '>=', String(minEstimatedValue));
            }
            if (maxEstimatedValue != null) {
                procurementsQuery = procurementsQuery.where('estimatedValue', '<=', String(maxEstimatedValue));
            }
            if (submissionDeadlineFrom != null) {
                procurementsQuery = procurementsQuery.where('submissionDeadline', '>=', new Date(submissionDeadlineFrom));
            }
            if (submissionDeadlineTo != null) {
                procurementsQuery = procurementsQuery.where('submissionDeadline', '<=', new Date(submissionDeadlineTo));
            }
            if (publishedFrom != null) {
                procurementsQuery = procurementsQuery.where('publishedAt', '>=', new Date(publishedFrom));
            }
            if (publishedTo != null) {
                procurementsQuery = procurementsQuery.where('publishedAt', '<=', new Date(publishedTo));
            }
            if (buyerRegistryCode != null) {
                procurementsQuery = procurementsQuery.where((eb) =>
                    eb.exists(
                        eb
                            .selectFrom('procurementBuyer')
                            .innerJoin('organization', 'organization.id', 'procurementBuyer.organizationId')
                            .select(sql`1`.as('one'))
                            .whereRef('procurementBuyer.procurementId', '=', 'procurement.id')
                            .where('organization.registryCode', '=', buyerRegistryCode)
                    )
                );
            }

            return json(await procurementsQuery.orderBy('publishedAt', 'desc').orderBy('title').limit(limit).execute());
        }
    );

    server.registerTool(
        'search-awards',
        {
            description: 'Search awards across procurements by amount, date, CPV, result, and supplier.',
            inputSchema: searchAwardsInputSchema,
            annotations: { readOnlyHint: true }
        },
        async ({
            resultStatus,
            minAmount,
            maxAmount,
            contractDateFrom,
            contractDateTo,
            mainCpv,
            cpvPrefix,
            supplierRegistryCode,
            limit
        }) => {
            let awardsQuery = db
                .selectFrom('award')
                .innerJoin('lot', 'lot.id', 'award.lotId')
                .innerJoin('procurement', 'procurement.id', 'lot.procurementId')
                .select([
                    'award.id',
                    'award.lotId',
                    'award.resultStatus',
                    'award.amount',
                    'award.currency',
                    'award.contractTitle',
                    'award.contractDate',
                    'award.tendersCount',
                    'award.smeTendersCount',
                    'award.frameworkMaxAmount',
                    'lot.id as lotRowId',
                    'lot.procurementId',
                    'lot.lotCode',
                    'lot.title as lotTitle',
                    'lot.status as lotStatus',
                    'lot.mainCpv as lotMainCpv',
                    'procurement.id as procurementRowId',
                    'procurement.rhrId',
                    'procurement.folderId',
                    'procurement.title as procurementTitle',
                    'procurement.status as procurementStatus',
                    'procurement.type as procurementType',
                    'procurement.mainCpv as procurementMainCpv'
                ]);

            if (resultStatus != null) {
                awardsQuery = awardsQuery.where('award.resultStatus', '=', resultStatus);
            }
            if (minAmount != null) {
                awardsQuery = awardsQuery.where('award.amount', '>=', String(minAmount));
            }
            if (maxAmount != null) {
                awardsQuery = awardsQuery.where('award.amount', '<=', String(maxAmount));
            }
            if (contractDateFrom != null) {
                awardsQuery = awardsQuery.where('award.contractDate', '>=', new Date(contractDateFrom));
            }
            if (contractDateTo != null) {
                awardsQuery = awardsQuery.where('award.contractDate', '<=', new Date(contractDateTo));
            }
            if (mainCpv != null) {
                awardsQuery = awardsQuery.where((eb) => eb.or([eb('lot.mainCpv', '=', mainCpv), eb('procurement.mainCpv', '=', mainCpv)]));
            }
            if (cpvPrefix != null) {
                awardsQuery = awardsQuery.where((eb) =>
                    eb.or([eb('lot.mainCpv', 'like', `${cpvPrefix}%`), eb('procurement.mainCpv', 'like', `${cpvPrefix}%`)])
                );
            }
            if (supplierRegistryCode != null) {
                awardsQuery = awardsQuery.where((eb) =>
                    eb.exists(
                        eb
                            .selectFrom('awardSupplier')
                            .innerJoin('organization', 'organization.id', 'awardSupplier.organizationId')
                            .select(sql`1`.as('one'))
                            .whereRef('awardSupplier.awardId', '=', 'award.id')
                            .where('organization.registryCode', '=', supplierRegistryCode)
                    )
                );
            }

            const rows = await awardsQuery.orderBy('award.contractDate', 'desc').orderBy('award.amount', 'desc').limit(limit).execute();

            return json(
                rows.map((row) => ({
                    award: {
                        id: row.id,
                        lotId: row.lotId,
                        resultStatus: row.resultStatus,
                        amount: row.amount,
                        currency: row.currency,
                        contractTitle: row.contractTitle,
                        contractDate: row.contractDate,
                        tendersCount: row.tendersCount,
                        smeTendersCount: row.smeTendersCount,
                        frameworkMaxAmount: row.frameworkMaxAmount
                    },
                    lot: lotSummary({
                        id: row.lotRowId,
                        procurementId: row.procurementId,
                        lotCode: row.lotCode,
                        title: row.lotTitle,
                        status: row.lotStatus,
                        mainCpv: row.lotMainCpv
                    }),
                    procurement: procurementSummary({
                        id: row.procurementRowId,
                        rhrId: row.rhrId,
                        folderId: row.folderId,
                        title: row.procurementTitle,
                        status: row.procurementStatus,
                        type: row.procurementType,
                        mainCpv: row.procurementMainCpv
                    })
                }))
            );
        }
    );
};

export { registerSearchTools };
