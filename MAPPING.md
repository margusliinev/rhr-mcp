# RHR data mapping

Every table has `id` (except many-to-many join tables), `createdAt`, and `updatedAt`.

Source is eForms UBL XML (`eforms-sdk-1.9`). Paths use local names (no `cbc:` / `cac:` / `efac:` prefixes). Notices sit inside `<OPEN-DATA>` monthly files under `data/{year}/`.

## Relationships

```text
organization ──< procurementBuyer >── procurement ──< lot ──o award ──< awardSupplier >── organization
```

## Source files

| File                      | Root element          | Tables                                                                             |
| ------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `HT_{year}_{month}.xml`   | `ContractNotice`      | `organization`, `procurement`, `procurementBuyer`, `lot`                           |
| `HLST_{year}_{month}.xml` | `ContractAwardNotice` | `organization`, `procurement`, `procurementBuyer`, `lot`, `award`, `awardSupplier` |

Upsert from `HT_*`, enrich awards from `HLST_*` (match on `folderId`). Prefer the latest notice version on republication. HT owns core procurement fields when present; HLST fills gaps and supplies awards.

Always skip noise orgs: `TED64` (Riigihangete register), `1000123` (Riigihangete vaidlustuskomisjon).

Mapped code fields store the English label from `src/mappings` (not the raw eForms code). `frameworkType` source `none` → `null`. Multilingual text fields prefer Estonian (`languageID=EST`), otherwise the first value.

## `organization`

Join key: `CompanyID` → `registryCode`.

From `EformsExtension/Organizations/Organization/Company`. Only keep orgs that appear as a buyer or award winner. Referenced elsewhere as `ORG-0001`, etc.

Mappings: `src/mappings/organization/country.ts`.

| Source                                     | Database       |
| ------------------------------------------ | -------------- |
| `PartyLegalEntity/CompanyID`               | `registryCode` |
| `PartyName/Name`                           | `name`         |
| `PostalAddress/CityName`                   | `city`         |
| `PostalAddress/Country/IdentificationCode` | `country`      |

## `procurement`

Join key: `ContractFolderID` → `folderId` (links HT ↔ HLST).

Mappings: `src/mappings/procurement/type.ts`, `procedure.ts`, `framework-type.ts`, `buyer-activity.ts`, `status.ts`, `currency.ts`.

### Identifiers & documents

| Source                                                                 | Database       |
| ---------------------------------------------------------------------- | -------------- |
| `/procurement/{id}/` in `CallForTendersDocumentReference/.../URI` (HT) | `rhrId`        |
| `ContractFolderID`                                                     | `folderId`     |
| `ProcurementProject/ID` (strip lot suffix like `-0000`)                | `eformsId`     |
| `CallForTendersDocumentReference/.../URI` (HT)                         | `documentsUrl` |
| `IssueDate` (+ `IssueTime`)                                            | `publishedAt`  |

### Core fields

| Source                                                                   | Database             |
| ------------------------------------------------------------------------ | -------------------- |
| `ProcurementProject/Name`                                                | `title`              |
| `ProcurementProject/Description`                                         | `description`        |
| derived (`published` / `awarded` / `cancelled` / `no_winner`)            | `status`             |
| `ProcurementProject/ProcurementTypeCode` (`listName=contract-nature`)    | `type`               |
| `TenderingProcess/ProcedureCode`                                         | `procedureCode`      |
| `ProcurementProject/MainCommodityClassification/ItemClassificationCode`  | `mainCpv`            |
| `ProcurementProject/RequestedTenderTotal/EstimatedOverallContractAmount` | `estimatedValue`     |
| same `@currencyID`                                                       | `currency`           |
| lot `ContractingSystemTypeCode` (`framework-agreement` or `dps-usage`)   | `frameworkType`      |
| `ContractingParty/ContractingActivity/ActivityTypeCode`                  | `buyerActivity`      |
| `ProcurementProject/PlannedPeriod/StartDate`                             | `periodStart`        |
| `ProcurementProject/PlannedPeriod/EndDate`                               | `periodEnd`          |
| latest lot `TenderSubmissionDeadlinePeriod/EndDate` (+ `EndTime`)        | `submissionDeadline` |

