import type { CreateLot, CreateProcurement, CreateProcurementBuyer, Database } from '../db/schema';
import type { BuyerDraft, OrganizationDraft, ProcurementDraft } from './drafts';
import type { ParsedOrganization } from './organizations';
import type { XmlNode } from './util';
import type { Kysely } from 'kysely';
import { createBatch } from './batch';
import { log } from './log';
import { mapBuyerActivity, mapBuyerType, mapCurrency, mapFrameworkType, mapProcedure, textOrNull } from './map';
import { asItems, get, getAttr, getCodedText, getNode, getText, parseInstant } from './util';

const parseLotsFromProject = (notice: XmlNode) => {
    const lots = new Map<
        string,
        {
            lotCode: string;
            title: string | null;
            description: string | null;
            mainCpv: string | null;
            estimatedValue: string | null;
            currency: ReturnType<typeof mapCurrency>;
            nutsCode: string | null;
            locationText: string | null;
            submissionDeadline: Date | null;
        }
    >();
    let frameworkType = null as ReturnType<typeof mapFrameworkType>;
    let dpsType = null as ReturnType<typeof mapFrameworkType>;
    let procedureCode = mapProcedure(getCodedText(getNode(notice, 'TenderingProcess'), 'ProcedureCode', 'procurement-procedure-type'));
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
            const listName = getAttr(codeNode, 'listName');
            if (listName === 'framework-agreement') {
                frameworkType ??= mapFrameworkType(textOrNull(codeNode));
            }
            if (listName === 'dps-usage') {
                dpsType ??= mapFrameworkType(textOrNull(codeNode));
            }
        }

        documentsUrl ??= getText(
            getNode(getNode(getNode(tenderingTerms, 'CallForTendersDocumentReference'), 'Attachment'), 'ExternalReference'),
            'URI'
        );

        const lotProcedure = mapProcedure(getCodedText(tenderingProcess, 'ProcedureCode', 'procurement-procedure-type'));
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

    return { lots, frameworkType: frameworkType ?? dpsType, procedureCode, documentsUrl };
};

const parseBuyers = (notice: XmlNode, organizations: Map<string, ParsedOrganization>) => {
    const buyers = new Map<string, BuyerDraft>();
    let buyerActivity = null as ReturnType<typeof mapBuyerActivity>;

    for (const party of asItems(get(notice, 'ContractingParty'))) {
        buyerActivity ??= mapBuyerActivity(
            getCodedText(getNode(party, 'ContractingActivity'), 'ActivityTypeCode', 'authority-activity') ??
                getCodedText(getNode(party, 'ContractingActivity'), 'ActivityTypeCode', 'entity-activity') ??
                getText(getNode(party, 'ContractingActivity'), 'ActivityTypeCode')
        );
        const orgId = getText(getNode(getNode(party, 'Party'), 'PartyIdentification'), 'ID');
        const organization = orgId == null ? undefined : organizations.get(orgId);
        if (organization == null) {
            continue;
        }

        let legalType: string | null = null;
        let contractingType: string | null = null;
        for (const partyType of asItems(get(party, 'ContractingPartyType'))) {
            legalType ??= getCodedText(partyType, 'PartyTypeCode', 'buyer-legal-type');
            contractingType ??= getCodedText(partyType, 'PartyTypeCode', 'buyer-contracting-type');
        }

        buyers.set(organization.registryCode, {
            registryCode: organization.registryCode,
            buyerType: mapBuyerType(legalType ?? contractingType)
        });
    }

    return { buyers, buyerActivity };
};

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

export { parseLotsFromProject, parseBuyers, ingestProcurements };
