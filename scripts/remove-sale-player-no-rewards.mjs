#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Remove live SALE_PLAYER edges when the source sale has no non-zero rewards.points.
 * Dry-run by default; pass --apply to execute. Uses the same index + link key updates as removeLink (no raw DEL-only).
 *
 * Usage (from thegame): node scripts/remove-sale-player-no-rewards.mjs [--apply]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const redis = Redis.fromEnv();

const NS = 'thegame:';
const linkKey = (id) => `${NS}links:link:${id}`;
const saleDataKey = (id) => `${NS}data:sale:${id}`;
const byEntity = (type, id) => `${NS}index:links:by-entity:${type}:${id}`;
const GLOBAL_LINKS = `${NS}index:links:all`;

function saleHasRewardPoints(sale) {
  const p = sale?.rewards?.points;
  if (!p) return false;
  return (p.xp || 0) > 0 || (p.rp || 0) > 0 || (p.fp || 0) > 0 || (p.hp || 0) > 0;
}

async function scanLinkKeys() {
  let cursor = '0';
  const keys = [];
  do {
    const [next, batch] = await redis.scan(cursor, { match: `${NS}links:link:*`, count: 500 });
    cursor = String(next);
    if (Array.isArray(batch)) keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}

/** Mirror link-registry removeLink: indexes + global set + link key. */
async function removeLinkLike(linkId) {
  const key = linkKey(linkId);
  const raw = await redis.get(key);
  if (!raw) return;
  const link = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const sid = link.source?.id;
  const st = link.source?.type;
  const tid = link.target?.id;
  const tt = link.target?.type;
  if (sid && st) await redis.srem(byEntity(st, sid), linkId);
  if (tid && tt) await redis.srem(byEntity(tt, tid), linkId);
  await redis.srem(GLOBAL_LINKS, linkId);
  await redis.del(key);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const keys = await scanLinkKeys();
  let examined = 0;
  /** @type {{ linkId: string; saleId: string }[]} */
  const toRemove = [];

  for (const k of keys) {
    const raw = await redis.get(k);
    if (!raw) continue;
    const link = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (link.linkType !== 'SALE_PLAYER') continue;
    examined++;
    const saleId = link.source?.id;
    if (!saleId) continue;
    const saleRaw = await redis.get(saleDataKey(saleId));
    if (!saleRaw) {
      console.warn(`[warn] sale missing ${saleId} (link ${link.id})`);
      continue;
    }
    const sale = typeof saleRaw === 'string' ? JSON.parse(saleRaw) : saleRaw;
    if (!saleHasRewardPoints(sale)) {
      toRemove.push({ linkId: link.id, saleId });
    }
  }

  console.log(`SALE_PLAYER links examined: ${examined}`);
  console.log(`To remove (sale has no reward points): ${toRemove.length}`);
  for (const r of toRemove) {
    console.log(`${apply ? 'REMOVE' : 'would remove'} link ${r.linkId} (sale ${r.saleId})`);
  }

  if (apply && toRemove.length) {
    for (const r of toRemove) {
      await removeLinkLike(r.linkId);
    }
    console.log('Done (--apply).');
  } else if (!apply && toRemove.length) {
    console.log('Re-run with --apply to execute removals.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
