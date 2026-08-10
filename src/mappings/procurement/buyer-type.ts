const procurementBuyerTypeMapping = {
    'body-pl': 'Body governed by public law',
    'body-pl-cga': 'Body governed by public law (central government)',
    'body-pl-la': 'Body governed by public law (local authority)',
    cga: 'Central government authority',
    'cont-ent': 'Contracting entity',
    'eu-ins-bod-ag': 'EU institution or agency',
    la: 'Local authority',
    'not-cont-ent': 'Not a contracting entity',
    'org-sub': 'Subsidised organisation',
    'org-sub-cga': 'Subsidised organisation (central government)',
    'org-sub-la': 'Subsidised organisation (local authority)',
    'pub-undert': 'Public undertaking'
} as const;

type ProcurementBuyerTypeCode = keyof typeof procurementBuyerTypeMapping;
type ProcurementBuyerType = (typeof procurementBuyerTypeMapping)[ProcurementBuyerTypeCode];

export { procurementBuyerTypeMapping };

export type { ProcurementBuyerTypeCode, ProcurementBuyerType };
