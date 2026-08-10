const currencyValues = ['EUR'] as const;

type Currency = (typeof currencyValues)[number];

export { currencyValues };

export type { Currency };
