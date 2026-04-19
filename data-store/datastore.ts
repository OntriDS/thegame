// data-store/datastore.ts
// Orchestration layer: repositories → workflows → links → logging

import type { Task, Item, FinancialRecord, Sale, Character, Player, Site, Settlement, Account, Business, Contract } from '@/types/entities';
import { roundSaleTotals } from '@/lib/utils/financial-utils';
import { ensureItemSaleLineIds, normalizeSale } from '@/lib/utils/sale-lines-normalize';
import type { TaskSnapshot, ItemSnapshot, SaleSnapshot, FinancialSnapshot } from '@/types/archive';
import { CharacterRole, EntityType, ItemType, TaskPriority, TaskStatus, FinancialStatus, TaskType, SaleStatus, ItemStatus } from '@/types/enums';
import {
  upsertTask as repoUpsertTask,
  getAllTasks as repoGetAllTasks,
  getTaskById as repoGetTaskById,
  deleteTask as repoDeleteTask,
  getTasksByParentId as repoGetTasksByParentId
} from './repositories/task.repo';
import {
  upsertItem as repoUpsertItem,
  getAllItems as repoGetAllItems,
  getItemById as repoGetItemById,
  deleteItem as repoDeleteItem,
  getItemsBySourceTaskId as repoGetItemsBySourceTaskId,
  getItemsBySourceRecordId as repoGetItemsBySourceRecordId,
  getItemsByType as repoGetItemsByType,
  getActiveItems as repoGetActiveItems,
  getLegacyItems as repoGetLegacyItems
} from './repositories/item.repo';
import {
  upsertFinancial as repoUpsertFinancial,
  getAllFinancials as repoGetAllFinancials,
  getFinancialById as repoGetFinancialById,
  deleteFinancial as repoDeleteFinancial,
  getFinancialsBySourceTaskId as repoGetFinancialsBySourceTaskId,
  getFinancialsBySourceSaleId as repoGetFinancialsBySourceSaleId,
  upsertContract as repoUpsertContract,
  getAllContracts as repoGetAllContracts,
  getContractById as repoGetContractById,
  deleteContract as repoDeleteContract
} from './repositories/financial.repo';
import {
  upsertSale as repoUpsertSale,
  getAllSales as repoGetAllSales,
  getSaleById as repoGetSaleById,
  deleteSale as repoDeleteSale
} from './repositories/sale.repo';
import {
  upsertCharacter as repoUpsertCharacter,
  getAllCharacters as repoGetAllCharacters,
  getCharacterById as repoGetCharacterById,
  deleteCharacter as repoDeleteCharacter,
  upsertBusiness as repoUpsertBusiness,
  getAllBusinesses as repoGetAllBusinesses,
  getBusinessById as repoGetBusinessById,
  deleteBusiness as repoDeleteBusiness
} from './repositories/character.repo';
import {
  upsertPlayer as repoUpsertPlayer,
  getAllPlayers as repoGetAllPlayers,
  getPlayerById as repoGetPlayerById,
  deletePlayer as repoDeletePlayer
} from './repositories/player.repo';
import {
  upsertAccount as repoUpsertAccount,
  getAllAccounts as repoGetAllAccounts,
  getAccountById as repoGetAccountById,
  deleteAccount as repoDeleteAccount
} from './repositories/account.repo';
// duplicate imports removed
import {
  upsertSite as repoUpsertSite,
  getAllSites as repoGetAllSites,
  getSiteById as repoGetSiteById,
  deleteSite as repoDeleteSite,
  getAllSettlements as repoGetAllSettlements,
  getSettlementById as repoGetSettlementById,
  upsertSettlement as repoUpsertSettlement,
  removeSettlement as repoRemoveSettlement,
  getSitesBySettlement as repoGetSitesBySettlement,
  getSitesByRadius as repoGetSitesByRadius
} from './repositories/site.repo';
import * as archiveRepo from './repositories/archive.repo';
import { kvGet, kvSet } from './kv';
// Import workflow functions dynamically to break circular dependency
import { processLinkEntity } from '@/links/links-workflows';
import {
  appendEntityLog,
  getEntityLogs as workflowGetEntityLogs,
  getEntityLogMonths as workflowGetEntityLogMonths,
  removeLogEntriesAcrossMonths as workflowRemoveLogEntriesAcrossMonths
} from '@/workflows/entities-logging';
import { SummaryService } from './services/summary.service';
import { SummaryRepository } from './repositories/summary.repo';
// UTC STANDARDIZATION: Using new UTC utilities
import { reviveDates } from '@/lib/utils/date-utils';
import {
  getUTCNow,
  toUTCISOString,
  formatArchiveMonthKeyUTC,
  formatArchiveMonthKeyUTCFromParts,
} from '@/lib/utils/utc-utils';
import { resolveTaskCompletedArchiveMonthKeyUTC } from '@/lib/utils/task-archive-index-utils';
import { kvDel, kvMGet, kvSAdd, kvSMembers, kvSRem } from './kv';
import {
  buildDataKey,
  buildIndexKey,
  buildMonthIndexKey,
  buildArchiveMonthsKey,
  buildSummaryMonthsKey,
  buildTaskActiveIndexKey,
} from './keys';
import { isTaskActive, isTaskCompleted } from '@/lib/utils/task-active-utils';
import { isSoldStatus } from '@/lib/utils/status-utils';
import type { PlayerArchiveRow } from '@/types/archive';
import {
  normalizeItemTaxonomyFields,
  normalizeTaskOutputTaxonomy,
  normalizeFinancialOutputTaxonomy,
  normalizeSaleOutputTaxonomy,
} from '@/lib/item-taxonomy-normalize';

