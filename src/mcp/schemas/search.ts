import { z } from 'zod';
import {
    awardResultStatusMapping,
    procurementBuyerActivityMapping,
    procurementFrameworkTypeMapping,
    procurementProcedureMapping,
    procurementStatusValues,
    procurementTypeMapping
} from '../../mappings';

const searchOrganizationsInputSchema = z.object({
    query: z.string().min(1).describe('Name or registry code substring'),
    limit: z.number().int().min(1).max(1000).default(100).describe('Max results (default 100, max 1000)')
});

const searchProcurementsInputSchema = z.object({
    query: z.string().min(1).optional().describe('Title or description substring'),
    status: z.enum(procurementStatusValues).optional().describe('Procurement status'),
    type: z.enum(Object.values(procurementTypeMapping)).optional().describe('Procurement type'),
    procedureCode: z.enum(Object.values(procurementProcedureMapping)).optional().describe('Procedure'),
    buyerActivity: z.enum(Object.values(procurementBuyerActivityMapping)).optional().describe('Buyer activity'),
    frameworkType: z.enum(Object.values(procurementFrameworkTypeMapping)).optional().describe('Framework or DPS type'),
    mainCpv: z.string().min(1).optional().describe('Exact main CPV code'),
    cpvPrefix: z.string().min(1).optional().describe('Main CPV code prefix (e.g. 72 for IT services)'),
    minEstimatedValue: z.number().optional().describe('Minimum estimated value'),
    maxEstimatedValue: z.number().optional().describe('Maximum estimated value'),
    submissionDeadlineFrom: z.string().min(1).optional().describe('Submission deadline from (ISO date or datetime, inclusive)'),
    submissionDeadlineTo: z.string().min(1).optional().describe('Submission deadline to (ISO date or datetime, inclusive)'),
    publishedFrom: z.string().min(1).optional().describe('Published from (ISO date or datetime, inclusive)'),
    publishedTo: z.string().min(1).optional().describe('Published to (ISO date or datetime, inclusive)'),
    buyerRegistryCode: z.string().min(1).optional().describe('Exact buyer business registry code'),
    limit: z.number().int().min(1).max(1000).default(100).describe('Max results (default 100, max 1000)')
});

const searchAwardsInputSchema = z.object({
    resultStatus: z.enum(Object.values(awardResultStatusMapping)).optional().describe('Award result status'),
    minAmount: z.number().optional().describe('Minimum award amount'),
    maxAmount: z.number().optional().describe('Maximum award amount'),
    contractDateFrom: z.string().min(1).optional().describe('Contract date from (ISO date or datetime, inclusive)'),
    contractDateTo: z.string().min(1).optional().describe('Contract date to (ISO date or datetime, inclusive)'),
    mainCpv: z.string().min(1).optional().describe('Exact lot or procurement main CPV code'),
    cpvPrefix: z.string().min(1).optional().describe('Lot or procurement main CPV code prefix (e.g. 72 for IT services)'),
    supplierRegistryCode: z.string().min(1).optional().describe('Exact winning supplier business registry code'),
    limit: z.number().int().min(1).max(1000).default(100).describe('Max results (default 100, max 1000)')
});

export { searchOrganizationsInputSchema, searchProcurementsInputSchema, searchAwardsInputSchema };
