const path = require('path');
const { Redis } = require('@upstash/redis');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const monthKey = process.argv[2] || '12-26';

const activeIndexKey = `thegame:index:sale:by-month:${monthKey}`;
const archiveIndexKey = `thegame:index:sales:collected:${monthKey}`;
const monthlySummaryKey = `thegame:summary:monthly:${monthKey}`;

const kv = Redis.fromEnv();

const toNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const sumPhysicalUnits = sales => {
  let total = 0;
  for (const sale of sales) {
    for (const line of sale.lines || []) {
      if (line.kind === 'item') {
        total += Math.max(0, toNumber(line.quantity));
      } else if (line.kind === 'bundle') {
        const quantity = Math.max(0, toNumber(line.quantity));
        const perBundle = Math.max(1, toNumber(line.itemsPerBundle));
        total += quantity * perBundle;
      }
    }
  }
  return total;
};

const sumLineBreakdown = sale => {
  let items = 0;
  let bundles = 0;
  for (const line of sale.lines || []) {
    if (line.kind === 'item') {
      items += Math.max(0, toNumber(line.quantity));
    } else if (line.kind === 'bundle') {
      const quantity = Math.max(0, toNumber(line.quantity));
      const perBundle = Math.max(1, toNumber(line.itemsPerBundle));
      bundles += quantity * perBundle;
    }
  }
  return { items, bundles, total: items + bundles };
};

async function main() {
  const summary = (await kv.hgetall(monthlySummaryKey)) || {};
  const summaryItemsSold = toNumber(summary.itemsSold);

  const ids = await kv.sunion(activeIndexKey, archiveIndexKey);
  const saleIds = Array.isArray(ids) ? ids : [];

  if (saleIds.length === 0) {
    console.log(`Sales month: ${monthKey}`);
    console.log(`Sales found: 0`);
    console.log(`Summary itemsSold: ${summaryItemsSold}`);
    console.log('[debug] No sales found for month key in indices.');

    const monthIndexKeys = await kv.keys('thegame:index:sale:by-month:*');
    const archiveIndexKeys = await kv.keys('thegame:index:sales:collected:*');
    const summaryKeyAlt = `thegame:summary:monthly:12-2026`;
    const altSummary = (await kv.hgetall(summaryKeyAlt)) || {};

    console.log(`Index keys (sale by-month): ${monthIndexKeys.length}`);
    console.log(`Index keys (sales collected): ${archiveIndexKeys.length}`);
    console.log(`Alt summary key (12-2026) itemsSold: ${toNumber(altSummary.itemsSold)}`);
    return;
  }

  const saleKeys = saleIds.map(id => `thegame:data:sale:${id}`);
  const salesRaw = await kv.mget(saleKeys);
  const sales = (salesRaw || []).filter(Boolean);

  const computedTotal = sumPhysicalUnits(sales);

  console.log(`Sales month: ${monthKey}`);
  console.log(`Sales found: ${sales.length}`);
  console.log(`Summary itemsSold: ${summaryItemsSold}`);
  console.log(`Computed itemsSold: ${computedTotal}`);
  console.log('');

  for (const sale of sales) {
    const breakdown = sumLineBreakdown(sale);
    const date = sale.collectedAt || sale.saleDate || sale.chargedAt || sale.createdAt;

    console.log(`Sale ${sale.id}`);
    console.log(`  status: ${sale.status} | isCollected: ${Boolean(sale.isCollected)}`);
    console.log(`  date: ${date}`);
    console.log(`  line totals -> items: ${breakdown.items}, bundles: ${breakdown.bundles}, total: ${breakdown.total}`);
    for (const line of sale.lines || []) {
      if (line.kind === 'item') {
        console.log(`    - item line: qty=${toNumber(line.quantity)} itemId=${line.itemId || 'n/a'}`);
      } else if (line.kind === 'bundle') {
        console.log(`    - bundle line: qty=${toNumber(line.quantity)} itemsPerBundle=${toNumber(line.itemsPerBundle)} subType=${line.subItemType || 'n/a'}`);
      } else {
        console.log(`    - service line`);
      }
    }
  }
}

main().catch(error => {
  console.error('[debug] Failed to inspect sales summary:', error);
  process.exitCode = 1;
});
