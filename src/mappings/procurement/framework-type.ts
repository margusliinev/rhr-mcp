const procurementFrameworkTypeMapping = {
    'fa-mix': 'Framework mixed reopening',
    'fa-w-rc': 'Framework with reopening',
    'fa-wo-rc': 'Framework without reopening',
    'dps-list': 'DPS with publish list',
    'dps-nlist': 'DPS without publish list'
} as const;

type ProcurementFrameworkTypeCode = keyof typeof procurementFrameworkTypeMapping;
type ProcurementFrameworkType = (typeof procurementFrameworkTypeMapping)[ProcurementFrameworkTypeCode];

export { procurementFrameworkTypeMapping };

export type { ProcurementFrameworkTypeCode, ProcurementFrameworkType };
