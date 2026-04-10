import { CharacterRole } from '@/types/enums';
import type { Character, Contract, FinancialRecord, Sale } from '@/types/entities';
import {
  getAllCharacters,
  getAllContracts,
  getAllFinancials,
  getAvailableMonths,
  getFinancialsForMonth,
  getAllSales,
  upsertCharacter,
  upsertContract,
  upsertFinancial,
  upsertSale
} from '@/data-store/datastore';
import { getAllFinancials as getAllFinancialsRaw } from '@/data-store/repositories/financial.repo';

export interface AssociateToPartnerMigrationSummary {
  salesScanned: number;
  salesMigrated: number;
  saleLinesMigrated: number;
  charactersScanned: number;
  charactersMigrated: number;
  financialScanned: number;
  financialMigrated: number;
  contractsScanned: number;
  contractsMigrated: number;
  contractClausesMigrated: number;
  dryRun: boolean;
  errors: string[];
}

type Migratable = Record<string, any>;

const normalizeForRoleLookup = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z]/g, '');

const LEGACY_ROLE_LOOKUP = new Map<string, CharacterRole>(
  (Object.values(CharacterRole) as CharacterRole[]).map((role) => [normalizeForRoleLookup(role), role])
);

const replaceAssociateText = (value: string): string => {
  return value
    .replace(/\bASSOCIATE\b/g, 'PARTNER')
    .replace(/\bAssociate\b/g, 'Partner')
    .replace(/\bassociate\b/g, 'partner');
};

const replaceAssociateSuffixForFinancialName = (value: string): string => {
  const trimmed = String(value || '').trim();
  const bulletSuffixPattern = /\s*[•\-–—]\s*associate\s*$/i;
  if (bulletSuffixPattern.test(trimmed)) {
    return trimmed.replace(bulletSuffixPattern, ' • Partner');
  }
  if (/\bassociate\b/i.test(trimmed)) {
    return replaceAssociateText(trimmed);
  }
  return trimmed;
};

const normalizeCharacterRoles = (roles: (CharacterRole | string)[]): { roles: CharacterRole[]; changed: boolean } => {
  const nextRoles = new Set<CharacterRole>();
  let changed = false;
  for (const role of roles) {
    const normalized = normalizeForRoleLookup(String(role || ''));
    if (!normalized) continue;

    const canonical =
      normalized === 'associate'
        ? CharacterRole.PARTNER
        : LEGACY_ROLE_LOOKUP.get(normalized);

    if (!canonical) continue;
    if (!nextRoles.has(canonical)) {
      nextRoles.add(canonical);
    }
  }

  const normalizedRoles = [...nextRoles];
  if (normalizedRoles.length !== roles.length) {
    changed = true;
  } else {
    for (let i = 0; i < roles.length; i += 1) {
      if (String(roles[i]) !== normalizedRoles[i]) {
        changed = true;
        break;
      }
    }
  }

  return { roles: normalizedRoles, changed };
};

const migrateSaleLineMetadata = (line: Migratable): { line: Migratable; changed: boolean } => {
  const metadata = line?.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return { line, changed: false };
  }

  const nextMetadata: Migratable = { ...metadata };
  let changed = false;

  if (Object.prototype.hasOwnProperty.call(nextMetadata, 'associateId') && !Object.prototype.hasOwnProperty.call(nextMetadata, 'partnerId')) {
    nextMetadata.partnerId = nextMetadata.associateId;
    delete nextMetadata.associateId;
    changed = true;
  }

  if (Object.prototype.hasOwnProperty.call(nextMetadata, 'associateShare') && !Object.prototype.hasOwnProperty.call(nextMetadata, 'partnerShare')) {
    nextMetadata.partnerShare = nextMetadata.associateShare;
    delete nextMetadata.associateShare;
    changed = true;
  }

  if (typeof nextMetadata.station === 'string' && (nextMetadata.station === 'Associate-Sales' || nextMetadata.station === 'Associate Sales')) {
    nextMetadata.station = nextMetadata.station.replace('Associate', 'Partner');
    changed = true;
  }

  if (typeof nextMetadata.description === 'string') {
    const normalizedDescription = replaceAssociateText(nextMetadata.description);
    if (normalizedDescription !== nextMetadata.description) {
      nextMetadata.description = normalizedDescription;
      changed = true;
    }
  }

  if (!changed) {
    return { line, changed: false };
  }

  return { line: { ...line, metadata: nextMetadata }, changed: true };
};

