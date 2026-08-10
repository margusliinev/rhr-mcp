import { z } from 'zod';
import { awardResultStatusMapping, lotStatusValues, procurementStatusValues, procurementTypeMapping } from '../../mappings';

const listOrganizationProcurementsInputSchema = z
    .object({
        id: z.uuid({ version: 'v7' }).optional().describe('Organization id'),
        registryCode: z.string().min(1).optional().describe('Business registry code'),
        status: z.enum(procurementStatusValues).optional().describe('Procurement status'),
        type: z.enum(Object.values(procurementTypeMapping)).optional().describe('Procurement type'),
        limit: z.number().int().min(1).max(1000).default(100).describe('Max results (default 100, max 1000)')
    })
    .refine((value) => (value.id == null) !== (value.registryCode == null), {
        message: 'Provide exactly one of id or registryCode'
    });

const listOrganizationAwardsInputSchema = z
    .object({
        id: z.uuid({ version: 'v7' }).optional().describe('Organization id'),
        registryCode: z.string().min(1).optional().describe('Business registry code'),
        resultStatus: z.enum(Object.values(awardResultStatusMapping)).optional().describe('Award result status'),
        minAmount: z.number().optional().describe('Minimum award amount'),
        maxAmount: z.number().optional().describe('Maximum award amount'),
        contractDateFrom: z.string().min(1).optional().describe('Contract date from (ISO date or datetime, inclusive)'),
        contractDateTo: z.string().min(1).optional().describe('Contract date to (ISO date or datetime, inclusive)'),
        limit: z.number().int().min(1).max(1000).default(100).describe('Max results (default 100, max 1000)')
    })
    .refine((value) => (value.id == null) !== (value.registryCode == null), {
        message: 'Provide exactly one of id or registryCode'
    });

const listProcurementLotsInputSchema = z
    .object({
        id: z.uuid({ version: 'v7' }).optional().describe('Procurement id'),
        rhrId: z.string().min(1).optional().describe('RHR procurement id from the public UI URL'),
        folderId: z.uuid().optional().describe('Contract folder id linking notice versions'),
        status: z.enum(lotStatusValues).optional().describe('Lot status'),
        limit: z.number().int().min(1).max(1000).default(100).describe('Max results (default 100, max 1000)')
    })
    .refine((value) => [value.id, value.rhrId, value.folderId].filter((item) => item != null).length === 1, {
        message: 'Provide exactly one of id, rhrId, or folderId'
    });

export { listOrganizationProcurementsInputSchema, listOrganizationAwardsInputSchema, listProcurementLotsInputSchema };
