import 'server-only';

import {
  getTaskById,
  getItemById,
  getSaleById,
  getFinancialById,
  getCharacterById,
  getPlayerById,
  getSiteById,
  getAccountById,
  getBusinessById,
  getContractById,
  getSettlementById,
} from '@/data-store/datastore';
import { kvSMembers, kvGet } from '@/lib/utils/kv';
import {
  buildMonthIndexKey,
  buildArchiveIndexKey,
  buildArchiveDataKey,
} from '@/data-store/keys';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, SaleStatus } from '@/types/enums';
import type { Sale, FinancialRecord } from '@/types/entities';
import { INTEGRITY_ISSUES_CAP, type IntegrityAuditResult, type IntegrityIssue } from './types';

const MAX_ENTITIES_SCAN = 400;

export function toMMYY(month: number, year: number): string {
  const mm = String(month).padStart(2, '0');
  const yy = String(year % 100).padStart(2, '0');
  return `${mm}-${yy}`;
}

function pushIssue(
  issues: IntegrityIssue[],
  total: { n: number },
  code: string,
  detail: string,
  entityType?: string,
  entityId?: string
) {
  total.n += 1;
  if (issues.length < INTEGRITY_ISSUES_CAP) {
    issues.push({ code, detail, entityType, entityId });
  }
}

async function entityExists(type: EntityType, id: string): Promise<boolean> {
  switch (type) {
    case EntityType.TASK:
      return !!(await getTaskById(id));
    case EntityType.ITEM:
      return !!(await getItemById(id));
    case EntityType.SALE:
      return !!(await getSaleById(id));
    case EntityType.FINANCIAL:
      return !!(await getFinancialById(id));
    case EntityType.CHARACTER:
      return !!(await getCharacterById(id));
    case EntityType.PLAYER:
      return !!(await getPlayerById(id));
    case EntityType.SITE:
      return !!(await getSiteById(id));
    case EntityType.ACCOUNT:
      return !!(await getAccountById(id));
    case EntityType.BUSINESS:
      return !!(await getBusinessById(id));
    case EntityType.CONTRACT:
      return !!(await getContractById(id));
    case EntityType.SETTLEMENT:
      return !!(await getSettlementById(id));
    case EntityType.LINK:
    case EntityType.SESSION:
    default:
      return false;
  }
}

function saleDateMmyy(sale: Sale): string {
  const d = new Date(sale.saleDate);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  return `${mm}-${yy}`;
}

/**
 * Links touching month-scoped entities: verify both endpoints exist.
 */
export async function auditLinkConsistency(month: number, year: number): Promise<IntegrityAuditResult> {
  const mmyy = toMMYY(month, year);
  const issues: IntegrityIssue[] = [];
  const total = { n: 0 };

  const taskIds = await kvSMembers(buildMonthIndexKey(EntityType.TASK, mmyy));
  const saleIds = await kvSMembers(buildMonthIndexKey(EntityType.SALE, mmyy));
  const itemIds = await kvSMembers(buildMonthIndexKey(EntityType.ITEM, mmyy));
  const finIds = await kvSMembers(buildMonthIndexKey(EntityType.FINANCIAL, mmyy));

  const seeds: { type: EntityType; id: string }[] = [
    ...taskIds.map((id) => ({ type: EntityType.TASK, id })),
    ...saleIds.map((id) => ({ type: EntityType.SALE, id })),
    ...itemIds.map((id) => ({ type: EntityType.ITEM, id })),
    ...finIds.map((id) => ({ type: EntityType.FINANCIAL, id })),
  ].slice(0, MAX_ENTITIES_SCAN);

  const seenLink = new Set<string>();

  for (const { type, id } of seeds) {
    let links: Awaited<ReturnType<typeof getLinksFor>>;
    try {
      links = await getLinksFor({ type, id });
    } catch {
      pushIssue(issues, total, 'LINK_QUERY_FAILED', `Could not load links for ${type}:${id}`, type, id);
      continue;
    }

    for (const link of links) {
      if (seenLink.has(link.id)) continue;
      seenLink.add(link.id);

      const srcOk = await entityExists(link.source.type as EntityType, link.source.id);
      if (!srcOk) {
        pushIssue(
          issues,
          total,
          'LINK_MISSING_SOURCE',
          `Link ${link.id} source ${link.source.type}:${link.source.id} not found`,
          String(link.source.type),
          link.source.id
        );
      }
      const tgtOk = await entityExists(link.target.type as EntityType, link.target.id);
      if (!tgtOk) {
        pushIssue(
          issues,
          total,
          'LINK_MISSING_TARGET',
          `Link ${link.id} target ${link.target.type}:${link.target.id} not found`,
          String(link.target.type),
          link.target.id
        );
      }
    }
  }

  return {
    ok: total.n === 0,
    audit: 'linkConsistency',
    scope: { month, year, mmyy },
    summary: {
      totalIssueCount: total.n,
      truncated: total.n > INTEGRITY_ISSUES_CAP,
      notes: `Scanned up to ${seeds.length} seeded entities from month indexes (cap ${MAX_ENTITIES_SCAN}).`,
    },
    issues,
  };
}

