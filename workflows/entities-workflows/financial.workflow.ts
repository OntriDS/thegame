// workflows/entities-workflows/financial.workflow.ts
// Financial-specific workflow: PENDING vs DONE (paid+charged); no COLLECTED / finrec points
import { isValid } from 'date-fns';

import { EntityType, LogEventType, FOUNDER_CHARACTER_ID } from '@/types/enums';
import type { FinancialRecord } from '@/types/entities';
import {
  appendEntityLog,
  updateEntityLeanFields,
  removeLogEntriesAcrossMonths,
  getEntityLogs,
  getEntityLogMonths,
  getMonthKeyFromTimestamp,
} from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { createLink, getLinksFor, removeLink } from '@/links/link-registry';
import { getPlayerById, getFinancialById } from '@/data-store/datastore';
import { createItemFromRecord, removeItemsCreatedByRecord } from '../item-creation-utils';
import { removePointsFromPlayer } from '../points-rewards-utils';
import {
  updateTasksFromFinancialRecord,
  updateItemsCreatedByRecord,
  hasFinancialPropsChanged,
  hasOutputPropsChanged,
} from '../update-propagation-utils';
import { createCharacterFromFinancial } from '../character-creation-utils';
import { upsertFinancial } from '@/data-store/datastore';
import { getUTCNow, endOfMonthUTC, formatArchiveMonthKeyUTC } from '@/lib/utils/utc-utils';
import { buildMonthIndexKey, buildArchiveMonthsKey } from '@/data-store/keys';
import { recalculateCharacterWallet } from '../financial-record-utils';
import { ensureCounterpartyRoleDatastore } from '@/lib/utils/character-role-sync-server';
const STATE_FIELDS = ['isNotPaid', 'isNotCharged'];

/**
 * Anchor date for financial logs / archive: doneAt, else closing date of year/month (not last-save createdAt),
 * else createdAt, else fallback.
 */
function getFinancialLogAnchorDate(f: FinancialRecord, fallback?: Date): Date {
  if (f.doneAt) {
    const d = f.doneAt instanceof Date ? f.doneAt : new Date(f.doneAt as string);
    if (Number.isFinite(d.getTime())) return d;
  }
  if (typeof f.year === 'number' && typeof f.month === 'number' && f.month >= 1 && f.month <= 12) {
    const ref = new Date(Date.UTC(f.year, f.month - 1, 1));
    if (isValid(ref)) return endOfMonthUTC(ref);
  }
  if (f.createdAt) {
    const d = f.createdAt instanceof Date ? f.createdAt : new Date(f.createdAt as string);
    if (Number.isFinite(d.getTime())) return d;
  }
  return fallback ?? new Date(Date.UTC(2025, 1, 1));
}

const getFinancialDate = (f: FinancialRecord, fallback?: Date) => getFinancialLogAnchorDate(f, fallback);

/** Timestamp for DONE / PENDING financial logs (month bucket follows this). */
function getFinancialDoneTimestamp(f: FinancialRecord): Date {
  return getFinancialLogAnchorDate(f);
}

