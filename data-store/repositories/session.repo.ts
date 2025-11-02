// data-store/repositories/session.repo.ts
import type { AISession } from '@/types/entities';
import { kvGet, kvMGet, kvSet, kvDel, kvSMembers, kvSAdd, kvSRem } from '@/data-store/kv';
import { buildDataKey, buildIndexKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';

const ENTITY = EntityType.SESSION;

function reviveSessionDates(session: AISession): AISession {
  // Revive Date objects from strings after KV deserialization
  return {
    ...session,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
    lastAccessedAt: new Date(session.lastAccessedAt),
    expiresAt: new Date(session.expiresAt),
    messages: session.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }))
  };
}

export async function getSessionById(id: string): Promise<AISession | null> {
  const session = await kvGet<AISession>(buildDataKey(ENTITY, id));
  if (!session) return null;
  return reviveSessionDates(session);
}

export async function getAllSessions(): Promise<AISession[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const sessions = await kvMGet<AISession>(keys);
  return sessions
    .filter((session): session is AISession => session !== null && session !== undefined)
    .map(reviveSessionDates);
}

export async function upsertSession(session: AISession): Promise<AISession> {
  await kvSet(buildDataKey(ENTITY, session.id), session);
  await kvSAdd(buildIndexKey(ENTITY), session.id);
  return session;
}

export async function deleteSession(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}

