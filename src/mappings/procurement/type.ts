const procurementTypeMapping = {
    services: 'Services',
    supplies: 'Supplies',
    works: 'Works'
} as const;

type ProcurementTypeCode = keyof typeof procurementTypeMapping;
type ProcurementType = (typeof procurementTypeMapping)[ProcurementTypeCode];

export { procurementTypeMapping };

export type { ProcurementTypeCode, ProcurementType };
