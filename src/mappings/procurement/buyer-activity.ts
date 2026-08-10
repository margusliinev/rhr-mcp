const procurementBuyerActivityMapping = {
    airport: 'Airport-related activities',
    defence: 'Defence',
    'econ-aff': 'Economic affairs',
    education: 'Education',
    electricity: 'Electricity',
    'env-pro': 'Environmental protection',
    'gas-heat': 'Gas and heat',
    'gen-pub': 'General public services',
    'hc-am': 'Housing and community amenities',
    health: 'Health',
    port: 'Port-related activities',
    post: 'Postal services',
    'pub-os': 'Public order and safety',
    rail: 'Railway services',
    rcr: 'Recreation, culture and religion',
    'soc-pro': 'Social protection',
    'solid-fuel': 'Solid fuels',
    urttb: 'Urban railway, tram, trolleybus or bus',
    water: 'Water'
} as const;

type ProcurementBuyerActivityCode = keyof typeof procurementBuyerActivityMapping;
type ProcurementBuyerActivity = (typeof procurementBuyerActivityMapping)[ProcurementBuyerActivityCode];

export { procurementBuyerActivityMapping };

export type { ProcurementBuyerActivityCode, ProcurementBuyerActivity };
