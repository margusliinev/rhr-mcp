import type { CreateLot, CreateProcurement, CreateProcurementBuyer, Database } from '../db/schema';
import type { AwardDraft, BuyerDraft, LotDraft, OrganizationDraft, ProcurementDraft } from './drafts';
import type { ParsedOrganization } from './organizations';
import type { XmlNode } from './util';
import type { Kysely } from 'kysely';
import { applyAwardToLot, lotStatusFromAward } from './awards';
import { createBatch } from './batch';
import { log } from './log';
import { mapBuyerActivity, mapBuyerType, mapCurrency, mapFrameworkType, mapProcedure, textOrNull } from './map';
import { asItems, get, getAttr, getNode, getText, parseInstant } from './util';

const deriveProcurementStatus = (lots: Iterable<LotDraft>) => {
    const statuses = [...lots].map((lot) => lot.status);
    if (statuses.some((status) => status === 'awarded')) {
        return 'awarded' as const;
    }
    if (statuses.length > 0 && statuses.every((status) => status === 'no_winner')) {
        return 'no_winner' as const;
    }
    if (statuses.some((status) => status === 'cancelled')) {
        return 'cancelled' as const;
    }
    return 'published' as const;
};

const parseLotsFromProject = (notice: XmlNode) => {
    const lots = new Map<string, Omit<LotDraft, 'status' | 'award'>>();
    let frameworkType = null as ReturnType<typeof mapFrameworkType>;
    let procedureCode = mapProcedure(getText(getNode(notice, 'TenderingProcess'), 'ProcedureCode'));
    let documentsUrl: string | null = null;

    for (const lotNode of asItems(get(notice, 'ProcurementProjectLot'))) {
        const lotCode = getText(lotNode, 'ID');
        if (lotCode == null) {
            continue;
        }

        const project = getNode(lotNode, 'ProcurementProject');
        const tenderingProcess = getNode(lotNode, 'TenderingProcess');
        const tenderingTerms = getNode(lotNode, 'TenderingTerms');
        const estimated = get(getNode(project, 'RequestedTenderTotal'), 'EstimatedOverallContractAmount');
        const location = getNode(project, 'RealizedLocation');
        const deadlinePeriod = getNode(tenderingProcess, 'TenderSubmissionDeadlinePeriod');

        for (const system of asItems(get(tenderingProcess, 'ContractingSystem'))) {
            const codeNode = get(system, 'ContractingSystemTypeCode');
            if (getAttr(codeNode, 'listName') === 'framework-agreement') {
                frameworkType ??= mapFrameworkType(textOrNull(codeNode));
            }
        }

        documentsUrl ??= getText(
            getNode(getNode(getNode(tenderingTerms, 'CallForTendersDocumentReference'), 'Attachment'), 'ExternalReference'),
            'URI'
        );

        const lotProcedure = mapProcedure(getText(tenderingProcess, 'ProcedureCode'));
        procedureCode ??= lotProcedure;

        lots.set(lotCode, {
            lotCode,
            title: getText(project, 'Name'),
            description: getText(project, 'Description'),
            mainCpv: getText(getNode(project, 'MainCommodityClassification'), 'ItemClassificationCode'),
            estimatedValue: textOrNull(estimated),
            currency: mapCurrency(getAttr(estimated, 'currencyID')),
            nutsCode: getText(getNode(location, 'Address'), 'CountrySubentityCode'),
            locationText: getText(location, 'Description'),
            submissionDeadline: parseInstant(getText(deadlinePeriod, 'EndDate'), getText(deadlinePeriod, 'EndTime'))
        });
    }

    return { lots, frameworkType, procedureCode, documentsUrl };
};

const parseBuyers = (notice: XmlNode, organizations: Map<string, ParsedOrganization>) => {
    const buyers = new Map<string, BuyerDraft>();
    let buyerActivity = null as ReturnType<typeof mapBuyerActivity>;

    for (const party of asItems(get(notice, 'ContractingParty'))) {
        buyerActivity ??= mapBuyerActivity(getText(getNode(party, 'ContractingActivity'), 'ActivityTypeCode'));
        const orgId = getText(getNode(getNode(party, 'Party'), 'PartyIdentification'), 'ID');
        const organization = orgId == null ? undefined : organizations.get(orgId);
        if (organization == null) {
            continue;
        }
        buyers.set(organization.registryCode, {
            registryCode: organization.registryCode,
            buyerType: mapBuyerType(getText(getNode(party, 'ContractingPartyType'), 'PartyTypeCode'))
        });
    }

    return { buyers, buyerActivity };
};

const finalizeProcurementDraft = (draft: ProcurementDraft) => {
    if (draft.estimatedValue == null) {
        const firstLot = draft.lots.values().next().value;
        draft.estimatedValue = firstLot?.estimatedValue ?? null;
        draft.currency ??= firstLot?.currency ?? null;
    }

    let latestDeadline: Date | null = null;
    for (const lot of draft.lots.values()) {
        if (lot.submissionDeadline != null && (latestDeadline == null || lot.submissionDeadline > latestDeadline)) {
            latestDeadline = lot.submissionDeadline;
        }
    }
    draft.submissionDeadline = latestDeadline;
    draft.status = deriveProcurementStatus(draft.lots.values());
};

