// One-time migration: legacy status strings → kebab-case slugs (enum values).
// Legacy maps live only here; remove this workflow after Apply + verified dry-run is empty.

import 'server-only';

import fs from 'fs';
import path from 'path';

import { kvGet, kvSet, kvSMembers } from '@/lib/utils/kv';
import { buildDataKey, buildIndexKey } from '@/data-store/keys';
import {
  EntityType,
  SiteStatus,
  TaskStatus,
  ItemStatus,
  FinancialStatus,
  SaleStatus,
  ContractStatus,
  DevSprintStatus,
} from '@/types/enums';

const PROJECT_STATUS_KV_KEY = 'thegame:data:project-status';
const DEV_LOG_KV_KEY = 'thegame:data:dev-log';

const LEGACY_SITE_STATUS: Record<string, SiteStatus> = {
  Active: SiteStatus.ACTIVE,
  Inactive: SiteStatus.INACTIVE,
  ACTIVE: SiteStatus.ACTIVE,
  INACTIVE: SiteStatus.INACTIVE,
  active: SiteStatus.ACTIVE,
  inactive: SiteStatus.INACTIVE,
};

const LEGACY_TASK_STATUS: Record<string, TaskStatus> = {
  Created: TaskStatus.CREATED,
  CREATED: TaskStatus.CREATED,
  created: TaskStatus.CREATED,
  'On Hold': TaskStatus.ON_HOLD,
  ON_HOLD: TaskStatus.ON_HOLD,
  'on hold': TaskStatus.ON_HOLD,
  'on-hold': TaskStatus.ON_HOLD,
  'In Progress': TaskStatus.IN_PROGRESS,
  IN_PROGRESS: TaskStatus.IN_PROGRESS,
  'in progress': TaskStatus.IN_PROGRESS,
  'in-progress': TaskStatus.IN_PROGRESS,
  Finishing: TaskStatus.FINISHING,
  FINISHING: TaskStatus.FINISHING,
  finishing: TaskStatus.FINISHING,
  Done: TaskStatus.DONE,
  DONE: TaskStatus.DONE,
  done: TaskStatus.DONE,
  Collected: TaskStatus.COLLECTED,
  COLLECTED: TaskStatus.COLLECTED,
  collected: TaskStatus.COLLECTED,
  Failed: TaskStatus.FAILED,
  FAILED: TaskStatus.FAILED,
  failed: TaskStatus.FAILED,
  None: TaskStatus.NONE,
  NONE: TaskStatus.NONE,
  none: TaskStatus.NONE,
};

const LEGACY_ITEM_STATUS: Record<string, ItemStatus> = {
  Created: ItemStatus.CREATED,
  created: ItemStatus.CREATED,
  'For Sale': ItemStatus.FOR_SALE,
  FOR_SALE: ItemStatus.FOR_SALE,
  'for sale': ItemStatus.FOR_SALE,
  'for-sale': ItemStatus.FOR_SALE,
  Sold: ItemStatus.SOLD,
  SOLD: ItemStatus.SOLD,
  sold: ItemStatus.SOLD,
  'To Order': ItemStatus.TO_ORDER,
  TO_ORDER: ItemStatus.TO_ORDER,
  'to order': ItemStatus.TO_ORDER,
  'to-order': ItemStatus.TO_ORDER,
  'To Do': ItemStatus.TO_DO,
  TO_DO: ItemStatus.TO_DO,
  'to do': ItemStatus.TO_DO,
  'to-do': ItemStatus.TO_DO,
  Gifted: ItemStatus.GIFTED,
  gifted: ItemStatus.GIFTED,
  Reserved: ItemStatus.RESERVED,
  reserved: ItemStatus.RESERVED,
  Consignment: ItemStatus.CONSIGNMENT,
  consignment: ItemStatus.CONSIGNMENT,
  Obsolete: ItemStatus.OBSOLETE,
  obsolete: ItemStatus.OBSOLETE,
  Damaged: ItemStatus.DAMAGED,
  damaged: ItemStatus.DAMAGED,
  Idle: ItemStatus.IDLE,
  idle: ItemStatus.IDLE,
};

const LEGACY_FINANCIAL_STATUS: Record<string, FinancialStatus> = {
  PENDING: FinancialStatus.PENDING,
  Pending: FinancialStatus.PENDING,
  pending: FinancialStatus.PENDING,
  Done: FinancialStatus.DONE,
  DONE: FinancialStatus.DONE,
  done: FinancialStatus.DONE,
};

