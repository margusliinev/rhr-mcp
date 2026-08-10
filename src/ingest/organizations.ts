import type { CreateOrganization, Database } from '../db/schema';
import type { OrganizationCountry } from '../mappings';
import type { OrganizationDraft } from './drafts';
import type { XmlNode } from './util';
import type { Kysely } from 'kysely';
import { log } from '../log';
import { createBatch } from './batch';
import { mapCountry } from './map';
import { asItems, get, getNode, getText } from './util';

const NOISE_REGISTRY_CODES = new Set(['TED64', '1000123']);

type ParsedOrganization = {
    registryCode: string;
    name: string;
    city: string | null;
    country: OrganizationCountry | null;
};

const collectOrganizations = (extension: XmlNode | null) => {
    const byOrgId = new Map<string, ParsedOrganization>();
    for (const organization of asItems(get(getNode(extension, 'Organizations'), 'Organization'))) {
        const company = getNode(organization, 'Company');
        if (company == null) {
            continue;
        }
        const orgId = getText(getNode(company, 'PartyIdentification'), 'ID');
        const registryCode = getText(getNode(company, 'PartyLegalEntity'), 'CompanyID');
        const name = getText(getNode(company, 'PartyName'), 'Name');
        if (orgId == null || registryCode == null || name == null) {
            continue;
        }
        const address = getNode(company, 'PostalAddress');
        byOrgId.set(orgId, {
            registryCode,
            name,
            city: getText(address, 'CityName'),
            country: mapCountry(getText(getNode(address, 'Country'), 'IdentificationCode'))
        });
    }
    return byOrgId;
};

const ensureOrganizationDrafts = (
    drafts: Map<string, OrganizationDraft>,
    organizations: Map<string, ParsedOrganization>,
    registryCodes: Iterable<string>
) => {
    const byRegistry = new Map([...organizations.values()].map((organization) => [organization.registryCode, organization]));
    for (const registryCode of registryCodes) {
        if (NOISE_REGISTRY_CODES.has(registryCode)) {
            continue;
        }
        const organization = byRegistry.get(registryCode);
        if (organization == null) {
            continue;
        }
        const existing = drafts.get(registryCode);
        if (existing == null) {
            drafts.set(registryCode, {
                id: Bun.randomUUIDv7(),
                registryCode: organization.registryCode,
                name: organization.name,
                city: organization.city,
                country: organization.country
            });
            continue;
        }
        existing.name = organization.name;
        if (organization.city != null) {
            existing.city = organization.city;
        }
        if (organization.country != null) {
            existing.country = organization.country;
        }
    }
};

const ingestOrganizations = async (db: Kysely<Database>, organizationDrafts: Map<string, OrganizationDraft>) => {
    const organizationBatch = createBatch((rows: CreateOrganization[]) => db.insertInto('organization').values(rows).execute());
    for (const organization of organizationDrafts.values()) {
        organizationBatch.push(organization);
        if (organizationBatch.size >= 1000) {
            await organizationBatch.flush();
        }
    }
    await organizationBatch.flush();
    log(`Added ${organizationBatch.inserted} organizations to the database`);
};

export { collectOrganizations, ensureOrganizationDrafts, ingestOrganizations };
export type { ParsedOrganization };
