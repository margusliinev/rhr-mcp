import { log } from '../lib/log';
import { db } from '../db';

const loggedTool =
    <A extends unknown[], R>(name: string, handler: (...args: A) => R) =>
    (...args: A) => {
        log(`Called tool ${name}`);
        return handler(...args);
    };

const json = (data: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
});

const notFound = (label: string) => ({
    content: [{ type: 'text' as const, text: `${label} not found` }],
    isError: true as const
});

const findOrganization = ({ id, registryCode }: { id?: string | undefined; registryCode?: string | undefined }) => {
    if (id != null) {
        return db.selectFrom('organization').selectAll().where('id', '=', id).executeTakeFirst();
    }
    if (registryCode != null) {
        return db.selectFrom('organization').selectAll().where('registryCode', '=', registryCode).executeTakeFirst();
    }
    return Promise.resolve(undefined);
};

const findProcurement = ({
    id,
    rhrId,
    folderId
}: {
    id?: string | undefined;
    rhrId?: string | undefined;
    folderId?: string | undefined;
}) => {
    if (id != null) {
        return db.selectFrom('procurement').selectAll().where('id', '=', id).executeTakeFirst();
    }
    if (rhrId != null) {
        return db.selectFrom('procurement').selectAll().where('rhrId', '=', rhrId).executeTakeFirst();
    }
    if (folderId != null) {
        return db.selectFrom('procurement').selectAll().where('folderId', '=', folderId).executeTakeFirst();
    }
    return Promise.resolve(undefined);
};

type OrganizationSummaryInput = {
    id: string;
    registryCode: string;
    name: string;
    city: string | null;
    country: string | null;
};

type ProcurementSummaryInput = {
    id: string;
    rhrId: string | null;
    folderId: string;
    title: string;
    status: string | null;
    type: string | null;
    mainCpv: string | null;
};

type LotSummaryInput = {
    id: string;
    procurementId: string;
    lotCode: string;
    title: string | null;
    status: string | null;
    mainCpv: string | null;
};

type AwardSummaryInput = {
    id: string;
    lotId: string;
    resultStatus: string | null;
    amount: string | null;
    currency: string | null;
    contractDate: Date | null;
};

const organizationSummary = (organization: OrganizationSummaryInput) => ({
    id: organization.id,
    registryCode: organization.registryCode,
    name: organization.name,
    city: organization.city,
    country: organization.country
});

const procurementSummary = (procurement: ProcurementSummaryInput) => ({
    id: procurement.id,
    rhrId: procurement.rhrId,
    folderId: procurement.folderId,
    title: procurement.title,
    status: procurement.status,
    type: procurement.type,
    mainCpv: procurement.mainCpv
});

const lotSummary = (lot: LotSummaryInput) => ({
    id: lot.id,
    procurementId: lot.procurementId,
    lotCode: lot.lotCode,
    title: lot.title,
    status: lot.status,
    mainCpv: lot.mainCpv
});

const awardSummary = (award: AwardSummaryInput) => ({
    id: award.id,
    lotId: award.lotId,
    resultStatus: award.resultStatus,
    amount: award.amount,
    currency: award.currency,
    contractDate: award.contractDate
});

export { loggedTool, json, notFound, findOrganization, findProcurement, organizationSummary, procurementSummary, lotSummary, awardSummary };