const LEGACY_SALE_STATUS: Record<string, SaleStatus> = {
  PENDING: SaleStatus.PENDING,
  Pending: SaleStatus.PENDING,
  pending: SaleStatus.PENDING,
  ON_HOLD: SaleStatus.ON_HOLD,
  'ON HOLD': SaleStatus.ON_HOLD,
  'On Hold': SaleStatus.ON_HOLD,
  'on hold': SaleStatus.ON_HOLD,
  'on-hold': SaleStatus.ON_HOLD,
  CHARGED: SaleStatus.CHARGED,
  Charged: SaleStatus.CHARGED,
  charged: SaleStatus.CHARGED,
  COLLECTED: SaleStatus.COLLECTED,
  Collected: SaleStatus.COLLECTED,
  collected: SaleStatus.COLLECTED,
  CANCELLED: SaleStatus.CANCELLED,
  Cancelled: SaleStatus.CANCELLED,
  cancelled: SaleStatus.CANCELLED,
};

const LEGACY_CONTRACT_STATUS: Record<string, ContractStatus> = {
  Draft: ContractStatus.DRAFT,
  DRAFT: ContractStatus.DRAFT,
  draft: ContractStatus.DRAFT,
  Active: ContractStatus.ACTIVE,
  ACTIVE: ContractStatus.ACTIVE,
  active: ContractStatus.ACTIVE,
  Paused: ContractStatus.PAUSED,
  PAUSED: ContractStatus.PAUSED,
  paused: ContractStatus.PAUSED,
  Terminated: ContractStatus.TERMINATED,
  TERMINATED: ContractStatus.TERMINATED,
  terminated: ContractStatus.TERMINATED,
};

/** Phase / system rows in project-status JSON (and mistaken task UI values). */
const LEGACY_PROJECT_PHASE_STATUS: Record<string, DevSprintStatus> = {
  'Not Started': DevSprintStatus.NOT_STARTED,
  NOT_STARTED: DevSprintStatus.NOT_STARTED,
  'not started': DevSprintStatus.NOT_STARTED,
  'not-started': DevSprintStatus.NOT_STARTED,
  'In Progress': DevSprintStatus.IN_PROGRESS,
  IN_PROGRESS: DevSprintStatus.IN_PROGRESS,
  'in progress': DevSprintStatus.IN_PROGRESS,
  'in-progress': DevSprintStatus.IN_PROGRESS,
  Done: DevSprintStatus.DONE,
  DONE: DevSprintStatus.DONE,
  done: DevSprintStatus.DONE,
  /** Historical dev-log.json used "completed" for finished sprints/phases */
  completed: DevSprintStatus.DONE,
  Completed: DevSprintStatus.DONE,
  COMPLETED: DevSprintStatus.DONE,
  /** Wrong enum used in research UI for phases */
  Created: DevSprintStatus.NOT_STARTED,
  CREATED: DevSprintStatus.NOT_STARTED,
  created: DevSprintStatus.NOT_STARTED,
};

const CANON_SITE = new Set(Object.values(SiteStatus));
const CANON_TASK = new Set(Object.values(TaskStatus));
const CANON_ITEM = new Set(Object.values(ItemStatus));
const CANON_FIN = new Set(Object.values(FinancialStatus));
const CANON_SALE = new Set(Object.values(SaleStatus));
const CANON_CONTRACT = new Set(Object.values(ContractStatus));
const CANON_DEV_SPRINT = new Set(Object.values(DevSprintStatus));

function resolveSite(raw: string): { value: SiteStatus } | { unknown: string } {
  if (CANON_SITE.has(raw as SiteStatus)) return { value: raw as SiteStatus };
  const m = LEGACY_SITE_STATUS[raw];
  if (m) return { value: m };
  return { unknown: raw };
}

function resolveTask(raw: string): { value: TaskStatus } | { unknown: string } {
  if (CANON_TASK.has(raw as TaskStatus)) return { value: raw as TaskStatus };
  const m = LEGACY_TASK_STATUS[raw];
  if (m) return { value: m };
  return { unknown: raw };
}

function resolveItem(raw: string): { value: ItemStatus } | { unknown: string } {
  if (CANON_ITEM.has(raw as ItemStatus)) return { value: raw as ItemStatus };
  const m = LEGACY_ITEM_STATUS[raw];
  if (m) return { value: m };
  return { unknown: raw };
}

