import type { CustomerCounterpartyRole, FinancialRecord } from '@/types/entities';

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export function getFinancialCounterpartyId(record?: FinancialRecord | null): string | null {
  if (!record) return null;
  return normalizeId(record.characterId);
}

/** Canonical role is stored in FinancialRecord.context.counterparty. */
export function getFinancialCounterpartyRole(record?: FinancialRecord | null): CustomerCounterpartyRole | null {
  if (!record) return null;
  const canonical = record.context?.counterparty?.role;
  if (canonical === 'CUSTOMER' || canonical === 'BENEFICIARY') return canonical;

  // Read-only compatibility for records written before the V1 facet existed.
  const legacy = (record as FinancialRecord & { customerCharacterRole?: unknown }).customerCharacterRole;
  return legacy === 'CUSTOMER' || legacy === 'BENEFICIARY' ? legacy : null;
}

