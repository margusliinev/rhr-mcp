const procurementProcedureMapping = {
    'comp-dial': 'Competitive dialogue',
    innovation: 'Innovation partnership',
    'neg-w-call': 'Negotiated with prior call',
    'neg-wo-call': 'Negotiated without prior call',
    open: 'Open',
    'oth-mult': 'Other multiple stage',
    'oth-single': 'Other single stage',
    restricted: 'Restricted'
} as const;

type ProcurementProcedureCode = keyof typeof procurementProcedureMapping;
type ProcurementProcedure = (typeof procurementProcedureMapping)[ProcurementProcedureCode];

export { procurementProcedureMapping };

export type { ProcurementProcedureCode, ProcurementProcedure };