export async function migrateAssociateToPartner(
  dryRun: boolean = true,
  includePendingFinancials: boolean = true
): Promise<AssociateToPartnerMigrationSummary> {
  const summary: AssociateToPartnerMigrationSummary = {
    salesScanned: 0,
    salesMigrated: 0,
    saleLinesMigrated: 0,
    charactersScanned: 0,
    charactersMigrated: 0,
    financialScanned: 0,
    financialMigrated: 0,
    contractsScanned: 0,
    contractsMigrated: 0,
    contractClausesMigrated: 0,
    dryRun,
    errors: []
  };

  console.log(`[migrateAssociateToPartner] Starting migration (dryRun=${dryRun})`);

  // 1) Migrate Sales (sale.associateId + line metadata)
  const sales = await getAllSales();
  summary.salesScanned = sales.length;
  for (const sale of sales) {
    const legacySale = sale as Sale & Migratable;
    const saleChanged = { hasUpdate: false, hasLineUpdate: false };
    const migratedSale: Migratable = { ...legacySale };

    const legacyAssociateId = legacySale.associateId;
    if (legacyAssociateId) {
      if (!legacySale.partnerId) {
        migratedSale.partnerId = legacyAssociateId;
        saleChanged.hasUpdate = true;
      } else if (legacySale.partnerId !== legacyAssociateId) {
        summary.errors.push(`Sale ${legacySale.id}: both associateId (${legacyAssociateId}) and partnerId (${legacySale.partnerId}) existed. Preserved partnerId.`);
      }

      if (Object.prototype.hasOwnProperty.call(migratedSale, 'associateId')) {
        delete migratedSale.associateId;
        saleChanged.hasUpdate = true;
      }
    }

    if (Array.isArray(migratedSale.lines)) {
      let migratedLineCount = 0;
      const nextLines = migratedSale.lines.map((line: Migratable) => {
        const migrated = migrateSaleLineMetadata(line);
        if (migrated.changed) {
          saleChanged.hasLineUpdate = true;
          migratedLineCount += 1;
          return migrated.line;
        }
        return line;
      });

      if (saleChanged.hasLineUpdate) {
        migratedSale.lines = nextLines;
        summary.saleLinesMigrated += migratedLineCount;
      }
    }

    try {
      if (saleChanged.hasUpdate || saleChanged.hasLineUpdate) {
        summary.salesMigrated += 1;

        if (!dryRun) {
          await upsertSale(migratedSale as unknown as Sale, {
            skipWorkflowEffects: true,
            skipLinkEffects: true
          });
        }
      }
    } catch (error) {
      summary.errors.push(`Sale ${legacySale.id}: ${(error as Error).message || String(error)}`);
    }
  }

  // 2) Migrate Characters (Associate role -> Partner)
  const characters = await getAllCharacters();
  summary.charactersScanned = characters.length;
  for (const character of characters) {
    const migrated = normalizeCharacterRoles(character.roles || []);
    if (!migrated.changed) {
      continue;
    }

    summary.charactersMigrated += 1;
    const migratedCharacter = { ...character, roles: migrated.roles } as Character;

    try {
      if (!dryRun) {
        await upsertCharacter(migratedCharacter, {
          skipWorkflowEffects: true,
          skipLinkEffects: true
        });
      }
    } catch (error) {
      summary.errors.push(`Character ${character.id}: ${(error as Error).message || String(error)}`);
    }
  }

  // 3) Migrate Financial records (metadata keys + copy text)
  let financialRecords = includePendingFinancials
    ? await getAllFinancialsRaw()
    : await getAllFinancials();

  if (includePendingFinancials) {
    try {
      const monthKeys = await getAvailableMonths();
      if (monthKeys.length > 0) {
        const monthIndexedFinancials = (await Promise.all(
          monthKeys.map(async (monthKey) => {
            const [month, yearSuffix] = monthKey.split('-');
            const monthNum = parseInt(month, 10);
            const year = parseInt(yearSuffix, 10);
            if (!Number.isFinite(monthNum) || !Number.isFinite(year)) return [];
            const fullYear = year < 100 ? 2000 + year : year;
            return await getFinancialsForMonth(fullYear, monthNum);
          })
        )).flat();

        const merged = new Map<string, FinancialRecord>();
        for (const fin of financialRecords) {
          merged.set(fin.id, fin);
        }
        for (const fin of monthIndexedFinancials) {
          merged.set(fin.id, fin);
        }
        financialRecords = Array.from(merged.values());
      }
    } catch (error) {
      summary.errors.push(`Financial fallback scan by month failed: ${(error as Error).message || String(error)}`);
    }
  }

  summary.financialScanned = financialRecords.length;
  for (const financialRecord of financialRecords) {
    const migratedRecord: Migratable = { ...financialRecord };
    let changed = false;

    if (typeof migratedRecord.name === 'string') {
      const nextName = replaceAssociateSuffixForFinancialName(migratedRecord.name);
      if (nextName !== migratedRecord.name) {
        migratedRecord.name = nextName;
        changed = true;
      }
    }

    if (typeof migratedRecord.description === 'string') {
      const nextDescription = replaceAssociateText(migratedRecord.description);
      if (nextDescription !== migratedRecord.description) {
        migratedRecord.description = nextDescription;
        changed = true;
      }
    }

    if (typeof migratedRecord.notes === 'string') {
      const nextNotes = replaceAssociateText(migratedRecord.notes);
      if (nextNotes !== migratedRecord.notes) {
        migratedRecord.notes = nextNotes;
        changed = true;
      }
    }

    if (migratedRecord.metadata && typeof migratedRecord.metadata === 'object') {
      const nextMetadata: Migratable = { ...migratedRecord.metadata };
      if (
        Object.prototype.hasOwnProperty.call(nextMetadata, 'associateId') &&
        !Object.prototype.hasOwnProperty.call(nextMetadata, 'partnerId')
      ) {
        nextMetadata.partnerId = nextMetadata.associateId;
        delete nextMetadata.associateId;
        changed = true;
      }

      if (
        Object.prototype.hasOwnProperty.call(nextMetadata, 'associateShare') &&
        !Object.prototype.hasOwnProperty.call(nextMetadata, 'partnerShare')
      ) {
        nextMetadata.partnerShare = nextMetadata.associateShare;
        delete nextMetadata.associateShare;
        changed = true;
      }

      if (
        typeof nextMetadata.station === 'string' &&
        (nextMetadata.station === 'Associate-Sales' || nextMetadata.station === 'Associate Sales')
      ) {
        nextMetadata.station = nextMetadata.station.replace('Associate', 'Partner');
        changed = true;
      }

      migratedRecord.metadata = nextMetadata;
    }

    if (!changed) {
      continue;
    }

    summary.financialMigrated += 1;
    try {
      if (!dryRun) {
        await upsertFinancial(migratedRecord as unknown as FinancialRecord, {
          skipWorkflowEffects: true,
          skipLinkEffects: true,
          forceSave: true
        });
      }
    } catch (error) {
      summary.errors.push(`Financial ${financialRecord.id}: ${(error as Error).message || String(error)}`);
    }
  }

  // 4) Migrate Contracts (legacy associateShare -> partnerShare)
  const contracts = await getAllContracts();
  summary.contractsScanned = contracts.length;
  for (const contract of contracts) {
    const migratedContract: Migratable = { ...contract };
    let contractChanged = false;
    let clauseChanged = 0;

    const nextClauses = Array.isArray(contract.clauses)
      ? contract.clauses.map((clause: Migratable) => {
          let cChanged = false;
          const nextClause = { ...clause };

          if (
            Object.prototype.hasOwnProperty.call(nextClause, 'associateShare') &&
            !Object.prototype.hasOwnProperty.call(nextClause, 'partnerShare')
          ) {
            nextClause.partnerShare = nextClause.associateShare;
            delete nextClause.associateShare;
            cChanged = true;
          }

          if (typeof nextClause.description === 'string') {
            const nextDescription = replaceAssociateText(nextClause.description);
            if (nextDescription !== nextClause.description) {
              nextClause.description = nextDescription;
              cChanged = true;
            }
          }

          if (cChanged) {
            clauseChanged += 1;
            return nextClause;
          }
          return clause;
        })
      : [];

    if (clauseChanged > 0) {
      migratedContract.clauses = nextClauses;
      contractChanged = true;
      summary.contractClausesMigrated += clauseChanged;
    }

    if (!contractChanged) {
      continue;
    }

    summary.contractsMigrated += 1;
    try {
      if (!dryRun) {
        await upsertContract(migratedContract as unknown as Contract);
      }
    } catch (error) {
      summary.errors.push(`Contract ${contract.id}: ${(error as Error).message || String(error)}`);
    }
  }

  console.log(
    `[migrateAssociateToPartner] Done. ` +
      `sales: ${summary.salesMigrated}/${summary.salesScanned}, ` +
      `financials: ${summary.financialMigrated}/${summary.financialScanned}, ` +
      `characters: ${summary.charactersMigrated}/${summary.charactersScanned}, ` +
      `contracts: ${summary.contractsMigrated}/${summary.contractsScanned}, ` +
      `errors: ${summary.errors.length}`
  );

  return summary;
}
