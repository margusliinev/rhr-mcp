import { z } from 'zod';

const getOrganizationInputSchema = z
    .object({
        id: z.uuid({ version: 'v7' }).optional().describe('Organization id'),
        registryCode: z.string().min(1).optional().describe('Business registry code')
    })
    .refine((value) => (value.id == null) !== (value.registryCode == null), {
        message: 'Provide exactly one of id or registryCode'
    });

const getProcurementInputSchema = z
    .object({
        id: z.uuid({ version: 'v7' }).optional().describe('Procurement id'),
        rhrId: z.string().min(1).optional().describe('RHR procurement id from the public UI URL'),
        folderId: z.uuid().optional().describe('Contract folder id linking notice versions')
    })
    .refine((value) => [value.id, value.rhrId, value.folderId].filter((item) => item != null).length === 1, {
        message: 'Provide exactly one of id, rhrId, or folderId'
    });

const getAwardInputSchema = z.object({
    id: z.uuid({ version: 'v7' }).describe('Award id')
});

export { getOrganizationInputSchema, getProcurementInputSchema, getAwardInputSchema };
