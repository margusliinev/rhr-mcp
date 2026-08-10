import { z } from 'zod';

const getOrganizationInputSchema = z
    .object({
        id: z.uuid({ version: 'v7' }).optional().describe('Organization id'),
        registryCode: z.string().min(1).optional().describe('Business registry code')
    })
    .refine((value) => (value.id == null) !== (value.registryCode == null), {
        message: 'Provide exactly one of id or registryCode'
    });

export { getOrganizationInputSchema };
