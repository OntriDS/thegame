import 'server-only';

import { isValid } from 'date-fns';
import { getAllTasks, getAvailableArchiveMonths, getTaskById } from '@/data-store/datastore';
import { kvSMembers } from '@/data-store/kv';
import { buildArchiveCollectionIndexKey, buildTaskActiveIndexKey } from '@/data-store/keys';
import { formatMonthKey } from '@/lib/utils/date-utils';
import { isTaskActive, isTaskCompleted } from '@/lib/utils/task-active-utils';
import { TaskStatus, EntityType } from '@/types/enums';
import { INTEGRITY_ISSUES_CAP, type IntegrityAuditResult, type IntegrityIssue } from './types';
import { toMMYY } from './integrity-audits';

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

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }
  return null;
}

/** Local calendar month match (consistent with formatMonthKey on Date objects). */
function inCalendarMonth(d: Date | null | undefined, month: number, year: number): boolean {
  if (!d || !isValid(d)) return false;
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

/**
 * Tasks in History scope for month X: collected index + active DONE in month.
 * Flags missing or cross-month doneAt / collectedAt vs that month.
 */
export async function auditTaskTimelineVsMonthIndex(month: number, year: number): Promise<IntegrityAuditResult> {
  const mmyy = toMMYY(month, year);
  const date = new Date(year, month - 1, 1);
  const monthKey = formatMonthKey(date);
  const issues: IntegrityIssue[] = [];
  const total = { n: 0 };

  const collectedIds = await kvSMembers(buildArchiveCollectionIndexKey('tasks', monthKey));

  for (const id of collectedIds) {
    const task = await getTaskById(id);
    if (!task) {
      pushIssue(
        issues,
        total,
        'TASK_COLLECTED_INDEX_ORPHAN',
        `Task id in collected index for ${mmyy} but no record: ${id}`,
        EntityType.TASK,
        id
      );
      continue;
    }
    const ca = toDate(task.collectedAt as unknown);
    if (ca == null) {
      pushIssue(
        issues,
        total,
        'TASK_COLLECTED_INDEX_MISSING_COLLECTED_AT',
        `Task ${id} is in collected index for ${mmyy} but collectedAt is missing`,
        EntityType.TASK,
        id
      );
    } else if (!inCalendarMonth(ca, month, year)) {
      pushIssue(
        issues,
        total,
        'TASK_COLLECTED_INDEX_WRONG_COLLECTED_MONTH',
        `Task ${id} is in collected index for ${mmyy} but collectedAt is ${ca.toISOString()} (different month)`,
        EntityType.TASK,
        id
      );
    }
  }

  return {
    ok: total.n === 0,
    audit: 'taskTimelineVsMonthIndex',
    scope: { month, year, mmyy },
    summary: {
      totalIssueCount: total.n,
      truncated: total.n > INTEGRITY_ISSUES_CAP,
      notes: `Scanned collected index (${collectedIds.length} ids) for ${mmyy}.`,
    },
    issues,
  };
}

/**
 * Completed tasks (Done or Collected) must appear in at least one monthly index set.
 * Redis key shape remains `thegame:index:tasks:collected:MM-YY` until a key rename migration.
 */
export async function auditCompletedTasksMissingFromCompletedIndex(): Promise<IntegrityAuditResult> {
  const tasks = await getAllTasks();
  const months = await getAvailableArchiveMonths();
  const monthlyIdSet = new Set<string>();
  for (const mmyy of months) {
    const key = buildArchiveCollectionIndexKey('tasks', mmyy);
    const ids = await kvSMembers(key);
    for (const id of ids) monthlyIdSet.add(id);
  }

  const issues: IntegrityIssue[] = [];
  const total = { n: 0 };

  for (const task of tasks) {
    if (isTaskCompleted(task) && !monthlyIdSet.has(task.id)) {
      pushIssue(
        issues,
        total,
        'TASK_COMPLETED_MISSING_FROM_ALL_MONTHLY_INDEXES',
        `Task ${task.id} is Done or Collected but not in any monthly tasks index (${months.length} months scanned)`,
        EntityType.TASK,
        task.id
      );
    }
  }

  const mmyy = 'global';
  return {
    ok: total.n === 0,
    audit: 'completedTasksMissingFromCompletedIndex',
    scope: { month: 0, year: 0, mmyy },
    summary: {
      totalIssueCount: total.n,
      truncated: total.n > INTEGRITY_ISSUES_CAP,
      notes: `Scanned ${tasks.length} tasks; union of monthly index ids size ${monthlyIdSet.size} (${months.length} month keys).`,
    },
    issues,
  };
}

/** Not-yet-completed tasks should be listed in thegame:index:task:active (after upsert/repair). */
export async function auditActiveTasksMissingFromActiveIndex(): Promise<IntegrityAuditResult> {
  const tasks = await getAllTasks();
  const activeKey = buildTaskActiveIndexKey();
  const activeMembers = await kvSMembers(activeKey);
  const activeSet = new Set(activeMembers);

  const issues: IntegrityIssue[] = [];
  const total = { n: 0 };

  for (const task of tasks) {
    if (isTaskActive(task) && !activeSet.has(task.id)) {
      pushIssue(
        issues,
        total,
        'TASK_ACTIVE_BUT_MISSING_FROM_ACTIVE_INDEX',
        `Task ${task.id} is not Done/Collected but is missing from ${activeKey}`,
        EntityType.TASK,
        task.id
      );
    }
  }

  const mmyy = 'global';
  return {
    ok: total.n === 0,
    audit: 'activeTasksMissingFromActiveIndex',
    scope: { month: 0, year: 0, mmyy },
    summary: {
      totalIssueCount: total.n,
      truncated: total.n > INTEGRITY_ISSUES_CAP,
      notes: `Scanned ${tasks.length} tasks; active index size ${activeSet.size}.`,
    },
    issues,
  };
}
