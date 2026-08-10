import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { registerTools } from './tools';

const handler = createMcpHandler(() => {
    const server = new McpServer(
        {
            name: 'rhr-mcp',
            version: '1.0.0',
            title: 'RHR MCP',
            description: 'Public Procurement Registry MCP'
        },
        {
            instructions:
                'Query Public Procurement Registry data via the available tools. Prefer returned ids and registry codes for follow-ups. Use only schema enum values; never invent codes or filters.'
        }
    );
    registerTools(server);
    return server;
});

export { handler };
