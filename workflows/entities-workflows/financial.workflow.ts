// workflows/entities-workflows/financial.workflow.ts
// Financial-specific workflow with CHARGED, COLLECTED events
import { isValid } from 'date-fns';

import { EntityType, LogEventType, FinancialStatus, FOUNDER_CHARACTER_ID } from '@/types/enums';
import type { FinancialRecord } from '@/types/entities';
import { appendEntityLog, updateEntityLeanFields, removeLogEntriesAcrossMonths } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { createLink, getLinksFor, removeLink } from '@/links/link-registry';
import { getPlayerById, getFinancialById } from '@/data-store/datastore';
import { createItemFromRecord, removeItemsCreatedByRecord } from '../item-creation-utils';
import { awardPointsToPlayer, removePointsFromPlayer, resolveToPlayerIdMaybeCharacter, stagePointsForPlayer, rewardPointsToPlayer, withdrawStagedPointsFromPlayer, unrewardPointsForPlayer } from '../points-rewards-utils';
import {
  updateTasksFromFinancialRecord,
  updateItemsCreatedByRecord,
  updatePlayerPointsFromSource,
  hasFinancialPropsChanged,
  hasOutputPropsChanged,
  hasRewardsChanged
} from '../update-propagation-utils';
import { createCharacterFromFinancial } from '../character-creation-utils';
import { upsertFinancial } from '@/data-store/datastore';
import { formatMonthKey, calculateClosingDate } from '@/lib/utils/date-utils';
import { buildArchiveCollectionIndexKey, buildArchiveMonthsKey } from '@/data-store/keys';
import { recalculateCharacterWallet } from '../financial-record-utils';

const STATE_FIELDS = ['isNotPaid', 'isNotCharged', 'isCollected'];

const getFinancialDate = (f: FinancialRecord) => new Date(f.year, f.month - 1, 1);

