// @ts-nocheck
// data-store/datastore.ts
// Orchestration layer: repositories → workflows → links → logging

import type { Task, Item, FinancialRecord, FinancialRecordRuntime, FinancialRecordRelationInput, Sale, Character, Player, PlayerAchievement, Site, Settlement, Region, Account, Business, Contract, Agent } from '@/types/entities';
import { getSaleFinancialConsistencyIssues, roundSaleTotals } from '@/lib/utils/financial-utils';
import { ensureItemSaleLineIds, normalizeSale } from '@/lib/utils/sale-lines-normalize';
import { CharacterRole, EntityType, EntitySchemaVersion, ItemType, TaskPriority, TaskStatus, FinancialStatus, TaskType, SaleStatus, SaleType, ItemStatus, LinkType } from '@/types/enums';
import type { TaskSnapshot, ItemSnapshot, SaleSnapshot, FinancialSnapshot } from '@/types/archive';
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
  getItemsBySubType as repoGetItemsBySubType,
  countItems as repoCountItems,
  getActiveItems as repoGetActiveItems,
  getLegacyItems as repoGetLegacyItems,
  getItemsByCharacterId as repoGetItemsByCharacterId
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
  upsertAgent as repoUpsertAgent,
  getAllAgents as repoGetAllAgents,
  getAgentById as repoGetAgentById,
  deleteAgent as repoDeleteAgent
} from './repositories/agent.repo';
import {
  upsertPlayer as repoUpsertPlayer,
  getAllPlayers as repoGetAllPlayers,
  getPlayerById as repoGetPlayerById,
  deletePlayer as repoDeletePlayer
} from './repositories/player.repo';
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
import {
  getAllRegions as repoGetAllRegions,
  getRegionById as repoGetRegionById,
  upsertRegion as repoUpsertRegion,
  removeRegion as repoRemoveRegion
} from './repositories/region.repo';
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
import { reviveDates } from '@/lib/utils/date-parsers';;
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
  buildMapReadModelKey,
} from './keys';
import { isTaskActive, isTaskCompleted } from '@/lib/utils/task-active-utils';
import { isSoldStatus } from '@/lib/utils/status-utils';
import type { PlayerArchiveRow } from '@/types/archive';
import {
  normalizeItemTaxonomyFields,
  normalizeTaskOutputTaxonomy,
  normalizeSaleOutputTaxonomy,
} from '@/lib/item-taxonomy-normalize';