`rhrId` / `documentsUrl` usually only on HT. Estimate / procedure / deadline may fall back to the first or latest lot when missing on the project root.

## `procurementBuyer`

Composite PK: `(procurementId, organizationId)`.

Mappings: `src/mappings/procurement/buyer-type.ts`.

| Source                                                      | Database         |
| ----------------------------------------------------------- | ---------------- |
| matched `procurement` via `folderId`                        | `procurementId`  |
| `ContractingParty` → `ORG-…` → `CompanyID` → `organization` | `organizationId` |
| `ContractingParty/ContractingPartyType/PartyTypeCode`       | `buyerType`      |

One row per `ContractingParty`.

## `lot`

Unique: `(procurementId, lotCode)`. From each `ProcurementProjectLot`.

Mappings: `src/mappings/lot/status.ts`.

| Source                                                                   | Database             |
| ------------------------------------------------------------------------ | -------------------- |
| matched `procurement` via `folderId`                                     | `procurementId`      |
| `ID` (e.g. `LOT-0000`)                                                   | `lotCode`            |
| `ProcurementProject/Name`                                                | `title`              |
| `ProcurementProject/Description`                                         | `description`        |
| derived (`open` / `awarded` / `cancelled` / `no_winner`)                 | `status`             |
| `ProcurementProject/MainCommodityClassification/ItemClassificationCode`  | `mainCpv`            |
| `ProcurementProject/RequestedTenderTotal/EstimatedOverallContractAmount` | `estimatedValue`     |
| same `@currencyID`                                                       | `currency`           |
| `ProcurementProject/RealizedLocation/Address/CountrySubentityCode`       | `nutsCode`           |
| `ProcurementProject/RealizedLocation/Description`                        | `locationText`       |
| `TenderingProcess/TenderSubmissionDeadlinePeriod/EndDate` (+ `EndTime`)  | `submissionDeadline` |

## `award`

One award per lot (`lotId` unique). From HLST `EformsExtension/NoticeResult`. Match lot via `LotResult/TenderLot/ID` → `lotCode`.

Mappings: `src/mappings/award/result-status.ts`.

| Source                                                                    | Database             |
| ------------------------------------------------------------------------- | -------------------- |
| matched `lot`                                                             | `lotId`              |
| `LotResult/TenderResultCode`                                              | `resultStatus`       |
| linked `LotTender/LegalMonetaryTotal/PayableAmount` (first usable)        | `amount`             |
| same `@currencyID`                                                        | `currency`           |
| linked `SettledContract/Title` (matched to selected tender when possible) | `contractTitle`      |
| linked `SettledContract/IssueDate`                                        | `contractDate`       |
| `ReceivedSubmissionsStatistics` where `StatisticsCode=tenders`            | `tendersCount`       |
| `ReceivedSubmissionsStatistics` where `StatisticsCode=t-sme`              | `smeTendersCount`    |
| `LotResult/FrameworkAgreementValues/MaximumValueAmount`                   | `frameworkMaxAmount` |

Privacy-withheld amount/statistics (`FieldsPrivacy` with `win-ten-val` / `not-val`, or stats privacy) → store `null`.

## `awardSupplier`

Composite PK: `(awardId, organizationId)`.

From `NoticeResult/TenderingParty` (via `LotTender/TenderingParty/ID`).

| Source                                                 | Database         |
| ------------------------------------------------------ | ---------------- |
| matched `award`                                        | `awardId`        |
| `Tenderer/ID` → `ORG-…` → `CompanyID` → `organization` | `organizationId` |
| `Tenderer/GroupLeadIndicator`                          | `isGroupLead`    |

Several tenderers on one party = consortium; `isGroupLead` marks the lead.
