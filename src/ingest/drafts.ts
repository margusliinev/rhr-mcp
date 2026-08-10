import type { CreateOrganization } from '../db/schema';
import type {
    AwardResultStatus,
    Currency,
    LotStatus,
    ProcurementBuyerActivity,
    ProcurementBuyerType,
    ProcurementFrameworkType,
    ProcurementProcedure,
    ProcurementStatus,
    ProcurementType
} from '../mappings';

type OrganizationDraft = CreateOrganization;

type BuyerDraft = {
    registryCode: string;
    buyerType: ProcurementBuyerType | null;
};

type SupplierDraft = {
    registryCode: string;
    isGroupLead: boolean;
};

type AwardDraft = {
    resultStatus: AwardResultStatus | null;
    amount: string | null;
    currency: Currency | null;
    contractTitle: string | null;
    contractDate: Date | null;
    tendersCount: number | null;
    smeTendersCount: number | null;
    frameworkMaxAmount: string | null;
    suppliers: SupplierDraft[];
};

type LotDraft = {
    id?: string;
    lotCode: string;
    title: string | null;
    description: string | null;
    status: LotStatus;
    mainCpv: string | null;
    estimatedValue: string | null;
    currency: Currency | null;
    nutsCode: string | null;
    locationText: string | null;
    submissionDeadline: Date | null;
    award: AwardDraft | null;
};

type ProcurementDraft = {
    id: string;
    folderId: string;
    rhrId: string | null;
    eformsId: string | null;
    title: string;
    description: string | null;
    status: ProcurementStatus;
    type: ProcurementType | null;
    procedureCode: ProcurementProcedure | null;
    mainCpv: string | null;
    estimatedValue: string | null;
    currency: Currency | null;
    frameworkType: ProcurementFrameworkType | null;
    buyerActivity: ProcurementBuyerActivity | null;
    periodStart: Date | null;
    periodEnd: Date | null;
    submissionDeadline: Date | null;
    documentsUrl: string | null;
    publishedAt: Date | null;
    buyers: Map<string, BuyerDraft>;
    lots: Map<string, LotDraft>;
    htRank: string | null;
    hlstRank: string | null;
};

type NoticeDrafts = {
    organizationDrafts: Map<string, OrganizationDraft>;
    procurementDrafts: Map<string, ProcurementDraft>;
};

export type { OrganizationDraft, BuyerDraft, SupplierDraft, AwardDraft, LotDraft, ProcurementDraft, NoticeDrafts };