type EcosystemCharacterSnapshot = {
  id: string;
  accountId: string;
  name: string;
  roles: CharacterRole[];
  profile: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

const toIsoTimestamp = (value?: Date | string | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const syncEcosystemCharacterSnapshot = async (character: Character): Promise<void> => {
  if (!character.id || !character.accountId) return;

  const now = new Date();
  const snapshotKey = `iam:character:${character.id}`;
  const existing = await kvGet<EcosystemCharacterSnapshot>(snapshotKey);

  const snapshot: EcosystemCharacterSnapshot = {
    id: character.id,
    accountId: character.accountId,
    name: (character.name || 'Customer').trim(),
    roles: character.roles,
    profile: existing?.profile || {},
    createdAt:
      toIsoTimestamp(existing?.createdAt) ||
      toIsoTimestamp(character.createdAt) ||
      toUTCISOString(now),
    updatedAt: toUTCISOString(now),
  };

  await kvSet(snapshotKey, snapshot);
  await kvSAdd('iam:index:characters', character.id);
};

// TASKS
export async function upsertTask(task: Task, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean; skipDuplicateCheck?: boolean }): Promise<Task> {
  // Explicitly block self-referential parent assignment (circular reference)
  if (task.parentId && task.parentId === task.id) {
    console.warn(`[Datastore] Prevented Task ${task.id} from becoming its own parent.`);
    task.parentId = null;
  }

  const previous = await repoGetTaskById(task.id);
  let normalizedTask =
    task.status === TaskStatus.DONE
      ? { ...task, priority: TaskPriority.NORMAL }
      : task;
  normalizedTask = normalizeTaskOutputTaxonomy(normalizedTask);
  const saved = await repoUpsertTask(normalizedTask);

  // Identity Shield: Time-Window Deduplication (30 seconds)
  // Only apply to NEW tasks (no previous record found) to allow updates
  // Skip if explicitly requested (e.g., intentional duplicate via Duplicate button)
  if (!previous && !options?.skipDuplicateCheck) {
    const DUPLICATION_WINDOW_MS = 30 * 1000; // 30 seconds
    const now = getUTCNow();

    // Fetch recent tasks (could be optimized with a time-based index, but filtering getAllTasks is acceptable for now given volume)
    // NOTE: In high-volume prod, query by approximate time range is better.
    const recentTasks = (await repoGetAllTasks()).filter(t =>
      t.id !== saved.id && // exclude self
      t.createdAt &&
      (now.getTime() - new Date(t.createdAt).getTime() < DUPLICATION_WINDOW_MS)
    );

    const isDuplicate = recentTasks.some(existing => {
      // 1. Basic Identity Match
      const basicMatch =
        existing.name === saved.name &&
        existing.type === saved.type &&
        existing.station === saved.station &&
        existing.priority === saved.priority;

      if (!basicMatch) return false;

      // 2. Recurrence Exception
      // If both are instances of the same parent (Recurrent Instances), they are NOT duplicates 
      // IF their scheduledStart is different.
      if (
        saved.type === TaskType.RECURRENT_INSTANCE &&
        existing.type === TaskType.RECURRENT_INSTANCE &&
        saved.parentId === existing.parentId
      ) {
        // If scheduledStart differs, they are distinct instances (e.g. Daily Task for Monday vs Tuesday)
        const savedStart = saved.scheduledStart ? new Date(saved.scheduledStart).getTime() : 0;
        const existingStart = existing.scheduledStart ? new Date(existing.scheduledStart).getTime() : 0;

        if (savedStart !== existingStart) return false;
      }

      // If we got here, it's a duplicate
      return true;
    });

    if (isDuplicate) {
      console.warn(`[upsertTask] Prevented duplicate task creation: ${saved.name} (${saved.id})`);
      // We essentially "undo" the save by throwing (or we could physically delete, but throwing allows API to handle it)
      // Since we already saved it (to get the ID for comparison? No, we shouldn't have saved it yet ideally)
      // The current architecture saves first. We must delete it.
      await repoDeleteTask(saved.id);
      throw new Error(`DUPLICATE_TASK_DETECTED: A similar task was created less than 2 minutes ago.`);
    }
  }

  // Phase 2: Rolling Summary Update
  await SummaryService.updateTaskCounters(saved, previous || undefined);

  if (!options?.skipWorkflowEffects) {
    const { onTaskUpsert } = await import('@/workflows/entities-workflows/task.workflow');
    await onTaskUpsert(saved, previous || undefined);
  }

  // onTaskUpsert may call nested upsertTask(skipWorkflowEffects) and update KV; `saved` can be stale.
  // Links (TASK_CHARACTER, etc.) must match the row actually stored.
  if (!options?.skipLinkEffects) {
    const latest = await getTaskById(saved.id);
    await processLinkEntity(latest ?? saved, EntityType.TASK);
  }

  return saved;
}

export async function getAllTasks(): Promise<Task[]> {
  const tasks = await repoGetAllTasks();
  return reviveDates(tasks);
}

/**
 * Returns a high-level count of total, active, and completed tasks across the entire database.
 * Useful for global data integrity audits.
 */
export async function getGlobalTaskCounts(): Promise<{ totalTasks: number; activeTasks: number; completedTasks: number; }> {
  const tasks = await repoGetAllTasks();
  let active = 0;
  let completed = 0;
  for (const t of tasks) {
    if (isTaskActive(t)) active++;
    if (isTaskCompleted(t)) completed++;
  }
  return {
    totalTasks: tasks.length,
    activeTasks: active,
    completedTasks: completed
  };
}

// Added specifically for active boards that don't want completed/archived noise
export async function getActiveTasks(): Promise<Task[]> {
  const activeKey = buildTaskActiveIndexKey();
  const ids = await kvSMembers(activeKey);
  if (ids.length === 0) {
    const tasks = await repoGetAllTasks();
    return reviveDates(tasks.filter(isTaskActive));
  }

  const recordKeys = ids.map((id) => buildDataKey(EntityType.TASK, id));
  const chunks = chunkArray(recordKeys, 500);
  const tasks: Task[] = [];
  for (const chunk of chunks) {
    const chunkResults = await kvMGet<Task>(chunk);
    tasks.push(...chunkResults.filter((t): t is Task => t !== null));
  }
  // Drop stale index members (e.g. collected but not yet removed from set)
  return reviveDates(tasks.filter(isTaskActive));
}

const REPAIR_ACTIVE_INDEX_LIST_CAP = 200;

export type RepairTaskActiveIndexResult = {
  activeCount: number;
  totalScanned: number;
  collectedIndexUnionSize: number;
  excludedByCollectedIndexCount: number;
  addedToActiveCount: number;
  removedFromActiveCount: number;
  unchangedCount: number;
  addedToActive: string[];
  removedFromActive: string[];
  truncated: boolean;
  dryRun?: boolean;
};

/**
 * Rebuild `thegame:index:task:active` from all tasks. Excludes ids present in any monthly collected set
 * (or in `completedTaskIdsOverride`, e.g. record-derived completed ids during {@link migrateUtcMonthlyRedisIndexes} dry-run).
 */
export async function repairTaskActiveIndex(options?: {
  dryRun?: boolean;
  /** When set, used as the “completed / collected index” id universe instead of scanning Redis month sets. */
  completedTaskIdsOverride?: Set<string>;
  /** When provided with `completedTaskIdsOverride`, skips loading all tasks again. */
  tasks?: Task[];
}): Promise<RepairTaskActiveIndexResult> {
  const dryRun = options?.dryRun ?? false;
  const activeKey = buildTaskActiveIndexKey();
  const beforeMembers = await kvSMembers(activeKey);
  const beforeIds = new Set(beforeMembers);

  const tasks = options?.tasks ?? (await repoGetAllTasks());
  const collectedIdSet = new Set<string>();
  if (options?.completedTaskIdsOverride) {
    for (const id of options.completedTaskIdsOverride) {
      collectedIdSet.add(id);
    }
  } else {
    const months = await getAvailableArchiveMonths();
    for (const mmyy of months) {
      const key = buildMonthIndexKey(EntityType.TASK, mmyy);
      const memberIds = await kvSMembers(key);
      for (const id of memberIds) {
        collectedIdSet.add(id);
      }
    }
  }

  const activeByRecord = tasks.filter(isTaskActive);
  let excludedByCollectedIndexCount = 0;
  const desiredIds = new Set<string>();
  for (const t of activeByRecord) {
    if (collectedIdSet.has(t.id)) {
      excludedByCollectedIndexCount += 1;
    } else {
      desiredIds.add(t.id);
    }
  }

  const addedFull: string[] = [];
  const removedFull: string[] = [];
  for (const id of desiredIds) {
    if (!beforeIds.has(id)) addedFull.push(id);
  }
  for (const id of beforeIds) {
    if (!desiredIds.has(id)) removedFull.push(id);
  }
  let unchangedCount = 0;
  for (const id of desiredIds) {
    if (beforeIds.has(id)) unchangedCount += 1;
  }

  if (!dryRun) {
    await kvDel(activeKey);
    const desiredArray = [...desiredIds];
    for (let i = 0; i < desiredArray.length; i += 500) {
      const slice = desiredArray.slice(i, i + 500);
      if (slice.length > 0) {
        await kvSAdd(activeKey, ...slice);
      }
    }
  }

  const listTooLong =
    addedFull.length > REPAIR_ACTIVE_INDEX_LIST_CAP || removedFull.length > REPAIR_ACTIVE_INDEX_LIST_CAP;
  const addedToActive = listTooLong
    ? addedFull.slice(0, REPAIR_ACTIVE_INDEX_LIST_CAP)
    : [...addedFull];
  const removedFromActive = listTooLong
    ? removedFull.slice(0, REPAIR_ACTIVE_INDEX_LIST_CAP)
    : [...removedFull];

  return {
    activeCount: desiredIds.size,
    totalScanned: tasks.length,
    collectedIndexUnionSize: collectedIdSet.size,
    excludedByCollectedIndexCount,
    addedToActiveCount: addedFull.length,
    removedFromActiveCount: removedFull.length,
    unchangedCount,
    addedToActive,
    removedFromActive,
    truncated: listTooLong,
    dryRun,
  };
}

export type RepairTaskCompletedIndexResult = {
  totalCompletedTasks: number;
  totalScanned: number;
  monthsRebuilt: number;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  samplesAdded: string[];
  samplesRemoved: string[];
  truncated: boolean;
  dryRun?: boolean;
};

export type MonthBucketsRebuildSummary = {
  monthsRebuilt: number;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  samplesAdded: string[];
  samplesRemoved: string[];
  truncated: boolean;
};

async function rebuildRedisMonthSetBuckets(params: {
  dryRun: boolean;
  desiredIdsByMonth: Record<string, Set<string>>;
  knownMonths: string[];
  redisKeyForMonth: (mmyy: string) => string;
  recordMonthsInArchiveMetaSet: boolean;
  /** When true, samples are `MM-yy:entityId` so multi-bucket migrations stay readable. */
  annotateSampleIds?: boolean;
}): Promise<MonthBucketsRebuildSummary> {
  const annotate = Boolean(params.annotateSampleIds);
  const allMonths = new Set<string>([...params.knownMonths, ...Object.keys(params.desiredIdsByMonth)]);
  const monthSetKey = params.recordMonthsInArchiveMetaSet ? buildArchiveMonthsKey() : null;

  const addedFull: string[] = [];
  const removedFull: string[] = [];
  let unchangedCount = 0;

  for (const mmyy of allMonths) {
    const key = params.redisKeyForMonth(mmyy);
    const beforeMembers = await kvSMembers(key);
    const beforeIds = new Set(beforeMembers);
    const desiredIds = params.desiredIdsByMonth[mmyy] || new Set<string>();

    for (const id of desiredIds) {
      if (!beforeIds.has(id)) addedFull.push(annotate ? `${mmyy}:${id}` : id);
      else unchangedCount += 1;
    }
    for (const id of beforeIds) {
      if (!desiredIds.has(id)) removedFull.push(annotate ? `${mmyy}:${id}` : id);
    }

    if (!params.dryRun) {
      await kvDel(key);
      const desiredArray = [...desiredIds];
      for (let i = 0; i < desiredArray.length; i += 500) {
        const slice = desiredArray.slice(i, i + 500);
        if (slice.length > 0) {
          await kvSAdd(key, ...slice);
        }
      }
      if (monthSetKey) {
        await kvSAdd(monthSetKey, mmyy);
      }
    }
  }

  const listTooLong =
    addedFull.length > REPAIR_ACTIVE_INDEX_LIST_CAP || removedFull.length > REPAIR_ACTIVE_INDEX_LIST_CAP;
  const samplesAdded = listTooLong ? addedFull.slice(0, REPAIR_ACTIVE_INDEX_LIST_CAP) : [...addedFull];
  const samplesRemoved = listTooLong ? removedFull.slice(0, REPAIR_ACTIVE_INDEX_LIST_CAP) : [...removedFull];

  return {
    monthsRebuilt: allMonths.size,
    addedCount: addedFull.length,
    removedCount: removedFull.length,
    unchangedCount,
    samplesAdded,
    samplesRemoved,
    truncated: listTooLong,
  };
}

function saleMonthIndexKeyUTC(sale: Sale): string | null {
  const raw =
    (sale as { collectedAt?: unknown }).collectedAt ||
    (sale as { doneAt?: unknown }).doneAt ||
    sale.saleDate ||
    sale.createdAt;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw as string);
  if (!Number.isFinite(d.getTime())) return null;
  return formatArchiveMonthKeyUTC(d) || null;
}

