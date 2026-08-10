const parseXml = (xml: string): unknown => {
    const xmlApi = Reflect.get(Bun, 'XML');
    if (xmlApi == null || typeof xmlApi !== 'object' || !('parse' in xmlApi)) {
        throw new TypeError('Bun.XML is unavailable');
    }
    const parse = Reflect.get(xmlApi, 'parse');
    if (typeof parse !== 'function') {
        throw new TypeError('Bun.XML.parse is unavailable');
    }
    return parse.call(xmlApi, xml);
};

async function* iterateXmlRecords(filePath: string, tag: string) {
    const open = `<${tag}>`;
    const close = `</${tag}>`;
    const stream = Bun.file(filePath).stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });

        while (true) {
            const start = buffer.indexOf(open);
            if (start === -1) {
                buffer = buffer.length > open.length ? buffer.slice(-(open.length - 1)) : buffer;
                break;
            }
            if (start > 0) {
                buffer = buffer.slice(start);
            }
            const end = buffer.indexOf(close);
            if (end === -1) {
                break;
            }
            const recordXml = buffer.slice(0, end + close.length);
            buffer = buffer.slice(end + close.length);
            yield parseXml(recordXml);
        }
    }

    decoder.decode();
}

export { iterateXmlRecords };
