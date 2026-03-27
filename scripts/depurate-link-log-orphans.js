#!/usr/bin/env node
/* eslint-disable no-console */
const dotenv = require('dotenv');
const { Redis } = require('@upstash/redis');

dotenv.config();
dotenv.config({ path: '.env.local' });

const redis = Redis.fromEnv();

function parseArgs() {
  const args = process.argv.slice(2);
  const read = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : null;
  };
  return {
    apply: args.includes('--apply'),
    month: read('--month'),
    archiveKey: read('--archive-key'),
    processLegacy: args.includes('--legacy'),
  };
}

function parseRows(rows) {
  return rows.map((row) => {
    if (typeof row === 'string') {
      try {
        return JSON.parse(row);
      } catch {
        return null;
      }
    }
    return row;
  }).filter(Boolean);
}

async function listMonths() {
  const months = await redis.smembers('thegame:logs:index:months:links');
  return [...new Set(months || [])].sort();
}

async function listLinkIds() {
  let cursor = '0';
  const ids = new Set();
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: 'thegame:links:link:*', count: 500 });
    cursor = String(nextCursor);
    for (const key of keys || []) {
      ids.add(String(key).replace('thegame:links:link:', ''));
    }
  } while (cursor !== '0');
  return ids;
}

async function processMonth(month, apply, archiveKeyPrefix, linkIds) {
  const key = `thegame:logs:links:${month}`;
  const rawRows = await redis.lrange(key, 0, -1);
  const rows = parseRows(rawRows);

  const keep = [];
  const orphans = [];
  for (const row of rows) {
    if (!row.linkId) {
      keep.push(row);
      continue;
    }
    if (linkIds.has(String(row.linkId))) keep.push(row);
    else orphans.push(row);
  }

  const result = {
    month,
    total: rows.length,
    keep: keep.length,
    orphans: orphans.length,
  };

  if (!apply || orphans.length === 0) return result;

  if (archiveKeyPrefix) {
    await redis.set(`${archiveKeyPrefix}:${month}`, JSON.stringify(orphans));
  }

  await redis.del(key);
  // Preserve chronological order (newest at head)
  await redis.lpush(key, ...keep.map((r) => JSON.stringify(r)).reverse());
  return result;
}

async function main() {
  const { apply, month, archiveKey, processLegacy } = parseArgs();
  const linkIds = await listLinkIds();
  const months = month ? [month] : await listMonths();

  if (months.length === 0 && !processLegacy) {
    console.log('No monthly links logs found. Use --legacy to process legacy thegame:logs:links.');
    return;
  }

  const results = [];
  for (const m of months) {
    results.push(await processMonth(m, apply, archiveKey, linkIds));
  }

  const totals = results.reduce((acc, row) => {
    acc.total += row.total;
    acc.keep += row.keep;
    acc.orphans += row.orphans;
    return acc;
  }, { total: 0, keep: 0, orphans: 0 });

  console.log(JSON.stringify({ apply, month: month || null, totals, results }, null, 2));

  if (processLegacy) {
    const legacyKey = 'thegame:logs:links';
    const raw = await redis.get(legacyKey);
    const rows = typeof raw === 'string'
      ? (() => { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } })()
      : (Array.isArray(raw) ? raw : []);

    const keep = [];
    const orphans = [];
    for (const row of rows) {
      if (!row?.linkId) {
        keep.push(row);
        continue;
      }
      if (linkIds.has(String(row.linkId))) keep.push(row);
      else orphans.push(row);
    }

    const legacyResult = {
      legacyKey,
      total: rows.length,
      keep: keep.length,
      orphans: orphans.length,
    };

    if (apply && rows.length > 0) {
      if (archiveKey) {
        await redis.set(`${archiveKey}:legacy`, JSON.stringify(orphans));
      }
      await redis.set(legacyKey, JSON.stringify(keep));
    }

    console.log(JSON.stringify({ apply, legacyResult }, null, 2));
  }

  if (!apply) {
    console.log('Dry-run only. Re-run with --apply to remove orphan rows.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