function financialMonthIndexKeyUTC(f: FinancialRecord): string | null {
  if (!f.year || f.month == null || f.month < 1 || f.month > 12) return null;
  return formatArchiveMonthKeyUTCFromParts(f.year, f.month);
}

export type MigrateUtcMonthlyRedisIndexesResult = {
  dryRun: boolean;
  durationMs: number;
  tasksCompletedArchive: RepairTaskCompletedIndexResult;
  tasksActiveIndex: RepairTaskActiveIndexResult;
  tasksMonthIndex: MonthBucketsRebuildSummary;
  itemsMonthIndex: MonthBucketsRebuildSummary;
  salesMonthIndex: MonthBucketsRebuildSummary;
  financialMonthIndex: MonthBucketsRebuildSummary;
};

/**
 * Rebuild UTC `MM-yy` Redis month buckets (`by-month` indexes) from KV records,
 * then rebuild the task active index (`thegame:index:task:active`) using record-derived completed ids.
 */
export async function migrateUtcMonthlyRedisIndexes(options: {
  dryRun: boolean;
}): Promise<MigrateUtcMonthlyRedisIndexesResult> {
  const t0 = Date.now();
  const knownMonths = await getAvailableArchiveMonths();

  const tasks = reviveDates(await repoGetAllTasks());

  const tasksCompletedArchive = await repairTaskCompletedIndex({
    dryRun: options.dryRun,
    tasks,
    annotateSampleIds: true,
  });

  const desiredTaskMonthByMonth: Record<string, Set<string>> = {};
  for (const t of tasks) {
    const raw = (t as { doneAt?: unknown }).doneAt || (t as { collectedAt?: unknown }).collectedAt || t.createdAt || getUTCNow();
    const d = raw instanceof Date ? raw : new Date(raw as string);
    const mmyy = formatArchiveMonthKeyUTC(Number.isFinite(d.getTime()) ? d : getUTCNow());
    if (!desiredTaskMonthByMonth[mmyy]) desiredTaskMonthByMonth[mmyy] = new Set();
    desiredTaskMonthByMonth[mmyy].add(t.id);
  }

  const tasksMonthIndex = await rebuildRedisMonthSetBuckets({
    dryRun: options.dryRun,
    desiredIdsByMonth: desiredTaskMonthByMonth,
    knownMonths,
    redisKeyForMonth: (m) => buildMonthIndexKey(EntityType.TASK, m),
    recordMonthsInArchiveMetaSet: true,
    annotateSampleIds: true,
  });

  const items = reviveDates(await repoGetAllItems());
  const desiredItemMonth: Record<string, Set<string>> = {};
  for (const it of items) {
    if (it.status === ItemStatus.LEGACY) continue;
    const dateForIndex = it.soldAt || it.createdAt;
    if (!dateForIndex) continue;
    const mmyy = formatArchiveMonthKeyUTC(dateForIndex instanceof Date ? dateForIndex : new Date(dateForIndex as string));
    if (!mmyy) continue;
    if (!desiredItemMonth[mmyy]) desiredItemMonth[mmyy] = new Set();
    desiredItemMonth[mmyy].add(it.id);
  }

  const itemsMonthIndex = await rebuildRedisMonthSetBuckets({
    dryRun: options.dryRun,
    desiredIdsByMonth: desiredItemMonth,
    knownMonths,
    redisKeyForMonth: (m) => buildMonthIndexKey(EntityType.ITEM, m),
    recordMonthsInArchiveMetaSet: true,
    annotateSampleIds: true,
  });


  let sales = await repoGetAllSales();
  sales = reviveDates(sales)
    .filter((s): s is Sale => s != null)
    .map((s) => normalizeSale(s));

  const desiredSaleMonth: Record<string, Set<string>> = {};
  for (const s of sales) {
    const mk = saleMonthIndexKeyUTC(s);
    if (mk) {
      if (!desiredSaleMonth[mk]) desiredSaleMonth[mk] = new Set();
      desiredSaleMonth[mk].add(s.id);
    }
  }

  const salesMonthIndex = await rebuildRedisMonthSetBuckets({
    dryRun: options.dryRun,
    desiredIdsByMonth: desiredSaleMonth,
    knownMonths,
    redisKeyForMonth: (m) => buildMonthIndexKey(EntityType.SALE, m),
    recordMonthsInArchiveMetaSet: true,
    annotateSampleIds: true,
  });


  const financials = reviveDates(await repoGetAllFinancials());
  const desiredFinMonth: Record<string, Set<string>> = {};
  for (const f of financials) {
    const mk = financialMonthIndexKeyUTC(f);
    if (mk) {
      if (!desiredFinMonth[mk]) desiredFinMonth[mk] = new Set();
      desiredFinMonth[mk].add(f.id);
    }
  }

  const financialMonthIndex = await rebuildRedisMonthSetBuckets({
    dryRun: options.dryRun,
    desiredIdsByMonth: desiredFinMonth,
    knownMonths,
    redisKeyForMonth: (m) => buildMonthIndexKey(EntityType.FINANCIAL, m),
    recordMonthsInArchiveMetaSet: true,
    annotateSampleIds: true,
  });

  const completedTaskIds = new Set<string>();
  for (const t of tasks) {
    if (isTaskCompleted(t)) completedTaskIds.add(t.id);
  }
  const tasksActiveIndex = await repairTaskActiveIndex({
    dryRun: options.dryRun,
    completedTaskIdsOverride: completedTaskIds,
    tasks,
  });

  return {
    dryRun: options.dryRun,
    durationMs: Date.now() - t0,
    tasksCompletedArchive,
    tasksActiveIndex,
    tasksMonthIndex,
    itemsMonthIndex,
    salesMonthIndex,
    financialMonthIndex,
  };
}

