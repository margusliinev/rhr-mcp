const procurementStatusValues = ['awarded', 'cancelled', 'no_winner', 'published'] as const;

type ProcurementStatus = (typeof procurementStatusValues)[number];

export { procurementStatusValues };

export type { ProcurementStatus };