export async function onFinancialUpsert(financial: FinancialRecord, previousFinancial?: FinancialRecord): Promise<void> {
  // New financial record creation
  if (!previousFinancial) {
    const effectKey = EffectKeys.created('financial', financial.id);
    if (await hasEffect(effectKey)) return;

    await appendEntityLog(EntityType.FINANCIAL, financial.id, LogEventType.CREATED, {
      name: financial.name,
      type: financial.type,
      station: financial.station,
      cost: financial.cost,
      revenue: financial.revenue,
      isNotPaid: financial.isNotPaid,
      isNotCharged: financial.isNotCharged
    }, financial.createdAt || getFinancialDate(financial));
    await markEffect(effectKey);

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

    // PARALLEL SIDE EFFECTS - item creation and points awarding can run concurrently
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

    // Points awarding - on record creation with rewards
    // Use financial.playerCharacterId directly as playerId (unified ID)
    if (financial.rewards?.points) {
      sideEffects.push(
        (async () => {
          (async () => {
            const stagingKey = EffectKeys.sideEffect('financial', financial.id, 'pointsStaged');
            const legacyKey = EffectKeys.sideEffect('financial', financial.id, 'pointsAwarded');

            if (!(await hasEffect(stagingKey)) && !(await hasEffect(legacyKey))) {
              const playerId = financial.playerCharacterId || FOUNDER_CHARACTER_ID;
              const points = financial.rewards?.points;
              if (points) {
                await stagePointsForPlayer(playerId, {
                  xp: points.xp || 0,
                  rp: points.rp || 0,
                  fp: points.fp || 0,
                  hp: points.hp || 0
                }, financial.id, EntityType.FINANCIAL, getFinancialDate(financial));
                await markEffect(stagingKey);
              }
            }
          })()
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
      const referenceDate = new Date(financial.year, financial.month - 1, 1);
      if (isValid(referenceDate)) {
        snapshotMonthDate = calculateClosingDate(referenceDate);
      } else if (financial.createdAt) {
        snapshotMonthDate = calculateClosingDate(financial.createdAt);
      } else {
        const now = new Date();
        const adjustedNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        snapshotMonthDate = calculateClosingDate(adjustedNow);
      }

      const archiveIndexEffectKey = EffectKeys.sideEffect('financial', financial.id, `archiveIndex:${formatMonthKey(snapshotMonthDate)}`);

      if (!(await hasEffect(archiveIndexEffectKey))) {
        const monthKey = formatMonthKey(snapshotMonthDate);
        const { kvSAdd } = await import('@/data-store/kv');
        const archiveIndexKey = buildArchiveCollectionIndexKey('financials', monthKey);
        await kvSAdd(archiveIndexKey, financial.id);

        const { buildArchiveMonthsKey } = await import('@/data-store/keys');
        await kvSAdd(buildArchiveMonthsKey(), monthKey);
        // The financial record's existence in the index and its inherent dates are the single source of truth.

        await markEffect(archiveIndexEffectKey);
      }
    }

    // Vest points if created as COLLECTED
    if (financial.isCollected) {
      const collectedAt = financial.collectedAt ?? new Date();

      // Ensure financial record has proper collection fields
      const normalizedFinancial: FinancialRecord = {
        ...financial,
        isCollected: true,
        collectedAt
      };

      if (!financial.collectedAt) {
        await upsertFinancial(normalizedFinancial, { skipWorkflowEffects: true, skipLinkEffects: true });
      }

      const pointsRewardedEffectKey = EffectKeys.sideEffect('financial', financial.id, 'pointsRewarded');
      if (!(await hasEffect(pointsRewardedEffectKey))) {
        // Reward points if rewards exist AND they were staged (prevents double-counting legacy)
        const stagingEffectKey = EffectKeys.sideEffect('financial', financial.id, 'pointsStaged');
        const pointsRewardedEffectKey = EffectKeys.sideEffect('financial', financial.id, 'pointsRewarded');

        if (normalizedFinancial.rewards?.points && await hasEffect(stagingEffectKey)) {
          const playerId = normalizedFinancial.playerCharacterId || FOUNDER_CHARACTER_ID;
          await rewardPointsToPlayer(playerId, {
            xp: normalizedFinancial.rewards.points.xp || 0,
            rp: normalizedFinancial.rewards.points.rp || 0,
            fp: normalizedFinancial.rewards.points.fp || 0,
            hp: normalizedFinancial.rewards.points.hp || 0
          }, normalizedFinancial.id, EntityType.FINANCIAL, collectedAt);
        }

        await markEffect(pointsRewardedEffectKey); // Mark the rewarded effect, even if no points were rewarded (e.g., no rewards or not staged)
      }
    }

    return;
  }

  // Payment status changes - PENDING (not paid or not charged) vs DONE (paid and charged)
  const wasPending = previousFinancial.isNotPaid || previousFinancial.isNotCharged;
  const nowPending = financial.isNotPaid || financial.isNotCharged;

  if (wasPending && !nowPending) {
    // Transitioned from PENDING to DONE (both paid and charged)
    await appendEntityLog(EntityType.FINANCIAL, financial.id, LogEventType.DONE, {
      name: financial.name,
      type: financial.type,
      station: financial.station,
      cost: financial.cost,
      revenue: financial.revenue,
      isNotPaid: financial.isNotPaid,
      isNotCharged: financial.isNotCharged,
      pendingAt: new Date().toISOString()
    }, getFinancialDate(financial));

    // NEW: Archive Index Tracking
    let snapshotMonthDate: Date;
    const referenceDate = new Date(financial.year, financial.month - 1, 1);

    if (isValid(referenceDate)) {
      snapshotMonthDate = calculateClosingDate(referenceDate);
    } else if (financial.createdAt) {
      snapshotMonthDate = calculateClosingDate(financial.createdAt);
    } else {
      const now = new Date();
      const adjustedNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      snapshotMonthDate = calculateClosingDate(adjustedNow);
    }

    const archiveIndexEffectKey = EffectKeys.sideEffect('financial', financial.id, `archiveIndex:${formatMonthKey(snapshotMonthDate)}`);

    if (!(await hasEffect(archiveIndexEffectKey))) {
      const monthKey = formatMonthKey(snapshotMonthDate);
      const { kvSAdd } = await import('@/data-store/kv');
      const archiveIndexKey = buildArchiveCollectionIndexKey('financials', monthKey);
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
      revenue: financial.revenue,
      isNotPaid: financial.isNotPaid,
      isNotCharged: financial.isNotCharged,
      pendingAt: new Date().toISOString()
    }, getFinancialDate(financial));
  }

  // Collection detection - Dual detection: status OR flag change to COLLECTED
  const statusBecameCollected =
    financial.status === FinancialStatus.COLLECTED &&
    (!previousFinancial || previousFinancial.status !== FinancialStatus.COLLECTED);
  const flagBecameCollected =
    !!financial.isCollected && (!previousFinancial || !previousFinancial.isCollected);

  if (statusBecameCollected || flagBecameCollected) {
    // User requirement: collectedAt is when points are actually claimed (often NOW)
    let collectedAt = financial.collectedAt;
    if (!collectedAt) {
      collectedAt = new Date();
      // Ensure financial record has proper collection fields saved
      await upsertFinancial({
        ...financial,
        isCollected: true,
        collectedAt
      }, { skipWorkflowEffects: true, skipLinkEffects: true });
    }

    const pointsRewardedEffectKey = EffectKeys.sideEffect('financial', financial.id, 'pointsRewarded');

    if (!(await hasEffect(pointsRewardedEffectKey))) {
      await appendEntityLog(EntityType.FINANCIAL, financial.id, LogEventType.COLLECTED, {
        name: financial.name,
        type: financial.type,
        station: financial.station,
        cost: financial.cost,
        revenue: financial.revenue,
        collectedAt: collectedAt.toISOString()
      }, collectedAt);

      // Reward points if rewards exist AND they were staged (prevents double-counting legacy)
      const stagingEffectKey = EffectKeys.sideEffect('financial', financial.id, 'pointsStaged');
      const pointsRewardedEffectKey = EffectKeys.sideEffect('financial', financial.id, 'pointsRewarded');

      if (financial.rewards?.points && await hasEffect(stagingEffectKey)) {
        const playerId = await resolveToPlayerIdMaybeCharacter(financial.playerCharacterId);
        if (playerId) {
          await rewardPointsToPlayer(playerId, {
            xp: financial.rewards.points.xp || 0,
            rp: financial.rewards.points.rp || 0,
            fp: financial.rewards.points.fp || 0,
            hp: financial.rewards.points.hp || 0
          }, financial.id, EntityType.FINANCIAL, collectedAt);
          await appendEntityLog(EntityType.FINANCIAL, financial.id, LogEventType.UPDATED, {
            name: financial.name,
            type: financial.type,
            station: financial.station,
            cost: financial.cost,
            revenue: financial.revenue
          });
        }
      }

      await markEffect(pointsRewardedEffectKey);
    }
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

    // Propagate to Player (points delta)
    if (hasRewardsChanged(financial, previousFinancial)) {
      await updatePlayerPointsFromSource(EntityType.FINANCIAL, financial, previousFinancial);
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
    const isNowArchived = financial.status === FinancialStatus.COLLECTED || financial.isCollected || (!financial.isNotPaid && !financial.isNotCharged);
    const wasArchived = previousFinancial.status === FinancialStatus.COLLECTED || previousFinancial.isCollected || (!previousFinancial.isNotPaid && !previousFinancial.isNotCharged);

    const getArchiveMonth = (f: FinancialRecord) => {
      let snapshotDate = new Date(); // fallback
      const referenceDate = new Date(f.year, f.month - 1, 1);
      if (isValid(referenceDate)) {
        snapshotDate = calculateClosingDate(referenceDate);
      } else if (f.createdAt) {
        snapshotDate = calculateClosingDate(f.createdAt);
      }
      return formatMonthKey(snapshotDate);
    };

    const newMonth = isNowArchived ? getArchiveMonth(financial) : null;
    const oldMonth = wasArchived ? getArchiveMonth(previousFinancial) : null;

    if (newMonth !== oldMonth || (!newMonth && oldMonth)) {
      const { kvSAdd, kvSRem } = await import('@/data-store/kv');
      const { getAvailableArchiveMonths } = await import('@/data-store/datastore');
      const { buildArchiveMonthsKey } = await import('@/data-store/keys');

      // BULLETPROOF CLEANUP: Remove from ALL other months to fix legacy ghost duplicates
      const allMonths = await getAvailableArchiveMonths();
      for (const m of allMonths) {
        if (m !== newMonth) {
          await kvSRem(buildArchiveCollectionIndexKey('financials', m), financial.id);
        }
      }

      if (newMonth) {
        await kvSAdd(buildArchiveCollectionIndexKey('financials', newMonth), financial.id);
        await kvSAdd(buildArchiveMonthsKey(), newMonth);

        // ── Log Sync ──────────────────────────────────────────────────────────
        // When an archived record is re-saved for data correction (no status change),
        // no DONE/COLLECTED log events fire above. We must ensure the correct
        // entry exists in the target month's log and carries updated fields.
        const { getEntityLogs } = await import('../entities-logging');
        const monthEntries = await getEntityLogs(EntityType.FINANCIAL, { month: newMonth });
        const targetEvent = financial.isCollected ? 'collected' : 'done';
        const existingEntry = monthEntries.find(
          (e: any) => e.entityId === financial.id && String(e.event ?? '').toLowerCase() === targetEvent
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
          const logEvent = financial.isCollected ? LogEventType.COLLECTED : LogEventType.DONE;
          const logPayload = financial.isCollected ? {
            name: financial.name,
            type: financial.type,
            station: financial.station,
            cost: financial.cost,
            revenue: financial.revenue,
            collectedAt: (financial.collectedAt || new Date()).toISOString()
          } : {
            name: financial.name,
            type: financial.type,
            station: financial.station,
            cost: financial.cost,
            revenue: financial.revenue,
            isNotPaid: financial.isNotPaid,
            isNotCharged: financial.isNotCharged,
          };
          const logDate = financial.isCollected ? (financial.collectedAt || new Date()) : getFinancialDate(financial);
          await appendEntityLog(EntityType.FINANCIAL, financial.id, logEvent, logPayload, logDate);
        }
      }
    }
  }
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
        let snapshotDate = new Date(); // fallback
        const referenceDate = new Date(record.year, record.month - 1, 1);
        if (isValid(referenceDate)) {
          snapshotDate = calculateClosingDate(referenceDate);
        } else if (record.createdAt) {
          snapshotDate = calculateClosingDate(record.createdAt);
        }
        const monthKey = formatMonthKey(snapshotDate);
        const { kvSRem } = await import('@/data-store/kv');
        const archiveIndexKey = buildArchiveCollectionIndexKey('financials', monthKey);
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