function paymentLooksPresent(sale: Sale): boolean {
  const pb = sale.paymentBreakdown;
  const breakdownSum = pb
    ? (pb.cashUSD || 0) + (pb.cashCRC || 0) + (pb.card || 0) + (pb.bitcoin || 0)
    : 0;
  const payArr = sale.payments?.length ?? 0;
  return breakdownSum > 0 || payArr > 0;
}

/**
 * Sale status vs payment / collected flags (scoped to month index).
 */
export async function auditStatusConsistency(month: number, year: number): Promise<IntegrityAuditResult> {
  const mmyy = toMMYY(month, year);
  const issues: IntegrityIssue[] = [];
  const total = { n: 0 };

  const saleIds = (await kvSMembers(buildMonthIndexKey(EntityType.SALE, mmyy))).slice(0, MAX_ENTITIES_SCAN);

  for (const id of saleIds) {
    const sale = await getSaleById(id);
    if (!sale) {
      pushIssue(issues, total, 'SALE_INDEX_ORPHAN', `Sale id in month index but no record: ${id}`, EntityType.SALE, id);
      continue;
    }

    if (sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.COLLECTED) {
      const rev = sale.totals?.totalRevenue ?? 0;
      if (rev > 0 && sale.isNotCharged && !paymentLooksPresent(sale)) {
        pushIssue(
          issues,
          total,
          'SALE_CHARGED_WITHOUT_PAYMENT',
          `Sale ${id} is ${sale.status} with revenue ${rev} but still marked isNotCharged without payment data`,
          EntityType.SALE,
          id
        );
      }
    }

    if (sale.status === SaleStatus.COLLECTED && !sale.isCollected) {
      pushIssue(
        issues,
        total,
        'SALE_COLLECTED_FLAG',
        `Sale ${id} status COLLECTED but isCollected is false`,
        EntityType.SALE,
        id
      );
    }
  }

  const finIds = (await kvSMembers(buildMonthIndexKey(EntityType.FINANCIAL, mmyy))).slice(0, 200);
  for (const id of finIds) {
    const fin = await getFinancialById(id);
    if (!fin) {
      pushIssue(issues, total, 'FIN_INDEX_ORPHAN', `Financial id in month index but no record: ${id}`, EntityType.FINANCIAL, id);
      continue;
    }
  }

  return {
    ok: total.n === 0,
    audit: 'statusConsistency',
    scope: { month, year, mmyy },
    summary: {
      totalIssueCount: total.n,
      truncated: total.n > INTEGRITY_ISSUES_CAP,
      notes: `Checked sales (${saleIds.length}) and financials (${finIds.length}) in month index.`,
    },
    issues,
  };
}

/**
 * Month index vs entity date fields.
 */