function resolveFinancial(raw: string): { value: FinancialStatus } | { unknown: string } {
  if (CANON_FIN.has(raw as FinancialStatus)) return { value: raw as FinancialStatus };
  const m = LEGACY_FINANCIAL_STATUS[raw];
  if (m) return { value: m };
  return { unknown: raw };
}

function resolveSale(raw: string): { value: SaleStatus } | { unknown: string } {
  if (CANON_SALE.has(raw as SaleStatus)) return { value: raw as SaleStatus };
  const m = LEGACY_SALE_STATUS[raw];
  if (m) return { value: m };
  return { unknown: raw };
}

function resolveContract(raw: string): { value: ContractStatus } | { unknown: string } {
  if (CANON_CONTRACT.has(raw as ContractStatus)) return { value: raw as ContractStatus };
  const m = LEGACY_CONTRACT_STATUS[raw];
  if (m) return { value: m };
  return { unknown: raw };
}

function resolveProjectPhase(raw: string): { value: DevSprintStatus } | { unknown: string } {
  if (CANON_DEV_SPRINT.has(raw as DevSprintStatus)) return { value: raw as DevSprintStatus };
  const m = LEGACY_PROJECT_PHASE_STATUS[raw];
  if (m) return { value: m };
  return { unknown: raw };
}

export interface MigrateStatusSlugsResult {
  success: boolean;
  message: string;
  data?: {
    dryRun: boolean;
    changesByEntity: Record<string, number>;
    sampleIdsByEntity: Record<string, string[]>;
    unmapped: UnmappedRow[];
    projectStatusChanged: boolean;
    devLogChanged: boolean;
  };
}

interface UnmappedRow {
  entity: string;
  field: string;
  id: string;
  value: string;
}

const ENTITY_SCAN_ORDER: { type: EntityType; label: string }[] = [
  { type: EntityType.TASK, label: 'task' },
  { type: EntityType.ITEM, label: 'item' },
  { type: EntityType.SALE, label: 'sale' },
  { type: EntityType.FINANCIAL, label: 'financial' },
  { type: EntityType.SITE, label: 'site' },
  { type: EntityType.CHARACTER, label: 'character' },
  { type: EntityType.PLAYER, label: 'player' },
  { type: EntityType.CONTRACT, label: 'contract' },
];

const MAX_UNMAPPED = 200;
const SAMPLE_CAP = 8;

function pushUnmapped(
  list: UnmappedRow[],
  row: UnmappedRow
) {
  if (list.length >= MAX_UNMAPPED) return;
  list.push(row);
}

function noteRecordChange(
  counts: Record<string, number>,
  samples: Record<string, string[]>,
  entityLabel: string,
  id: string
) {
  counts[entityLabel] = (counts[entityLabel] || 0) + 1;
  if (!samples[entityLabel]) samples[entityLabel] = [];
  if (samples[entityLabel].length < SAMPLE_CAP) samples[entityLabel].push(id);
}

function patchRecordForEntity(
  entityLabel: string,
  row: Record<string, unknown>,
  id: string,
  unmapped: UnmappedRow[]
): boolean {
  let changed = false;

  const patchField = (
    field: string,
    raw: unknown,
    resolve: (s: string) => { value: string } | { unknown: string }
  ) => {
    if (typeof raw !== 'string' || !raw.trim()) return;
    const r = resolve(raw);
    if ('unknown' in r) {
      pushUnmapped(unmapped, { entity: entityLabel, field, id, value: raw });
      return;
    }
    if (row[field] !== r.value) {
      row[field] = r.value;
      changed = true;
    }
  };

  if (entityLabel === 'task') {
    patchField('status', row.status, resolveTask);
    patchField('outputItemStatus', row.outputItemStatus, resolveItem);
  } else if (entityLabel === 'item') {
    patchField('status', row.status, resolveItem);
  } else if (entityLabel === 'sale') {
    patchField('status', row.status, resolveSale);
  } else if (entityLabel === 'financial') {
    if (row.status !== undefined && row.status !== null) {
      patchField('status', row.status, resolveFinancial);
    }
  } else if (entityLabel === 'site') {
    patchField('status', row.status, resolveSite);
  } else if (entityLabel === 'contract') {
    patchField('status', row.status, resolveContract);
  } else if (entityLabel === 'character' || entityLabel === 'player') {
    if (typeof row.status === 'string') {
      const chain = [resolveSite, resolveTask, resolveItem, resolveSale, resolveFinancial, resolveContract] as const;
      let resolved: string | null = null;
      for (const fn of chain) {
        const r = fn(row.status);
        if ('value' in r) {
          resolved = r.value;
          break;
        }
      }
      if (resolved === null) {
        pushUnmapped(unmapped, { entity: entityLabel, field: 'status', id, value: row.status });
      } else if (row.status !== resolved) {
        row.status = resolved;
        changed = true;
      }
    }
  }

  return changed;
}

