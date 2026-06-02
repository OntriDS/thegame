import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { Agent } from '@/types/entities';

const ENTITY = EntityType.AGENT;

export async function getAllAgents(): Promise<Agent[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];

  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const agents = await kvMGet<Agent>(keys);
  return agents
    .filter((agent): agent is Agent => agent !== null && agent !== undefined)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const key = buildDataKey(ENTITY, id);
  return await kvGet<Agent>(key);
}

export async function upsertAgent(agent: Agent): Promise<void> {
  const key = buildDataKey(ENTITY, agent.id);
  const indexKey = buildIndexKey(ENTITY);
  
  // Set the data
  await kvSet(key, agent);
  
  // Add to index
  await kvSAdd(indexKey, agent.id);
}

export async function deleteAgent(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  // Remove data
  await kvDel(key);
  
  // Remove from index
  await kvSRem(indexKey, id);
}