type EcosystemCharacterSnapshot = {
  id: string;
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
  if (!character.id) return;
  const { getLinksFor } = await import('@/links/link-registry');
  const accountLink = (await getLinksFor({ type: EntityType.CHARACTER, id: character.id }))
    .find((link) =>
      link.linkType === LinkType.ACCOUNT_CHARACTER &&
      link.source.type === EntityType.ACCOUNT &&
      link.target.type === EntityType.CHARACTER &&
      link.target.id === character.id
    );
  if (!accountLink) return;

  const now = new Date();
  const snapshotKey = `iam:character:${character.id}`;
  const existing = await kvGet<EcosystemCharacterSnapshot>(snapshotKey);

  const snapshot: EcosystemCharacterSnapshot = {
    id: character.id,
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
// Root dates are accepted while callers transition, but they never persist on
// canonical Task rows. This helper keeps older callers operational while each
// task workflow moves to the lifecycle facet.
const withTaskLifecycleCompatibility = (task: Task): Task => {
  const lifecycle = (task as any).lifecycle;
  if (!lifecycle || typeof lifecycle !== 'object') return task;
  return {
    ...task,
    ...(lifecycle.doneAt !== undefined ? { doneAt: lifecycle.doneAt } : {}),
    ...(lifecycle.collectedAt !== undefined ? { collectedAt: lifecycle.collectedAt } : {}),
  } as Task;
};

const taskLifecycleForPersistence = (task: Task): Record<string, unknown> | undefined => {
  const hasCanonicalLifecycle = Boolean((task as any).lifecycle && typeof (task as any).lifecycle === 'object');
  const lifecycle = { ...(hasCanonicalLifecycle ? (task as any).lifecycle : {}) };
  // Explicit lifecycle data is authoritative. Root dates are accepted only for
  // legacy callers that have not supplied the canonical facet at all.
  if (!hasCanonicalLifecycle && Object.prototype.hasOwnProperty.call(task, 'doneAt')) {
    if ((task as any).doneAt == null) delete lifecycle.doneAt;
    else lifecycle.doneAt = (task as any).doneAt;
  }
  if (!hasCanonicalLifecycle && Object.prototype.hasOwnProperty.call(task, 'collectedAt')) {
    if ((task as any).collectedAt == null) delete lifecycle.collectedAt;
    else lifecycle.collectedAt = (task as any).collectedAt;
  }
  if (lifecycle.doneAt == null) delete lifecycle.doneAt;
  if (lifecycle.collectedAt == null) delete lifecycle.collectedAt;
  return Object.keys(lifecycle).length ? lifecycle : undefined;
};

export async function upsertTask(task: Task, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean; skipDuplicateCheck?: boolean }): Promise<Task> {
  // Explicitly block self-referential parent assignment (circular reference)
  if (task.parentId && task.parentId === task.id) {
    console.warn(`[Datastore] Prevented Task ${task.id} from becoming its own parent.`);
    task.parentId = null;
  }

  const previousRaw = await repoGetTaskById(task.id);
  const previous = previousRaw ? withTaskLifecycleCompatibility(previousRaw) : null;
  const hasOwnerSelection = Object.prototype.hasOwnProperty.call(task, 'ownerIds');
  const requestedOwnerIds = hasOwnerSelection ? [...(task.ownerIds || [])] : undefined;
  let normalizedTask =
    task.status === TaskStatus.DONE
      ? { ...task, priority: TaskPriority.NORMAL }
      : task;
  normalizedTask = normalizeTaskOutputTaxonomy(normalizedTask);
  const rawTaskCounterparty = (normalizedTask as any).__counterparty || (normalizedTask as any).context?.counterparty || null;
  const taskCounterparty = rawTaskCounterparty?.counterpartyId
    ? { id: rawTaskCounterparty.counterpartyId, role: rawTaskCounterparty.role }
    : rawTaskCounterparty;
  // The envelope is owned by the persistence boundary. Modal payloads may omit
  // version, but a persisted Task may not: new rows start at 0 and every update
  // advances from the stored version.
  const persistedContext = (normalizedTask as any).context
    ? { ...(normalizedTask as any).context }
    : undefined;
  if (persistedContext) {
    delete persistedContext.counterparty;
    delete persistedContext.kind;
    delete persistedContext.schemaVersion;
    if (persistedContext.recurrence) {
      delete persistedContext.recurrence.isRecurrentGroup;
      delete persistedContext.recurrence.isTemplate;
    }
  }
  const persistedTask = {
    ...normalizedTask,
    ...(persistedContext && Object.keys(persistedContext).length > 0 ? { context: persistedContext } : {}),
    schemaVersion: normalizedTask.schemaVersion ?? EntitySchemaVersion.V1,
    version: previous ? ((previous.version ?? 0) + 1) : (normalizedTask.version ?? 0),
  } as Task;
  const lifecycle = taskLifecycleForPersistence(normalizedTask);
  if (lifecycle) (persistedTask as any).lifecycle = lifecycle;
  delete (persistedTask as any).doneAt;
  delete (persistedTask as any).collectedAt;
  // Capture legacy fields for link creation
  const { siteId, targetSiteId, parentId } = persistedTask as any;
  delete (persistedTask as any).siteId;
  delete (persistedTask as any).targetSiteId;
  delete (persistedTask as any).parentId;
  delete (persistedTask as any).ownerIds;
  delete (persistedTask as any).__counterparty;
  
  const saved = await repoUpsertTask(persistedTask);
  const runtimeSaved = withTaskLifecycleCompatibility(saved);

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
        parentId === existing.parentId // use captured parentId for deduplication
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
  await SummaryService.updateTaskCounters(runtimeSaved, previous || undefined);

  // Task completion effects resolve the owner through TASK_CHARACTER Links.
  // Create/reconcile those Links before running the workflow so point staging
  // never races the relationship materialization.
  if (!options?.skipLinkEffects) {
    const linkInput = {
      ...runtimeSaved,
      ...(siteId ? { siteId } : {}),
      ...(targetSiteId ? { targetSiteId } : {}),
      ...(parentId ? { parentId } : {}),
      ...(hasOwnerSelection ? { ownerIds: requestedOwnerIds } : {}),
      ...(taskCounterparty ? { __counterparty: taskCounterparty } : {}),
    };
    await processLinkEntity(linkInput, EntityType.TASK);
  }

  if (!options?.skipWorkflowEffects) {
    const { onTaskUpsert } = await import('@/workflows/entities-workflows/task.workflow');
    await onTaskUpsert(
      taskCounterparty ? ({ ...runtimeSaved, parentId, __counterparty: taskCounterparty } as Task) : ({ ...runtimeSaved, parentId } as Task),
      previous || undefined
    );
  }

  // onTaskUpsert may call nested upsertTask(skipWorkflowEffects) and update KV;
  // re-run Link reconciliation against the row actually stored. This second
  // pass also creates TASK_ITEM/TASK_FINREC Links after their effects exist.
  if (!options?.skipLinkEffects) {
    const latest = await getTaskById(saved.id);
    const linkInput = latest
      ? {
          ...latest,
          ...(siteId ? { siteId } : {}),
          ...(targetSiteId ? { targetSiteId } : {}),
          ...(parentId ? { parentId } : {}),
          ...(hasOwnerSelection ? { ownerIds: requestedOwnerIds } : {}),
          ...(taskCounterparty ? { __counterparty: taskCounterparty } : {}),
        }
      : {
          ...runtimeSaved,
          ...(siteId ? { siteId } : {}),
          ...(targetSiteId ? { targetSiteId } : {}),
          ...(parentId ? { parentId } : {}),
          ...(taskCounterparty ? { __counterparty: taskCounterparty } : {}),
        };
    await processLinkEntity(linkInput, EntityType.TASK);
  }

  return runtimeSaved;
}

export async function hydrateTaskCompatibility(task: Task): Promise<Task> {
  const { getLinksFor } = await import('@/links/link-registry');
  const { CharacterRole } = await import('@/types/enums');
  const links = await getLinksFor({ type: EntityType.TASK, id: task.id });
  
  const sourceLinks = links.filter(l => l.source.type === EntityType.TASK && l.source.id === task.id);
  
  const parentLink = sourceLinks.find(l => l.linkType === 'TASK_TASK' && l.relationship === 'parent');
  const ownerLinks = sourceLinks.filter(l => l.linkType === 'TASK_CHARACTER' && l.relationship === 'owner');
  const siteLink = sourceLinks.find(l => l.linkType === 'TASK_SITE' && l.relationship === 'performed-at');
  const targetSiteLink = sourceLinks.find(l => l.linkType === 'TASK_SITE' && l.relationship === 'target-location');
  const counterpartyLink = sourceLinks.find(l => l.linkType === 'TASK_CHARACTER' && (l.relationship === 'beneficiary' || l.relationship === 'customer'));
  
  return {
    ...withTaskLifecycleCompatibility(task),
    ...(parentLink ? { parentId: parentLink.target.id } : { parentId: task.parentId || null }),
    ...(ownerLinks.length > 0 ? { ownerIds: ownerLinks.map(l => l.target.id) } : { ownerIds: task.ownerIds || [] }),
    ...(siteLink ? { siteId: siteLink.target.id } : { siteId: (task as any).siteId || null }),
    ...(targetSiteLink ? { targetSiteId: targetSiteLink.target.id } : { targetSiteId: (task as any).targetSiteId || null }),
    ...(counterpartyLink ? {
      __counterparty: {
        role: counterpartyLink.relationship === 'beneficiary' ? CharacterRole.BENEFICIARY : CharacterRole.CUSTOMER,
        id: counterpartyLink.target.id
      }
    } : { __counterparty: (task as any).__counterparty || undefined })
  };
}

async function hydrateTasksCompatibilityBulk(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return [];
  const { getAllLinks } = await import('@/links/link-registry');
  const { CharacterRole } = await import('@/types/enums');
  const links = await getAllLinks();
  
  const parentMap = new Map<string, string>();
  const ownerMap = new Map<string, string[]>();
  const siteMap = new Map<string, string>();
  const targetSiteMap = new Map<string, string>();
  const counterpartyMap = new Map<string, { role: any, id: string }>();

  for (const link of links) {
    if (link.source.type === EntityType.TASK) {
      if (link.linkType === 'TASK_TASK' && link.relationship === 'parent') {
        parentMap.set(link.source.id, link.target.id);
      } else if (link.linkType === 'TASK_CHARACTER' && link.relationship === 'owner') {
        const arr = ownerMap.get(link.source.id) || [];
        arr.push(link.target.id);
        ownerMap.set(link.source.id, arr);
      } else if (link.linkType === 'TASK_SITE' && link.relationship === 'performed-at') {
        siteMap.set(link.source.id, link.target.id);
      } else if (link.linkType === 'TASK_SITE' && link.relationship === 'target-location') {
        targetSiteMap.set(link.source.id, link.target.id);
      } else if (link.linkType === 'TASK_CHARACTER' && (link.relationship === 'beneficiary' || link.relationship === 'customer')) {
        counterpartyMap.set(link.source.id, {
          role: link.relationship === 'beneficiary' ? CharacterRole.BENEFICIARY : CharacterRole.CUSTOMER,
          id: link.target.id
        });
      }
    }
  }

  return tasks.map(task => {
    const parentId = parentMap.get(task.id);
    const ownerIds = ownerMap.get(task.id);
    const siteId = siteMap.get(task.id);
    const targetSiteId = targetSiteMap.get(task.id);
    const counterparty = counterpartyMap.get(task.id);

    return {
      ...withTaskLifecycleCompatibility(task),
      ...(parentId ? { parentId } : { parentId: task.parentId || null }),
      ...(ownerIds && ownerIds.length > 0 ? { ownerIds } : { ownerIds: task.ownerIds || [] }),
      ...(siteId ? { siteId } : { siteId: task.siteId || null }),
      ...(targetSiteId ? { targetSiteId } : { targetSiteId: task.targetSiteId || null }),
      ...(counterparty ? { __counterparty: counterparty } : { __counterparty: task.__counterparty || undefined })
    };
  });
}

export async function getAllTasks(): Promise<Task[]> {
  const tasks = await repoGetAllTasks();
  return hydrateTasksCompatibilityBulk(reviveDates(tasks));
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
  return hydrateTasksCompatibilityBulk(reviveDates(tasks.filter(isTaskActive)));
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
    if (!isTaskCompleted(t)) continue;
    const mmyy = resolveTaskCompletedArchiveMonthKeyUTC(t);
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
  sales = reviveDates<Sale[]>(sales)
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
  return hydrateTasksCompatibilityBulk(reviveDates(tasks));
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

  return hydrateTasksCompatibilityBulk(reviveDates(tasks));
}

export async function getTaskById(id: string): Promise<Task | null> {
  const raw = await repoGetTaskById(id);
  if (!raw) return null;
  return hydrateTaskCompatibility(raw);
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
export async function upsertItem(item: Item, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean; skipSummaryUpdate?: boolean }): Promise<Item> {
  const itemNorm = normalizeItemTaxonomyFields(item);
  const previous = await repoGetItemById(itemNorm.id);
  const persistedItem = {
    ...itemNorm,
    schemaVersion: itemNorm.schemaVersion ?? EntitySchemaVersion.V1,
    version: previous ? ((previous.version ?? 0) + 1) : (itemNorm.version ?? 0),
  } as Item;

  // Identity Shield: Time-Window Deduplication (2 minutes)
  // Only apply to NEW items (no previous record found) to allow legitimate updates
  if (!previous) {
    // ... duplication logic remains ... (already skipped if previous exists)
  }

  const saved = await repoUpsertItem(persistedItem);  // ✅ Item persisted here

  // Phase 2: Rolling Summary Update
  // OPTIMIZATION: Skip individual updates during bulk operations
  if (!options?.skipSummaryUpdate) {
    await SummaryService.updateItemCounters(saved, previous || undefined);
  }

  if (!options?.skipWorkflowEffects) {
    try {
      const { onItemUpsert } = await import('@/workflows/entities-workflows/item.workflow');
      await onItemUpsert(saved, previous || undefined);
    } catch (error) {
      console.error(`[Datastore] Item workflow failed for ${saved.id}:`, error);
    }
  }

  if (!options?.skipLinkEffects) {
    try {
      await processLinkEntity(saved, EntityType.ITEM);
    } catch (error) {
      console.error(`[Datastore] Item link workflow failed for ${saved.id}:`, error);
    }
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

export async function getItemsByCharacterId(ownerId: string): Promise<Item[]> {
  // Canonical ownership is represented by ITEM_CHARACTER links. The old
  // characterId index is retained only for historical compatibility.
  const { getLinksFor } = await import('@/links/link-registry');
  const links = await getLinksFor({ type: EntityType.CHARACTER, id: ownerId });
  const linkedItemIds = Array.from(new Set(
    links
      .filter((link: any) =>
        link.linkType === 'ITEM_CHARACTER' || link.linkType === 'CHARACTER_ITEM'
      )
      .map((link: any) =>
        link.source?.type === EntityType.ITEM ? link.source.id :
          link.target?.type === EntityType.ITEM ? link.target.id : null
      )
      .filter(Boolean)
  ));

  if (linkedItemIds.length > 0) {
    const linkedItems = await Promise.all(linkedItemIds.map(id => repoGetItemById(id as string)));
    return linkedItems.filter((item): item is Item => Boolean(item));
  }

  // Compatibility fallback for pre-link records only.
  return await repoGetItemsByCharacterId(ownerId);
}

export async function bulkUpsertItems(items: Item[]): Promise<Item[]> {
  const results: Item[] = [];
  let totalItemsSoldDelta = 0;
  const monthKeys = new Set<string>();

  for (const item of items) {
    // 1. Get previous state for delta calculation
    const previous = await repoGetItemById(item.id);
    
    // 2. Perform upsert but skip individual summary updates
    const saved = await upsertItem(item, { skipSummaryUpdate: true });
    results.push(saved);

    // 3. Calculate delta for this item
    const isSold = (status?: string) => {
      const u = (status as string || '').toUpperCase();
      return u === 'SOLD' || u === 'ITEMSTATUS.SOLD' || u === 'COLLECTED' || u === 'ITEMSTATUS.COLLECTED';
    };

    const wasSold = previous ? isSold(previous.status) : false;
    const isNowSold = isSold(saved.status);

    if (!wasSold && isNowSold) {
      totalItemsSoldDelta += saved.quantitySold || 0;
    } else if (wasSold && !isNowSold) {
      totalItemsSoldDelta -= previous?.quantitySold || 0;
    } else if (wasSold && isNowSold) {
      totalItemsSoldDelta += (saved.quantitySold || 0) - (previous?.quantitySold || 0);
    }

    // Track which month summary to update
    const date = saved.soldAt || saved.updatedAt || new Date();
    monthKeys.add(formatArchiveMonthKeyUTC(new Date(date)));
  }

  // 4. Perform AGGREGATE summary update (One call instead of many!)
  if (totalItemsSoldDelta !== 0 && monthKeys.size > 0) {
    const { SummaryRepository } = await import('./repositories/summary.repo');
    for (const monthYear of monthKeys) {
      await SummaryRepository.updateCounters({ monthYear, itemsSoldDelta: totalItemsSoldDelta });
    }
  }

  return results;
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

export async function getItemsBySubType(subItemTypes: string | string[]): Promise<Item[]> {
  return await repoGetItemsBySubType(subItemTypes);
}

export async function countItems(types?: string | string[], subTypes?: string | string[]): Promise<number> {
  return await repoCountItems(types, subTypes);
}

export async function removeItem(id: string): Promise<void> {
  const existing = await repoGetItemById(id);
  if (existing?.status === ItemStatus.SOLD && existing.sourceRecordId === 'manual') {
    const marker = '-manualsold-';
    const markerIndex = existing.id.indexOf(marker);
    const baseId = markerIndex >= 0 ? existing.id.slice(0, markerIndex) : null;
    const quantityToRestore = Number(existing.quantitySold || 0);
    if (baseId && quantityToRestore > 0) {
      const base = await repoGetItemById(baseId);
      const siteId = existing.stock?.[0]?.siteId || 'none';
      if (base) {
        const stock = (base.stock || []).map(point => ({ ...point }));
        const sitePoint = stock.find(point => point.siteId === siteId);
        if (sitePoint) sitePoint.quantity += quantityToRestore;
        else stock.push({ siteId, quantity: quantityToRestore });
        const {
          quantitySold: _quantitySold,
          sourceRecordId: _sourceRecordId,
          soldAt: _soldAt,
          ...baseShape
        } = base as any;
        await upsertItem(
          { ...baseShape, status: ItemStatus.FOR_SALE, stock, updatedAt: getUTCNow() },
          { skipWorkflowEffects: true }
        );
      } else {
        const { quantitySold: _quantitySold, sourceRecordId: _sourceRecordId, soldAt: _soldAt, ...cloneShape } = existing as any;
        const { soldAt: _contextSoldAt, ...context } = cloneShape.context || {};
        const { actualSaleValue: _actualSaleValue, ...pricing } = cloneShape.pricing || {};
        await upsertItem(
          {
            ...cloneShape,
            id: baseId,
            status: ItemStatus.FOR_SALE,
            stock: [{ siteId, quantity: quantityToRestore }],
            pricing,
            context,
            updatedAt: getUTCNow(),
          },
          { skipWorkflowEffects: true }
        );
      }
    }
  }
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
export async function upsertFinancial(financial: FinancialRecordRuntime, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean; forceSave?: boolean }): Promise<FinancialRecord> {
  const rawFinancial = financial as any;
  const suppliedRelations = rawFinancial.__financialRelations || {};
  const legacyRootKeys = [
    'siteId', 'targetSiteId', 'characterId', 'playerCharacterId', 'sourceTaskId', 'sourceSaleId',
    'doneAt', 'collectedAt', 'jungleCoins', 'rewards', 'customerCharacterRole',
  ];
  const legacyRootKey = legacyRootKeys.find((key) => Object.prototype.hasOwnProperty.call(rawFinancial, key));
  if (legacyRootKey) {
    throw new Error(`FINANCIAL_CANONICAL_WRITE_REJECTED: ${legacyRootKey} must be supplied through __financialRelations and canonical Links, not the FinancialRecord entity.`);
  }
  if (rawFinancial.context?.counterparty || rawFinancial.context?.paymentObservation) {
    throw new Error('FINANCIAL_CANONICAL_WRITE_REJECTED: counterparty and paymentObservation are compatibility facets; use __financialRelations and lifecycle/status.');
  }

  // The runtime relation command is deliberately removed before persistence.
  // It is command metadata for link reconciliation, not entity state.
  const { __financialRelations: _relations, __financialRelationsProvided: _provided, ...entityData } = rawFinancial;
  // Canonical writers must already provide the entity schema. There is no
  // compatibility normalizer on this write path; legacy migration/import
  // code must convert its input before calling upsertFinancial.
  const financialNorm = {
    ...entityData,
    schemaVersion: entityData.schemaVersion ?? EntitySchemaVersion.V1,
    version: entityData.version ?? 0,
  } as FinancialRecord;
  const previous = await repoGetFinancialById(financialNorm.id);
  const relationsProvided = Boolean(rawFinancial.__financialRelations);
  const relations: FinancialRecordRelationInput = {
    siteId: suppliedRelations.siteId ?? null,
    targetSiteId: suppliedRelations.targetSiteId ?? null,
    characterId: suppliedRelations.characterId ?? null,
    playerCharacterId: suppliedRelations.playerCharacterId ?? null,
    sourceTaskId: suppliedRelations.sourceTaskId ?? null,
    sourceSaleId: suppliedRelations.sourceSaleId ?? null,
    characterRelationship: suppliedRelations.characterRelationship ?? null,
  };

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

  const saved = await repoUpsertFinancial(financialNorm, relations);
  // Relationship values are runtime command metadata only. They are passed
  // to link/effect workflows after the clean entity has been persisted.
  const runtimeFinancial = {
    ...saved,
    ...relations,
    __financialRelations: relations,
    __financialRelationsProvided: relationsProvided,
  } as any as FinancialRecord;

  // Phase 2: Rolling Summary Update (Delta Approach)
  await SummaryService.updateFinancialCounters(saved, previous || undefined);

  if (!options?.skipWorkflowEffects) {
    const { onFinancialUpsert } = await import('@/workflows/entities-workflows/financial.workflow');
    await onFinancialUpsert(runtimeFinancial, previous || undefined);
  }

  if (!options?.skipLinkEffects) {
    await processLinkEntity(runtimeFinancial, EntityType.FINANCIAL);
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
    return financials.filter((f) => f.status === FinancialStatus.PENDING);
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

export async function getFinancialsByIds(ids: string[]): Promise<FinancialRecord[]> {
  const { getFinancialsByIds: repoGetFinancialsByIds } = await import('./repositories/financial.repo');
  return await repoGetFinancialsByIds(ids);
}

// OPTIMIZED: Indexed queries - only load financials created by specific tasks
export async function getFinancialsBySourceTaskId(taskId: string): Promise<FinancialRecord[]> {
  const { getLinksFor } = await import('@/links/link-registry');
  const links = await getLinksFor({ type: EntityType.TASK, id: taskId });
  const ids = links
    .filter((link: any) => link.linkType === 'TASK_FINREC' && link.target?.type === EntityType.FINANCIAL)
    .map((link: any) => link.target.id);
  const records = await Promise.all(Array.from(new Set(ids)).map(id => repoGetFinancialById(id as string)));
  return records.filter((record): record is FinancialRecord => Boolean(record));
}

// OPTIMIZED: Indexed queries - only load financials created by specific sales
export async function getFinancialsBySourceSaleId(saleId: string): Promise<FinancialRecord[]> {
  const { getLinksFor } = await import('@/links/link-registry');
  const links = await getLinksFor({ type: EntityType.SALE, id: saleId });
  const ids = links
    .filter((link: any) => link.linkType === 'SALE_FINREC' && link.target?.type === EntityType.FINANCIAL)
    .map((link: any) => link.target.id);
  const records = await Promise.all(Array.from(new Set(ids)).map(id => repoGetFinancialById(id as string)));
  return records.filter((record): record is FinancialRecord => Boolean(record));
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
async function hydrateSaleCompatibility(sale: Sale): Promise<Sale> {
  const { getLinksFor } = await import('@/links/link-registry');
  const saleLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });
  const siteLink = saleLinks.find(
    link => link.linkType === LinkType.SALE_SITE && link.target.type === EntityType.SITE
  );
  const characterLink = saleLinks.find(
    link => link.linkType === LinkType.SALE_CHARACTER &&
      link.target.type === EntityType.CHARACTER &&
      (!link.relationship || link.relationship === 'customer')
  );
  const ownerLink = saleLinks.find(
    link => link.linkType === LinkType.SALE_CHARACTER &&
      link.relationship === 'owner' &&
      link.target.type === EntityType.CHARACTER
  );
  const linkedCharacterId = characterLink?.target.id;
  const linkedOwnerId = ownerLink?.target.id;
  let counterpartyName = sale.counterpartyName;
  if (!counterpartyName && linkedCharacterId) {
    const character = await getCharacterById(linkedCharacterId);
    counterpartyName = character?.name;
  }
  return {
    ...sale,
    ...(siteLink ? { siteId: siteLink.target.id } : {}),
    ...(linkedCharacterId ? { characterId: linkedCharacterId } : {}),
    ...(linkedOwnerId ? { ownerId: linkedOwnerId } : {}),
    ...(counterpartyName ? { counterpartyName } : {}),
    ...(sale.saleDate ? {} : { saleDate: sale.createdAt }),
  };
}

async function ensureSaleSiteLink(saleId: string, siteId?: string): Promise<void> {
  if (!siteId) return;
  const { createLink, getLinksFor } = await import('@/links/link-registry');
  const { makeLink } = await import('@/links/links-workflows');
  const existing = await getLinksFor({ type: EntityType.SALE, id: saleId });
  if (existing.some(link => link.linkType === LinkType.SALE_SITE && link.target.type === EntityType.SITE && link.target.id === siteId)) return;
  await createLink(makeLink(LinkType.SALE_SITE, { type: EntityType.SALE, id: saleId }, { type: EntityType.SITE, id: siteId }, 'sold-at'));
}

async function ensureSaleCharacterLink(saleId: string, characterId?: string | null, relationship: 'customer' | 'owner' = 'customer'): Promise<void> {
  if (!characterId) return;
  const { createLink, getLinksFor } = await import('@/links/link-registry');
  const { makeLink } = await import('@/links/links-workflows');
  const existing = await getLinksFor({ type: EntityType.SALE, id: saleId });
  if (existing.some(link => link.linkType === LinkType.SALE_CHARACTER && link.target.type === EntityType.CHARACTER && link.target.id === characterId && (link.relationship || 'customer') === relationship)) return;
  await createLink(makeLink(LinkType.SALE_CHARACTER, { type: EntityType.SALE, id: saleId }, { type: EntityType.CHARACTER, id: characterId }, relationship));
}

export async function upsertSale(sale: Sale, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean; forceSave?: boolean }): Promise<Sale> {
  const previous = await getSaleById(sale.id);
  const relations = (sale as any).__saleRelations || {};
  const transientSiteId = relations.siteId ?? sale.siteId ?? previous?.siteId;
  const transientCharacterId = relations.characterId ?? sale.characterId ?? previous?.characterId;
  // An Online sale is customer-originated. Never carry an admin owner from a
  // compatibility projection or generic form submission into its Links.
  const transientOwnerId = sale.type === SaleType.ONLINE
    ? undefined
    : relations.ownerId ?? sale.ownerId ?? previous?.ownerId;
  const transientCounterpartyName = sale.counterpartyName ?? previous?.counterpartyName;

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
        (existing.createdAt ?? existing.saleDate) === (sale.createdAt ?? sale.saleDate)
      );
    });

    if (isDuplicate) {
      console.warn(`[upsertSale] Prevented duplicate sale creation: ${sale.counterpartyName}`);
      throw new Error(`DUPLICATE_SALE_DETECTED: A similar sale was created less than 2 minutes ago.`);
    }
  }

  const normalizedSale = roundSaleTotals(
    ensureItemSaleLineIds(normalizeSale(normalizeSaleOutputTaxonomy({
      ...sale,
      lifecycle: (() => {
        const { saleAt: _legacySaleAt, ...canonicalLifecycle } = sale.lifecycle || {};
        return canonicalLifecycle;
      })(),
    })))
  );
  if (['direct', 'network'].includes(String(normalizedSale.type).toLowerCase())) {
    const consistencyIssues = getSaleFinancialConsistencyIssues(normalizedSale);
    if (consistencyIssues.length > 0) {
      throw new Error(`SALE_FINANCIAL_INCONSISTENCY: ${consistencyIssues.join('; ')}`);
    }
  }
  const {
    siteId: _transientSiteId,
    saleDate: _transientSaleDate,
    characterId: _transientCharacterId,
    ownerId: _transientOwnerId,
    partnerId: transientPartnerId,
    counterpartyName: _transientCounterpartyName,
    __saleRelations: _transientSaleRelations,
    ...canonicalSale
  } = normalizedSale as any;
  const saved = await repoUpsertSale(canonicalSale as Sale);

  // The sale workflow can create its financial record before the general link
  // pass runs. Establish SALE_SITE first so that downstream records resolve
  // their site from the canonical relationship.
  await ensureSaleSiteLink(saved.id, transientSiteId);
  await ensureSaleCharacterLink(saved.id, transientCharacterId, 'customer');
  await ensureSaleCharacterLink(saved.id, transientOwnerId, 'owner');

  // Phase 2: Rolling Summary Update
  await SummaryService.updateSalesCounters(saved, previous || undefined);

  /** After onSaleUpsert, ensureSoldItemEntities may persist updated line itemIds (sold clones). Link sync must use that state, not the in-memory first write. */
  const runtimeSale = {
    ...saved,
    ...(transientSiteId ? { siteId: transientSiteId } : {}),
    ...(transientCharacterId ? { characterId: transientCharacterId } : {}),
    ...(transientOwnerId ? { ownerId: transientOwnerId } : {}),
    ...(transientPartnerId ? { partnerId: transientPartnerId } : {}),
    ...(transientCounterpartyName ? { counterpartyName: transientCounterpartyName } : {}),
  } as Sale;
  let resultForLinks: Sale = runtimeSale;

  if (!options?.skipWorkflowEffects) {
    const { onSaleUpsert } = await import('@/workflows/entities-workflows/sale.workflow');
    await onSaleUpsert(runtimeSale, previous || undefined);

    const latestRaw = await repoGetSaleById(sale.id);
    if (latestRaw) {
      const [revived] = reviveDates([latestRaw]);
      resultForLinks = {
        ...normalizeSale(revived),
        ...(transientSiteId ? { siteId: transientSiteId } : {}),
        ...(transientCharacterId ? { characterId: transientCharacterId } : {}),
        ...(transientOwnerId ? { ownerId: transientOwnerId } : {}),
        ...(transientPartnerId ? { partnerId: transientPartnerId } : {}),
        ...(transientCounterpartyName ? { counterpartyName: transientCounterpartyName } : {}),
      } as Sale;
    }
  }

  if (!options?.skipLinkEffects) {
    await processLinkEntity(resultForLinks, EntityType.SALE);
  }

  return resultForLinks;
}

