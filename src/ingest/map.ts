import type { Currency } from '../mappings';
import type { XmlNode } from './util';
import {
    awardResultStatusMapping,
    currencyValues,
    organizationCountryValues,
    procurementBuyerActivityMapping,
    procurementBuyerTypeMapping,
    procurementFrameworkTypeMapping,
    procurementProcedureMapping,
    procurementTypeMapping
} from '../mappings';
import { get, getAttr, getText, text } from './util';
import { isKeyOf, isOneOf } from './is-key-of';

const textOrNull = (value: unknown) => text(value);

const mapCurrency = (value: string | null) => (value != null && isOneOf(currencyValues, value) ? value : null);

const mapCountry = (value: string | null) => (value != null && isOneOf(organizationCountryValues, value) ? value : null);

const mapType = (value: string | null) => (value != null && isKeyOf(procurementTypeMapping, value) ? procurementTypeMapping[value] : null);

const mapProcedure = (value: string | null) =>
    value != null && isKeyOf(procurementProcedureMapping, value) ? procurementProcedureMapping[value] : null;

const mapFrameworkType = (value: string | null) => {
    if (value == null || value === 'none') {
        return null;
    }
    return isKeyOf(procurementFrameworkTypeMapping, value) ? procurementFrameworkTypeMapping[value] : null;
};

const mapBuyerActivity = (value: string | null) =>
    value != null && isKeyOf(procurementBuyerActivityMapping, value) ? procurementBuyerActivityMapping[value] : null;

const mapBuyerType = (value: string | null) =>
    value != null && isKeyOf(procurementBuyerTypeMapping, value) ? procurementBuyerTypeMapping[value] : null;

const mapResultStatus = (value: string | null) =>
    value != null && isKeyOf(awardResultStatusMapping, value) ? awardResultStatusMapping[value] : null;

const parseAmount = (node: XmlNode | null) => {
    if (node == null) {
        return { amount: null, currency: null as Currency | null };
    }
    const amount = getText(node, 'PayableAmount') ?? getText(node, 'EstimatedOverallContractAmount') ?? getText(node, 'MaximumValueAmount');
    const currency = mapCurrency(
        getAttr(get(node, 'PayableAmount') ?? get(node, 'EstimatedOverallContractAmount') ?? get(node, 'MaximumValueAmount'), 'currencyID')
    );
    return { amount, currency };
};

export {
    textOrNull,
    mapCurrency,
    mapCountry,
    mapType,
    mapProcedure,
    mapFrameworkType,
    mapBuyerActivity,
    mapBuyerType,
    mapResultStatus,
    parseAmount
};
