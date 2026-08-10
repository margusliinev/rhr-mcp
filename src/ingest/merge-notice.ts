import type { AwardDraft, LotDraft, OrganizationDraft, ProcurementDraft } from './drafts';
import type { NoticeCore, ParsedLot, ParsedNotice } from './parse-notice';
import { lotStatusFromAward, replaceAwards } from './awards';
import { ensureOrganizationDrafts } from './organizations';

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

const replaceCoreFields = (draft: ProcurementDraft, core: NoticeCore) => {
    draft.title = core.title;
    draft.description = core.description;
    draft.type = core.type;
    draft.procedureCode = core.procedureCode;
    draft.mainCpv = core.mainCpv;
    draft.estimatedValue = core.estimatedValue;
    draft.currency = core.currency;
    draft.frameworkType = core.frameworkType;
    draft.buyerActivity = core.buyerActivity;
    draft.periodStart = core.periodStart;
    draft.periodEnd = core.periodEnd;
    draft.eformsId = core.eformsId;
};

const fillMissingCoreFields = (draft: ProcurementDraft, core: NoticeCore) => {
    draft.description ??= core.description;
    draft.type ??= core.type;
    draft.procedureCode ??= core.procedureCode;
    draft.mainCpv ??= core.mainCpv;
    draft.estimatedValue ??= core.estimatedValue;
    draft.currency ??= core.currency;
    draft.frameworkType ??= core.frameworkType;
    draft.buyerActivity ??= core.buyerActivity;
    draft.periodStart ??= core.periodStart;
    draft.periodEnd ??= core.periodEnd;
    draft.eformsId ??= core.eformsId;
};

const replaceLots = (draft: ProcurementDraft, parsedLots: Map<string, ParsedLot>, awards: Map<string, AwardDraft>) => {
    const previousAwards = new Map([...draft.lots.entries()].map(([lotCode, lot]) => [lotCode, lot.award] as const));
    draft.lots.clear();

    for (const [lotCode, lot] of parsedLots) {
        const award = awards.get(lotCode) ?? previousAwards.get(lotCode) ?? null;
        draft.lots.set(lotCode, {
            ...lot,
            award,
            status: lotStatusFromAward(award)
        });
    }

    for (const [lotCode, award] of awards) {
        if (draft.lots.has(lotCode)) {
            continue;
        }
        draft.lots.set(lotCode, {
            lotCode,
            title: null,
            description: null,
            status: lotStatusFromAward(award),
            mainCpv: null,
            estimatedValue: null,
            currency: null,
            nutsCode: null,
            locationText: null,
            submissionDeadline: null,
            award
        });
    }
};

const fillMissingLotMetadata = (draft: ProcurementDraft, parsedLots: Map<string, ParsedLot>) => {
    for (const [lotCode, lot] of parsedLots) {
        const existing = draft.lots.get(lotCode);
        if (existing == null) {
            draft.lots.set(lotCode, {
                ...lot,
                award: null,
                status: 'open'
            });
            continue;
        }
        existing.title ??= lot.title;
        existing.description ??= lot.description;
        existing.mainCpv ??= lot.mainCpv;
        existing.estimatedValue ??= lot.estimatedValue;
        existing.currency ??= lot.currency;
        existing.nutsCode ??= lot.nutsCode;
        existing.locationText ??= lot.locationText;
        existing.submissionDeadline ??= lot.submissionDeadline;
    }
};

const fillMissingBuyers = (draft: ProcurementDraft, notice: ParsedNotice) => {
    for (const [registryCode, buyer] of notice.buyers) {
        if (!draft.buyers.has(registryCode)) {
            draft.buyers.set(registryCode, buyer);
        }
    }
};

const isStale = (incomingRank: string, currentRank: string | null) => currentRank != null && incomingRank < currentRank;

const mergeHtNotice = (draft: ProcurementDraft, notice: ParsedNotice) => {
    if (isStale(notice.rank, draft.htRank)) {
        return;
    }

    draft.htRank = notice.rank;
    replaceCoreFields(draft, notice.core);
    draft.documentsUrl = notice.documentsUrl;
    draft.rhrId = notice.rhrId;
    draft.publishedAt = notice.issuedAt;
    draft.buyers = new Map(notice.buyers);
    replaceLots(draft, notice.lots, new Map());
};

const mergeHlstNotice = (draft: ProcurementDraft, notice: ParsedNotice) => {
    if (isStale(notice.rank, draft.hlstRank)) {
        return;
    }

    draft.hlstRank = notice.rank;

    if (draft.htRank == null) {
        replaceCoreFields(draft, notice.core);
        draft.documentsUrl = notice.documentsUrl;
        draft.rhrId = notice.rhrId;
        draft.publishedAt = notice.issuedAt;
        draft.buyers = new Map(notice.buyers);
        replaceLots(draft, notice.lots, notice.awards);
        return;
    }

    fillMissingCoreFields(draft, notice.core);
    draft.publishedAt ??= notice.issuedAt;
    draft.documentsUrl ??= notice.documentsUrl;
    draft.rhrId ??= notice.rhrId;
    fillMissingBuyers(draft, notice);
    fillMissingLotMetadata(draft, notice.lots);
    replaceAwards(draft.lots, notice.awards);
};

const mergeNotice = (draft: ProcurementDraft | null, notice: ParsedNotice, organizationDrafts: Map<string, OrganizationDraft>) => {
    ensureOrganizationDrafts(organizationDrafts, notice.organizations, notice.usedRegistryCodes);

    const next = draft ?? createEmptyProcurementDraft(notice.folderId, notice.core.title);

    if (notice.kind === 'ht') {
        mergeHtNotice(next, notice);
    } else {
        mergeHlstNotice(next, notice);
    }

    finalizeProcurementDraft(next);
    return next;
};

export { mergeNotice };
