import type { McpServer } from '@modelcontextprotocol/server';
import { getOrganizationInputSchema } from '../schemas/get';
import { findOrganization, json, notFound } from '../util';

const registerGetTools = (server: McpServer) => {
    server.registerTool(
        'get-organization',
        {
            description: 'Get an organization by id or registry code.',
            inputSchema: getOrganizationInputSchema,
            annotations: { readOnlyHint: true }
        },
        async (args) => {
            const organization = await findOrganization(args);
            return organization == null ? notFound('Organization') : json(organization);
        }
    );
};

export { registerGetTools };
