type XmlNode = Record<string, unknown>;

type NoticeFile = {
    path: string;
    tag: 'ContractNotice' | 'ContractAwardNotice';
    kind: 'ht' | 'hlst';
};

const isXmlNode = (value: unknown): value is XmlNode => value != null && typeof value === 'object' && !Array.isArray(value);

const text = (value: unknown): string | null => {
    if (value == null) {
        return null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
    }
    if (Array.isArray(value)) {
        let fallback: string | null = null;
        for (const item of value) {
            const language = isXmlNode(item) ? text(item['@languageID']) : null;
            const itemText = text(item);
            if (itemText == null) {
                continue;
            }
            if (language === 'EST') {
                return itemText;
            }
            fallback ??= itemText;
        }
        return fallback;
    }
    if (typeof value === 'object' && '#text' in value) {
        return text(value['#text']);
    }
    return null;
};

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

const localName = (key: string) => {
    const index = key.lastIndexOf(':');
    return index === -1 ? key : key.slice(index + 1);
};

const get = (node: XmlNode | null | undefined, name: string) => {
    if (node == null) {
        return undefined;
    }
    if (name in node) {
        return node[name];
    }
    for (const [key, value] of Object.entries(node)) {
        if (key.startsWith('@')) {
            continue;
        }
        if (localName(key) === name) {
            return value;
        }
    }
    return undefined;
};

const getNode = (node: XmlNode | null | undefined, name: string) => {
    const value = get(node, name);
    return isXmlNode(value) ? value : null;
};

const getText = (node: XmlNode | null | undefined, name: string) => text(get(node, name));

const getAttr = (value: unknown, name: string) => {
    if (!isXmlNode(value)) {
        return null;
    }
    const key = name.startsWith('@') ? name : `@${name}`;
    if (key in value) {
        return text(value[key]);
    }
    return null;
};

const getCodedText = (node: XmlNode | null | undefined, name: string, listName: string) => {
    for (const item of asItems(get(node, name))) {
        if (getAttr(item, 'listName') === listName) {
            return text(item);
        }
    }
    const value = get(node, name);
    if (!Array.isArray(value) && getAttr(value, 'listName') === listName) {
        return text(value);
    }
    if (!Array.isArray(value) && isXmlNode(value) && getAttr(value, 'listName') == null) {
        return text(value);
    }
    if (typeof value === 'string') {
        return text(value);
    }
    return null;
};

const parseInstant = (dateValue: string | null, timeValue: string | null = null) => {
    if (dateValue == null) {
        return null;
    }

    const dateMatch = /^(?<ymd>\d{4}-\d{2}-\d{2})(?<tz>[Zz]|[+-]\d{2}:\d{2})?$/u.exec(dateValue);
    if (dateMatch == null) {
        return null;
    }

    const ymd = dateMatch.groups?.['ymd'];
    if (ymd == null) {
        return null;
    }

    if (timeValue != null) {
        const timeMatch = /^(?<hms>\d{2}:\d{2}:\d{2}(?:\.\d+)?)(?<tz>[Zz]|[+-]\d{2}:\d{2})?$/u.exec(timeValue);
        const hms = timeMatch?.groups?.['hms'];
        if (hms != null) {
            const tz = timeMatch?.groups?.['tz'] ?? dateMatch.groups?.['tz'] ?? 'Z';
            const ms = Date.parse(`${ymd}T${hms}${tz}`);
            return Number.isNaN(ms) ? null : new Date(ms);
        }
    }

    const tz = dateMatch.groups?.['tz'] ?? 'Z';
    const ms = Date.parse(`${ymd}T00:00:00${tz}`);
    return Number.isNaN(ms) ? null : new Date(ms);
};

const parseRhrId = (uri: string | null) => {
    if (uri == null) {
        return null;
    }
    const match = /\/procurement\/(?<id>\d+)\//u.exec(uri);
    return match?.groups?.['id'] ?? null;
};

const parseEformsId = (value: string | null) => {
    if (value == null) {
        return null;
    }
    return value.replace(/-\d{4}$/u, '');
};

const noticeRank = (versionId: string | null, issuedAt: Date | null) => {
    const version = (versionId ?? '00').padStart(4, '0');
    const issued = issuedAt?.toISOString() ?? '';
    return `${version}|${issued}`;
};

const dataPath = (...parts: string[]) => `${import.meta.dirname}/../../data/${parts.join('/')}`;

const parseNoticeFileName = (name: string) => {
    const match = /^(?<kind>HT|HLST)_(?<year>\d{4})_(?<month>\d{1,2})\.xml$/u.exec(name);
    if (match?.groups == null) {
        return null;
    }

    return {
        kind: match.groups['kind'] === 'HLST' ? 1 : 0,
        year: Number(match.groups['year']),
        month: Number(match.groups['month'])
    };
};

const compareNoticeFileNames = (leftName: string, rightName: string) => {
    const left = parseNoticeFileName(leftName);
    const right = parseNoticeFileName(rightName);
    if (left == null || right == null) {
        return leftName.localeCompare(rightName);
    }
    return left.year - right.year || left.month - right.month || left.kind - right.kind || leftName.localeCompare(rightName);
};

const listNoticeFiles = async () => {
    const root = dataPath();
    const xmlEntries = await Array.fromAsync(new Bun.Glob('*.xml').scan({ cwd: root }));
    const names = xmlEntries.toSorted(compareNoticeFileNames);

    const files: NoticeFile[] = [];

    for (const name of names) {
        const parts = parseNoticeFileName(name);
        if (parts == null) {
            continue;
        }

        if (name.startsWith('HT_')) {
            files.push({ path: dataPath(name), tag: 'ContractNotice', kind: 'ht' });
        } else if (name.startsWith('HLST_')) {
            files.push({ path: dataPath(name), tag: 'ContractAwardNotice', kind: 'hlst' });
        }
    }

    return files;
};

const getNoticeRoot = (document: unknown, tag: string) => {
    if (!isXmlNode(document)) {
        return null;
    }
    const nested = document[tag];
    if (isXmlNode(nested)) {
        return nested;
    }
    return document;
};

const getExtension = (notice: XmlNode) => {
    const extensions = asItems(get(getNode(notice, 'UBLExtensions'), 'UBLExtension'));
    for (const extension of extensions) {
        const content = getNode(extension, 'ExtensionContent');
        const eforms = getNode(content, 'EformsExtension');
        if (eforms != null) {
            return eforms;
        }
    }
    return null;
};

const hasPrivacy = (node: XmlNode | null | undefined, codes?: readonly string[]) => {
    const items = asItems(get(node, 'FieldsPrivacy'));
    if (items.length === 0) {
        return false;
    }
    if (codes == null) {
        return true;
    }
    return items.some((item) => {
        const code = getText(item, 'FieldIdentifierCode');
        return code != null && codes.includes(code);
    });
};

export type { XmlNode };
export {
    text,
    asItems,
    get,
    getNode,
    getText,
    getAttr,
    getCodedText,
    parseInstant,
    parseRhrId,
    parseEformsId,
    noticeRank,
    listNoticeFiles,
    getNoticeRoot,
    getExtension,
    hasPrivacy
};