export type RepairPrimaryTaskIndexResult = {
  scannedKeys: number;
  addedOrphans: number;
  totalInIndexNow: number;
  orphanIdsSample: string[];
};

/**
 * Deep scan of the Upstash Redis database to find any tasks that exist as records (thegame:task:*)
 * but have fallen out of the master index (thegame:index:task).
 * This completely fixes "Ghost Tasks" that the system forgot about!
 */
export async function repairPrimaryTaskIndex(): Promise<RepairPrimaryTaskIndexResult> {
  const prefix = buildDataKey(EntityType.TASK, ''); // "thegame:task:"
  const { kvScan } = await import('./kv');
  const allTaskKeys = await kvScan(prefix, 1000);
  
  const extractedIds = allTaskKeys.map(k => k.replace(prefix, ''));
  
  const indexKey = buildIndexKey(EntityType.TASK);
  const beforeMembers = await kvSMembers(indexKey);
  const beforeSet = new Set(beforeMembers);
  
  const orphans: string[] = [];
  for (const id of extractedIds) {
    if (!beforeSet.has(id)) {
      orphans.push(id);
    }
  }
  
  if (orphans.length > 0) {
    for (let i = 0; i < orphans.length; i += 500) {
      await kvSAdd(indexKey, ...orphans.slice(i, i + 500));
    }
  }
  
  return {
    scannedKeys: allTaskKeys.length,
    addedOrphans: orphans.length,
    totalInIndexNow: beforeSet.size + orphans.length,
    orphanIdsSample: orphans.slice(0, 100) // Give the agent/user a sample to analyze
  };
}
/**
 * Rebuild ALL `thegame:index:task:by-month:MM-YY` sets from all tasks marked as completed.
 * Month keys match `task.workflow` archive indexing ({@link resolveTaskCompletedArchiveMonthKeyUTC}).
 */
export async function repairTaskCompletedIndex(options?: {
  dryRun?: boolean;
  /** When provided, skips loading all tasks again (e.g. {@link migrateUtcMonthlyRedisIndexes}). */
  tasks?: Task[];
  annotateSampleIds?: boolean;
}): Promise<RepairTaskCompletedIndexResult> {
  const dryRun = options?.dryRun ?? false;
  const tasks = options?.tasks ?? (await repoGetAllTasks());

  const desiredIdsByMonth: Record<string, Set<string>> = {};
  for (const t of tasks) {
    if (!isTaskCompleted(t)) continue;
    const mmyy = resolveTaskCompletedArchiveMonthKeyUTC(t);
    if (!desiredIdsByMonth[mmyy]) desiredIdsByMonth[mmyy] = new Set<string>();
    desiredIdsByMonth[mmyy].add(t.id);
  }

  const months = await getAvailableArchiveMonths();
  const summary = await rebuildRedisMonthSetBuckets({
    dryRun,
    desiredIdsByMonth,
    knownMonths: months,
    redisKeyForMonth: (m) => buildMonthIndexKey(EntityType.TASK, m),
    recordMonthsInArchiveMetaSet: true,
    annotateSampleIds: Boolean(options?.annotateSampleIds),
  });

  let totalCompletedTasks = 0;
  for (const s of Object.values(desiredIdsByMonth)) {
    totalCompletedTasks += s.size;
  }

  return {
    totalCompletedTasks,
    totalScanned: tasks.length,
    monthsRebuilt: summary.monthsRebuilt,
    addedCount: summary.addedCount,
    removedCount: summary.removedCount,
    unchangedCount: summary.unchangedCount,
    samplesAdded: summary.samplesAdded,
    samplesRemoved: summary.samplesRemoved,
    truncated: summary.truncated,
    dryRun,
  };
}

export async function getTasksByParentId(parentId: string): Promise<Task[]> {
  const tasks = await repoGetTasksByParentId(parentId);
  return reviveDates(tasks);
}

// Phase 4: Unified & Optimized Tasks fetching (Active + Archive)
export async function getTasksForMonth(year: number, month: number): Promise<Task[]> {
  const mmyy = formatArchiveMonthKeyUTCFromParts(year, month);
  const monthIndexKey = buildMonthIndexKey(EntityType.TASK, mmyy);

  // Tasks are indexed by collected/done month
  const { kvSMembers } = await import('./kv');
  const allIds = await kvSMembers(monthIndexKey);

  if (!allIds || allIds.length === 0) return [];

  // 2. Map IDs to storage keys
  const recordKeys = allIds.map(id => buildDataKey(EntityType.TASK, id));

  // 3. Fetch ALL records in chunks of 500
  const chunks = chunkArray(recordKeys, 500);
  const tasks: Task[] = [];

  for (const chunk of chunks) {
    const chunkResults = await kvMGet<Task>(chunk);
    tasks.push(...chunkResults.filter((t): t is Task => t !== null));
  }

  return reviveDates(tasks);
}

export async function getTaskById(id: string): Promise<Task | null> {
  return await repoGetTaskById(id);
}

export type RemoveTaskOptions = {
  /**
   * When deleting a task that has **any** subtasks (any parent type), also hard-delete active descendants.
   * Default false: orphan all children (done/collected and active) and never delete history-terminal rows.
   */
  cascadeDeleteActiveChildren?: boolean;
};

export async function removeTask(id: string, options?: RemoveTaskOptions): Promise<void> {
  const existing = await repoGetTaskById(id);
  if (!existing) return;

  const cascade = options?.cascadeDeleteActiveChildren === true;

  const { prepareTaskSubtreeBeforeParentRemoval } = await import('@/lib/utils/recurrent-task-utils');
  await prepareTaskSubtreeBeforeParentRemoval(existing, { cascadeDeleteActiveChildren: cascade });

  const stillThere = await repoGetTaskById(id);
  if (!stillThere) return;

  await repoDeleteTask(id);

  // Phase 2: Rolling Summary Update
  await SummaryService.handleTaskDeletion(existing);

  const { removeTaskLogEntriesOnDelete } = await import('@/workflows/entities-workflows/task.workflow');
  await removeTaskLogEntriesOnDelete(existing);
}