const mergeLots = (
    draft: ProcurementDraft,
    parsedLots: Map<string, Omit<LotDraft, 'status' | 'award'>>,
    awards: Map<string, AwardDraft>,
    kind: 'ht' | 'hlst'
) => {
    for (const [lotCode, lot] of parsedLots) {
        const existing = draft.lots.get(lotCode);
        const award = kind === 'hlst' ? (awards.get(lotCode) ?? existing?.award ?? null) : (existing?.award ?? null);
        draft.lots.set(lotCode, {
            ...lot,
            award,
            status: lotStatusFromAward(award)
        });
    }

    if (kind === 'hlst') {
        for (const [lotCode, award] of awards) {
            applyAwardToLot(draft.lots, lotCode, award);
        }
    }
};

const createEmptyProcurementDraft = (folderId: string, title: string): ProcurementDraft => ({
    id: Bun.randomUUIDv7(),
    folderId,
    rhrId: null,
    eformsId: null,
    title,
    description: null,
    status: 'published',
    type: null,
    procedureCode: null,
    mainCpv: null,
    estimatedValue: null,
    currency: null,
    frameworkType: null,
    buyerActivity: null,
    periodStart: null,
    periodEnd: null,
    submissionDeadline: null,
    documentsUrl: null,
    publishedAt: null,
    buyers: new Map(),
    lots: new Map(),
    htRank: null,
    hlstRank: null
});

const dedupeRhrIds = (procurementDrafts: Map<string, ProcurementDraft>) => {
    const rhrOwners = new Map<string, ProcurementDraft>();
    for (const procurement of procurementDrafts.values()) {
        if (procurement.rhrId == null) {
            continue;
        }
        const owner = rhrOwners.get(procurement.rhrId);
        if (owner == null) {
            rhrOwners.set(procurement.rhrId, procurement);
            continue;
        }
        const preferCurrent =
            (procurement.htRank != null && owner.htRank == null) ||
            (procurement.publishedAt?.getTime() ?? Number.POSITIVE_INFINITY) < (owner.publishedAt?.getTime() ?? Number.POSITIVE_INFINITY);
        if (preferCurrent) {
            owner.rhrId = null;
            rhrOwners.set(procurement.rhrId, procurement);
        } else {
            procurement.rhrId = null;
        }
    }
};

const ingestProcurements = async (
    db: Kysely<Database>,
    procurementDrafts: Map<string, ProcurementDraft>,
    organizationDrafts: Map<string, OrganizationDraft>
) => {
    dedupeRhrIds(procurementDrafts);

    const procurementBatch = createBatch((rows: CreateProcurement[]) => db.insertInto('procurement').values(rows).execute());
    const buyerBatch = createBatch((rows: CreateProcurementBuyer[]) => db.insertInto('procurementBuyer').values(rows).execute());
    const lotBatch = createBatch((rows: CreateLot[]) => db.insertInto('lot').values(rows).execute());

    const flushRelated = async (force = false) => {
        const ready = force || procurementBatch.size >= 1000 || buyerBatch.size >= 1000 || lotBatch.size >= 1000;
        if (!ready) {
            return;
        }
        await procurementBatch.flush();
        await buyerBatch.flush();
        await lotBatch.flush();
    };

    for (const procurement of procurementDrafts.values()) {
        procurementBatch.push({
            id: procurement.id,
            rhrId: procurement.rhrId,
            folderId: procurement.folderId,
            eformsId: procurement.eformsId,
            title: procurement.title,
            description: procurement.description,
            status: procurement.status,
            type: procurement.type,
            procedureCode: procurement.procedureCode,
            mainCpv: procurement.mainCpv,
            estimatedValue: procurement.estimatedValue,
            currency: procurement.currency,
            frameworkType: procurement.frameworkType,
            buyerActivity: procurement.buyerActivity,
            periodStart: procurement.periodStart,
            periodEnd: procurement.periodEnd,
            submissionDeadline: procurement.submissionDeadline,
            documentsUrl: procurement.documentsUrl,
            publishedAt: procurement.publishedAt
        });

        for (const buyer of procurement.buyers.values()) {
            const organizationId = organizationDrafts.get(buyer.registryCode)?.id;
            if (organizationId == null) {
                continue;
            }
            buyerBatch.push({
                procurementId: procurement.id,
                organizationId,
                buyerType: buyer.buyerType
            });
        }

        for (const lot of procurement.lots.values()) {
            const lotId = Bun.randomUUIDv7();
            lot.id = lotId;
            lotBatch.push({
                id: lotId,
                procurementId: procurement.id,
                lotCode: lot.lotCode,
                title: lot.title,
                description: lot.description,
                status: lot.status,
                mainCpv: lot.mainCpv,
                estimatedValue: lot.estimatedValue,
                currency: lot.currency,
                nutsCode: lot.nutsCode,
                locationText: lot.locationText,
                submissionDeadline: lot.submissionDeadline
            });
        }

        await flushRelated();
    }

    await flushRelated(true);

    log(`Added ${procurementBatch.inserted} procurements to the database`);
    log(`Added ${buyerBatch.inserted} procurement buyers to the database`);
    log(`Added ${lotBatch.inserted} lots to the database`);
};

export { parseLotsFromProject, parseBuyers, finalizeProcurementDraft, mergeLots, createEmptyProcurementDraft, ingestProcurements };
