import type {
    AwardResultStatus,
    Currency,
    LotStatus,
    OrganizationCountry,
    ProcurementBuyerActivity,
    ProcurementBuyerType,
    ProcurementFrameworkType,
    ProcurementProcedure,
    ProcurementStatus,
    ProcurementType
} from '../mappings';
import type { Generated, Insertable, Selectable } from 'kysely';

type Timestamps = {
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
};

type OrganizationTable = {
    id: string;
    registryCode: string;
    name: string;
    city: string | null;
    country: OrganizationCountry | null;
} & Timestamps;

type ProcurementTable = {
    id: string;
    rhrId: string | null;
    folderId: string;
    eformsId: string | null;
    title: string;
    description: string | null;
    status: ProcurementStatus | null;
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
} & Timestamps;

type ProcurementBuyerTable = {
    procurementId: string;
    organizationId: string;
    buyerType: ProcurementBuyerType | null;
} & Timestamps;

type LotTable = {
    id: string;
    procurementId: string;
    lotCode: string;
    title: string | null;
    description: string | null;
    status: LotStatus | null;
    mainCpv: string | null;
    estimatedValue: string | null;
    currency: Currency | null;
    nutsCode: string | null;
    locationText: string | null;
    submissionDeadline: Date | null;
} & Timestamps;

type AwardTable = {
    id: string;
    lotId: string;
    resultStatus: AwardResultStatus | null;
    amount: string | null;
    currency: Currency | null;
    contractTitle: string | null;
    contractDate: Date | null;
    tendersCount: number | null;
    smeTendersCount: number | null;
    frameworkMaxAmount: string | null;
} & Timestamps;

type AwardSupplierTable = {
    awardId: string;
    organizationId: string;
    isGroupLead: Generated<boolean>;
} & Timestamps;

type Database = {
    organization: OrganizationTable;
    procurement: ProcurementTable;
    procurementBuyer: ProcurementBuyerTable;
    lot: LotTable;
    award: AwardTable;
    awardSupplier: AwardSupplierTable;
};

type Organization = Selectable<OrganizationTable>;
type Procurement = Selectable<ProcurementTable>;
type ProcurementBuyer = Selectable<ProcurementBuyerTable>;
type Lot = Selectable<LotTable>;
type Award = Selectable<AwardTable>;
type AwardSupplier = Selectable<AwardSupplierTable>;

type CreateOrganization = Insertable<OrganizationTable>;
type CreateProcurement = Insertable<ProcurementTable>;
type CreateProcurementBuyer = Insertable<ProcurementBuyerTable>;
type CreateLot = Insertable<LotTable>;
type CreateAward = Insertable<AwardTable>;
type CreateAwardSupplier = Insertable<AwardSupplierTable>;

export type {
    Database,
    Organization,
    Procurement,
    ProcurementBuyer,
    Lot,
    Award,
    AwardSupplier,
    CreateOrganization,
    CreateProcurement,
    CreateProcurementBuyer,
    CreateLot,
    CreateAward,
    CreateAwardSupplier
};
