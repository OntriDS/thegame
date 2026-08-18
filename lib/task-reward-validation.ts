import { TaskStatus } from '@/types/enums';

export type TaskPointValues = { xp?: unknown; rp?: unknown; fp?: unknown; hp?: unknown };

export const hasPositiveTaskPoints = (points: TaskPointValues | null | undefined): boolean =>
  Boolean(points && Object.values(points).some((value) => Number(value) > 0));

export const hasNonZeroTaskPoints = (points: TaskPointValues | null | undefined): boolean =>
  Boolean(points && Object.values(points).some((value) => Number(value) !== 0));

export const failedTaskPositivePointsError = {
  code: 'FAILED_TASK_POSITIVE_POINTS',
  message: 'A failed task cannot contain positive points. Set its points to zero or enter a negative penalty.',
};

export const validateTaskRewardStatus = (status: TaskStatus | string | undefined, points: TaskPointValues | null | undefined) =>
  status === TaskStatus.FAILED && hasPositiveTaskPoints(points) ? failedTaskPositivePointsError : null;
