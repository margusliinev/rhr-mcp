import type { AwardDraft, NoticeDrafts, OrganizationDraft, ProcurementDraft } from './drafts';
import type { XmlNode } from './util';
import { applyAwardToLot, parseAwards } from './awards';
import { log } from './log';
import { mapCurrency, mapProcedure, mapType, textOrNull } from './map';
import { collectOrganizations, ensureOrganizationDrafts } from './organizations';
import { createEmptyProcurementDraft, finalizeProcurementDraft, mergeLots, parseBuyers, parseLotsFromProject } from './procurements';
import {
    getAttr,
    getExtension,
    getNode,
    getNoticeRoot,
    getText,
    listNoticeFiles,
    noticeRank,
    parseEformsId,
    parseInstant,
    parseRhrId
} from './util';
import { iterateXmlRecords } from './xml';

const applyNotice = (
    draft: ProcurementDraft | null,
    notice: XmlNode,
    kind: 'ht' | 'hlst',
    organizationDrafts: Map<string, OrganizationDraft>
) => {
    const folderId = getText(notice, 'ContractFolderID');
    const title = getText(getNode(notice, 'ProcurementProject'), 'Name');
    if (folderId == null || title == null) {
        return draft;
    }

    const issuedAt = parseInstant(getText(notice, 'IssueDate'), getText(notice, 'IssueTime'));
    const rank = noticeRank(getText(notice, 'VersionID'), issuedAt);
    const extension = getExtension(notice);
    const organizations = collectOrganizations(extension);
    const project = getNode(notice, 'ProcurementProject');
    const { lots: parsedLots, frameworkType, procedureCode, documentsUrl } = parseLotsFromProject(notice);
    const { buyers, buyerActivity } = parseBuyers(notice, organizations);
    const usedRegistryCodes = new Set(buyers.keys());
    const awards = kind === 'hlst' ? parseAwards(extension, organizations, usedRegistryCodes) : new Map<string, AwardDraft>();

    ensureOrganizationDrafts(organizationDrafts, organizations, usedRegistryCodes);

    const estimated = getNode(getNode(project, 'RequestedTenderTotal'), 'EstimatedOverallContractAmount');
    const plannedPeriod = getNode(project, 'PlannedPeriod');
    const rootProcedure = mapProcedure(getText(getNode(notice, 'TenderingProcess'), 'ProcedureCode'));

    let next = draft;
    next ??= createEmptyProcurementDraft(folderId, title);

    const shouldReplaceCore = kind === 'ht' ? next.htRank == null || rank >= next.htRank : next.hlstRank == null || rank >= next.hlstRank;

    if (kind === 'ht') {
        if (next.htRank == null || rank >= next.htRank) {
            next.htRank = rank;
        }
    } else if (next.hlstRank == null || rank >= next.hlstRank) {
        next.hlstRank = rank;
    }

    if (shouldReplaceCore) {
        next.title = title;
        next.description = getText(project, 'Description');
        next.type = mapType(getText(project, 'ProcurementTypeCode'));
        next.procedureCode = rootProcedure ?? procedureCode;
        next.mainCpv = getText(getNode(project, 'MainCommodityClassification'), 'ItemClassificationCode');
        next.estimatedValue = textOrNull(estimated);
        next.currency = mapCurrency(getAttr(estimated, 'currencyID'));
        next.frameworkType = frameworkType;
        next.buyerActivity = buyerActivity;
        next.periodStart = parseInstant(getText(plannedPeriod, 'StartDate'));
        next.periodEnd = parseInstant(getText(plannedPeriod, 'EndDate'));
        next.eformsId = parseEformsId(getText(project, 'ID'));

        if (kind === 'ht') {
            next.documentsUrl = documentsUrl;
            next.rhrId = parseRhrId(documentsUrl);
            next.publishedAt = issuedAt;
        } else {
            next.publishedAt ??= issuedAt;
            next.documentsUrl ??= documentsUrl;
            next.rhrId ??= parseRhrId(documentsUrl);
        }

        for (const [registryCode, buyer] of buyers) {
            next.buyers.set(registryCode, buyer);
        }

        mergeLots(next, parsedLots, awards, kind);
    } else if (kind === 'hlst' && (next.hlstRank == null || rank >= next.hlstRank)) {
        for (const [lotCode, award] of awards) {
            applyAwardToLot(next.lots, lotCode, award);
        }
    }

    finalizeProcurementDraft(next);
    return next;
};

const loadNoticeDrafts = async () => {
    const organizationDrafts = new Map<string, OrganizationDraft>();
    const procurementDrafts = new Map<string, ProcurementDraft>();
    const files = await listNoticeFiles();

    log(`Parsing ${files.length} notice files`);

    for (const file of files) {
        let count = 0;
        for await (const document of iterateXmlRecords(file.path, file.tag)) {
            const notice = getNoticeRoot(document, file.tag);
            if (notice == null) {
                continue;
            }
            const folderId = getText(notice, 'ContractFolderID');
            if (folderId == null) {
                continue;
            }
            const current = procurementDrafts.get(folderId) ?? null;
            const next = applyNotice(current, notice, file.kind, organizationDrafts);
            if (next != null) {
                procurementDrafts.set(folderId, next);
            }
            count += 1;
        }
        log(`Parsed ${count} notices from ${file.path.split('/').slice(-2).join('/')}`);
    }

    return { organizationDrafts, procurementDrafts } satisfies NoticeDrafts;
};

export { loadNoticeDrafts };
