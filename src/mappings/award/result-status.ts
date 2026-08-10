const awardResultStatusMapping = {
    'clos-nw': 'Closed, no winner',
    'selec-w': 'Winner selected'
} as const;

type AwardResultStatusCode = keyof typeof awardResultStatusMapping;
type AwardResultStatus = (typeof awardResultStatusMapping)[AwardResultStatusCode];

export { awardResultStatusMapping };

export type { AwardResultStatusCode, AwardResultStatus };
