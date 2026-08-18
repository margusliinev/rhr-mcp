import type { AwardDraft, BuyerDraft, LotDraft, ProcurementDraft } from './drafts';
import type { ParsedOrganization } from './organizations';
import type { XmlNode } from './util';
import { getAttr, getCodedText, getExtension, getNode, getText, noticeRank, parseEformsId, parseInstant, parseRhrId } from './util';
import { mapCurrency, mapProcedure, mapType, textOrNull } from './map';
import { parseBuyers, parseLotsFromProject } from './procurements';
import { collectOrganizations } from './organizations';
import { parseAwards } from './awards';

type ParsedLot = Omit<LotDraft, 'status' | 'award'>;

type NoticeCore = {
    title: string;
    description: string | null;
    type: ProcurementDraft['type'];
    procedureCode: ProcurementDraft['procedureCode'];
    mainCpv: string | null;
    estimatedValue: string | null;
    currency: ProcurementDraft['currency'];
    frameworkType: ProcurementDraft['frameworkType'];
    buyerActivity: ProcurementDraft['buyerActivity'];
    periodStart: Date | null;
    periodEnd: Date | null;
    eformsId: string | null;
};

type ParsedNotice = {
    kind: 'ht' | 'hlst';
    folderId: string;
    issuedAt: Date | null;
    rank: string;
    core: NoticeCore;
    documentsUrl: string | null;
    rhrId: string | null;
    buyers: Map<string, BuyerDraft>;
    lots: Map<string, ParsedLot>;
    awards: Map<string, AwardDraft>;
    organizations: Map<string, ParsedOrganization>;
    usedRegistryCodes: Set<string>;
};

const parseNotice = (notice: XmlNode, kind: 'ht' | 'hlst'): ParsedNotice | null => {
    const folderId = getText(notice, 'ContractFolderID');
    const project = getNode(notice, 'ProcurementProject');
    const title = getText(project, 'Name');
    if (folderId == null || title == null) {
        return null;
    }

    const issuedAt = parseInstant(getText(notice, 'IssueDate'), getText(notice, 'IssueTime'));
    const extension = getExtension(notice);
    const organizations = collectOrganizations(extension);
    const { lots, frameworkType, procedureCode, documentsUrl } = parseLotsFromProject(notice);
    const { buyers, buyerActivity } = parseBuyers(notice, organizations);
    const usedRegistryCodes = new Set(buyers.keys());
    const awards = kind === 'hlst' ? parseAwards(extension, organizations, usedRegistryCodes) : new Map<string, AwardDraft>();

    const estimated = getNode(getNode(project, 'RequestedTenderTotal'), 'EstimatedOverallContractAmount');
    const plannedPeriod = getNode(project, 'PlannedPeriod');
    const rootProcedure = mapProcedure(getCodedText(getNode(notice, 'TenderingProcess'), 'ProcedureCode', 'procurement-procedure-type'));

    return {
        kind,
        folderId,
        issuedAt,
        rank: noticeRank(getText(notice, 'VersionID'), issuedAt),
        core: {
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
        },
        documentsUrl,
        rhrId: parseRhrId(documentsUrl),
        buyers,
        lots,
        awards,
        organizations,
        usedRegistryCodes
    };
};

export { parseNotice };
export type { ParsedNotice, ParsedLot, NoticeCore };