// ITEMS
// NOTE: Item is saved to KV BEFORE workflows run. This means:
// - If workflows fail, the item still exists in the database
// - This prevents data loss but may cause 500 errors if workflows throw
// - API routes MUST have try/catch to handle workflow failures gracefully
export async function upsertItem(item: Item, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Item> {
  const itemNorm = normalizeItemTaxonomyFields(item);
  const previous = await repoGetItemById(itemNorm.id);

  // Identity Shield: Time-Window Deduplication (2 minutes)
  // Only apply to NEW items (no previous record found) to allow legitimate updates
  if (!previous) {
    const DUPLICATION_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
    const now = getUTCNow();

    // Fetch recent items
    // NOTE: This could be optimized with a query by createdAt if available in repo, 
    // but filtering getAllItems is acceptable for current scale.
    const recentItems = (await repoGetAllItems()).filter(i =>
      i.id !== itemNorm.id && // exclude self
      i.createdAt &&
      (now.getTime() - new Date(i.createdAt).getTime() < DUPLICATION_WINDOW_MS)
    );

    const isDuplicate = recentItems.some(existing => {
      // 1. Basic Identity Match
      return (
        existing.name === itemNorm.name &&
        existing.type === itemNorm.type &&
        existing.station === itemNorm.station &&
        existing.subItemType === itemNorm.subItemType &&
        // Check stock length as a proxy for "same content"
        (existing.stock?.length || 0) === (itemNorm.stock?.length || 0)
      );
    });

    if (isDuplicate) {
      console.warn(`[upsertItem] Prevented duplicate item creation: ${itemNorm.name}`);
      // We technically haven't saved it yet in this flow (repoUpsertItem is called AFTER this check in my proposed change, 
      // but wait... the original code calls repoUpsertItem at line 206. I need to intercept BEFORE line 206).

      // Wait, the original code is:
      // const saved = await repoUpsertItem(item);

      // I need to change that order OR delete it if dup detected. 
      // Changing order is safer.
      throw new Error(`DUPLICATE_ITEM_DETECTED: A similar item was created less than 2 minutes ago.`);
    }
  }

  const saved = await repoUpsertItem({
    ...itemNorm
  });  // ✅ Item persisted here

  // Phase 2: Rolling Summary Update
  await SummaryService.updateItemCounters(saved, previous || undefined);

  if (!options?.skipWorkflowEffects) {
    const { onItemUpsert } = await import('@/workflows/entities-workflows/item.workflow');
    await onItemUpsert(saved, previous || undefined);  // ⚠️ Can throw
  }

  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.ITEM);   // ⚠️ Can throw
  }

  return saved;
}

export async function getAllItems(): Promise<Item[]> {
  return await repoGetAllItems();
}

export async function getActiveItems(): Promise<Item[]> {
  return await repoGetActiveItems();
}

export async function getLegacyItems(): Promise<Item[]> {
  return await repoGetLegacyItems();
}

// Phase 6: Unified & Optimized Items fetching (Active + Archive)
export async function getItemsForMonth(year: number, month: number): Promise<Item[]> {
  const mmyy = formatArchiveMonthKeyUTCFromParts(year, month);
  const ids = await kvSMembers(buildMonthIndexKey(EntityType.ITEM, mmyy));

  if (!ids || ids.length === 0) return [];

  // 2. Map IDs to storage keys
  const recordKeys = ids.map(id => buildDataKey(EntityType.ITEM, id));

  // 3. Fetch ALL records in chunks of 500
  const chunks = chunkArray(recordKeys, 500);
  const items: Item[] = [];

  for (const chunk of chunks) {
    const chunkResults = await kvMGet<Item>(chunk);
    items.push(...chunkResults.filter((i): i is Item => i !== null));
  }

  return reviveDates(items);
}

export async function getItemById(id: string): Promise<Item | null> {
  return await repoGetItemById(id);
}

export async function deleteItem(id: string): Promise<void> {
  return await repoDeleteItem(id);
}

// OPTIMIZED: Indexed queries - only load items created by specific tasks/records
export async function getItemsBySourceTaskId(taskId: string): Promise<Item[]> {
  return await repoGetItemsBySourceTaskId(taskId);
}

export async function getItemsBySourceRecordId(recordId: string): Promise<Item[]> {
  return await repoGetItemsBySourceRecordId(recordId);
}

export async function getItemsByType(itemTypes: string | string[]): Promise<Item[]> {
  const types = Array.isArray(itemTypes)
    ? itemTypes.map(t => t as ItemType)
    : (itemTypes as ItemType);
  return await repoGetItemsByType(types);
}

export async function removeItem(id: string): Promise<void> {
  const existing = await repoGetItemById(id);
  await repoDeleteItem(id);
  if (existing) {
    // Phase 2: Rolling Summary Update
    await SummaryService.handleItemDeletion(existing);

    // Call item deletion workflow for cleanup
    const { removeItemEffectsOnDelete } = await import('@/workflows/entities-workflows/item.workflow');
    await removeItemEffectsOnDelete(id);
  }
}

// FINANCIALS
export async function upsertFinancial(financial: FinancialRecord, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean; forceSave?: boolean }): Promise<FinancialRecord> {
  const financialNorm = normalizeFinancialOutputTaxonomy(financial);
  const previous = await repoGetFinancialById(financialNorm.id);

  // Identity Shield: Time-Window Deduplication (2 minutes)
  // Only apply to NEW financials (no previous record found) to allow legitimate updates
  if (!previous) {
    const DUPLICATION_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
    const now = getUTCNow();

    // Fetch recent financials
    const recentFinancials = (await repoGetAllFinancials()).filter(f =>
      f.id !== financialNorm.id && // exclude self
      f.createdAt &&
      (now.getTime() - new Date(f.createdAt).getTime() < DUPLICATION_WINDOW_MS)
    );

    const isDuplicate = recentFinancials.some(existing => {
      // 1. Basic Identity Match
      return (
        existing.name === financialNorm.name &&
        existing.status === financialNorm.status &&
        existing.year === financialNorm.year &&
        existing.month === financialNorm.month &&
        existing.type === financialNorm.type
      );
    });

    if (isDuplicate) {
      console.warn(`[upsertFinancial] Prevented duplicate financial creation: ${financialNorm.name}`);
      throw new Error(`DUPLICATE_FINANCIAL_DETECTED: A similar financial record was created less than 2 minutes ago.`);
    }
  }

  const saved = await repoUpsertFinancial(financialNorm);

  // Phase 2: Rolling Summary Update (Delta Approach)
  await SummaryService.updateFinancialCounters(saved, previous || undefined);

  if (!options?.skipWorkflowEffects) {
    const { onFinancialUpsert } = await import('@/workflows/entities-workflows/financial.workflow');
    await onFinancialUpsert(saved, previous || undefined);
  }

  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.FINANCIAL);
  }

  return saved;
}

export async function getAllFinancials(): Promise<FinancialRecord[]> {
  const financials = await repoGetAllFinancials();
  // We DO NOT filter out isCollected (Analytics needs historical data)
  // But we DO filter out PENDING records to prevent artificial inflation
  return financials.filter(financial => financial.status !== FinancialStatus.PENDING);
}

/** Financial rows that still need settlement (unpaid or uncharged). No COLLECTED lifecycle on finrecs. */
export async function getActiveFinancials(): Promise<FinancialRecord[]> {
  const financials = await repoGetAllFinancials();
  return financials.filter(
    (f) => f.isNotPaid || f.isNotCharged || f.status === FinancialStatus.PENDING
  );
}

// Helper to chunk arrays for Redis MGET (prevents payload size errors)
const chunkArray = <T>(arr: T[], size: number): T[][] =>
  arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];

export async function getFinancialsForMonth(year: number, month: number): Promise<FinancialRecord[]> {
  const mmyy = formatArchiveMonthKeyUTCFromParts(year, month);
  const ids = await kvSMembers(buildMonthIndexKey(EntityType.FINANCIAL, mmyy));

  if (!ids || ids.length === 0) return [];

  // 2. Map IDs to storage keys
  const recordKeys = ids.map(id => buildDataKey(EntityType.FINANCIAL, id));

  // 3. Fetch ALL records in chunks of 500 (Upstash safety limit)
  const chunks = chunkArray(recordKeys, 500);
  const financials: FinancialRecord[] = [];

  for (const chunk of chunks) {
    const chunkResults = await kvMGet<FinancialRecord>(chunk);
    financials.push(...chunkResults.filter((f): f is FinancialRecord => f !== null));
  }

  return reviveDates(financials);
}

export async function getFinancialById(id: string): Promise<FinancialRecord | null> {
  return await repoGetFinancialById(id);
}

// OPTIMIZED: Indexed queries - only load financials created by specific tasks
export async function getFinancialsBySourceTaskId(taskId: string): Promise<FinancialRecord[]> {
  return await repoGetFinancialsBySourceTaskId(taskId);
}

// OPTIMIZED: Indexed queries - only load financials created by specific sales
export async function getFinancialsBySourceSaleId(saleId: string): Promise<FinancialRecord[]> {
  return await repoGetFinancialsBySourceSaleId(saleId);
}

