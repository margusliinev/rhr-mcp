import type { McpServer } from '@modelcontextprotocol/server';
import { registerGetTools } from './get';
import { registerListTools } from './list';
import { registerSearchTools } from './search';

const registerTools = (server: McpServer) => {
    registerGetTools(server);
    registerListTools(server);
    registerSearchTools(server);
};

export { registerTools };
