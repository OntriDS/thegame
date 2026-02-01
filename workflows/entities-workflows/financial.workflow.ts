// workflows/entities-workflows/financial.workflow.ts
// Financial-specific workflow with CHARGED, COLLECTED events

import { EntityType, LogEventType, FinancialStatus, PLAYER_ONE_ID } from '@/types/enums';
import type { FinancialRecord } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys, buildLogKey } from '@/data-store/keys';
import { kvGet, kvSet } from '@/data-store/kv';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getPlayerById, getFinancialById } from '@/data-store/datastore';
import { createItemFromRecord, removeItemsCreatedByRecord } from '../item-creation-utils';
import { awardPointsToPlayer, removePointsFromPlayer } from '../points-rewards-utils';
import {
  updateTasksFromFinancialRecord,
  updateItemsCreatedByRecord,
  updatePlayerPointsFromSource,
  hasFinancialPropsChanged,
  hasOutputPropsChanged,
  hasRewardsChanged
} from '../update-propagation-utils';
import { createCharacterFromFinancial } from '../character-creation-utils';
import { archiveFinancialRecordSnapshot, upsertFinancial } from '@/data-store/datastore';
import { formatMonthKey, calculateClosingDate } from '@/lib/utils/date-utils';
import { createFinancialSnapshot } from '../snapshot-workflows';
import { recalculateCharacterWallet } from '../financial-record-utils';

