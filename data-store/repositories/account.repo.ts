// data-store/repositories/account.repo.ts
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import type { Account } from '@/types/entities';

const ENTITY = 'accounts';

export async function getAllAccounts(): Promise<Account[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const accounts: Account[] = [];
  for (const id of ids) {
    const key = buildDataKey(ENTITY, id);
    const account = await kvGet<Account>(key);
    if (account) accounts.push(account);
  }
  
  return accounts;
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