export async function getAllSales(): Promise<Sale[]> {
  const sales = await repoGetAllSales();
  const activeSales = sales.filter(sale => sale.status !== SaleStatus.COLLECTED).map(s => normalizeSale(s));
  return Promise.all(activeSales.map(hydrateSaleCompatibility));
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
  return Promise.all(reviveDates<Sale[]>(sales).map(s => hydrateSaleCompatibility(normalizeSale(s))));
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

  return hydrateTasksCompatibilityBulk(reviveDates(tasks));
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
  return hydrateSaleCompatibility(normalizeSale(revived));
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
  const rawCharacter = character as Character & {
    achievements?: unknown;
    playerId?: unknown;
    siteId?: unknown;
    purchasedAmount?: unknown;
    beneficiaryPaidAmount?: unknown;
  };
  const {
    achievements: legacyAchievements,
    playerId: _legacyPlayerId,
    siteId: _legacySiteId,
    purchasedAmount: _purchasedAmount,
    beneficiaryPaidAmount: _beneficiaryPaidAmount,
    ...characterWithoutLegacyFields
  } = rawCharacter;
  const canonicalCharacter = {
    ...characterWithoutLegacyFields,
    ...(character.qualifications === undefined && legacyAchievements !== undefined
      ? { qualifications: legacyAchievements }
      : {}),
    schemaVersion: character.schemaVersion ?? EntitySchemaVersion.V1,
    version: previous ? ((previous.version ?? 0) + 1) : (character.version ?? 0),
  } as Character;

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

  const saved = await repoUpsertCharacter(canonicalCharacter);
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
    // Relationship inputs are transient compatibility data. They are used by
    // the workflow to reconcile Links, but are not part of the saved entity.
    await processLinkEntity({
      ...saved,
      playerId: rawCharacter.playerId,
      siteId: rawCharacter.siteId,
    } as Character, EntityType.CHARACTER);
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
function normalizePlayerAchievements(raw: unknown, fallbackCreatedAt: unknown): PlayerAchievement[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index) => {
    if (typeof entry === 'string') {
      const name = entry.trim();
      if (!name) return [];
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return [{ id: `legacy-achievement-${index}-${slug || 'unnamed'}`, name, createdAt: fallbackCreatedAt } as PlayerAchievement];
    }
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Partial<PlayerAchievement>;
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return [];
    return [{
      id: candidate.id,
      name: candidate.name,
      ...(typeof candidate.description === 'string' ? { description: candidate.description } : {}),
      createdAt: candidate.createdAt ?? fallbackCreatedAt,
    } as PlayerAchievement];
  });
}