const STATE_FIELDS = ['isNotPaid', 'isNotCharged', 'isCollected'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'cost', 'revenue', 'jungleCoins', 'notes'];

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
    });
    await markEffect(effectKey);

    // Character creation from emissary fields - when newCustomerName is provided
    // This MUST run first because it updates the financial record
    if (financial.newCustomerName && !financial.customerCharacterId) {
      const characterEffectKey = EffectKeys.sideEffect('financial', financial.id, 'characterCreated');
      if (!(await hasEffect(characterEffectKey))) {
        console.log(`[onFinancialUpsert] Creating character from financial record emissary fields: ${financial.name}`);
        const createdCharacter = await createCharacterFromFinancial(financial);
        if (createdCharacter) {
          // Update financial record with the created character ID
          const updatedFinancial = { ...financial, customerCharacterId: createdCharacter.id };
          await upsertFinancial(updatedFinancial, { skipWorkflowEffects: true });
          await markEffect(characterEffectKey);
          console.log(`[onFinancialUpsert] ✅ Character created and financial record updated: ${createdCharacter.name}`);
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
            console.log(`[onFinancialUpsert] Creating item from financial record emissary fields: ${financial.name}`);
            const createdItem = await createItemFromRecord(financial);
            if (createdItem) {
              await markEffect(itemEffectKey);
              console.log(`[onFinancialUpsert] ✅ Item created and effect marked: ${createdItem.name}`);
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
          const pointsEffectKey = EffectKeys.sideEffect('financial', financial.id, 'pointsAwarded');
          if (!(await hasEffect(pointsEffectKey))) {
            console.log(`[onFinancialUpsert] Awarding points from financial record: ${financial.name}`);
            const playerId = financial.playerCharacterId || PLAYER_ONE_ID;
            const points = financial.rewards?.points;
            if (points) {
              await awardPointsToPlayer(playerId, {
                xp: points.xp || 0,
                rp: points.rp || 0,
                fp: points.fp || 0,
                hp: points.hp || 0
              }, financial.id, EntityType.FINANCIAL);
              await markEffect(pointsEffectKey);
              console.log(`[onFinancialUpsert] ✅ Points awarded to player ${playerId} for record: ${financial.name}`);
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

    if (financial.isCollected) {
      const collectedAt = financial.collectedAt ?? new Date();
      const snapshotEffectKey = EffectKeys.sideEffect('financial', financial.id, `financialSnapshot:${formatMonthKey(collectedAt)}`);

      if (!(await hasEffect(snapshotEffectKey))) {
        // Ensure financial record has proper collection fields
        const normalizedFinancial: FinancialRecord = {
          ...financial,
          isCollected: true,
          collectedAt
        };

        if (!financial.collectedAt) {
          await upsertFinancial(normalizedFinancial, { skipWorkflowEffects: true, skipLinkEffects: true });
        }

        // Create FinancialSnapshot using the new Archive-First approach
        await createFinancialSnapshot(normalizedFinancial, collectedAt, financial.playerCharacterId || undefined);

        // Add to month-based collection index for efficient History Tab queries
        const monthKey = formatMonthKey(collectedAt);
        const { kvSAdd } = await import('@/data-store/kv');
        const collectedIndexKey = `index:financials:collected:${monthKey}`;
        await kvSAdd(collectedIndexKey, financial.id);

        await markEffect(snapshotEffectKey);
        console.log(`[onFinancialUpsert] ✅ Created snapshot for collected financial ${financial.name}, added to index ${monthKey}`);
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
      completedAt: new Date().toISOString()
    });
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
    });
  }

  // Collection detection - Dual detection: status OR flag change to COLLECTED
  const statusBecameCollected =
    financial.status === FinancialStatus.COLLECTED &&
    (!previousFinancial || previousFinancial.status !== FinancialStatus.COLLECTED);
  const flagBecameCollected =
    !!financial.isCollected && (!previousFinancial || !previousFinancial.isCollected);

  if (statusBecameCollected || flagBecameCollected) {
    await appendEntityLog(EntityType.FINANCIAL, financial.id, LogEventType.COLLECTED, {
      name: financial.name,
      type: financial.type,
      station: financial.station,
      collectedAt: new Date().toISOString()
    });

    // User requirement: collectedAt should be the last day of the record's month
    // Snap-to-Month Logic
    // month is 1-based index (1=Jan, 11=Nov). 
    // Construct a reference date for the helper (using the 1st of the month is fine, helper finds the end)
    const referenceDate = new Date(financial.year, financial.month - 1, 1);
    const collectedAt = financial.collectedAt ?? calculateClosingDate(referenceDate);

    const snapshotEffectKey = EffectKeys.sideEffect('financial', financial.id, `financialSnapshot:${formatMonthKey(collectedAt)}`);

    if (!(await hasEffect(snapshotEffectKey))) {
      // Ensure financial record has proper collection fields
      const normalizedFinancial: FinancialRecord = {
        ...financial,
        isCollected: true,
        collectedAt
      };

      if (!financial.collectedAt) {
        await upsertFinancial(normalizedFinancial, { skipWorkflowEffects: true, skipLinkEffects: true });
      }

      // Create FinancialSnapshot using the new Archive-First approach
      await createFinancialSnapshot(normalizedFinancial, collectedAt, financial.playerCharacterId || undefined);

      // Add to month-based collection index for efficient History Tab queries
      const monthKey = formatMonthKey(collectedAt);
      const { kvSAdd } = await import('@/data-store/kv');
      const collectedIndexKey = `index:financials:collected:${monthKey}`;
      await kvSAdd(collectedIndexKey, financial.id);

      await markEffect(snapshotEffectKey);
      console.log(`[onFinancialUpsert] ✅ Created snapshot for collected financial ${financial.name}, added to index ${monthKey}`);
    }
  }

  // COMPREHENSIVE UPDATE PROPAGATION - when financial record properties change
  if (previousFinancial) {
    // Propagate to Tasks
    if (hasFinancialPropsChanged(financial, previousFinancial)) {
      console.log(`[onFinancialUpsert] Propagating financial changes to tasks: ${financial.name}`);
      await updateTasksFromFinancialRecord(financial, previousFinancial);
    }

    // Propagate to Items
    if (hasOutputPropsChanged(financial, previousFinancial)) {
      console.log(`[onFinancialUpsert] Propagating output changes to items: ${financial.name}`);
      await updateItemsCreatedByRecord(financial, previousFinancial);
    }

    // Propagate to Player (points delta)
    if (hasRewardsChanged(financial, previousFinancial)) {
      console.log(`[onFinancialUpsert] Propagating points changes to player: ${financial.name}`);
      await updatePlayerPointsFromSource(EntityType.FINANCIAL, financial, previousFinancial);
    }


    // Propagate J$ changes to Character Wallet Cache
    if (financial.jungleCoins !== previousFinancial.jungleCoins) {
      console.log(`[onFinancialUpsert] Propagating J$ changes to wallet cache: ${financial.name}`);
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

  // Descriptive changes - update in-place
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousFinancial as any)[field] !== (financial as any)[field]) {
      await updateEntityLogField(EntityType.FINANCIAL, financial.id, field, (previousFinancial as any)[field], (financial as any)[field]);
    }
  }
}

/**
 * Remove financial record effects when record is deleted
 * Financial records can have entries in multiple logs: financials, character, player, items
 */
export async function removeRecordEffectsOnDelete(recordId: string): Promise<void> {
  try {
    console.log(`[removeRecordEffectsOnDelete] Starting cleanup for record: ${recordId}`);

    // 1. Remove items created by this record
    await removeItemsCreatedByRecord(recordId);

    // 2. Remove player points that were awarded by this record (if points were badly given)
    await removePlayerPointsFromRecord(recordId);
    // 3. Remove all Links related to this record
    const recordLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: recordId });
    console.log(`[removeRecordEffectsOnDelete] Found ${recordLinks.length} links to remove`);

    // Extract character IDs from links before deleting them
    const affectedCharacterIds = new Set<string>();
    for (const link of recordLinks) {
      if (link.source.type === EntityType.CHARACTER) affectedCharacterIds.add(link.source.id);
      if (link.target.type === EntityType.CHARACTER) affectedCharacterIds.add(link.target.id);
    }

    for (const link of recordLinks) {
      try {
        await removeLink(link.id);
        console.log(`[removeRecordEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeRecordEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }

    // Recalculate for all affected characters found via links
    for (const charId of affectedCharacterIds) {
      await recalculateCharacterWallet(charId);
      console.log(`[removeRecordEffectsOnDelete] ✅ Recalculated wallet for character: ${charId}`);
    }

    // 4. Clear effects registry
    await clearEffect(EffectKeys.created('financial', recordId));
    await clearEffect(EffectKeys.sideEffect('financial', recordId, 'characterCreated'));
    await clearEffect(EffectKeys.sideEffect('financial', recordId, 'itemCreated'));
    await clearEffect(EffectKeys.sideEffect('financial', recordId, 'pointsAwarded'));
    await clearEffectsByPrefix(EntityType.FINANCIAL, recordId, 'pointsLogged:');
    await clearEffectsByPrefix(EntityType.FINANCIAL, recordId, 'financialLogged:');

    // 5. Remove log entries from financials log
    console.log(`[removeRecordEffectsOnDelete] Removing log entries for record: ${recordId}`);
    const financialsLogKey = buildLogKey(EntityType.FINANCIAL);
    const financialsLog = (await kvGet<any[]>(financialsLogKey)) || [];
    const filteredFinancialsLog = financialsLog.filter(entry => entry.entityId !== recordId);
    if (filteredFinancialsLog.length !== financialsLog.length) {
      await kvSet(financialsLogKey, filteredFinancialsLog);
      console.log(`[removeRecordEffectsOnDelete] ✅ Removed ${financialsLog.length - filteredFinancialsLog.length} entries from financials log`);
    }

    // Check and remove from character log if this record was linked to a character
    const characterLogKey = buildLogKey(EntityType.CHARACTER);
    const characterLog = (await kvGet<any[]>(characterLogKey)) || [];
    const filteredCharacterLog = characterLog.filter(entry => entry.financialId !== recordId && entry.sourceFinancialId !== recordId);
    if (filteredCharacterLog.length !== characterLog.length) {
      await kvSet(characterLogKey, filteredCharacterLog);
      console.log(`[removeRecordEffectsOnDelete] ✅ Removed ${characterLog.length - filteredCharacterLog.length} entries from character log`);
    }

    console.log(`[removeRecordEffectsOnDelete] ✅ Cleared effects, removed links, deleted created items, and removed log entries for record ${recordId}`);
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
    console.log(`[removePlayerPointsFromRecord] Removing points for record: ${recordId}`);

    // Get the record to find what points were awarded
    const record = await getFinancialById(recordId);

    if (!record || !record.rewards?.points) {
      console.log(`[removePlayerPointsFromRecord] Record ${recordId} has no points to remove`);
      return;
    }

    // Get the player from the record (same logic as creation)
    const playerId = record.playerCharacterId || PLAYER_ONE_ID;
    const player = await getPlayerById(playerId);

    if (!player) {
      console.log(`[removePlayerPointsFromRecord] Player ${playerId} not found, skipping points removal`);
      return;
    }

    // Check if any points were actually awarded
    const pointsToRemove = record.rewards.points;
    const hasPoints = (pointsToRemove.xp || 0) > 0 || (pointsToRemove.rp || 0) > 0 ||
      (pointsToRemove.fp || 0) > 0 || (pointsToRemove.hp || 0) > 0;

    if (!hasPoints) {
      console.log(`[removePlayerPointsFromRecord] No points to remove from record ${recordId}`);
      return;
    }

    // Remove the points from the player
    await removePointsFromPlayer(playerId, {
      xp: pointsToRemove.xp || 0,
      rp: pointsToRemove.rp || 0,
      fp: pointsToRemove.fp || 0,
      hp: pointsToRemove.hp || 0
    });
    console.log(`[removePlayerPointsFromRecord] ✅ Removed points from player: ${JSON.stringify(pointsToRemove)}`);

  } catch (error) {
    console.error(`[removePlayerPointsFromRecord] ❌ Failed to remove player points for record ${recordId}:`, error);
  }
}
