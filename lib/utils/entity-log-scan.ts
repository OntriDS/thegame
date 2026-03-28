import { EntityType } from '@/types/enums';

/** Whether any monthly log for this entity contains an event (case-insensitive). */
export async function entityHasLogEvent(
  entityType: EntityType,
  entityId: string,
  eventLower: string
): Promise<boolean> {
  const { getEntityLogMonths, getEntityLogs } = await import('@/workflows/entities-logging');
  const months = await getEntityLogMonths(entityType);
  const mmYyNow = (() => {
    const n = new Date();
    return `${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getFullYear()).slice(-2)}`;
  })();
  const monthSet = new Set<string>([mmYyNow, ...months]);
  const want = eventLower.toLowerCase();
  for (const m of monthSet) {
    const logs = await getEntityLogs(entityType, { month: m });
    if (
      logs.some(
        (e: { entityId?: string; event?: string; status?: string }) =>
          e.entityId === entityId && String(e.event ?? e.status ?? '').toLowerCase() === want
      )
    ) {
      return true;
    }
  }
  return false;
}

/** True if any of the listed events exists for this entity. */
export async function entityHasAnyLogEvent(
  entityType: EntityType,
  entityId: string,
  eventLowers: string[]
): Promise<boolean> {
  for (const ev of eventLowers) {
    if (await entityHasLogEvent(entityType, entityId, ev)) return true;
  }
  return false;
}