export async function removeFinancial(id: string): Promise<void> {
  const existing = await repoGetFinancialById(id);
  await repoDeleteFinancial(id);
  if (existing) {
    // Phase 2: Rolling Summary Update (Subtraction)
    await SummaryService.handleFinancialDeletion(existing);

    // Call financial deletion workflow for cleanup
    const { removeRecordEffectsOnDelete } = await import('@/workflows/entities-workflows/financial.workflow');
    await removeRecordEffectsOnDelete(id);
  }
}

// SALES
export async function upsertSale(sale: Sale, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean; forceSave?: boolean }): Promise<Sale> {
  const previous = await repoGetSaleById(sale.id);

  // Identity Shield: Time-Window Deduplication (2 minutes)
  // Only apply to NEW sales (no previous record found) to allow legitimate updates
  if (!previous) {
    const DUPLICATION_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
    const now = getUTCNow();

    // Fetch recent sales
    const recentSales = (await repoGetAllSales()).filter(s =>
      s.id !== sale.id && // exclude self
      s.createdAt &&
      (now.getTime() - new Date(s.createdAt).getTime() < DUPLICATION_WINDOW_MS)
    );

    const isDuplicate = recentSales.some(existing => {
      // 1. Basic Identity Match
      return (
        existing.counterpartyName === sale.counterpartyName &&
        existing.status === sale.status &&
        existing.saleDate === sale.saleDate
      );
    });

    if (isDuplicate) {
      console.warn(`[upsertSale] Prevented duplicate sale creation: ${sale.counterpartyName}`);
      throw new Error(`DUPLICATE_SALE_DETECTED: A similar sale was created less than 2 minutes ago.`);
    }
  }

  const saleToPersist = roundSaleTotals(
    ensureItemSaleLineIds(normalizeSale(normalizeSaleOutputTaxonomy(sale)))
  );
  const saved = await repoUpsertSale(saleToPersist);

  // Phase 2: Rolling Summary Update
  await SummaryService.updateSalesCounters(saved, previous || undefined);

  /** After onSaleUpsert, ensureSoldItemEntities may persist updated line itemIds (sold clones). Link sync must use that state, not the in-memory first write. */
  let resultForLinks: Sale = saved;

  if (!options?.skipWorkflowEffects) {
    const { onSaleUpsert } = await import('@/workflows/entities-workflows/sale.workflow');
    await onSaleUpsert(saved, previous || undefined);

    const latestRaw = await repoGetSaleById(sale.id);
    if (latestRaw) {
      const [revived] = reviveDates([latestRaw]);
      resultForLinks = normalizeSale(revived);
    }
  }

  if (!options?.skipLinkEffects) {
    await processLinkEntity(resultForLinks, EntityType.SALE);
  }

  return resultForLinks;
}

export async function getAllSales(): Promise<Sale[]> {
  const sales = await repoGetAllSales();
  return sales.filter(sale => !sale.isCollected).map(s => normalizeSale(s));
}

// Phase 5: Unified & Optimized Sales fetching (Active + Archive)
export async function getSalesForMonth(year: number, month: number): Promise<Sale[]> {
  const mmyy = formatArchiveMonthKeyUTCFromParts(year, month);
  const ids = await kvSMembers(buildMonthIndexKey(EntityType.SALE, mmyy));

  if (!ids || ids.length === 0) return [];

  // 2. Map IDs to storage keys
  const recordKeys = ids.map(id => buildDataKey(EntityType.SALE, id));

  // 3. Fetch ALL records in chunks of 500
  const chunks = chunkArray(recordKeys, 500);
  const sales: Sale[] = [];

  for (const chunk of chunks) {
    const chunkResults = await kvMGet<Sale>(chunk);
    sales.push(...chunkResults.filter((s): s is Sale => s !== null));
  }

  // Filter for completed/archived sales if needed, but for "For Month" we usually want them all
  // The Vault specifically filters for CHARGED/COLLECTED.
  // I will leave filtering to the consumer if they want specific statuses, 
  // but for the "Sales Archive" tab, we should probably follow the existing logic.
  return reviveDates(sales).map(s => normalizeSale(s));
}

/**
 * Fetch sales strictly from the month index (no archive union).
 * Intended for summary rebuilds that mirror the live month index.
 */
export async function getSalesFromMonthIndex(mmyy: string): Promise<Sale[]> {
  const parsed = parseMonthKeyToYearMonth(mmyy);
  if (!parsed) return [];
  return getSalesForMonth(parsed.year, parsed.month);
}

export async function getTasksFromMonthIndex(mmyy: string): Promise<Task[]> {
  const ids = await kvSMembers(buildMonthIndexKey(EntityType.TASK, mmyy));

  if (!ids || ids.length === 0) return [];

  const recordKeys = ids.map(id => buildDataKey(EntityType.TASK, id));
  const chunks = chunkArray(recordKeys, 500);
  const tasks: Task[] = [];

  for (const chunk of chunks) {
    const chunkResults = await kvMGet<Task>(chunk);
    tasks.push(...chunkResults.filter((t): t is Task => t !== null));
  }

  return reviveDates(tasks);
}

export async function getFinancialsFromMonthIndex(mmyy: string): Promise<FinancialRecord[]> {
  const parsed = parseMonthKeyToYearMonth(mmyy);
  if (!parsed) return [];
  return getFinancialsForMonth(parsed.year, parsed.month);
}

function parseMonthKeyToYearMonth(mmyy: string): { year: number; month: number } | null {
  const [monthText, yearText] = mmyy.split('-');
  if (!monthText || !yearText) return null;
  const month = Number(monthText);
  const yearSuffix = Number(yearText);
  if (!Number.isInteger(month) || !Number.isInteger(yearSuffix)) return null;
  if (month < 1 || month > 12 || yearText.length !== 2) return null;
  return { year: 2000 + yearSuffix, month };
}

export async function getSaleById(id: string): Promise<Sale | null> {
  const raw = await repoGetSaleById(id);
  if (!raw) return null;
  const [revived] = reviveDates([raw]);
  return normalizeSale(revived);
}

export async function removeSale(id: string): Promise<void> {
  const existing = await repoGetSaleById(id);
  if (existing) {
    const [revived] = reviveDates([existing]);
    const saleForCleanup = normalizeSale(revived);
    const { removeSaleEffectsOnDelete } = await import('@/workflows/entities-workflows/sale.workflow');
    await removeSaleEffectsOnDelete(id, saleForCleanup);
  }
  await repoDeleteSale(id);
  if (existing) {
    await SummaryService.handleSaleDeletion(existing);
  }
}

// CHARACTERS
export async function upsertCharacter(character: Character, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Character> {
  const previous = await repoGetCharacterById(character.id);

  // Identity Shield: Time-Window Deduplication (2 minutes)
  if (!previous) {
    const DUPLICATION_WINDOW_MS = 2 * 60 * 1000;
    const now = getUTCNow();
    const recent = (await repoGetAllCharacters()).filter(c =>
      c.id !== character.id &&
      c.createdAt &&
      (now.getTime() - new Date(c.createdAt).getTime() < DUPLICATION_WINDOW_MS)
    );

    const isDuplicate = recent.some(existing =>
      existing.name === character.name &&
      // Check if roles match exactly (simple equality check for arrays)
      JSON.stringify(existing.roles.sort()) === JSON.stringify(character.roles.sort())
    );

    if (isDuplicate) {
      console.warn(`[upsertCharacter] Prevented duplicate character creation: ${character.name}`);
      throw new Error(`DUPLICATE_CHARACTER_DETECTED: A similar character was created less than 2 minutes ago.`);
    }
  }

  const saved = await repoUpsertCharacter(character);
  try {
    await syncEcosystemCharacterSnapshot(saved);
  } catch (error) {
    console.error('[Datastore] Failed syncing linked Akiles character snapshot:', error);
  }

  if (!options?.skipWorkflowEffects) {
    const { onCharacterUpsert } = await import('@/workflows/entities-workflows/character.workflow');
    await onCharacterUpsert(saved, previous || undefined);
  }

  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.CHARACTER);
  }

  return saved;
}

export async function getAllCharacters(): Promise<Character[]> {
  return await repoGetAllCharacters();
}

