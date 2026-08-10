import type { AwardDraft, NoticeDrafts, OrganizationDraft, ProcurementDraft } from './drafts';
import type { XmlNode } from './util';
import { parseAwards, replaceAwards } from './awards';
import { log } from './log';
import { mapCurrency, mapProcedure, mapType, textOrNull } from './map';
import { collectOrganizations, ensureOrganizationDrafts } from './organizations';
import {
    createEmptyProcurementDraft,
    fillLotMetadata,
    finalizeProcurementDraft,
    parseBuyers,
    parseLotsFromProject,
    replaceLots
} from './procurements';
import {
    getAttr,
    getCodedText,
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

const applyCoreFields = (
    draft: ProcurementDraft,
    input: {
        title: string;
        description: string | null;
        type: ReturnType<typeof mapType>;
        procedureCode: ReturnType<typeof mapProcedure>;
        mainCpv: string | null;
        estimatedValue: string | null;
        currency: ReturnType<typeof mapCurrency>;
        frameworkType: ProcurementDraft['frameworkType'];
        buyerActivity: ProcurementDraft['buyerActivity'];
        periodStart: Date | null;
        periodEnd: Date | null;
        eformsId: string | null;
    },
    mode: 'replace' | 'fill'
) => {
    if (mode === 'replace') {
        draft.title = input.title;
        draft.description = input.description;
        draft.type = input.type;
        draft.procedureCode = input.procedureCode;
        draft.mainCpv = input.mainCpv;
        draft.estimatedValue = input.estimatedValue;
        draft.currency = input.currency;
        draft.frameworkType = input.frameworkType;
        draft.buyerActivity = input.buyerActivity;
        draft.periodStart = input.periodStart;
        draft.periodEnd = input.periodEnd;
        draft.eformsId = input.eformsId;
        return;
    }

    draft.description ??= input.description;
    draft.type ??= input.type;
    draft.procedureCode ??= input.procedureCode;
    draft.mainCpv ??= input.mainCpv;
    draft.estimatedValue ??= input.estimatedValue;
    draft.currency ??= input.currency;
    draft.frameworkType ??= input.frameworkType;
    draft.buyerActivity ??= input.buyerActivity;
    draft.periodStart ??= input.periodStart;
    draft.periodEnd ??= input.periodEnd;
    draft.eformsId ??= input.eformsId;
};

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
    const rootProcedure = mapProcedure(getCodedText(getNode(notice, 'TenderingProcess'), 'ProcedureCode', 'procurement-procedure-type'));

    let next = draft;
    next ??= createEmptyProcurementDraft(folderId, title);

    const core = {
        title,
        description: getText(project, 'Description'),
        type: mapType(getCodedText(project, 'ProcurementTypeCode', 'contract-nature')),
        procedureCode: rootProcedure ?? procedureCode,
        mainCpv: getText(getNode(project, 'MainCommodityClassification'), 'ItemClassificationCode'),
        estimatedValue: textOrNull(estimated),
        currency: mapCurrency(getAttr(estimated, 'currencyID')),
        frameworkType,
        buyerActivity,
        periodStart: parseInstant(getText(plannedPeriod, 'StartDate')),
        periodEnd: parseInstant(getText(plannedPeriod, 'EndDate')),
        eformsId: parseEformsId(getText(project, 'ID'))
    };

    if (kind === 'ht') {
        if (next.htRank != null && rank < next.htRank) {
            finalizeProcurementDraft(next);
            return next;
        }
        next.htRank = rank;
        applyCoreFields(next, core, 'replace');
        next.documentsUrl = documentsUrl;
        next.rhrId = parseRhrId(documentsUrl);
        next.publishedAt = issuedAt;
        next.buyers = new Map(buyers);
        replaceLots(next, parsedLots, new Map());
    } else {
        if (next.hlstRank != null && rank < next.hlstRank) {
            finalizeProcurementDraft(next);
            return next;
        }
        next.hlstRank = rank;

        if (next.htRank == null) {
            applyCoreFields(next, core, 'replace');
            next.documentsUrl = documentsUrl;
            next.rhrId = parseRhrId(documentsUrl);
            next.publishedAt = issuedAt;
            next.buyers = new Map(buyers);
            replaceLots(next, parsedLots, awards);
        } else {
            applyCoreFields(next, core, 'fill');
            next.publishedAt ??= issuedAt;
            next.documentsUrl ??= documentsUrl;
            next.rhrId ??= parseRhrId(documentsUrl);
            for (const [registryCode, buyer] of buyers) {
                if (!next.buyers.has(registryCode)) {
                    next.buyers.set(registryCode, buyer);
                }
            }
            fillLotMetadata(next, parsedLots);
            replaceAwards(next.lots, awards);
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
