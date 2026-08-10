import { db } from '../db';

const json = (data: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
});

const notFound = (label: string) => ({
    content: [{ type: 'text' as const, text: `${label} not found` }],
    isError: true as const
});

const findOrganization = ({ id, registryCode }: { id?: string | undefined; registryCode?: string | undefined }) => {
    if (id != null) {
        return db.selectFrom('organization').selectAll().where('id', '=', id).executeTakeFirst();
    }
    if (registryCode != null) {
        return db.selectFrom('organization').selectAll().where('registryCode', '=', registryCode).executeTakeFirst();
    }
    return Promise.resolve(undefined);
};

export { json, notFound, findOrganization };
