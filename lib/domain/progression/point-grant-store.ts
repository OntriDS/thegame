// lib/domain/progression/point-grant-store.ts
// Increment 6: Durable PlayerPointGrantV1 storage
//
// PlayerPointGrantV1 tracks progression evidence from Task and Sale completion.
// Grants are staged on DONE/CHARGED and vested on COLLECTED.
// FinancialRecord never stages or vests points.
//
// Grant lifecycle:
//   absent → staged → vested → compensated
//
// Staging: Task DONE or Sale CHARGED
// Vesting: Task COLLECTED or Sale COLLECTED
// Compensation: Manual correction or rollback

import { kvEval, kvGet, kvSet } from '@/lib/utils/kv';
import type { PlayerPointGrantV1, PointAmountV1, EntityRef } from '@/types/entities';
import { v4 as uuid } from 'uuid';

const GRANT_PREFIX = 'thegame:point-grant:';
const GRANT_SOURCE_INDEX = 'thegame:point-grant:source';

// ─── Grant Creation ─────────────────────────────────────────────────────────

/**
 * Stage a new point grant.
 *
 * Called when a Task is completed (DONE) or a Sale is charged (CHARGED).
 * The grant is created in 'pending' state and will be vested on collection.
 *
 * Idempotency: If a grant already exists for this source+player, returns the existing grant.
 */
export async function stagePointGrant(params: {
  playerId: string;
  source: EntityRef;
  points: PointAmountV1;
  commandId: string;
  policyVersion?: string;
}): Promise<PlayerPointGrantV1> {
  const { playerId, source, points, commandId, policyVersion = '1.0' } = params;

  // Check for existing grant (idempotency)
  const existingGrant = await getGrantBySource(source, playerId);
  if (existingGrant) {
    return existingGrant;
  }

  const grantId = `grant-${uuid()}`;
  const now = new Date().toISOString();

  const grant: PlayerPointGrantV1 = {
    grantId,
    playerId,
    source,
    policyVersion,
    points,
    state: 'pending',
    stagedCommandId: commandId,
    stagedAt: now,
    version: 1,
  };

  // Atomic write: grant + source index
  const luaScript = `
    local grantKey = KEYS[1]
    local sourceKey = KEYS[2]
    local grantData = ARGV[1]
    local sourceType = ARGV[2]
    local sourceId = ARGV[3]
    local playerId = ARGV[4]

    -- Check if grant already exists (idempotency)
    local existing = redis.call('GET', grantKey)
    if existing ~= false then
      return existing
    end

    -- Write grant
    redis.call('SET', grantKey, grantData)

    -- Add to source index
    local indexKey = sourceType .. ':' .. sourceId .. ':' .. playerId
    redis.call('HSET', KEYS[3], indexKey, grantKey)

    return grantData
  `;

  const grantKey = `${GRANT_PREFIX}${grantId}`;
  const sourceKey = `${GRANT_SOURCE_INDEX}:${source.type}:${source.id}:${playerId}`;

  await kvEval<string>(
    luaScript,
    [grantKey, sourceKey, GRANT_SOURCE_INDEX],
    [JSON.stringify(grant), source.type, source.id, playerId]
  );

  return grant;
}

// ─── Grant Vesting ──────────────────────────────────────────────────────────

/**
 * Vest a point grant.
 *
 * Called when a Task is collected (COLLECTED) or a Sale is collected (COLLECTED).
 * Transitions the grant from 'pending' to 'vested'.
 *
 * Only the grant's stagedCommandId can vest it (prevents double-vesting).
 */
export async function vestPointGrant(params: {
  grantId: string;
  commandId: string;
}): Promise<PlayerPointGrantV1 | null> {
  const { grantId, commandId } = params;
  const grantKey = `${GRANT_PREFIX}${grantId}`;
  const now = new Date().toISOString();

  const luaScript = `
    local grantKey = KEYS[1]
    local commandId = ARGV[1]
    local now = ARGV[2]

    local grantStr = redis.call('GET', grantKey)
    if grantStr == false then
      return nil
    end

    local grant = cjson.decode(grantStr)

    -- Only vest if state is 'pending'
    if grant.state ~= 'pending' then
      return grantStr
    end

    -- Transition to vested
    grant.state = 'vested'
    grant.vestedCommandId = commandId
    grant.vestedAt = now
    grant.version = grant.version + 1

    redis.call('SET', grantKey, cjson.encode(grant))
    return cjson.encode(grant)
  `;

  const result = await kvEval<string | null>(
    luaScript,
    [grantKey],
    [commandId, now]
  );

  if (!result) return null;

  try {
    return JSON.parse(result) as PlayerPointGrantV1;
  } catch {
    return null;
  }
}

// ─── Grant Query ────────────────────────────────────────────────────────────

/**
 * Get a grant by grantId.
 */
export async function getGrant(grantId: string): Promise<PlayerPointGrantV1 | null> {
  const grantKey = `${GRANT_PREFIX}${grantId}`;
  return await kvGet<PlayerPointGrantV1>(grantKey);
}

/**
 * Get a grant by source and player.
 *
 * Used for idempotency: check if a grant already exists for this source+player.
 */
export async function getGrantBySource(
  source: { type: string; id: string },
  playerId: string
): Promise<PlayerPointGrantV1 | null> {
  const indexKey = `${source.type}:${source.id}:${playerId}`;

  const luaScript = `
    local indexKey = ARGV[1]
    local grantKey = redis.call('HGET', KEYS[1], indexKey)
    if grantKey == false then
      return nil
    end
    return redis.call('GET', grantKey)
  `;

  const result = await kvEval<string | null>(
    luaScript,
    [GRANT_SOURCE_INDEX],
    [indexKey]
  );

  if (!result) return null;

  try {
    return JSON.parse(result) as PlayerPointGrantV1;
  } catch {
    return null;
  }
}

/**
 * Get all grants for a player.
 *
 * Used for displaying grant history and calculating totals.
 */
export async function getGrantsForPlayer(playerId: string): Promise<PlayerPointGrantV1[]> {
  const luaScript = `
    local playerId = ARGV[1]
    local prefix = KEYS[1]

    local cursor = '0'
    local grants = {}

    repeat
      local result = redis.call('SCAN', cursor, 'MATCH', prefix .. '*', 'COUNT', 100)
      cursor = result[1]
      local keys = result[2]

      for i, key in ipairs(keys) do
        local grantStr = redis.call('GET', key)
        if grantStr ~= false then
          local grant = cjson.decode(grantStr)
          if grant.playerId == playerId then
            table.insert(grants, grantStr)
          end
        end
      end
    until cursor == '0'

    return grants
  `;

  const results = await kvEval<string[]>(
    luaScript,
    [GRANT_PREFIX],
    [playerId]
  );

  return results.map(r => JSON.parse(r) as PlayerPointGrantV1);
}

/**
 * Get all pending grants for a player.
 *
 * Used for calculating pending points.
 */
export async function getPendingGrantsForPlayer(playerId: string): Promise<PlayerPointGrantV1[]> {
  const allGrants = await getGrantsForPlayer(playerId);
  return allGrants.filter(g => g.state === 'pending');
}

/**
 * Get all vested grants for a player.
 *
 * Used for calculating vested points.
 */
export async function getVestedGrantsForPlayer(playerId: string): Promise<PlayerPointGrantV1[]> {
  const allGrants = await getGrantsForPlayer(playerId);
  return allGrants.filter(g => g.state === 'vested');
}
