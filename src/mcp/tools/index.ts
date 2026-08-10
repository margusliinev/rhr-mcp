import type { McpServer } from '@modelcontextprotocol/server';
import { registerGetTools } from './get';

const registerTools = (server: McpServer) => {
    registerGetTools(server);
};

export { registerTools };
