import type { McpServer } from '@modelcontextprotocol/server';
import { registerSearchTools } from './search';
import { registerListTools } from './list';
import { registerGetTools } from './get';

const registerTools = (server: McpServer) => {
    registerGetTools(server);
    registerListTools(server);
    registerSearchTools(server);
};

export { registerTools };
