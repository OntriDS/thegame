// data-store/repositories/account.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { Account } from '@/types/entities';

const ENTITY = EntityType.ACCOUNT;

export async function getAllAccounts(): Promise<Account[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const accounts = await kvMGet<Account>(keys);
  return accounts.filter((account): account is Account => account !== null && account !== undefined);
}

export async function getAccountById(id: string): Promise<Account | null> {
  const key = buildDataKey(ENTITY, id);
  return await kvGet<Account>(key);
}

export async function upsertAccount(account: Account): Promise<Account> {
  const key = buildDataKey(ENTITY, account.id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvSet(key, account);
  await kvSAdd(indexKey, account.id);
  
  return account;
}

export async function deleteAccount(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}
