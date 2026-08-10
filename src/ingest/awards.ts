import type { CreateAward, CreateAwardSupplier, Database } from '../db/schema';
import type { AwardDraft, LotDraft, OrganizationDraft, ProcurementDraft, SupplierDraft } from './drafts';
import type { ParsedOrganization } from './organizations';
import type { XmlNode } from './util';
import type { Kysely } from 'kysely';
import { createBatch } from './batch';
import { log } from './log';
import { mapResultStatus, parseAmount, textOrNull } from './map';
import { asItems, get, getNode, getText, hasPrivacy, parseInstant } from './util';

const lotStatusFromAward = (award: AwardDraft | null) => {
    if (award?.resultStatus === 'Winner selected') {
        return 'awarded' as const;
    }
    if (award?.resultStatus === 'Closed, no winner') {
        return 'no_winner' as const;
    }
    return 'open' as const;
};

const parseAwards = (extension: XmlNode | null, organizations: Map<string, ParsedOrganization>, usedRegistryCodes: Set<string>) => {
    const awards = new Map<string, AwardDraft>();
    const noticeResult = getNode(extension, 'NoticeResult');
    if (noticeResult == null) {
        return awards;
    }

    const noticeValuePrivate = hasPrivacy(noticeResult, ['not-val']);

    const lotTenders = new Map<string, XmlNode>();
    for (const tender of asItems(get(noticeResult, 'LotTender'))) {
        const id = getText(tender, 'ID');
        if (id != null) {
            lotTenders.set(id, tender);
        }
    }

    const settledContracts = new Map<string, XmlNode>();
    for (const contract of asItems(get(noticeResult, 'SettledContract'))) {
        const id = getText(contract, 'ID');
        if (id != null) {
            settledContracts.set(id, contract);
        }
    }

    const tenderingParties = new Map<string, XmlNode>();
    for (const party of asItems(get(noticeResult, 'TenderingParty'))) {
        const id = getText(party, 'ID');
        if (id != null) {
            tenderingParties.set(id, party);
        }
    }

    for (const lotResult of asItems(get(noticeResult, 'LotResult'))) {
        const lotCode = getText(getNode(lotResult, 'TenderLot'), 'ID');
        if (lotCode == null) {
            continue;
        }

        let tendersCount: number | null = null;
        let smeTendersCount: number | null = null;
        for (const stats of asItems(get(lotResult, 'ReceivedSubmissionsStatistics'))) {
            const code = getText(stats, 'StatisticsCode');
            if (code !== 'tenders' && code !== 't-sme') {
                continue;
            }
            const value = hasPrivacy(stats) ? null : Number(getText(stats, 'StatisticsNumeric'));
            const parsed = value != null && Number.isFinite(value) ? value : null;
            if (code === 'tenders') {
                tendersCount = parsed;
            } else {
                smeTendersCount = parsed;
            }
        }

        const tenderRefs = asItems(get(lotResult, 'LotTender'));
        const firstTenderId = getText(tenderRefs[0] ?? null, 'ID');
        const lotTender = firstTenderId == null ? null : (lotTenders.get(firstTenderId) ?? null);
        const amountPrivate = noticeValuePrivate || hasPrivacy(lotTender, ['win-ten-val', 'not-val']) || hasPrivacy(lotTender);
        const payable = amountPrivate ? null : getNode(lotTender, 'LegalMonetaryTotal');
        const { amount, currency } = parseAmount(payable);

        const contractRefs = asItems(get(lotResult, 'SettledContract'));
        const firstContractId = getText(contractRefs[0] ?? null, 'ID');
        const contract = firstContractId == null ? null : (settledContracts.get(firstContractId) ?? null);

        const frameworkMax = getNode(getNode(lotResult, 'FrameworkAgreementValues'), 'MaximumValueAmount');

        const suppliers: SupplierDraft[] = [];
        for (const tenderRef of tenderRefs) {
            const tenderId = getText(tenderRef, 'ID');
            const tender = tenderId == null ? null : (lotTenders.get(tenderId) ?? null);
            const partyId = getText(getNode(tender, 'TenderingParty'), 'ID');
            const party = partyId == null ? null : (tenderingParties.get(partyId) ?? null);
            for (const tenderer of asItems(get(party, 'Tenderer'))) {
                const orgId = getText(tenderer, 'ID');
                const organization = orgId == null ? undefined : organizations.get(orgId);
                if (organization == null) {
                    continue;
                }
                usedRegistryCodes.add(organization.registryCode);
                suppliers.push({
                    registryCode: organization.registryCode,
                    isGroupLead: getText(tenderer, 'GroupLeadIndicator') === 'true'
                });
            }
        }

        awards.set(lotCode, {
            resultStatus: mapResultStatus(getText(lotResult, 'TenderResultCode')),
            amount,
            currency,
            contractTitle: getText(contract, 'Title'),
            contractDate: parseInstant(getText(contract, 'IssueDate')),
            tendersCount,
            smeTendersCount,
            frameworkMaxAmount: textOrNull(frameworkMax),
            suppliers
        });
    }

    return awards;
};

const applyAwardToLot = (lots: Map<string, LotDraft>, lotCode: string, award: AwardDraft) => {
    const existing = lots.get(lotCode);
    if (existing == null) {
        lots.set(lotCode, {
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
        return;
    }
    existing.award = award;
    existing.status = lotStatusFromAward(award);
};

const ingestAwards = async (
    db: Kysely<Database>,
    procurementDrafts: Map<string, ProcurementDraft>,
    organizationDrafts: Map<string, OrganizationDraft>
) => {
    const awardBatch = createBatch((rows: CreateAward[]) => db.insertInto('award').values(rows).execute());
    const supplierBatch = createBatch((rows: CreateAwardSupplier[]) => db.insertInto('awardSupplier').values(rows).execute());

    const flushRelated = async (force = false) => {
        const ready = force || awardBatch.size >= 1000 || supplierBatch.size >= 1000;
        if (!ready) {
            return;
        }
        await awardBatch.flush();
        await supplierBatch.flush();
    };

    for (const procurement of procurementDrafts.values()) {
        for (const lot of procurement.lots.values()) {
            if (lot.award == null || lot.id == null) {
                continue;
            }

            const awardId = Bun.randomUUIDv7();
            awardBatch.push({
                id: awardId,
                lotId: lot.id,
                resultStatus: lot.award.resultStatus,
                amount: lot.award.amount,
                currency: lot.award.currency,
                contractTitle: lot.award.contractTitle,
                contractDate: lot.award.contractDate,
                tendersCount: lot.award.tendersCount,
                smeTendersCount: lot.award.smeTendersCount,
                frameworkMaxAmount: lot.award.frameworkMaxAmount
            });

            const seenSuppliers = new Set<string>();
            for (const supplier of lot.award.suppliers) {
                if (seenSuppliers.has(supplier.registryCode)) {
                    continue;
                }
                seenSuppliers.add(supplier.registryCode);
                const organizationId = organizationDrafts.get(supplier.registryCode)?.id;
                if (organizationId == null) {
                    continue;
                }
                supplierBatch.push({
                    awardId,
                    organizationId,
                    isGroupLead: supplier.isGroupLead
                });
            }
        }

        await flushRelated();
    }

    await flushRelated(true);

    log(`Added ${awardBatch.inserted} awards to the database`);
    log(`Added ${supplierBatch.inserted} award suppliers to the database`);
};

export { lotStatusFromAward, parseAwards, applyAwardToLot, ingestAwards };
