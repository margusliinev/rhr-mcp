const isTagOpenBoundary = (char: string | undefined) =>
    char === '>' || char === ' ' || char === '\n' || char === '\r' || char === '\t' || char === '/';

async function* iterateXmlRecords(filePath: string, tag: string) {
    const openPrefix = `<${tag}`;
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
            const start = buffer.indexOf(openPrefix);
            if (start === -1) {
                buffer = buffer.length > openPrefix.length ? buffer.slice(-(openPrefix.length - 1)) : buffer;
                break;
            }
            if (start > 0) {
                buffer = buffer.slice(start);
            }
            if (!isTagOpenBoundary(buffer[openPrefix.length])) {
                buffer = buffer.slice(openPrefix.length);
                continue;
            }
            const end = buffer.indexOf(close);
            if (end === -1) {
                break;
            }
            const recordXml = buffer.slice(0, end + close.length);
            buffer = buffer.slice(end + close.length);
            yield Bun.XML.parse(recordXml);
        }
    }

    decoder.decode();
}

export { iterateXmlRecords };