export async function onFinancialUpsert(financial: FinancialRecord, previousFinancial?: FinancialRecord): Promise<void> {
  // New financial record creation
  if (!previousFinancial) {
    const effectKey = EffectKeys.created('financial', financial.id);
    if (await hasEffect(effectKey)) return;

    // Character creation from emissary fields - when newCustomerName is provided
    // This MUST run first because it updates the financial record
    if (financial.newCustomerName && !financial.customerCharacterId) {
      const characterEffectKey = EffectKeys.sideEffect('financial', financial.id, 'characterCreated');
      if (!(await hasEffect(characterEffectKey))) {
        const createdCharacter = await createCharacterFromFinancial(financial);
        if (createdCharacter) {
          // Update financial record with the created character ID
          const updatedFinancial = { ...financial, customerCharacterId: createdCharacter.id };
          await upsertFinancial(updatedFinancial, { skipWorkflowEffects: true });
          await markEffect(characterEffectKey);
        }
      }
    }

    // PARALLEL SIDE EFFECTS — item creation and wallet recalculation only (financial records do not award player points)
    // Run these independent side effects in parallel for 60-70% performance improvement
    const sideEffects: Promise<void>[] = [];

    // Item creation from emissary fields - on record creation
    if (financial.outputItemType && financial.outputQuantity) {
      sideEffects.push(
        (async () => {
          const itemEffectKey = EffectKeys.sideEffect('financial', financial.id, 'itemCreated');
          if (!(await hasEffect(itemEffectKey))) {
            const createdItem = await createItemFromRecord(financial);
            if (createdItem) {
              await markEffect(itemEffectKey);
            }
          }
        })()
      );
    }

    // J$ Wallet Cache Update - on record creation
    if (financial.jungleCoins !== 0) {
      sideEffects.push(
        (async () => {
          // Identify target character(s)
          // 1. Explicit Customer
          if (financial.customerCharacterId) {
            await recalculateCharacterWallet(financial.customerCharacterId);
          }
          // 2. Explicit Player
          if (financial.playerCharacterId) {
            await recalculateCharacterWallet(financial.playerCharacterId);
          }
          // 3. Check for Links? (Async, might be overkill for creation if we trust fields)
          // If fields are missing but links exist, we might miss it here.
          // But usually creator ensures fields for ID.
        })()
      );
    }

    // Wait for all side effects to complete
    await Promise.all(sideEffects);

    const isPending = financial.isNotPaid || financial.isNotCharged;

    // Snapshot if created as DONE (not pending)
    if (!isPending) {
      let snapshotMonthDate: Date;
      const referenceDate = new Date(Date.UTC(financial.year, financial.month - 1, 1));
      if (isValid(referenceDate)) {
        snapshotMonthDate = endOfMonthUTC(referenceDate);
      } else if (financial.createdAt) {
        snapshotMonthDate = endOfMonthUTC(financial.createdAt instanceof Date ? financial.createdAt : new Date(financial.createdAt as string));
      } else {
        // Safe historical fallback: use Jan 1st of record year, never current date
        const safeHistoricalDate = new Date(Date.UTC(financial.year, 0, 1));
        snapshotMonthDate = endOfMonthUTC(safeHistoricalDate);
      }

      const archiveIndexEffectKey = EffectKeys.sideEffect('financial', financial.id, `archiveIndex:${formatArchiveMonthKeyUTC(snapshotMonthDate)}`);

      if (!(await hasEffect(archiveIndexEffectKey))) {
        const monthKey = formatArchiveMonthKeyUTC(snapshotMonthDate);
        const { kvSAdd } = await import('@/lib/utils/kv');
        const archiveIndexKey = buildMonthIndexKey(EntityType.FINANCIAL, monthKey);
        await kvSAdd(archiveIndexKey, financial.id);

        const { buildArchiveMonthsKey } = await import('@/data-store/keys');
        await kvSAdd(buildArchiveMonthsKey(), monthKey);
        // The financial record's existence in the index and its inherent dates are the single source of truth.

        await markEffect(archiveIndexEffectKey);
      }

      // First lifecycle log is DONE.
      const doneLoggedKey = EffectKeys.sideEffect('financial', financial.id, 'doneLogged');
      if (!(await hasEffect(doneLoggedKey))) {
        await appendEntityLog(
          EntityType.FINANCIAL,
          financial.id,
          LogEventType.DONE,
          {
            name: financial.name,
            type: financial.type,
            station: financial.station,
            cost: financial.cost,
            revenue: financial.revenue
          },
          getFinancialDoneTimestamp(financial)
        );
        await markEffect(doneLoggedKey);
      }
    }

    const latestNewFinancial = (await getFinancialById(financial.id)) || financial;
    if (latestNewFinancial.customerCharacterId && latestNewFinancial.customerCharacterRole) {
      await ensureCounterpartyRoleDatastore(
        latestNewFinancial.customerCharacterId,
        latestNewFinancial.customerCharacterRole
      );
    }

    await markEffect(effectKey);
    // DONE log is already written above when !isPending (effect-gated). Do not call ensureFinancialDoneLog here —
    // it could append a second DONE if month resolution or list order differed from the guard in appendEntityLog.
    return;
  }

  // Payment status changes - PENDING (not paid or not charged) vs DONE (paid and charged)
  const wasPending = previousFinancial.isNotPaid || previousFinancial.isNotCharged;
  const nowPending = financial.isNotPaid || financial.isNotCharged;

  if (wasPending && !nowPending) {
    // Transitioned from PENDING to DONE (both paid and charged)
    const doneLoggedKey = EffectKeys.sideEffect('financial', financial.id, 'doneLogged');
    if (!(await hasEffect(doneLoggedKey))) {
      await appendEntityLog(EntityType.FINANCIAL, financial.id, LogEventType.DONE, {
        name: financial.name,
        type: financial.type,
        station: financial.station,
        cost: financial.cost,
        revenue: financial.revenue
      }, getFinancialDoneTimestamp(financial));
      await markEffect(doneLoggedKey);
    }

    // NEW: Archive Index Tracking
    let snapshotMonthDate: Date;
    const referenceDate = new Date(Date.UTC(financial.year, financial.month - 1, 1));

    if (isValid(referenceDate)) {
      snapshotMonthDate = endOfMonthUTC(referenceDate);
    } else if (financial.createdAt) {
      snapshotMonthDate = endOfMonthUTC(financial.createdAt instanceof Date ? financial.createdAt : new Date(financial.createdAt as string));
    } else {
      // Safe historical fallback: use Jan 1st of record year, never current date
      const safeHistoricalDate = new Date(Date.UTC(financial.year, 0, 1));
      snapshotMonthDate = endOfMonthUTC(safeHistoricalDate);
    }

    const archiveIndexEffectKey = EffectKeys.sideEffect('financial', financial.id, `archiveIndex:${formatArchiveMonthKeyUTC(snapshotMonthDate)}`);

    if (!(await hasEffect(archiveIndexEffectKey))) {
      const monthKey = formatArchiveMonthKeyUTC(snapshotMonthDate);
      const { kvSAdd } = await import('@/lib/utils/kv');
      const archiveIndexKey = buildMonthIndexKey(EntityType.FINANCIAL, monthKey);
      await kvSAdd(archiveIndexKey, financial.id);

      const { buildArchiveMonthsKey } = await import('@/data-store/keys');
      await kvSAdd(buildArchiveMonthsKey(), monthKey);

      // The financial record's existence in the index and its inherent dates are the single source of truth.

      await markEffect(archiveIndexEffectKey);
    }
  } else if (!wasPending && nowPending) {
    // Reverted from DONE to PENDING (became unpaid or uncharged)
    await appendEntityLog(EntityType.FINANCIAL, financial.id, LogEventType.PENDING, {
      name: financial.name,
      type: financial.type,
      station: financial.station,
      cost: financial.cost,
      revenue: financial.revenue
    }, getFinancialDate(financial));
  }

  // COMPREHENSIVE UPDATE PROPAGATION - when financial record properties change
  if (previousFinancial) {
    // Propagate to Tasks
    if (hasFinancialPropsChanged(financial, previousFinancial)) {
      await updateTasksFromFinancialRecord(financial, previousFinancial);
    }

    // Propagate to Items
    if (hasOutputPropsChanged(financial, previousFinancial)) {
      await updateItemsCreatedByRecord(financial, previousFinancial);
    }

    // Propagate J$ changes to Character Wallet Cache
    if (financial.jungleCoins !== previousFinancial.jungleCoins) {
      if (financial.customerCharacterId) await recalculateCharacterWallet(financial.customerCharacterId);
      if (financial.playerCharacterId) await recalculateCharacterWallet(financial.playerCharacterId);

      // Also check previous record's owner if it changed!
      if (previousFinancial.customerCharacterId && previousFinancial.customerCharacterId !== financial.customerCharacterId) {
        await recalculateCharacterWallet(previousFinancial.customerCharacterId);
      }
      if (previousFinancial.playerCharacterId && previousFinancial.playerCharacterId !== financial.playerCharacterId) {
        await recalculateCharacterWallet(previousFinancial.playerCharacterId);
      }
    }

  }

  const finCounterpartyPresent = Boolean(financial.customerCharacterId && financial.customerCharacterRole);
  const finCounterpartyChanged =
    !previousFinancial ||
    previousFinancial.customerCharacterId !== financial.customerCharacterId ||
    previousFinancial.customerCharacterRole !== financial.customerCharacterRole;
  if (finCounterpartyPresent && finCounterpartyChanged) {
    await ensureCounterpartyRoleDatastore(financial.customerCharacterId, financial.customerCharacterRole);
  }

  // Lean identity fields changed — cascade patch ALL log entries across ALL months and events
  if (previousFinancial) {
    const leanFieldsChanged =
      previousFinancial.name !== financial.name ||
      previousFinancial.type !== financial.type ||
      previousFinancial.station !== financial.station ||
      previousFinancial.cost !== financial.cost ||
      previousFinancial.revenue !== financial.revenue;

    if (leanFieldsChanged) {
      await updateEntityLeanFields(EntityType.FINANCIAL, financial.id, {
        name: financial.name || 'Unknown',
        type: financial.type || 'Unknown',
        station: financial.station || 'Unknown',
        cost: financial.cost ?? 0,
        revenue: financial.revenue ?? 0,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Reactive Archive Indexing & Ghost Cleanup
  // Ensure the entity is correctly placed in the right month's sorted set.
  // We sweep all available months to completely eradicate Snapshot-era ghost duplicates.
  // ---------------------------------------------------------------------------
  if (previousFinancial) {
    const isNowArchived = !financial.isNotPaid && !financial.isNotCharged;
    const wasArchived = !previousFinancial.isNotPaid && !previousFinancial.isNotCharged;

    const getArchiveMonth = (f: FinancialRecord) => {
      let snapshotDate: Date = f.createdAt instanceof Date ? f.createdAt : (f.createdAt ? new Date(f.createdAt as string) : new Date(Date.UTC(f.year, 0, 1)));
      const referenceDate = new Date(Date.UTC(f.year, f.month - 1, 1));
      if (isValid(referenceDate)) {
        snapshotDate = endOfMonthUTC(referenceDate);
      } else if (f.createdAt) {
        snapshotDate = endOfMonthUTC(f.createdAt instanceof Date ? f.createdAt : new Date(f.createdAt as string));
      }
      return formatArchiveMonthKeyUTC(snapshotDate);
    };

    const newMonth = isNowArchived ? getArchiveMonth(financial) : null;
    const oldMonth = wasArchived ? getArchiveMonth(previousFinancial) : null;

    if (newMonth !== oldMonth || (!newMonth && oldMonth)) {
      const { kvSAdd, kvSRem } = await import('@/lib/utils/kv');
      const { getAvailableArchiveMonths } = await import('@/data-store/datastore');
      const { buildArchiveMonthsKey } = await import('@/data-store/keys');

      // BULLETPROOF CLEANUP: Remove from ALL other months to fix legacy ghost duplicates
      const allMonths = await getAvailableArchiveMonths();
      for (const m of allMonths) {
        if (m !== newMonth) {
          await kvSRem(buildMonthIndexKey(EntityType.FINANCIAL, m), financial.id);
        }
      }

      if (newMonth) {
        await kvSAdd(buildMonthIndexKey(EntityType.FINANCIAL, newMonth), financial.id);
        await kvSAdd(buildArchiveMonthsKey(), newMonth);

        // ── Log Sync ──────────────────────────────────────────────────────────
        const { getEntityLogs } = await import('../entities-logging');
        const monthEntries = await getEntityLogs(EntityType.FINANCIAL, { month: newMonth });
        const existingEntry = monthEntries.find(
          (e: any) => e.entityId === financial.id && String(e.event ?? '').toLowerCase() === 'done'
        );

        if (existingEntry) {
          await updateEntityLeanFields(EntityType.FINANCIAL, financial.id, {
            name: financial.name,
            type: financial.type,
            station: financial.station,
            cost: financial.cost,
            revenue: financial.revenue,
          });
        } else {
          const logPayload = {
            name: financial.name,
            type: financial.type,
            station: financial.station,
            cost: financial.cost,
            revenue: financial.revenue
          };
          await appendEntityLog(
            EntityType.FINANCIAL,
            financial.id,
            LogEventType.DONE,
            logPayload,
            getFinancialDoneTimestamp(financial)
          );
        }
      }
    }
  }

  // Heal missing DONE log after edits (manual log delete, or lean-field patch found no row).
  if (!(financial.isNotPaid || financial.isNotCharged)) {
    await ensureFinancialDoneLog(financial.id);
  }
}

/**
 * Precision repair: append FINANCIAL DONE when paid+charged but the row is missing.
 * (Analyst `ensure_done_log` maps here for entityType=financial.)
 */
export async function ensureFinancialDoneLog(financialId: string): Promise<{
  success: boolean;
  noop?: boolean;
  repaired?: boolean;
  error?: string;
}> {
  const financial = await getFinancialById(financialId);
  if (!financial) return { success: false, error: `Financial not found: ${financialId}` };
  const pending = financial.isNotPaid || financial.isNotCharged;
  if (pending) {
    return {
      success: false,
      error: 'Financial is still pending (not paid or not charged); DONE log not implied.',
    };
  }

  const ts = getFinancialDoneTimestamp(financial);
  const targetMonth = getMonthKeyFromTimestamp(ts);

  const monthIndex = new Set<string>([targetMonth, ...(await getEntityLogMonths(EntityType.FINANCIAL))]);
  for (const m of monthIndex) {
    const logsInMonth = await getEntityLogs(EntityType.FINANCIAL, { month: m });
    const hasDone = logsInMonth.some(
      (e: { entityId?: string; event?: string }) =>
        e.entityId === financialId && String(e.event ?? '').toLowerCase() === 'done'
    );
    if (hasDone) {
      return { success: true, noop: true };
    }
  }

  await removeLogEntriesAcrossMonths(
    EntityType.FINANCIAL,
    entry =>
      entry.entityId === financialId && String(entry.event ?? '').toLowerCase() === 'done'
  );

  await appendEntityLog(
    EntityType.FINANCIAL,
    financial.id,
    LogEventType.DONE,
    {
      name: financial.name,
      type: financial.type,
      station: financial.station,
      cost: financial.cost,
      revenue: financial.revenue,
    },
    ts
  );
  return { success: true, repaired: true };
}

/**
 * Remove financial record effects when record is deleted
 * Financial records can have entries in multiple logs: financials, character, player, items
 */
export async function removeRecordEffectsOnDelete(recordId: string): Promise<void> {
  try {

    // 1. Remove items created by this record
    await removeItemsCreatedByRecord(recordId);

    // 2. Remove player points that were awarded by this record (if points were badly given)
    await removePlayerPointsFromRecord(recordId);
    // 3. Remove all Links related to this record
    const recordLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: recordId });

    // Extract character IDs from links before deleting them
    const affectedCharacterIds = new Set<string>();
    for (const link of recordLinks) {
      if (link.source.type === EntityType.CHARACTER) affectedCharacterIds.add(link.source.id);
      if (link.target.type === EntityType.CHARACTER) affectedCharacterIds.add(link.target.id);
    }

    for (const link of recordLinks) {
      try {
        await removeLink(link.id);
      } catch (error) {
        console.error(`[removeRecordEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }

    // Recalculate for all affected characters found via links
    for (const charId of affectedCharacterIds) {
      await recalculateCharacterWallet(charId);
    }

    // 4. Clear effects registry
    await clearEffect(EffectKeys.created('financial', recordId));
    await clearEffect(EffectKeys.sideEffect('financial', recordId, 'characterCreated'));
    await clearEffect(EffectKeys.sideEffect('financial', recordId, 'itemCreated'));
    await clearEffect(EffectKeys.sideEffect('financial', recordId, 'pointsAwarded'));
    await clearEffect(EffectKeys.sideEffect('financial', recordId, 'pointsVested')); // Remove old effect key
    await clearEffect(EffectKeys.sideEffect('financial', recordId, 'pointsRewarded')); // Add new effect key
    await clearEffectsByPrefix(EntityType.FINANCIAL, recordId, 'pointsLogged:');
    await clearEffectsByPrefix(EntityType.FINANCIAL, recordId, 'financialLogged:');

    // 5. Remove log entries from financials log (monthly lists)
    await removeLogEntriesAcrossMonths(EntityType.FINANCIAL, entry => entry.entityId === recordId);

    // Check and remove from character log if this record was linked to a character
    await removeLogEntriesAcrossMonths(EntityType.CHARACTER, entry => entry.financialId === recordId || entry.sourceFinancialId === recordId);

    // 6. Remove from archive index
    try {
      const record = await getFinancialById(recordId);
      if (record) {
        let snapshotDate: Date = record.createdAt instanceof Date ? record.createdAt : (record.createdAt ? new Date(record.createdAt as string) : new Date(Date.UTC(record.year, 0, 1)));
        const referenceDate = new Date(Date.UTC(record.year, record.month - 1, 1));
        if (isValid(referenceDate)) {
          snapshotDate = endOfMonthUTC(referenceDate);
        } else if (record.createdAt) {
          snapshotDate = endOfMonthUTC(record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt as string));
        }
        const monthKey = formatArchiveMonthKeyUTC(snapshotDate);
        const { kvSRem } = await import('@/lib/utils/kv');
        const archiveIndexKey = buildMonthIndexKey(EntityType.FINANCIAL, monthKey);
        await kvSRem(archiveIndexKey, recordId);
        await clearEffect(EffectKeys.sideEffect('financial', recordId, `financialSnapshot:${monthKey}`));
      }
    } catch (err) {
      console.error(`[removeRecordEffectsOnDelete] Failed to clean up archive index`, err);
    }

  } catch (error) {
    console.error('Error removing record effects:', error);
  }
}

/**
 * Remove player points that were awarded by a specific financial record
 * This is used when rolling back a record that incorrectly awarded points
 */
async function removePlayerPointsFromRecord(recordId: string): Promise<void> {
  try {

    // Get the record to find what points were awarded
    const record = await getFinancialById(recordId);

    if (!record || !record.rewards?.points) {
      return;
    }

    // Get the player from the record (same logic as creation)
    const playerId = record.playerCharacterId || FOUNDER_CHARACTER_ID;
    const player = await getPlayerById(playerId);

    if (!player) {
      return;
    }

    // Check if any points were actually awarded
    const pointsToRemove = record.rewards.points;
    const hasPoints = (pointsToRemove.xp || 0) > 0 || (pointsToRemove.rp || 0) > 0 ||
      (pointsToRemove.fp || 0) > 0 || (pointsToRemove.hp || 0) > 0;

    if (!hasPoints) {
      return;
    }

    // Remove the points from the player
    await removePointsFromPlayer(playerId, {
      xp: pointsToRemove.xp || 0,
      rp: pointsToRemove.rp || 0,
      fp: pointsToRemove.fp || 0,
      hp: pointsToRemove.hp || 0
    });

  } catch (error) {
    console.error(`[removePlayerPointsFromRecord] ❌ Failed to remove player points for record ${recordId}:`, error);
  }
}

