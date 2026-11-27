import type {
  EntityRef,
  FinancialRecord,
  Item,
  Link,
  PeriodAuditFindingV1,
  PeriodAuditMonthSummaryV1,
  PeriodAuditReferenceCheckV2,
  Sale,
  Task,
  TheGamePeriodAuditPacketV2,
} from '@/types/entities';
import { EntityType, FinancialStatus, SaleStatus, TaskStatus } from '@/types/enums';
import {
  getAllFinancialsHistorical,
  getAllItems,
  getAllSalesHistorical,
  getAllTasks,
} from '@/data-store/datastore';
import { buildAccountKey, buildDataKey, buildLinkKey } from '@/data-store/keys';
import { kvMGet } from '@/lib/utils/kv';
import { getLinksFor } from '@/links/link-registry';

export type PeriodAuditEntityFamily = 'tasks' | 'financials' | 'items' | 'sales';

export interface TheGamePeriodAuditInput {
  year: number;
  /** Omit for the complete calendar year. */
  months?: number[];
}

export type { TheGamePeriodAuditPacketV2 as TheGamePeriodAuditPacket } from '@/types/entities';

const MAX_FINDINGS = 100;
const MAX_REFERENCE_ENTITIES = 5000;
const MAX_REFERENCE_LINKS = 10000;
const MAX_REFERENCE_FINDINGS = 100;
const FAMILIES: PeriodAuditEntityFamily[] = ['tasks', 'financials', 'items', 'sales'];
const REFERENCE_SCOPE = 'Canonical Links returned by selected-period entity link indexes; checks endpoint existence only. It does not scan orphaned Link rows, infer missing required Links, or validate Link business rules.';

export function validateTheGamePeriodAuditInput(value: unknown): Required<TheGamePeriodAuditInput> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('PERIOD_AUDIT_INPUT_REQUIRED');
  const raw = value as TheGamePeriodAuditInput;
  if (!Number.isInteger(raw.year) || raw.year < 2000 || raw.year > 9999) throw new Error('PERIOD_AUDIT_YEAR_INVALID');
  const months = raw.months === undefined ? Array.from({ length: 12 }, (_, index) => index + 1) : raw.months;
  if (!Array.isArray(months) || months.length === 0 || months.some((month) => !Number.isInteger(month) || month < 1 || month > 12)) {
    throw new Error('PERIOD_AUDIT_MONTHS_INVALID');
  }
  const uniqueMonths = [...new Set(months)].sort((left, right) => left - right);
  return { year: raw.year, months: uniqueMonths };
}

function monthForUtc(value: unknown, year: number): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== year) return null;
  return date.getUTCMonth() + 1;
}

function taskDate(task: Task): unknown {
  const runtimeTask = task as any;
  return runtimeTask.lifecycle?.doneAt || runtimeTask.doneAt || task.createdAt || task.updatedAt;
}

function saleDate(sale: Sale): unknown {
  return sale.lifecycle?.chargedAt || sale.saleDate || sale.createdAt || sale.updatedAt;
}

function itemDate(item: Item): unknown {
  return item.createdAt || item.updatedAt;
}

function referenceEntityKey(reference: EntityRef): string | null {
  if (!reference?.type || !reference?.id) return null;
  if (reference.type === EntityType.ACCOUNT) return buildAccountKey(reference.id);
  if (reference.type === EntityType.LINK) return buildLinkKey(reference.id);
  return buildDataKey(reference.type, reference.id);
}

async function inspectPeriodReferences(
  selectedEntities: EntityRef[],
  sourceCoverageIncomplete: boolean,
): Promise<PeriodAuditReferenceCheckV2> {
  const sortedEntities = [...new Map(
    selectedEntities
      .filter((entity) => entity?.type && entity?.id)
      .map((entity) => [`${entity.type}:${entity.id}`, entity] as const),
  ).values()].sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
  const entities = sortedEntities.slice(0, MAX_REFERENCE_ENTITIES);
  let incomplete = sourceCoverageIncomplete || sortedEntities.length > entities.length;

  try {
    const linksById = new Map<string, Link>();
    for (let index = 0; index < entities.length; index += 20) {
      const batch = entities.slice(index, index + 20);
      const linkGroups = await Promise.all(batch.map((entity) => getLinksFor(entity)));
      for (const links of linkGroups) {
        for (const link of links) linksById.set(link.id, link);
      }
      if (linksById.size > MAX_REFERENCE_LINKS) {
        incomplete = true;
        break;
      }
    }

    const allLinks = [...linksById.values()].sort((left, right) => left.id.localeCompare(right.id));
    const links = allLinks.slice(0, MAX_REFERENCE_LINKS);
    if (allLinks.length > links.length) incomplete = true;

    const endpointKeys = links.flatMap((link) => [
      referenceEntityKey(link.source),
      referenceEntityKey(link.target),
    ]).filter((key): key is string => key !== null);
    const uniqueKeys = [...new Set(endpointKeys)];
    const existingKeys = new Set<string>();
    for (let index = 0; index < uniqueKeys.length; index += 500) {
      const keys = uniqueKeys.slice(index, index + 500);
      const values = await kvMGet<unknown>(keys);
      for (let item = 0; item < keys.length; item += 1) {
        if (values[item] !== null && values[item] !== undefined) existingKeys.add(keys[item]);
      }
    }

    const findings: PeriodAuditReferenceCheckV2['findings'] = [];
    let issueCount = 0;
    const recordMissingEndpoint = (link: Link, endpoint: 'source' | 'target') => {
      const reference = link[endpoint];
      const key = referenceEntityKey(reference);
      if (key && existingKeys.has(key)) return;
      issueCount += 1;
      if (findings.length < MAX_REFERENCE_FINDINGS) {
        findings.push({
          linkId: link.id,
          linkType: String(link.linkType),
          missingEndpoint: endpoint,
          entityType: String(reference?.type || 'unknown'),
          entityId: String(reference?.id || ''),
        });
      }
    };
    for (const link of links) {
      recordMissingEndpoint(link, 'source');
      recordMissingEndpoint(link, 'target');
    }

    return {
      status: incomplete ? 'partial' : 'checked',
      scope: REFERENCE_SCOPE,
      entitiesChecked: entities.length,
      linksChecked: links.length,
      issueCount,
      findings,
      findingsTruncated: issueCount > findings.length,
    };
  } catch {
    return {
      status: 'unavailable',
      scope: REFERENCE_SCOPE,
      entitiesChecked: 0,
      linksChecked: 0,
      issueCount: 0,
      findings: [],
      findingsTruncated: false,
    };
  }
}

