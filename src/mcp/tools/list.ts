import type { McpServer } from '@modelcontextprotocol/server';
import {
    listOrganizationAwardsInputSchema,
    listOrganizationProcurementsInputSchema,
    listProcurementLotsInputSchema
} from '../schemas/list';
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
import { db } from '../../db';

const registerListTools = (server: McpServer) => {
    server.registerTool(
        'list-organization-procurements',
        {
            description: 'List procurements where an organization is a buyer.',
            inputSchema: listOrganizationProcurementsInputSchema,
            annotations: { readOnlyHint: true }
        },
        loggedTool('list-organization-procurements', async ({ id, registryCode, status, type, limit }) => {
            const organization = await findOrganization({ id, registryCode });
            if (organization == null) {
                return notFound('Organization');
            }

            let procurementsQuery = db
                .selectFrom('procurementBuyer')
                .innerJoin('procurement', 'procurement.id', 'procurementBuyer.procurementId')
                .select([
                    'procurementBuyer.buyerType',
                    'procurement.id',
                    'procurement.rhrId',
                    'procurement.folderId',
                    'procurement.title',
                    'procurement.status',
                    'procurement.type',
                    'procurement.procedureCode',
                    'procurement.mainCpv',
                    'procurement.estimatedValue',
                    'procurement.currency',
                    'procurement.frameworkType',
                    'procurement.buyerActivity',
                    'procurement.submissionDeadline',
                    'procurement.publishedAt',
                    'procurement.documentsUrl'
                ])
                .where('procurementBuyer.organizationId', '=', organization.id);

            if (status != null) {
                procurementsQuery = procurementsQuery.where('procurement.status', '=', status);
            }
            if (type != null) {
                procurementsQuery = procurementsQuery.where('procurement.type', '=', type);
            }

            const rows = await procurementsQuery
                .orderBy('procurement.publishedAt', 'desc')
                .orderBy('procurement.title')
                .limit(limit)
                .execute();

            return json({
                organization: organizationSummary(organization),
                procurements: rows.map((row) => ({
                    buyerType: row.buyerType,
                    procurement: {
                        id: row.id,
                        rhrId: row.rhrId,
                        folderId: row.folderId,
                        title: row.title,
                        status: row.status,
                        type: row.type,
                        procedureCode: row.procedureCode,
                        mainCpv: row.mainCpv,
                        estimatedValue: row.estimatedValue,
                        currency: row.currency,
                        frameworkType: row.frameworkType,
                        buyerActivity: row.buyerActivity,
                        submissionDeadline: row.submissionDeadline,
                        publishedAt: row.publishedAt,
                        documentsUrl: row.documentsUrl
                    }
                }))
            });
        })
    );

    server.registerTool(
        'list-organization-awards',
        {
            description: 'List awards where an organization is a winning supplier.',
            inputSchema: listOrganizationAwardsInputSchema,
            annotations: { readOnlyHint: true }
        },
        loggedTool(
            'list-organization-awards',
            async ({ id, registryCode, resultStatus, minAmount, maxAmount, contractDateFrom, contractDateTo, limit }) => {
                const organization = await findOrganization({ id, registryCode });
                if (organization == null) {
                    return notFound('Organization');
                }

                let awardsQuery = db
                    .selectFrom('awardSupplier')
                    .innerJoin('award', 'award.id', 'awardSupplier.awardId')
                    .innerJoin('lot', 'lot.id', 'award.lotId')
                    .innerJoin('procurement', 'procurement.id', 'lot.procurementId')
                    .select([
                        'awardSupplier.isGroupLead',
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
                    ])
                    .where('awardSupplier.organizationId', '=', organization.id);

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

                const rows = await awardsQuery.orderBy('award.contractDate', 'desc').orderBy('award.amount', 'desc').limit(limit).execute();

                return json({
                    organization: organizationSummary(organization),
                    awards: rows.map((row) => ({
                        isGroupLead: row.isGroupLead,
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
                });
            }
        )
    );

    server.registerTool(
        'list-procurement-lots',
        {
            description: 'List lots for a procurement, with award summaries linked by lot id.',
            inputSchema: listProcurementLotsInputSchema,
            annotations: { readOnlyHint: true }
        },
        loggedTool('list-procurement-lots', async ({ id, rhrId, folderId, status, limit }) => {
            const procurement = await findProcurement({ id, rhrId, folderId });
            if (procurement == null) {
                return notFound('Procurement');
            }

            let lotsQuery = db.selectFrom('lot').selectAll().where('procurementId', '=', procurement.id);

            if (status != null) {
                lotsQuery = lotsQuery.where('status', '=', status);
            }

            const lots = await lotsQuery.orderBy('lotCode').limit(limit).execute();
            const lotIds = lots.map((lot) => lot.id);

            const awardRows =
                lotIds.length === 0
                    ? []
                    : await db
                          .selectFrom('award')
                          .select(['id', 'lotId', 'resultStatus', 'amount', 'currency', 'contractDate'])
                          .where('lotId', 'in', lotIds)
                          .execute();

            return json({
                procurement: procurementSummary(procurement),
                lots,
                awards: awardRows.map((row) => awardSummary(row))
            });
        })
    );
};

export { registerListTools };
