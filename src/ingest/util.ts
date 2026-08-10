type XmlNode = Record<string, unknown>;

const text = (value: unknown) => {
    if (value == null) {
        return null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
    }
    if (typeof value === 'object' && value !== null && '#text' in value) {
        return text(value['#text']);
    }
    return null;
};

const isXmlNode = (value: unknown): value is XmlNode => value != null && typeof value === 'object' && !Array.isArray(value);

const asItems = (value: unknown): XmlNode[] => {
    if (value == null || value === '') {
        return [];
    }
    if (Array.isArray(value)) {
        return value.filter((item) => isXmlNode(item));
    }
    if (isXmlNode(value)) {
        return [value];
    }
    return [];
};

const parseDate = (value: string | null) => {
    if (value == null) {
        return null;
    }
    const match = /^(?<day>\d{2})\.(?<month>\d{2})\.(?<year>\d{4})$/u.exec(value);
    const day = match?.groups?.['day'];
    const month = match?.groups?.['month'];
    const year = match?.groups?.['year'];
    if (day == null || month == null || year == null) {
        return null;
    }
    try {
        return Temporal.PlainDate.from(
            {
                year: Number(year),
                month: Number(month),
                day: Number(day)
            },
            { overflow: 'reject' }
        ).toString();
    } catch {
        return null;
    }
};

const dataPath = (fileName: string) => `${import.meta.dirname}/../../data/${fileName}`;

export type { XmlNode };
export { text, asItems, parseDate, dataPath, isXmlNode };
