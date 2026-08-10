import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

type Timestamps = {
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
};

type OrganizationTable = {
    id: string;
    registryCode: string;
    name: string;
    city: string | null;
    country: string | null;
    street: string | null;
    postalZone: string | null;
    website: string | null;
    sizeCode: string | null;
} & Timestamps;

type ProcurementTable = {
    id: string;
    rhrId: string | null;
    eformsId: string | null;
    folderId: string;
    title: string;
    description: string | null;
    type: string | null;
    procedureCode: string | null;
    mainCpv: string | null;
    estimatedValue: string | null;
    currency: string | null;
    frameworkType: string | null;
    regulatoryDomain: string | null;
    buyerActivity: string | null;
    periodStart: Date | null;
    periodEnd: Date | null;
    durationMonths: number | null;
    submissionDeadline: Date | null;
    status: string | null;
    publishedAt: Date | null;
    documentsUrl: string | null;
} & Timestamps;

type ProcurementBuyerTable = {
    procurementId: string;
    organizationId: string;
    buyerType: string | null;
} & Timestamps;

type LotTable = {
    id: string;
    procurementId: string;
    lotCode: string;
    title: string | null;
    description: string | null;
    mainCpv: string | null;
    estimatedValue: string | null;
    currency: string | null;
    submissionDeadline: Date | null;
    nutsCode: string | null;
    locationText: string | null;
    status: string | null;
} & Timestamps;

type AwardTable = {
    id: string;
    lotId: string;
    resultStatus: string | null;
    amount: string | null;
    currency: string | null;
    tendersCount: number | null;
    smeTendersCount: number | null;
    contractTitle: string | null;
    contractDate: Date | null;
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

type UpdateOrganization = Updateable<OrganizationTable>;
type UpdateProcurement = Updateable<ProcurementTable>;
type UpdateLot = Updateable<LotTable>;
type UpdateAward = Updateable<AwardTable>;

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
    CreateAwardSupplier,
    UpdateOrganization,
    UpdateProcurement,
    UpdateLot,
    UpdateAward
};
