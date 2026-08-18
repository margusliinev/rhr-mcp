import {
    hostHeaderValidationResponse,
    localhostAllowedHostnames,
    localhostAllowedOrigins,
    originValidationResponse
} from '@modelcontextprotocol/server';
import { handler } from './mcp/handler';
import { serve } from 'bun';
import { env } from './lib/env';
import { log } from './lib/log';
import { db } from './db/index';

const allowedHosts = localhostAllowedHostnames();
const allowedOrigins = localhostAllowedOrigins();

const server = serve({
    port: env.PORT,
    development: env.NODE_ENV !== 'production',
    routes: {
        '/health': new Response('OK'),
        '/mcp': (request) => {
            const hostError = hostHeaderValidationResponse(request, allowedHosts);
            if (hostError) return hostError;

            const originError = originValidationResponse(request, allowedOrigins);
            if (originError) return originError;

            return handler.fetch(request);
        }
    },
    fetch() {
        return new Response('Not Found');
    },
    error(err) {
        console.error(err);
        return new Response('Internal Server Error');
    }
});

const shutdown = async () => {
    await server.stop();
    await handler.close();
    await db.destroy();
    process.exit(0);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

log(`Server running at ${server.url.href}`);