export async function collectTheGamePeriodAudit(input: TheGamePeriodAuditInput): Promise<TheGamePeriodAuditPacketV2> {
  const { year, months } = validateTheGamePeriodAuditInput(input);
  const sourceStatus = Object.fromEntries(FAMILIES.map((family) => [family, 'available'])) as TheGamePeriodAuditPacketV2['sourceStatus'];
  const settled = await Promise.allSettled([
    getAllTasks(),
    getAllFinancialsHistorical(),
    getAllItems(),
    getAllSalesHistorical(),
  ] as const);
  const [taskRead, financialRead, itemRead, saleRead] = settled;
  const sourceValues = <T>(result: PromiseSettledResult<T[]>, family: PeriodAuditEntityFamily): T[] => {
    if (result.status === 'fulfilled') return result.value;
    sourceStatus[family] = 'unavailable';
    return [];
  };
  const tasks = sourceValues(taskRead, 'tasks');
  const financials = sourceValues(financialRead, 'financials');
  const items = sourceValues(itemRead, 'items');
  const sales = sourceValues(saleRead, 'sales');
  const summaries = new Map(months.map((month) => [month, {
    month, tasks: 0, financials: 0, items: 0, sales: 0, notDateable: 0, noActivity: false,
  }]));
  const referenceEntities: EntityRef[] = [];
  const findings: PeriodAuditFindingV1[] = [];
  let findingsTruncated = false;
  const addFinding = (finding: PeriodAuditFindingV1) => {
    if (findings.length < MAX_FINDINGS) findings.push(finding);
    else findingsTruncated = true;
  };
  const selected = (month: number | null): month is number => month !== null && summaries.has(month);

  for (const task of tasks) {
    const month = monthForUtc(taskDate(task), year);
    if (!selected(month)) continue;
    summaries.get(month)!.tasks += 1;
    referenceEntities.push({ type: EntityType.TASK, id: task.id });
    const runtimeTask = task as any;
    if ((task.status === TaskStatus.DONE || task.status === TaskStatus.COLLECTED) && !runtimeTask.lifecycle?.doneAt && !runtimeTask.doneAt) {
      addFinding({ entityFamily: 'tasks', entityId: task.id, month, rule: 'completed-task-missing-done-at', severity: 'warning', observed: `status=${task.status} without doneAt`, suggestedAction: 'Verify the task lifecycle timestamp.' });
    }
  }

  for (const financial of financials) {
    const month = Number(financial.month);
    if (financial.year !== year) continue;
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      addFinding({ entityFamily: 'financials', entityId: financial.id, month: null, rule: 'financial-period-invalid', severity: 'error', observed: `year=${financial.year}, month=${String(financial.month)}`, suggestedAction: 'Correct the canonical financial period.' });
      continue;
    }
    if (!selected(month)) continue;
    summaries.get(month)!.financials += 1;
    referenceEntities.push({ type: EntityType.FINANCIAL, id: financial.id });
    if (financial.status === FinancialStatus.PENDING) {
      addFinding({ entityFamily: 'financials', entityId: financial.id, month, rule: 'financial-pending', severity: 'info', observed: 'status=pending', suggestedAction: 'Review whether this record should remain pending.' });
    }
  }

  for (const item of items) {
    const month = monthForUtc(itemDate(item), year);
    if (!selected(month)) continue;
    summaries.get(month)!.items += 1;
    referenceEntities.push({ type: EntityType.ITEM, id: item.id });
  }

  for (const sale of sales) {
    const month = monthForUtc(saleDate(sale), year);
    if (!selected(month)) continue;
    summaries.get(month)!.sales += 1;
    referenceEntities.push({ type: EntityType.SALE, id: sale.id });
    if ((sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.COLLECTED) && !sale.lifecycle?.chargedAt) {
      addFinding({ entityFamily: 'sales', entityId: sale.id, month, rule: 'charged-sale-missing-charged-at', severity: 'warning', observed: `status=${sale.status} without chargedAt`, suggestedAction: 'Verify the sale lifecycle timestamp.' });
    }
  }

  const monthsSummary = [...summaries.values()].map((summary) => ({
    ...summary,
    noActivity: summary.tasks + summary.financials + summary.items + summary.sales === 0,
  }));
  const references = await inspectPeriodReferences(
    referenceEntities,
    Object.values(sourceStatus).some((status) => status !== 'available'),
  );
  return {
    schemaVersion: 2,
    year,
    months,
    generatedAt: new Date().toISOString(),
    groupingRules: {
      tasks: 'UTC lifecycle.doneAt; createdAt/updatedAt only when completion is unavailable.',
      financials: 'Canonical year and month fields.',
      items: 'UTC createdAt or updatedAt inventory activity.',
      sales: 'UTC lifecycle.chargedAt; saleDate/createdAt only when chargedAt is unavailable.',
    },
    sourceStatus,
    monthsSummary,
    findings,
    findingsTruncated,
    references,
  };
}