function migrateProjectStatusTree(node: unknown, unmapped: UnmappedRow[]): boolean {
  if (node === null || typeof node !== 'object') return false;
  let changed = false;

  if (Array.isArray(node)) {
    for (const el of node) {
      if (migrateProjectStatusTree(el, unmapped)) changed = true;
    }
    return changed;
  }

  const o = node as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    if (key === 'status' && typeof o[key] === 'string') {
      const raw = o[key] as string;
      const r = resolveProjectPhase(raw);
      if ('unknown' in r) {
        pushUnmapped(unmapped, { entity: 'project-status', field: 'status', id: '(nested)', value: raw });
      } else if (o[key] !== r.value) {
        o[key] = r.value;
        changed = true;
      }
    } else if (typeof o[key] === 'object' && o[key] !== null) {
      if (migrateProjectStatusTree(o[key], unmapped)) changed = true;
    }
  }
  return changed;
}

function projectStatusFilePath(): string {
  return path.join(process.cwd(), 'project-status', 'PROJECT-STATUS.json');
}

async function loadProjectStatus(): Promise<{ data: unknown; mode: 'kv' | 'file' } | null> {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const data = await kvGet<unknown>(PROJECT_STATUS_KV_KEY);
    if (data && typeof data === 'object') return { data, mode: 'kv' };
    return { data: {}, mode: 'kv' };
  }
  const fp = projectStatusFilePath();
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    return { data: JSON.parse(raw), mode: 'file' };
  } catch {
    return null;
  }
}

async function saveProjectStatus(mode: 'kv' | 'file', data: unknown): Promise<void> {
  if (mode === 'kv') {
    await kvSet(PROJECT_STATUS_KV_KEY, data);
    return;
  }
  const fp = projectStatusFilePath();
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

function devLogFilePath(): string {
  return path.join(process.cwd(), 'project-status', 'dev-log.json');
}

async function loadDevLog(): Promise<{ data: unknown; mode: 'kv' | 'file' } | null> {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const data = await kvGet<unknown>(DEV_LOG_KV_KEY);
    if (data && typeof data === 'object') return { data, mode: 'kv' };
    return { data: { sprints: [], phases: [] }, mode: 'kv' };
  }
  try {
    const raw = fs.readFileSync(devLogFilePath(), 'utf8');
    return { data: JSON.parse(raw), mode: 'file' };
  } catch {
    return null;
  }
}

async function saveDevLog(mode: 'kv' | 'file', data: unknown): Promise<void> {
  if (mode === 'kv') {
    await kvSet(DEV_LOG_KV_KEY, data);
    return;
  }
  fs.writeFileSync(devLogFilePath(), JSON.stringify(data, null, 2));
}

/** Sprint + nested phase `status` in dev-log (align with DevSprintStatus / project-status). */
function migrateDevLogSprintPhaseStatuses(root: unknown, unmapped: UnmappedRow[]): boolean {
  if (!root || typeof root !== 'object') return false;
  const o = root as Record<string, unknown>;
  const sprints = o.sprints;
  if (!Array.isArray(sprints)) return false;
  let changed = false;

  const patchStatus = (obj: Record<string, unknown>, id: string, fieldPrefix: string) => {
    if (typeof obj.status !== 'string' || !obj.status.trim()) return;
    const r = resolveProjectPhase(obj.status);
    if ('unknown' in r) {
      pushUnmapped(unmapped, { entity: 'dev-log', field: `${fieldPrefix}.status`, id, value: obj.status });
      return;
    }
    if (obj.status !== r.value) {
      obj.status = r.value;
      changed = true;
    }
  };

  for (const sp of sprints) {
    if (!sp || typeof sp !== 'object') continue;
    const sprint = sp as Record<string, unknown>;
    patchStatus(sprint, String(sprint.id ?? 'sprint'), 'sprint');
    const phases = sprint.phases;
    if (Array.isArray(phases)) {
      for (const ph of phases) {
        if (!ph || typeof ph !== 'object') continue;
        const phase = ph as Record<string, unknown>;
        patchStatus(phase, String(phase.id ?? 'phase'), 'phase');
      }
    }
  }
  return changed;
}

