#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Redis } = require('@upstash/redis');

dotenv.config();
dotenv.config({ path: '.env.local' });

const redis = Redis.fromEnv();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    itemId: null,
    includePrefixMatches: true,
    sampleSize: 2000,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--item-id') out.itemId = args[++i] || null;
    else if (a === '--sample-size') out.sampleSize = Number(args[++i] || 2000);
    else if (a === '--output') out.output = args[++i] || null;
    else if (a === '--no-prefix-matches') out.includePrefixMatches = false;
  }
  return out;
}

async function scanKeys(matchPattern, count = 500) {
  let cursor = '0';
  const keys = [];
  do {
    const [nextCursor, batch] = await redis.scan(cursor, { match: matchPattern, count });
    cursor = String(nextCursor);
    if (Array.isArray(batch)) keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function parseLegacyLinksLog(raw) {
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

async function buildReport(config) {
  const legacyKey = 'thegame:logs:links';
  const legacyRaw = await redis.get(legacyKey);
  const rawString = typeof legacyRaw === 'string' ? legacyRaw : JSON.stringify(legacyRaw ?? '');
  const legacyEvents = parseLegacyLinksLog(legacyRaw);

  const linkKeys = await scanKeys('thegame:links:link:*');
  const linkIdSet = new Set(linkKeys.map((k) => String(k).replace('thegame:links:link:', '')));
  const linkValues = await Promise.all(linkKeys.map((k) => redis.get(k)));
  const links = linkValues.filter(Boolean);

  let orphanInSample = 0;
  let orphanSampleN = 0;
  for (const ev of legacyEvents.slice(0, config.sampleSize)) {
    if (!ev || !ev.linkId) continue;
    orphanSampleN += 1;
    if (!linkIdSet.has(String(ev.linkId))) orphanInSample += 1;
  }

  const report = {
    summary: {
      generatedAt: new Date().toISOString(),
      logsLinksStringLength: rawString.length,
      logsLinksParsedEvents: legacyEvents.length,
      linkObjectKeyCount: linkKeys.length,
      orphanSample: {
        checked: orphanSampleN,
        missingLinkObjects: orphanInSample,
      },
    },
    itemAnalysis: null,
  };

  if (config.itemId) {
    const clonePrefix = `${config.itemId}-sold-`;
    const itemLinks = links.filter((link) => {
      if (!link || !link.source || !link.target) return false;
      const sourceMatch = link.source.type === 'item' && (link.source.id === config.itemId || (config.includePrefixMatches && String(link.source.id).startsWith(clonePrefix)));
      const targetMatch = link.target.type === 'item' && (link.target.id === config.itemId || (config.includePrefixMatches && String(link.target.id).startsWith(clonePrefix)));
      return sourceMatch || targetMatch;
    });

    const saleItem = itemLinks.filter((l) => l.linkType === 'SALE_ITEM');
    const finrecItem = itemLinks.filter((l) => l.linkType === 'FINREC_ITEM');
    const itemSite = itemLinks.filter((l) => l.linkType === 'ITEM_SITE');

    const saleItemGroups = {};
    for (const link of saleItem) {
      const saleId = link.source?.id || 'unknown-sale';
      const targetItemId = link.target?.id || 'unknown-item';
      const key = `${saleId} -> ${targetItemId}`;
      if (!saleItemGroups[key]) saleItemGroups[key] = [];
      saleItemGroups[key].push({
        linkId: link.id,
        createdAt: normalizeDate(link.createdAt) || normalizeDate(link.metadata?.soldAt),
      });
    }

    const finrecGroups = {};
    for (const link of finrecItem) {
      const finId = link.source?.id || 'unknown-finrec';
      const targetItemId = link.target?.id || 'unknown-item';
      const key = `${finId} -> ${targetItemId}`;
      if (!finrecGroups[key]) finrecGroups[key] = [];
      finrecGroups[key].push({
        linkId: link.id,
        createdAt: normalizeDate(link.createdAt) || normalizeDate(link.metadata?.createdAt),
      });
    }

    const duplicateSalePairs = Object.entries(saleItemGroups)
      .filter(([, rows]) => rows.length > 1)
      .map(([pair, rows]) => ({ pair, count: rows.length }));

    const duplicateFinrecPairs = Object.entries(finrecGroups)
      .filter(([, rows]) => rows.length > 1)
      .map(([pair, rows]) => ({ pair, count: rows.length }));

    const finrecIdPatternCounts = {
      standardFinrecSaleId: 0,
      finrecWithTimestampSuffix: 0,
      other: 0,
    };
    const finrecLineage = [];

    const finrecIds = [...new Set(finrecItem.map((l) => l.source?.id).filter(Boolean))];
    const finrecRows = await Promise.all(finrecIds.map((id) => redis.get(`thegame:data:financial:${id}`)));
    const finrecById = new Map(finrecIds.map((id, idx) => [id, finrecRows[idx]]));

    for (const link of finrecItem) {
      const finId = link.source?.id;
      if (!finId) continue;
      let pattern = 'other';
      if (/^finrec-[a-f0-9-]{36}$/i.test(finId)) pattern = 'standardFinrecSaleId';
      else if (/^finrec-.*-\d{10,}$/.test(finId)) pattern = 'finrecWithTimestampSuffix';
      finrecIdPatternCounts[pattern] += 1;

      const fin = finrecById.get(finId);
      finrecLineage.push({
        finrecId: finId,
        sourceSaleId: fin?.sourceSaleId || null,
        targetItemId: link.target?.id || null,
        linkId: link.id,
      });
    }

    report.itemAnalysis = {
      itemId: config.itemId,
      includePrefixMatches: config.includePrefixMatches,
      counts: {
        totalLinksForItemAndClones: itemLinks.length,
        saleItem: saleItem.length,
        finrecItem: finrecItem.length,
        itemSite: itemSite.length,
      },
      duplicates: {
        saleItemSameSourceTarget: duplicateSalePairs,
        finrecItemSameSourceTarget: duplicateFinrecPairs,
      },
      finrecIdPatternCounts,
      finrecLineage,
      saleItemGroups,
      finrecGroups,
      itemSiteLinks: itemSite.map((l) => ({
        linkId: l.id,
        source: l.source,
        target: l.target,
        createdAt: normalizeDate(l.createdAt) || normalizeDate(l.metadata?.createdAt),
      })),
    };
  }

  return report;
}

async function main() {
  const config = parseArgs();
  const report = await buildReport(config);
  const json = JSON.stringify(report, null, 2);

  if (config.output) {
    const absolute = path.isAbsolute(config.output)
      ? config.output
      : path.join(process.cwd(), config.output);
    fs.writeFileSync(absolute, json, 'utf8');
    console.log(`Wrote report to ${absolute}`);
  } else {
    console.log(json);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

