import type {
  WeeklyScheduleApplyReceiptV1,
  WeeklyScheduleChangeV1,
  AkilesWeeklySchedulePacketV1,
  Task,
  WeeklyScheduleTaskSnapshotV1,
} from '@/types/entities';
import { EntityType, LinkType, TaskPriority, TaskStatus, TaskType } from '@/types/enums';
import { getCharacterById, getTaskById, upsertTask } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { addDaysUTC, getUTCNow } from '@/lib/utils/utc-utils';
import { parseDateToUTC } from '@/lib/utils/date-parsers';

export interface AkilesWeeklyScheduleInput {
  /** Any UTC calendar date within the requested week. */
  selectedDate: string;
}

const INCLUDED_STATUSES = [
  TaskStatus.CREATED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.FINISHING,
] as const;

function normalizeWeek(value: unknown): { selectedDate: string; weekStartDate: string; weekEndDate: string } {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('WEEKLY_SCHEDULE_DATE_INVALID');
  }

  let selected: Date;
  try {
    selected = parseDateToUTC(value);
  } catch {
    throw new Error('WEEKLY_SCHEDULE_DATE_INVALID');
  }
  if (selected.toISOString().slice(0, 10) !== value) throw new Error('WEEKLY_SCHEDULE_DATE_INVALID');

  const mondayOffset = (selected.getUTCDay() + 6) % 7;
  const weekStart = addDaysUTC(selected, -mondayOffset);
  const weekEnd = addDaysUTC(weekStart, 6);
  return {
    selectedDate: value,
    weekStartDate: weekStart.toISOString().slice(0, 10),
    weekEndDate: weekEnd.toISOString().slice(0, 10),
  };
}

function taskSnapshot(task: Task): WeeklyScheduleTaskSnapshotV1 {
  return {
    id: task.id,
    version: task.version,
    name: task.name,
    ...(task.description ? { description: task.description } : {}),
    type: task.type,
    status: task.status,
    priority: task.priority,
    station: task.station,
    ...(task.parentId !== undefined ? { parentId: task.parentId } : {}),
    ownerIds: task.ownerIds || [],
    ...('schedule' in task && task.schedule ? { schedule: task.schedule } : {}),
    ...(task.context?.recurrence ? { recurrence: task.context.recurrence } : {}),
  };
}

function isStructuralTask(task: Task): boolean {
  return task.type === TaskType.MISSION_GROUP || task.type === TaskType.RECURRENT_GROUP;
}

export async function collectAkilesWeeklySchedule(
  automationTask: Task,
  input: AkilesWeeklyScheduleInput,
): Promise<AkilesWeeklySchedulePacketV1> {
  if (automationTask.type !== TaskType.AUTOMATION) throw new Error('TASK_IS_NOT_AUTOMATION');

  const ownerIds = [...new Set(automationTask.ownerIds || [])].sort();
  if (ownerIds.length !== 1) throw new Error('WEEKLY_SCHEDULE_REQUIRES_ONE_OWNER');
  const ownerId = ownerIds[0];
  const owner = await getCharacterById(ownerId);
  if (!owner || !owner.isActive) throw new Error('WEEKLY_SCHEDULE_OWNER_NOT_FOUND');

  const week = normalizeWeek(input?.selectedDate);
  const ownerLinks = await getLinksFor({ type: EntityType.CHARACTER, id: ownerId });
  const taskIds = [...new Set(ownerLinks
    .filter((link) => (
      link.linkType === LinkType.TASK_CHARACTER
      && link.relationship === 'owner'
      && link.target.type === EntityType.CHARACTER
      && link.target.id === ownerId
      && link.source.type === EntityType.TASK
    ))
    .map((link) => link.source.id))].sort();

  const tasks: Task[] = [];
  for (let offset = 0; offset < taskIds.length; offset += 25) {
    const batch = taskIds.slice(offset, offset + 25);
    const records = await Promise.all(batch.map((id) => getTaskById(id)));
    tasks.push(...records.filter((task): task is Task => task !== null));
  }

  const included: Task[] = [];
  const excludedCountsByStatus: Partial<Record<TaskStatus, number>> = {};
  for (const task of tasks) {
    if (isStructuralTask(task) || !INCLUDED_STATUSES.includes(task.status as typeof INCLUDED_STATUSES[number])) {
      excludedCountsByStatus[task.status] = (excludedCountsByStatus[task.status] || 0) + 1;
      continue;
    }
    if (!task.ownerIds?.includes(ownerId)) continue;
    included.push(task);
  }

  included.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  return {
    schemaVersion: 1,
    ...week,
    generatedAt: getUTCNow().toISOString(),
    owner: { id: owner.id, name: owner.name },
    includedStatuses: [...INCLUDED_STATUSES],
    excludedCountsByStatus,
    tasks: included.map(taskSnapshot),
  };
}

