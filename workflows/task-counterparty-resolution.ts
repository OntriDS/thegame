// workflows/task-counterparty-resolution.ts
// Shared helpers to resolve a task's effective counterparty identity for financial propagation.

import type { Task, CustomerCounterpartyRole } from '@/types/entities';
import { CharacterRole, EntityType, LinkType } from '@/types/enums';
import { getSaleById } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';

export type CounterpartyResolutionSource = 'task-field' | 'task-character-link' | 'sale-fallback' | 'none';

export interface ResolvedTaskCounterparty {
  characterId: string | null;
  characterRole: CustomerCounterpartyRole | null;
  source: CounterpartyResolutionSource;
}

const normalizeRole = (role: unknown): CustomerCounterpartyRole | null => {
  if (role === CharacterRole.CUSTOMER || role === CharacterRole.BENEFICIARY) {
    return role;
  }
  return null;
};

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

async function resolveByTaskFields(task: Task): Promise<ResolvedTaskCounterparty | null> {
  const characterId = normalizeId(task.customerCharacterId);
  if (!characterId) return null;

  const characterRole = normalizeRole(task.customerCharacterRole) ?? CharacterRole.CUSTOMER;
  return { characterId, characterRole, source: 'task-field' };
}

async function resolveByTaskCharacterLink(taskId: string): Promise<ResolvedTaskCounterparty | null> {
  const links = await getLinksFor({ type: EntityType.TASK, id: taskId });
  const taskCharacterLink = links.find(
    (link) =>
      link.linkType === LinkType.TASK_CHARACTER &&
      link.target.type === EntityType.CHARACTER &&
      !!link.target.id
  );

  if (!taskCharacterLink) return null;

  return {
    characterId: taskCharacterLink.target.id,
    characterRole: CharacterRole.CUSTOMER,
    source: 'task-character-link'
  };
}

async function resolveBySaleFallback(sourceSaleId: string | null | undefined): Promise<ResolvedTaskCounterparty | null> {
  if (!sourceSaleId) return null;

  const sale = await getSaleById(sourceSaleId);
  const saleCustomerId = normalizeId(sale?.customerId);
  if (!saleCustomerId) return null;

  return {
    characterId: saleCustomerId,
    characterRole: CharacterRole.CUSTOMER,
    source: 'sale-fallback'
  };
}

export async function resolveCounterpartyForTask(task: Task): Promise<ResolvedTaskCounterparty> {
  const byTaskFields = await resolveByTaskFields(task);
  if (byTaskFields) return byTaskFields;

  const byLink = await resolveByTaskCharacterLink(task.id);
  if (byLink) return byLink;

  const bySale = await resolveBySaleFallback(task.sourceSaleId);
  if (bySale) return bySale;

  return { characterId: null, characterRole: null, source: 'none' };
}

export function withResolvedTaskCounterparty(task: Task, resolution: ResolvedTaskCounterparty): Task {
  if (task.customerCharacterId === resolution.characterId && task.customerCharacterRole === resolution.characterRole) {
    return task;
  }

  const characterRole =
    resolution.characterRole !== null
      ? resolution.characterRole
      : (task.customerCharacterRole as CustomerCounterpartyRole | undefined);

  return {
    ...task,
    customerCharacterId: resolution.characterId,
    customerCharacterRole: characterRole
  };
}