export class MigrateStatusSlugsWorkflow {
  static async execute(options: { dryRun: boolean }): Promise<MigrateStatusSlugsResult> {
    const dryRun = options.dryRun;
    const unmapped: UnmappedRow[] = [];
    const changesByEntity: Record<string, number> = {};
    const sampleIdsByEntity: Record<string, string[]> = {};

    try {
      const isKV = Boolean(process.env.UPSTASH_REDIS_REST_URL);
      if (!isKV && typeof window !== 'undefined') {
        return {
          success: false,
          message: 'Status migration must run on the server (KV or local filesystem).',
        };
      }

      const pendingEntityWrites: { key: string; payload: Record<string, unknown> }[] = [];
      let pendingProjectStatus: { mode: 'kv' | 'file'; data: unknown } | null = null;
      let pendingDevLog: { mode: 'kv' | 'file'; data: unknown } | null = null;
      let projectStatusChanged = false;
      let devLogChanged = false;

      if (isKV) {
        for (const { type, label } of ENTITY_SCAN_ORDER) {
          const indexKey = buildIndexKey(type);
          const ids = await kvSMembers(indexKey);
          for (const id of ids) {
            const key = buildDataKey(type, id);
            const row = await kvGet<Record<string, unknown>>(key);
            if (!row || typeof row !== 'object') continue;

            const clone = JSON.parse(JSON.stringify(row)) as Record<string, unknown>;
            const touched = patchRecordForEntity(label, clone, id, unmapped);
            if (touched) {
              noteRecordChange(changesByEntity, sampleIdsByEntity, label, id);
              pendingEntityWrites.push({ key, payload: clone });
            }
          }
        }
      }

      const ps = await loadProjectStatus();
      if (ps && typeof ps.data === 'object' && ps.data !== null) {
        const clone = JSON.parse(JSON.stringify(ps.data)) as unknown;
        const before = JSON.stringify(clone);
        if (migrateProjectStatusTree(clone, unmapped)) {
          projectStatusChanged = JSON.stringify(clone) !== before;
          if (projectStatusChanged) {
            noteRecordChange(changesByEntity, sampleIdsByEntity, 'project-status', 'file-or-kv');
            pendingProjectStatus = { mode: ps.mode, data: clone };
          }
        }
      }

      const dl = await loadDevLog();
      if (dl && typeof dl.data === 'object' && dl.data !== null) {
        const clone = JSON.parse(JSON.stringify(dl.data)) as unknown;
        const before = JSON.stringify(clone);
        if (migrateDevLogSprintPhaseStatuses(clone, unmapped)) {
          devLogChanged = JSON.stringify(clone) !== before;
          if (devLogChanged) {
            noteRecordChange(changesByEntity, sampleIdsByEntity, 'dev-log', 'file-or-kv');
            pendingDevLog = { mode: dl.mode, data: clone };
          }
        }
      }

      const hasUnmapped = unmapped.length > 0;
      if (hasUnmapped) {
        return {
          success: false,
          message: `Migration ${dryRun ? 'dry run' : 'apply'} stopped: ${unmapped.length} unmapped value(s). Fix legacy maps or data before apply.`,
          data: {
            dryRun,
            changesByEntity,
            sampleIdsByEntity,
            unmapped,
            projectStatusChanged: false,
            devLogChanged: false,
          },
        };
      }

      if (!dryRun) {
        for (const w of pendingEntityWrites) {
          await kvSet(w.key, w.payload);
        }
        if (pendingProjectStatus) {
          await saveProjectStatus(pendingProjectStatus.mode, pendingProjectStatus.data);
        }
        if (pendingDevLog) {
          await saveDevLog(pendingDevLog.mode, pendingDevLog.data);
        }
      }

      const message = dryRun
        ? 'Dry run completed: no unmapped values; counts reflect rows that would change.'
        : 'Apply completed: KV, project-status, and dev-log updated where needed.';

      return {
        success: true,
        message,
        data: {
          dryRun,
          changesByEntity,
          sampleIdsByEntity,
          unmapped,
          projectStatusChanged,
          devLogChanged,
        },
      };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : 'Unknown migration error',
      };
    }
  }
}
