import type { NoticeDrafts, OrganizationDraft, ProcurementDraft } from './drafts';
import { log } from './log';
import { mergeNotice } from './merge-notice';
import { parseNotice } from './parse-notice';
import { getNoticeRoot, listNoticeFiles } from './util';
import { iterateXmlRecords } from './xml';

const loadNoticeDrafts = async () => {
    const organizationDrafts = new Map<string, OrganizationDraft>();
    const procurementDrafts = new Map<string, ProcurementDraft>();
    const files = await listNoticeFiles();

    log(`Parsing ${files.length} notice files`);

    for (const file of files) {
        let count = 0;
        for await (const document of iterateXmlRecords(file.path, file.tag)) {
            const root = getNoticeRoot(document, file.tag);
            if (root == null) {
                continue;
            }

            const notice = parseNotice(root, file.kind);
            if (notice == null) {
                continue;
            }

            const current = procurementDrafts.get(notice.folderId) ?? null;
            procurementDrafts.set(notice.folderId, mergeNotice(current, notice, organizationDrafts));
            count += 1;
        }
        log(`Parsed ${count} notices from ${file.path.split('/').slice(-2).join('/')}`);
    }

    return { organizationDrafts, procurementDrafts } satisfies NoticeDrafts;
};

export { loadNoticeDrafts };
