import 'server-only';

import { isValid } from 'date-fns';
import { getTaskById, getTasksForMonth } from '@/data-store/datastore';
import { kvSMembers } from '@/data-store/kv';
import { formatMonthKey } from '@/lib/utils/date-utils';
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

  const collectedIndexKey = `index:tasks:collected:${monthKey}`;
  const collectedIds = await kvSMembers(collectedIndexKey);

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

  const activeForMonth = await getTasksForMonth(year, month);
  const doneActive = activeForMonth.filter((t) => t.status === TaskStatus.DONE);

  for (const task of doneActive) {
    const da = toDate(task.doneAt as unknown);
    if (da == null) {
      pushIssue(
        issues,
        total,
        'TASK_DONE_ACTIVE_MISSING_DONE_AT',
        `Task ${task.id} is DONE in active month ${mmyy} but doneAt is missing`,
        EntityType.TASK,
        task.id
      );
    } else if (!inCalendarMonth(da, month, year)) {
      pushIssue(
        issues,
        total,
        'TASK_DONE_ACTIVE_WRONG_DONE_MONTH',
        `Task ${task.id} is DONE in month ${mmyy} active list but doneAt is ${da.toISOString()} (different month)`,
        EntityType.TASK,
        task.id
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
      notes: `Scanned collected index (${collectedIds.length} ids) and ${doneActive.length} active DONE tasks for ${mmyy}.`,
    },
    issues,
  };
}
