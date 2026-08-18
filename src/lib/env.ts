import { z } from 'zod';

const schema = z.object({
    PORT: z.coerce.number().min(1).max(65_535),
    NODE_ENV: z.enum(['development', 'production']),
    DATABASE_URL: z.url()
});

export const env = schema.parse(process.env);