export async function upsertPlayer(player: Player, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Player> {
  const previous = await repoGetPlayerById(player.id);
  // Player authentication is resolved through Account ↔ Character. Do not
  // carry the obsolete embedded accountId or entity links into new writes.
  const {
    accountId: _legacyAccountId,
    links: _embeddedLinks,
    characterId: _legacyCharacterId,
    points: legacyPoints,
    pendingPoints: legacyPendingPoints,
    totalPoints: legacyTotalPoints,
    totalTasksCompleted: _legacyTotalTasksCompleted,
    totalSalesCompleted: _legacyTotalSalesCompleted,
    totalItemsSold: _legacyTotalItemsSold,
    metrics: _legacyMetrics,
    badges: legacyBadges,
    achievements: legacyAchievements,
    ...canonicalPlayer
  } = player as Player & {
    accountId?: string | null;
    links?: unknown;
    characterId?: string | null;
    totalTasksCompleted?: unknown;
    totalSalesCompleted?: unknown;
    totalItemsSold?: unknown;
    metrics?: unknown;
    badges?: unknown;
    achievements?: unknown;
  };
  const zeroPoints = { hp: 0, fp: 0, rp: 0, xp: 0 };
  const current = player.rewards?.points.current ?? legacyPoints ?? zeroPoints;
  const pending = player.rewards?.points.pending ?? legacyPendingPoints ?? zeroPoints;
  const vested = player.rewards?.points.vested ?? legacyTotalPoints ?? current;
  const exchanged = player.rewards?.points.exchanged ?? zeroPoints;
  const historic = player.rewards?.points.historic ?? {
    hp: vested.hp + pending.hp,
    fp: vested.fp + pending.fp,
    rp: vested.rp + pending.rp,
    xp: vested.xp + pending.xp,
  };
  const rawAchievements = player.rewards?.achievements ?? legacyAchievements;
  const canonicalWithRewards = {
    ...canonicalPlayer,
    rewards: {
      ...(player.rewards ?? {}),
      points: player.rewards?.points ?? { pending, vested, current, exchanged, historic },
      achievements: normalizePlayerAchievements(rawAchievements, player.createdAt),
      badges: player.rewards?.badges ?? (Array.isArray(legacyBadges) ? legacyBadges : []),
    },
  };
  const saved = await repoUpsertPlayer(canonicalWithRewards as Player);

  if (!options?.skipWorkflowEffects) {
    const { onPlayerUpsert } = await import('@/workflows/entities-workflows/player.workflow');
    await onPlayerUpsert(saved, previous || undefined);
  }

  if (!options?.skipLinkEffects) {
    await processLinkEntity({ ...saved, characterId: _legacyCharacterId } as Player, EntityType.PLAYER);
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
  const rawSite = site as Site & {
    metadata?: Site['metadata'];
    type?: Site['type'];
    subtype?: Site['subtype'];
    settlementId?: string;
    googleMapsAddress?: string;
    coordinates?: { lat: number; lng: number };
    url?: string;
  };
  const legacyMetadata = rawSite.metadata;
  const {
    metadata: _legacyMetadata,
    ...siteWithoutMetadata
  } = rawSite;
  const legacyType = legacyMetadata?.type;
  const legacySubtype = legacyMetadata && (
    'businessType' in legacyMetadata ? legacyMetadata.businessType
      : 'digitalType' in legacyMetadata ? legacyMetadata.digitalType
        : legacyMetadata.systemType
  );
  const canonicalSite = {
    ...siteWithoutMetadata,
    type: rawSite.type ?? legacyType,
    subtype: rawSite.subtype ?? legacySubtype,
    settlementId: rawSite.settlementId ?? (legacyMetadata && 'settlementId' in legacyMetadata ? legacyMetadata.settlementId : undefined),
    googleMapsAddress: rawSite.googleMapsAddress ?? (legacyMetadata && 'googleMapsAddress' in legacyMetadata ? legacyMetadata.googleMapsAddress : undefined),
    coordinates: rawSite.coordinates ?? (legacyMetadata && 'coordinates' in legacyMetadata ? legacyMetadata.coordinates : undefined),
    url: rawSite.url ?? (legacyMetadata && 'url' in legacyMetadata ? legacyMetadata.url : undefined),
  } as Site;
  const saved = await repoUpsertSite(canonicalSite);
  await kvDel(buildMapReadModelKey());

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
  await kvDel(buildMapReadModelKey());
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
  const saved = await repoUpsertSettlement(settlement);
  await kvDel(buildMapReadModelKey());
  return saved;
}

export async function removeSettlement(id: string): Promise<void> {
  await kvDel(buildMapReadModelKey());
  await repoRemoveSettlement(id);
}

// ============================================================================
// REGION METHODS
// ============================================================================

/** Legacy KV rows may omit `isUnlocked`; treat as unlocked so existing maps keep working until re-saved. */
function normalizeRegionForRead(region: Region): Region {
  return {
    ...region,
    isUnlocked: region.isUnlocked !== undefined ? region.isUnlocked : true,
  };
}

export async function getAllRegions(): Promise<Region[]> {
  const list = await repoGetAllRegions();
  return list.map(normalizeRegionForRead);
}

export async function getRegionById(id: string): Promise<Region | null> {
  const region = await repoGetRegionById(id);
  return region ? normalizeRegionForRead(region) : null;
}

export async function upsertRegion(region: Region): Promise<Region> {
  const saved = await repoUpsertRegion(region);
  await kvDel(buildMapReadModelKey());
  return saved;
}

export async function removeRegion(id: string): Promise<void> {
  await kvDel(buildMapReadModelKey());
  await repoRemoveRegion(id);
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
    t.status === TaskStatus.COLLECTED
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
    s.status === SaleStatus.COLLECTED
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
    if (hasPoints(task.context?.rewardIntent?.points)) {
      rows.push({
        id: `task:${task.id}`,
        sourceType: 'task',
        sourceId: task.id,
        description: task.name,
        date: toUTCISOString(task.collectedAt ?? task.doneAt ?? getUTCNow()),
        points: {
          hp: task.context?.rewardIntent?.points?.hp ?? 0,
          fp: task.context?.rewardIntent?.points?.fp ?? 0,
          rp: task.context?.rewardIntent?.points?.rp ?? 0,
          xp: task.context?.rewardIntent?.points?.xp ?? 0,
        },
      });
    }
  });

  sales.forEach((sale) => {
    if (hasPoints(sale.context?.rewardIntent?.points)) {
      rows.push({
        id: `sale:${sale.id}`,
        sourceType: 'sale',
        sourceId: sale.id,
        description: sale.counterpartyName ?? 'Sale',
        date: toUTCISOString(sale.lifecycle?.collectedAt ?? sale.lifecycle?.chargedAt ?? sale.saleDate ?? sale.createdAt ?? getUTCNow()),
        points: {
          hp: sale.context?.rewardIntent?.points?.hp ?? 0,
          fp: sale.context?.rewardIntent?.points?.fp ?? 0,
          rp: sale.context?.rewardIntent?.points?.rp ?? 0,
          xp: sale.context?.rewardIntent?.points?.xp ?? 0,
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

// AGENT
export async function upsertAgent(entity: Agent): Promise<Agent> {
  const previous = await repoGetAgentById(entity.id);
  await repoUpsertAgent(entity);
  if (previous) {
    await processLinkEntity(entity, EntityType.AGENT);
  }
  return entity;
}

export async function getAllAgents(): Promise<Agent[]> {
  return await repoGetAllAgents();
}

export async function getAgentById(id: string): Promise<Agent | null> {
  return await repoGetAgentById(id);
}

export async function deleteAgent(id: string): Promise<void> {
  const previous = await repoGetAgentById(id);
  await repoDeleteAgent(id);
  if (previous) {
    // Additional deletion effects if any
  }
}