export async function getCharacterById(id: string): Promise<Character | null> {
  return await repoGetCharacterById(id);
}

export async function removeCharacter(id: string): Promise<void> {
  const existing = await repoGetCharacterById(id);
  await repoDeleteCharacter(id);
  if (existing) {
    // Call character deletion workflow for cleanup
    const { removeCharacterEffectsOnDelete } = await import('@/workflows/entities-workflows/character.workflow');
    await removeCharacterEffectsOnDelete(id);
  }
}

// PLAYERS
export async function upsertPlayer(player: Player, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Player> {
  const previous = await repoGetPlayerById(player.id);
  const saved = await repoUpsertPlayer(player);

  if (!options?.skipWorkflowEffects) {
    const { onPlayerUpsert } = await import('@/workflows/entities-workflows/player.workflow');
    await onPlayerUpsert(saved, previous || undefined);
  }

  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.PLAYER);
  }

  return saved;
}

export async function getAllPlayers(): Promise<Player[]> {
  return await repoGetAllPlayers();
}

export async function getPlayerById(id: string): Promise<Player | null> {
  return await repoGetPlayerById(id);
}

export async function removePlayer(id: string): Promise<void> {
  const existing = await repoGetPlayerById(id);
  await repoDeletePlayer(id);
  if (existing) {
    // Call player deletion workflow for cleanup
    const { removePlayerEffectsOnDelete } = await import('@/workflows/entities-workflows/player.workflow');
    await removePlayerEffectsOnDelete(id);
  }
}

// ACCOUNTS
export async function upsertAccount(account: Account, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Account> {
  const previous = await repoGetAccountById(account.id);
  const saved = await repoUpsertAccount(account);

  if (!options?.skipWorkflowEffects) {
    const { onAccountUpsert } = await import('@/workflows/entities-workflows/account.workflow');
    await onAccountUpsert(saved, previous || undefined);
  }

  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.ACCOUNT);
  }

  return saved;
}

export async function getAllAccounts(): Promise<Account[]> {
  return await repoGetAllAccounts();
}

export async function getAccountById(id: string): Promise<Account | null> {
  return await repoGetAccountById(id);
}

export async function removeAccount(id: string): Promise<void> {
  const existing = await repoGetAccountById(id);
  await repoDeleteAccount(id);
  if (existing) {
    const { removeAccountEffectsOnDelete } = await import('@/workflows/entities-workflows/account.workflow');
    await removeAccountEffectsOnDelete(id);
  }
}

// removed any-typed duplicates for legal entities and contracts


// BUSINESSES
export async function upsertBusiness(entity: Business): Promise<Business> {
  const previous = await repoGetBusinessById(entity.id);

  // Identity Shield: Time-Window Deduplication (2 minutes)
  if (!previous) {
    const DUPLICATION_WINDOW_MS = 2 * 60 * 1000;
    const now = getUTCNow();
    const recent = (await repoGetAllBusinesses()).filter(b =>
      b.id !== entity.id &&
      b.createdAt &&
      (now.getTime() - new Date(b.createdAt).getTime() < DUPLICATION_WINDOW_MS)
    );

    const isDuplicate = recent.some(existing =>
      existing.name === entity.name &&
      existing.type === entity.type
    );

    if (isDuplicate) {
      console.warn(`[upsertBusiness] Prevented duplicate business creation: ${entity.name}`);
      throw new Error(`DUPLICATE_BUSINESS_DETECTED: A similar business was created less than 2 minutes ago.`);
    }
  }

  const saved = await repoUpsertBusiness(entity);

  return saved;
}

export async function getAllBusinesses(): Promise<Business[]> {
  return await repoGetAllBusinesses();
}

export async function getBusinessById(id: string): Promise<Business | null> {
  return await repoGetBusinessById(id);
}

export async function removeBusiness(id: string): Promise<void> {
  const existing = await repoGetBusinessById(id);
  await repoDeleteBusiness(id);
  if (existing) {
    // Call business deletion effects if any
  }
}

// CONTRACTS
export async function upsertContract(contract: Contract): Promise<Contract> {
  const previous = await repoGetContractById(contract.id);
  const saved = await repoUpsertContract(contract);
  return saved;
}

export async function getAllContracts(): Promise<Contract[]> {
  return await repoGetAllContracts();
}

export async function getContractById(id: string): Promise<Contract | null> {
  return await repoGetContractById(id);
}

export async function removeContract(id: string): Promise<void> {
  const existing = await repoGetContractById(id);
  await repoDeleteContract(id);
  if (existing) {
    // Call contract deletion effects if any
  }
}

// SITES
export async function upsertSite(site: Site, options?: { skipWorkflowEffects?: boolean }): Promise<Site> {
  const previous = await repoGetSiteById(site.id);
  const saved = await repoUpsertSite(site);

  if (!options?.skipWorkflowEffects) {
    const { onSiteUpsert } = await import('@/workflows/entities-workflows/site.workflow');
    await onSiteUpsert(saved, previous || undefined);
  }

  // NOTE: Sites don't create links when saved - they're link targets only
  // SITE_SITE links are created explicitly by movement operations (workflows/site-movement-utils.ts)
  return saved;
}

export async function getAllSites(): Promise<Site[]> {
  return await repoGetAllSites();
}

export async function getSiteById(id: string): Promise<Site | null> {
  return await repoGetSiteById(id);
}

export async function removeSite(id: string): Promise<void> {
  const existing = await repoGetSiteById(id);
  await repoDeleteSite(id);
  if (existing) {
    // Call site deletion workflow for cleanup
    const { removeSiteEffectsOnDelete } = await import('@/workflows/entities-workflows/site.workflow');
    await removeSiteEffectsOnDelete(id);
  }
}

// ============================================================================
// SETTLEMENT METHODS (Reference data for Sites)
// ============================================================================

export async function getAllSettlements(): Promise<Settlement[]> {
  return await repoGetAllSettlements();
}

export async function getSettlementById(id: string): Promise<Settlement | null> {
  return await repoGetSettlementById(id);
}

export async function upsertSettlement(settlement: Settlement): Promise<Settlement> {
  return await repoUpsertSettlement(settlement);
}

export async function removeSettlement(id: string): Promise<void> {
  await repoRemoveSettlement(id);
}

// ============================================================================
// SITE QUERY METHODS
// ============================================================================

export async function getSitesBySettlement(settlementId: string): Promise<Site[]> {
  return await repoGetSitesBySettlement(settlementId);
}

export async function getSitesByRadius(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): Promise<Site[]> {
  return await repoGetSitesByRadius(centerLat, centerLng, radiusMeters);
}

// ============================================================================
// LOGS
// ============================================================================

export async function getEntityLogs(
  entityType: EntityType,
  options?: { month?: string; start?: number; count?: number }
): Promise<any[]> {
  return await workflowGetEntityLogs(entityType, options);
}

export async function getEntityLogMonths(entityType: EntityType): Promise<string[]> {
  return await workflowGetEntityLogMonths(entityType);
}

export async function removeLogEntriesAcrossMonths(
  entityType: EntityType,
  filterFn: (entry: any) => boolean
): Promise<number> {
  return await workflowRemoveLogEntriesAcrossMonths(entityType, filterFn);
}

// ============================================================================
// ARCHIVE ACCESSORS
// ============================================================================


export async function deleteArchivedItem(id: string, mmyy: string): Promise<void> {
  await kvSRem(buildMonthIndexKey(EntityType.ITEM, mmyy), id);
}

export async function deleteArchivedTask(id: string, mmyy: string): Promise<void> {
  await kvSRem(buildMonthIndexKey(EntityType.TASK, mmyy), id);
}

export async function getArchivedTasksByMonth(mmyy: string): Promise<Task[]> {
  const [month, yearShort] = mmyy.split('-');
  const year = parseInt(`20${yearShort}`, 10);
  const tasks = await getTasksForMonth(year, parseInt(month, 10));

  // Archive Vault Filter: Only show completed/collected tasks
  const { TaskStatus } = await import('@/types/enums');
  return tasks.filter(t =>
    t.status === TaskStatus.DONE ||
    t.status === TaskStatus.COLLECTED ||
    t.isCollected
  );
}

