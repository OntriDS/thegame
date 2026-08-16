// @ts-nocheck
// app/api/tasks/route.ts
// app/api/tasks/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Task } from '@/types/entities';
import { TaskType, TaskStatus, TaskPriority } from '@/types/enums';
import { getAllTasks, getActiveTasks, upsertTask, getTasksForMonth, getTaskById } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
// UTC STANDARDIZATION: Using new UTC utilities
import { getUTCNow, endOfMonthUTC } from '@/lib/utils/utc-utils';
import { parseDateToUTC } from '@/lib/utils/date-parsers';

const normalizeCharacterId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = req.nextUrl.searchParams;
  const monthParam = params.get('month');
  const yearParam = params.get('year');

  const normalizeYear = (y: string | null): number | null => {
    if (!y) return null;
    const n = parseInt(y, 10);
    if (isNaN(n)) return null;
    // Accept YY or YYYY
    if (n < 100) return 2000 + n;
    return n;
  };

  const parseMonth = (m: string | null): number | null => {
    if (!m) return null;
    const n = parseInt(m, 10);
    if (isNaN(n) || n < 1 || n > 12) return null;
    return n;
  };

  const month = parseMonth(monthParam);
  const year = normalizeYear(yearParam);

  try {
    let data: Task[];
    if (month && year) {
      data = await getTasksForMonth(year, month);
    } else {
      // Default: Return ALL active tasks (not collected)
      // This supports the "Active Task Tree" view which is not time-bound
      data = await getActiveTasks();
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { skipDuplicateCheck, ...taskData } = body as { skipDuplicateCheck?: boolean } & Record<string, unknown>;
    const taskBody = taskData as unknown as Task;
    const incomingTaskCharacterId = normalizeCharacterId((taskBody as { characterId?: string | null }).characterId);
    const characterId = incomingTaskCharacterId;

    const cleanTaskBody = { ...(taskBody as unknown as Record<string, unknown>) } as Record<string, unknown>;
    const requestedOwnerIds = Array.isArray(taskBody.ownerIds) ? taskBody.ownerIds : undefined;
    delete cleanTaskBody.customerCharacterId;
    delete cleanTaskBody.counterpartyCharacterId;
    delete cleanTaskBody.counterpartyRole;
    // These fields are compatibility inputs only. New Task writes use the
    // canonical schedule/context facets and canonical Links.
    delete cleanTaskBody.characterId;
    delete cleanTaskBody.links;
    delete cleanTaskBody.dueDate;
    delete cleanTaskBody.frequencyConfig;
    delete cleanTaskBody.isCollected;
    delete cleanTaskBody.ownerIds;
    if (cleanTaskBody.description === '') delete cleanTaskBody.description;
    if (cleanTaskBody.parentId == null) delete cleanTaskBody.parentId;
    if (cleanTaskBody.siteId == null) delete cleanTaskBody.siteId;
    if (cleanTaskBody.targetSiteId == null) delete cleanTaskBody.targetSiteId;

    const rawContext = (taskBody.context || {}) as Record<string, any>;
    const rawProductionPlan = rawContext.productionPlan;
    const hasProductionIntent = Boolean(
      rawProductionPlan && (
        rawProductionPlan.outputItemType ||
        rawProductionPlan.outputItemName ||
        (taskBody as any).outputItemId
      )
    );
    const rewardPoints = rawContext.rewardIntent?.points;
    const hasRewardIntent = Boolean(
      rewardPoints && Object.values(rewardPoints).some((value) => Number(value) > 0)
    );
    const requestedCounterpartyId = normalizeCharacterId(
      (taskBody as any).counterpartyCharacterId ?? rawContext.counterparty?.counterpartyId
    );
    const requestedCounterpartyRole = String(
      (taskBody as any).counterpartyRole ?? rawContext.counterparty?.role ?? ''
    ).trim().toLowerCase();
    const canonicalCounterpartyId = requestedCounterpartyId || characterId;
    const hasCounterparty = Boolean(canonicalCounterpartyId || rawContext.newCustomerName);
    const normalizedContext = { ...rawContext };
    if (!hasProductionIntent) delete normalizedContext.productionPlan;
    if (!hasRewardIntent) delete normalizedContext.rewardIntent;
    else if (normalizedContext.rewardIntent) {
      // Task points belong to the owner's Player relationship. The old
      // These fields belonged to retired reward-recipient experiments. The
      // canonical Task reward facet contains only its kind and point amounts.
      const {
        beneficiaryCharacterId: _legacyBeneficiary,
        policyVersion: _legacyPolicyVersion,
        ...canonicalRewardIntent
      } = normalizedContext.rewardIntent;
      normalizedContext.rewardIntent = canonicalRewardIntent;
    }
    if (normalizedContext.financialIntent) {
      const financialIntent = normalizedContext.financialIntent as Record<string, any>;
      const normalizedFinancialIntent: Record<string, any> = {};
      for (const key of ['costIntent', 'revenueIntent']) {
        const money = financialIntent[key];
        if (money && String(money.minorUnits) !== '0') {
          normalizedFinancialIntent[key] = money;
        }
      }
      if (Object.keys(normalizedFinancialIntent).length > 0) {
        normalizedContext.financialIntent = normalizedFinancialIntent;
      } else {
        delete normalizedContext.financialIntent;
      }
    }
    // Counterparty identity is command input for TASK_CHARACTER Link
    // reconciliation, never part of the persisted Task entity.
    delete normalizedContext.counterparty;

    // Normalize frequencyConfig.customDays to parsed UTC instants (preserve client civil day)
    let normalizedFrequencyConfig = taskBody.frequencyConfig;
    if (normalizedFrequencyConfig?.customDays && Array.isArray(normalizedFrequencyConfig.customDays)) {
      normalizedFrequencyConfig = {
        ...normalizedFrequencyConfig,
        customDays: normalizedFrequencyConfig.customDays.map((day: any) => {
          if (day instanceof Date) {
            return new Date(day.getTime());
          }
          if (typeof day === 'string') {
            try {
              return parseDateToUTC(day);
            } catch {
              return null;
            }
          }
          return day;
        }).filter((day: any) => day instanceof Date && !isNaN(day.getTime())) as Date[]
      };
    }

    if (normalizedFrequencyConfig?.stopsAfter?.type === 'date' && normalizedFrequencyConfig.stopsAfter.value) {
      try {
        const dateValue = typeof normalizedFrequencyConfig.stopsAfter.value === 'string'
          ? parseDateToUTC(normalizedFrequencyConfig.stopsAfter.value)
          : normalizedFrequencyConfig.stopsAfter.value;

        if (dateValue && !isNaN(dateValue.getTime())) {
          normalizedFrequencyConfig.stopsAfter.value = new Date(dateValue.getTime());
        }
      } catch {
        // Invalid date, leave as is
      }
    }

    const id = taskBody.id || uuid();
    let parentId = taskBody.parentId;

    // Explicitly block self-referential parent assignment (circular reference)
    if (parentId === id) {
      console.warn(`[API] Task ${id} attempted to become its own parent. Nullifying parentId.`);
      parentId = null;
    }

    const existingTask = taskBody.id ? await getTaskById(taskBody.id) : null;
    const requestedStatus = taskBody.status as TaskStatus | undefined;
    const isTerminalStatus = (status?: TaskStatus) =>
      status === TaskStatus.DONE ||
      status === TaskStatus.COLLECTED ||
      status === TaskStatus.FAILED;
    const isRevertingFromTerminal =
      Boolean(existingTask?.status) &&
      isTerminalStatus(existingTask?.status as TaskStatus) &&
      Boolean(requestedStatus) &&
      !isTerminalStatus(requestedStatus);
    const requestedDoneAt = taskBody.doneAt ? parseDateToUTC(taskBody.doneAt) : undefined;
    const requestedCollectedAt = taskBody.collectedAt ? parseDateToUTC(taskBody.collectedAt) : undefined;
    const shouldSetDoneAt = Boolean(requestedStatus) &&
      (requestedStatus === TaskStatus.DONE ||
        requestedStatus === TaskStatus.COLLECTED ||
        requestedStatus === TaskStatus.FAILED);
    const nextDoneAt =
      requestedDoneAt !== undefined
        ? requestedDoneAt
        : isRevertingFromTerminal
          ? undefined
          : shouldSetDoneAt
            ? (existingTask?.doneAt || getUTCNow())
            : existingTask?.doneAt;
    const nextCollectedAt =
      requestedCollectedAt !== undefined
        ? requestedCollectedAt
        : isRevertingFromTerminal
          ? undefined
          : requestedStatus === TaskStatus.COLLECTED
            ? (existingTask?.collectedAt || (existingTask?.doneAt ? endOfMonthUTC(existingTask.doneAt) : getUTCNow()))
            : existingTask?.collectedAt;
    const existingProgress = typeof existingTask?.progress === 'object'
      ? Number((existingTask.progress as { percentage?: unknown }).percentage ?? 0)
      : Number(existingTask?.progress ?? 0);
    const nextProgress =
      taskBody.progress !== undefined
        ? (typeof taskBody.progress === 'object'
          ? Number((taskBody.progress as { percentage?: unknown }).percentage ?? 0)
          : Number(taskBody.progress))
        : isRevertingFromTerminal
          ? 0
          : existingProgress;

    const task = {
      ...cleanTaskBody,
      id,
      ...(parentId ? { parentId } : {}),
      ...(taskBody.outputItemId ? { outputItemId: taskBody.outputItemId } : {}),
      ...(requestedOwnerIds !== undefined ? { ownerIds: requestedOwnerIds } : {}),
      createdAt: taskBody.createdAt ? parseDateToUTC(taskBody.createdAt as Date | string | number | null | undefined) : getUTCNow(),
      updatedAt: getUTCNow(),
      schedule: taskBody.schedule || (taskBody.dueDate
        ? { dueDate: parseDateToUTC(taskBody.dueDate) }
        : undefined),
      doneAt: nextDoneAt,
      collectedAt: nextCollectedAt,
      progress: { percentage: Number.isFinite(nextProgress) ? nextProgress : 0 },
      context: {
        ...normalizedContext,
        ...(normalizedFrequencyConfig && (taskBody.type === TaskType.RECURRENT_GROUP || taskBody.type === TaskType.RECURRENT_TEMPLATE)
          ? {
              recurrence: {
                ...(normalizedContext.recurrence || {}),
                frequencyConfig: normalizedFrequencyConfig,
              },
            }
          : {}),
      },
      __counterparty: hasCounterparty
        ? {
            id: canonicalCounterpartyId,
            role: requestedCounterpartyRole || (taskBody as any).customerCharacterRole || 'customer',
          }
        : null,
    } as unknown as Task;
    const saved = await upsertTask(task, { skipDuplicateCheck });
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[API] Error saving task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save task' },
      { status: 500 }
    );
  }
}