function normalizedInterval(change: WeeklyScheduleChangeV1): { start: string; end: string } {
  if (typeof change.scheduledStart !== 'string' || !change.scheduledStart.endsWith('Z')) {
    throw new Error('WEEKLY_SCHEDULE_START_MUST_BE_UTC');
  }
  if (typeof change.scheduledEnd !== 'string' || !change.scheduledEnd.endsWith('Z')) {
    throw new Error('WEEKLY_SCHEDULE_END_MUST_BE_UTC');
  }
  let start: Date;
  let end: Date;
  try {
    start = parseDateToUTC(change.scheduledStart);
    end = parseDateToUTC(change.scheduledEnd);
  } catch {
    throw new Error('WEEKLY_SCHEDULE_INTERVAL_INVALID');
  }
  if (start.getTime() >= end.getTime()) throw new Error('WEEKLY_SCHEDULE_INTERVAL_INVALID');
  if (start.getTime() % (15 * 60 * 1000) !== 0 || end.getTime() % (15 * 60 * 1000) !== 0) {
    throw new Error('WEEKLY_SCHEDULE_INTERVAL_MUST_ALIGN_TO_15_MINUTES');
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

function overlaps(left: { start: string; end: string }, right: { start: string; end: string }): boolean {
  return Date.parse(left.start) < Date.parse(right.end) && Date.parse(right.start) < Date.parse(left.end);
}

function sameValue(left: unknown, right: unknown): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  try {
    return parseDateToUTC(left as string).getTime() === parseDateToUTC(right as string).getTime();
  } catch {
    return false;
  }
}

function isEligible(task: Task, ownerId: string): boolean {
  return task.ownerIds?.includes(ownerId) === true
    && INCLUDED_STATUSES.includes(task.status as typeof INCLUDED_STATUSES[number])
    && !isStructuralTask(task);
}

export async function applyAkilesWeeklySchedule(
  sourceRunId: string,
  packet: AkilesWeeklySchedulePacketV1,
  changes: WeeklyScheduleChangeV1[],
): Promise<WeeklyScheduleApplyReceiptV1> {
  if (!Array.isArray(changes)) throw new Error('WEEKLY_SCHEDULE_CHANGES_REQUIRED');
  const owner = await getCharacterById(packet.owner.id);
  if (!owner || !owner.isActive) throw new Error('WEEKLY_SCHEDULE_OWNER_NOT_FOUND');
  const sourceTasks = new Map(packet.tasks.map((task) => [task.id, task]));
  const changeById = new Map<string, WeeklyScheduleChangeV1>();
  const intervals = new Map<string, { start: string; end: string }>();
  for (const change of changes) {
    if (!change || typeof change.taskId !== 'string' || changeById.has(change.taskId)) {
      throw new Error('WEEKLY_SCHEDULE_TASK_IDS_INVALID');
    }
    if (!sourceTasks.has(change.taskId)) throw new Error('WEEKLY_SCHEDULE_TASK_OUT_OF_SCOPE');
    if (change.priority !== undefined && !Object.values(TaskPriority).includes(change.priority)) {
      throw new Error('WEEKLY_SCHEDULE_PRIORITY_INVALID');
    }
    changeById.set(change.taskId, change);
    const interval = normalizedInterval(change);
    const rangeStart = Date.parse(`${packet.weekStartDate}T00:00:00.000Z`);
    const rangeEnd = Date.parse(`${packet.weekEndDate}T00:00:00.000Z`) + 24 * 60 * 60 * 1000;
    if (Date.parse(interval.start) < rangeStart || Date.parse(interval.end) > rangeEnd) {
      throw new Error('WEEKLY_SCHEDULE_INTERVAL_OUTSIDE_SELECTED_WEEK');
    }
    intervals.set(change.taskId, interval);
  }

  // Reject proposed blocks that collide with another existing or proposed block
  // for this owner. Existing overlaps among untouched tasks are not rewritten.
  const collisionIds = new Set<string>();
  for (const [taskId, interval] of intervals) {
    for (const other of packet.tasks) {
      if (other.id === taskId) continue;
      const otherChange = changeById.get(other.id);
      const otherStart = otherChange
        ? intervals.get(other.id)?.start
        : other.schedule?.scheduledStart;
      const otherEnd = otherChange
        ? intervals.get(other.id)?.end
        : other.schedule?.scheduledEnd;
      if (!otherStart && !otherEnd) continue;
      if (!otherStart || !otherEnd) {
        collisionIds.add(taskId);
        continue;
      }
      let otherInterval: { start: string; end: string };
      try {
        otherInterval = { start: parseDateToUTC(otherStart).toISOString(), end: parseDateToUTC(otherEnd).toISOString() };
      } catch {
        collisionIds.add(taskId);
        continue;
      }
      if (overlaps(interval, otherInterval)) {
        collisionIds.add(taskId);
        if (otherChange) collisionIds.add(other.id);
      }
    }
  }

  const receipt: WeeklyScheduleApplyReceiptV1 = {
    sourceRunId,
    status: 'completed',
    applied: [],
    alreadyApplied: [],
    skipped: [...collisionIds].sort().map((taskId) => ({ taskId, reason: 'schedule-conflict' })),
  };

  for (const change of changes) {
    const snapshot = sourceTasks.get(change.taskId)!;
    if (collisionIds.has(change.taskId)) continue;
    const desired = intervals.get(change.taskId)!;
    let current: Task | null;
    try {
      current = await getTaskById(change.taskId);
    } catch {
      receipt.status = 'partial';
      receipt.skipped.push({ taskId: change.taskId, reason: 'task-read-failed' });
      break;
    }
    if (!current || !isEligible(current, packet.owner.id)) {
      receipt.skipped.push({ taskId: change.taskId, reason: 'owner-or-status-changed' });
      continue;
    }

    const currentStart = current.schedule?.scheduledStart;
    const currentEnd = current.schedule?.scheduledEnd;
    const desiredAlreadyPresent = sameValue(currentStart, desired.start)
      && sameValue(currentEnd, desired.end)
      && (change.priority === undefined || current.priority === change.priority);
    if (desiredAlreadyPresent) {
      receipt.alreadyApplied.push(change.taskId);
      continue;
    }

    const sourceSchedule = snapshot.schedule;
    if (!sameValue(currentStart, sourceSchedule?.scheduledStart)
      || !sameValue(currentEnd, sourceSchedule?.scheduledEnd)
      || (change.priority !== undefined && current.priority !== snapshot.priority)) {
      receipt.skipped.push({ taskId: change.taskId, reason: 'task-changed-since-collection' });
      continue;
    }

    let saved: Task;
    try {
      saved = await upsertTask({
        ...current,
        schedule: {
          ...(current.schedule || {}),
          scheduledStart: desired.start,
          scheduledEnd: desired.end,
        },
        ...(change.priority !== undefined ? { priority: change.priority } : {}),
      });
    } catch {
      receipt.status = 'partial';
      receipt.skipped.push({ taskId: change.taskId, reason: 'write-failed' });
      break;
    }
    let readBack: Task | null;
    try {
      readBack = await getTaskById(change.taskId);
    } catch {
      readBack = null;
    }
    if (!readBack
      || !sameValue(readBack.schedule?.scheduledStart, desired.start)
      || !sameValue(readBack.schedule?.scheduledEnd, desired.end)
      || (change.priority !== undefined && readBack.priority !== change.priority)) {
      receipt.status = 'partial';
      receipt.skipped.push({ taskId: change.taskId, reason: 'write-readback-mismatch' });
      break;
    }
    receipt.applied.push({ taskId: change.taskId, version: readBack.version ?? saved.version });
  }

  if (receipt.skipped.length > 0) receipt.status = 'partial';
  return receipt;
}