export async function getArchivedItemsByMonth(mmyy: string): Promise<Item[]> {
  const [month, yearShort] = mmyy.split('-');
  const year = parseInt(`20${yearShort}`, 10);
  const items = await getItemsForMonth(year, parseInt(month, 10));

  // Archive Vault Filter: Only show sold/collected items
  return items.filter(i => isSoldStatus(i.status));
}

export async function getArchivedSalesByMonth(mmyy: string): Promise<Sale[]> {
  const [month, yearShort] = mmyy.split('-');
  const year = parseInt(`20${yearShort}`, 10);
  const sales = await getSalesForMonth(year, parseInt(month, 10));

  // Maintain existing Archive Vault filtering logic
  return sales.filter(s =>
    s.status === SaleStatus.CHARGED ||
    s.status === SaleStatus.COLLECTED ||
    s.isCollected
  );
}

export async function getArchivedFinancialRecordsByMonth(mmyy: string): Promise<FinancialRecord[]> {
  const [month, yearShort] = mmyy.split('-');
  const year = parseInt(`20${yearShort}`, 10);
  return await getFinancialsForMonth(year, parseInt(month, 10));
}

export async function getAvailableArchiveMonths(): Promise<string[]> {
  return await archiveRepo.getAvailableArchiveMonths();
}


/**
 * THE STANDARDIZED MONTH SELECTOR SOURCE:
 * Returns any month that has either Archived data 
 * OR Summary data (active sales/finances/inventory).
 */
export async function getAvailableMonths(): Promise<string[]> {
  const { kvSUnion } = await import('./kv');
  
  // Union of Archive months and Summary months
  const months = await kvSUnion(buildArchiveMonthsKey(), buildSummaryMonthsKey());
  
  // Custom sort (descending: newest first)
  return [...months].sort((a, b) => {
    const [am, ay] = a.split('-').map(n => parseInt(n, 10));
    const [bm, by] = b.split('-').map(n => parseInt(n, 10));
    
    // Normalize years (assume 20xx for 2-digit years)
    const ayFull = ay < 100 ? 2000 + ay : ay;
    const byFull = by < 100 ? 2000 + by : by;
    
    if (ayFull !== byFull) return byFull - ayFull;
    return bm - am;
  });
}

export async function getCurrentMonthArchivedTasks(): Promise<Task[]> {
  return await getArchivedTasksByMonth(formatArchiveMonthKeyUTC(getUTCNow()));
}

export async function getCurrentMonthArchivedItems(): Promise<Item[]> {
  return await getArchivedItemsByMonth(formatArchiveMonthKeyUTC(getUTCNow()));
}

export async function getCurrentMonthArchivedSales(): Promise<Sale[]> {
  return await getArchivedSalesByMonth(formatArchiveMonthKeyUTC(getUTCNow()));
}

export async function getCurrentMonthArchivedFinancials(): Promise<FinancialRecord[]> {
  return await getArchivedFinancialRecordsByMonth(formatArchiveMonthKeyUTC(getUTCNow()));
}

function resolveMonthKeyDate(mmyy: string): Date {
  const [mm, yy] = mmyy.split('-');
  const year = 2000 + parseInt(yy, 10);
  const month = Math.max(0, parseInt(mm, 10) - 1);
  return new Date(year, month, 1);
}

export function formatArchiveMonthLabel(mmyy: string): string {
  const date = resolveMonthKeyDate(mmyy);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
}

const hasPoints = (points?: {
  hp?: number;
  fp?: number;
  rp?: number;
  xp?: number;
}) => {
  if (!points) return false;
  return Boolean(points.hp || points.fp || points.rp || points.xp);
};

export async function getPlayerArchiveEventsByMonth(mmyy: string): Promise<PlayerArchiveRow[]> {
  const [tasks, financials, sales] = await Promise.all([
    getArchivedTasksByMonth(mmyy),
    getArchivedFinancialRecordsByMonth(mmyy),
    getArchivedSalesByMonth(mmyy),
  ]);

  const rows: PlayerArchiveRow[] = [];

  tasks.forEach((task) => {
    if (hasPoints(task.rewards?.points)) {
      rows.push({
        id: `task:${task.id}`,
        sourceType: 'task',
        sourceId: task.id,
        description: task.name,
        date: toUTCISOString(task.collectedAt ?? task.doneAt ?? getUTCNow()),
        points: {
          hp: task.rewards?.points?.hp ?? 0,
          fp: task.rewards?.points?.fp ?? 0,
          rp: task.rewards?.points?.rp ?? 0,
          xp: task.rewards?.points?.xp ?? 0,
        },
      });
    }
  });

  financials.forEach((financial) => {
    if (hasPoints(financial.rewards?.points)) {
      rows.push({
        id: `financial:${financial.id}`,
        sourceType: 'financial',
        sourceId: financial.id,
        description: financial.name,
        date: toUTCISOString(new Date(Date.UTC(financial.year, Math.max(0, financial.month - 1), 1))),
        points: {
          hp: financial.rewards?.points?.hp ?? 0,
          fp: financial.rewards?.points?.fp ?? 0,
          rp: financial.rewards?.points?.rp ?? 0,
          xp: financial.rewards?.points?.xp ?? 0,
        },
      });
    }
  });

  sales.forEach((sale) => {
    if (hasPoints(sale.rewards?.points)) {
      rows.push({
        id: `sale:${sale.id}`,
        sourceType: 'sale',
        sourceId: sale.id,
        description: sale.counterpartyName ?? 'Sale',
        date: toUTCISOString(sale.collectedAt ?? sale.saleDate ?? getUTCNow()),
        points: {
          hp: sale.rewards?.points?.hp ?? 0,
          fp: sale.rewards?.points?.fp ?? 0,
          rp: sale.rewards?.points?.rp ?? 0,
          xp: sale.rewards?.points?.xp ?? 0,
        },
      });
    }
  });

  return rows;
}

// PLAYER CONVERSION RATES
export async function getPlayerConversionRates(): Promise<any> {
  return await kvGet('thegame:data:player-conversion-rates');
}

export async function savePlayerConversionRates(rates: any): Promise<void> {
  await kvSet('thegame:data:player-conversion-rates', rates);
}

// COMPANY ASSETS
export async function getCompanyAssets(): Promise<any> {
  const assets = await kvGet('thegame:data:company-assets');
  return assets || {
    cash: 0,
    bank: 0,
    bitcoin: 0,
    toCharge: 0,
    toPay: 0,
    companyJ$: 0,
    cashColones: 0,
    bankColones: 0,
    toChargeColones: 0,
    toPayColones: 0,
    bitcoinSats: 0,
    materials: { value: 0, cost: 0 },
    equipment: { value: 0, cost: 0 },
    artworks: { value: 0, cost: 0 },
    prints: { value: 0, cost: 0 },
    stickers: { value: 0, cost: 0 },
    merch: { value: 0, cost: 0 }
  };
}

export async function saveCompanyAssets(assets: any): Promise<void> {
  await kvSet('thegame:data:company-assets', assets);
}

// PERSONAL ASSETS
export async function getPersonalAssets(): Promise<any> {
  const assets = await kvGet('thegame:data:personal-assets');
  return assets || {
    cash: 0,
    bank: 0,
    bitcoin: 0,
    crypto: 0,
    toCharge: 0,
    toPay: 0,
    personalJ$: 0,
    cashColones: 0,
    bankColones: 0,
    toChargeColones: 0,
    toPayColones: 0,
    bitcoinSats: 0,
    vehicle: 0,
    properties: 0,
    nfts: 0,
    other: 0
  };
}

export async function savePersonalAssets(assets: any): Promise<void> {
  await kvSet('thegame:data:personal-assets', assets);
}

// FINANCIAL CONVERSION RATES
export async function getFinancialConversionRates(): Promise<any> {
  return await kvGet('thegame:data:financial-conversion-rates');
}

export async function saveFinancialConversionRates(rates: any): Promise<void> {
  await kvSet('thegame:data:financial-conversion-rates', rates);
}
