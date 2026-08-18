import type { CustomerCounterpartyRole, FinancialRecord } from '@/types/entities';
import { CharacterRole } from '@/types/enums';

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export function getFinancialCounterpartyId(record?: FinancialRecord | null): string | null {
  if (!record) return null;
  return normalizeId(record.context?.counterparty?.counterpartyId) ||
    // Read-only compatibility for pre-cleanup records and transient command input.
    normalizeId((record as any).characterId);
}

/** Canonical role is carried by the FINREC_CHARACTER Link; context/root values
 * are transient or read-only compatibility inputs. */
export function getFinancialCounterpartyRole(record?: FinancialRecord | null): CustomerCounterpartyRole | null {
  if (!record) return null;
  const runtimeRole = (record as any).__financialRelations?.characterRelationship;
  if (typeof runtimeRole === 'string') {
    const normalized = runtimeRole.trim().toLowerCase();
    if (normalized === CharacterRole.CUSTOMER || normalized === CharacterRole.BENEFICIARY) return normalized;
  }
  const canonical = record.context?.counterparty?.role;
  if (typeof canonical === 'string') {
    const normalized = canonical.trim().toLowerCase();
    if (normalized === CharacterRole.CUSTOMER || normalized === CharacterRole.BENEFICIARY) {
      return normalized;
    }
  }

  // Read-only compatibility for records written before the V1 facet existed.
  const legacy = (record as FinancialRecord & { customerCharacterRole?: unknown }).customerCharacterRole;
  if (typeof legacy !== 'string') return null;
  const normalizedLegacy = legacy.trim().toLowerCase();
  return normalizedLegacy === CharacterRole.CUSTOMER || normalizedLegacy === CharacterRole.BENEFICIARY
    ? normalizedLegacy
    : null;
}

