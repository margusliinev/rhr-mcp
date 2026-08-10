const lotStatusValues = ['awarded', 'cancelled', 'no_winner', 'open'] as const;

type LotStatus = (typeof lotStatusValues)[number];

export { lotStatusValues };

export type { LotStatus };
