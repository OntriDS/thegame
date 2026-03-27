#!/usr/bin/env node
/* eslint-disable no-console */
const dotenv = require('dotenv');
const { Redis } = require('@upstash/redis');

dotenv.config();
dotenv.config({ path: '.env.local' });

const redis = Redis.fromEnv();
const LEGACY_KEY = 'thegame:logs:links';
const MONTHS_INDEX_KEY = 'thegame:logs:index:months:links';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    apply: args.includes('--apply'),
    archiveKey: (() => {
      const idx = args.indexOf('--archive-key');
      return idx >= 0 ? args[idx + 1] : null;
    })(),
  };
}

function getMonthKey(value) {
  const d = new Date(value || Date.now());
  if (!Number.isFinite(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}-${yy}`;
}

function parseLegacy(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function main() {
  const { apply, archiveKey } = parseArgs();
  const raw = await redis.get(LEGACY_KEY);
  const events = parseLegacy(raw);
  if (events.length === 0) {
    console.log(`No legacy events found in ${LEGACY_KEY}.`);
    return;
  }

  const buckets = new Map();
  for (const ev of events) {
    const month = getMonthKey(ev?.at || ev?.timestamp || ev?.metadata?.createdAt);
    if (!month) continue;
    if (!buckets.has(month)) buckets.set(month, []);
    buckets.get(month).push(JSON.stringify(ev));
  }

  const preview = {
    totalLegacyEvents: events.length,
    bucketCount: buckets.size,
    buckets: [...buckets.entries()].map(([month, rows]) => ({ month, count: rows.length })),
    apply,
    archiveKey: archiveKey || null,
  };
  console.log(JSON.stringify(preview, null, 2));

  if (!apply) {
    console.log('Dry-run only. Re-run with --apply to execute migration writes.');
    return;
  }

  for (const [month, rows] of buckets.entries()) {
    const targetKey = `thegame:logs:links:${month}`;
    // Keep oldest-first order after LPUSH by reversing before pushing.
    const reversed = [...rows].reverse();
    await redis.lpush(targetKey, ...reversed);
    await redis.sadd(MONTHS_INDEX_KEY, month);
  }

  if (archiveKey) {
    await redis.set(archiveKey, raw);
    await redis.del(LEGACY_KEY);
  }

  console.log('Migration completed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