export async function auditMonthIndexAccuracy(month: number, year: number): Promise<IntegrityAuditResult> {
  const mmyy = toMMYY(month, year);
  const issues: IntegrityIssue[] = [];
  const total = { n: 0 };

  const saleIds = (await kvSMembers(buildMonthIndexKey(EntityType.SALE, mmyy))).slice(0, MAX_ENTITIES_SCAN);
  for (const id of saleIds) {
    const sale = await getSaleById(id);
    if (!sale) {
      pushIssue(issues, total, 'SALE_INDEX_ORPHAN', `Sale ${id} in month index but missing`, EntityType.SALE, id);
      continue;
    }
    if (saleDateMmyy(sale) !== mmyy) {
      pushIssue(
        issues,
        total,
        'SALE_MONTH_MISMATCH',
        `Sale ${id} saleDate month ${saleDateMmyy(sale)} does not match index month ${mmyy}`,
        EntityType.SALE,
        id
      );
    }
  }

  const finIds = (await kvSMembers(buildMonthIndexKey(EntityType.FINANCIAL, mmyy))).slice(0, MAX_ENTITIES_SCAN);
  for (const id of finIds) {
    const fin = (await getFinancialById(id)) as FinancialRecord | null;
    if (!fin) {
      pushIssue(issues, total, 'FIN_INDEX_ORPHAN', `Financial ${id} in month index but missing`, EntityType.FINANCIAL, id);
      continue;
    }
    if (fin.month !== month || fin.year !== year) {
      pushIssue(
        issues,
        total,
        'FIN_MONTH_FIELDS_MISMATCH',
        `Financial ${id} has year/month ${fin.year}-${fin.month} but index is ${year}-${month}`,
        EntityType.FINANCIAL,
        id
      );
    }
  }

  return {
    ok: total.n === 0,
    audit: 'monthIndexAccuracy',
    scope: { month, year, mmyy },
    summary: {
      totalIssueCount: total.n,
      truncated: total.n > INTEGRITY_ISSUES_CAP,
      notes: `Compared sale dates and fin year/month fields to ${mmyy}.`,
    },
    issues,
  };
}

/**
 * Collected sales should appear in archive for the same MM-YY bucket.
 */
export async function auditArchiveCompleteness(month: number, year: number): Promise<IntegrityAuditResult> {
  const mmyy = toMMYY(month, year);
  const issues: IntegrityIssue[] = [];
  const total = { n: 0 };

  const saleIds = (await kvSMembers(buildMonthIndexKey(EntityType.SALE, mmyy))).slice(0, MAX_ENTITIES_SCAN);
  const archiveIndex = new Set(await kvSMembers(buildArchiveIndexKey(EntityType.SALE, mmyy)));

  for (const id of saleIds) {
    const sale = await getSaleById(id);
    if (!sale) {
      pushIssue(issues, total, 'SALE_MISSING', `Sale ${id} in index but record missing`, EntityType.SALE, id);
      continue;
    }
    if (sale.isCollected && !archiveIndex.has(id)) {
      pushIssue(
        issues,
        total,
        'SALE_COLLECTED_NOT_ARCHIVED',
        `Sale ${id} is collected but not present in archive index for ${mmyy}`,
        EntityType.SALE,
        id
      );
      continue;
    }
    if (sale.isCollected && archiveIndex.has(id)) {
      const data = await kvGet<Sale>(buildArchiveDataKey(EntityType.SALE, mmyy, id));
      if (!data) {
        pushIssue(
          issues,
          total,
          'ARCHIVE_DATA_MISSING',
          `Sale ${id} in archive index but archive data key missing`,
          EntityType.SALE,
          id
        );
      }
    }
  }

  return {
    ok: total.n === 0,
    audit: 'archiveCompleteness',
    scope: { month, year, mmyy },
    summary: {
      totalIssueCount: total.n,
      truncated: total.n > INTEGRITY_ISSUES_CAP,
      notes: `Checked collected sales vs archive index/data for ${mmyy}.`,
    },
    issues,
  };
}

