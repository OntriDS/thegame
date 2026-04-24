// workflows/entities-workflows/sale.workflow.ts
// Sale-specific workflow with CHARGED, CANCELLED, COLLECTED events

import { EntityType, LogEventType, FOUNDER_CHARACTER_ID, SaleStatus, SaleType } from '@/types/enums';
import type { ItemSaleLine, Sale } from '@/types/entities';
import {
  appendEntityLog,
  ensureItemSoldLogsFromSale,
  updateEntityLeanFields,
  removeLogEntriesAcrossMonths
} from '../entities-logging';
import { ensureFinancialDoneLog } from './financial.workflow';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
import {
  getPlayerById,
  getSaleById,
  getItemById,
  getItemsBySourceRecordId,
  getFinancialsBySourceSaleId,
  removeFinancial,
  removeItem,
  upsertSale,
} from '@/data-store/datastore';
import { stagePointsForPlayer, removePointsFromPlayer, rewardPointsToPlayer } from '../points-rewards-utils';
import { processSaleLines, ensureSoldItemEntities } from '../sale-line-utils';
import { resyncFinrecItemLinksAfterSoldItemClones } from '../financial-record-utils';
import { updateFinancialRecordsFromSale, updateItemsFromSale, hasRevenueChanged, hasCostChanged, hasLinesChanged } from '../update-propagation-utils';
import { createCharacterFromSale } from '../character-creation-utils';
// UTC STANDARDIZATION: Using new UTC utilities
import { getUTCNow, endOfMonthUTC, toUTCISOString, formatArchiveMonthKeyUTC } from '@/lib/utils/utc-utils';
import { buildMonthIndexKey, buildArchiveMonthsKey } from '@/data-store/keys';
import { getSaleLogDetails } from '@/lib/utils/sale-log-details';
import { entityHasLogEvent } from '@/lib/utils/entity-log-scan';
import { getSaleCharacterId } from '@/lib/sale-character-id';

const STATE_FIELDS = ['status', 'isNotPaid', 'isNotCharged', 'isCollected', 'postedAt', 'doneAt', 'cancelledAt'];

function saleHasRewardPoints(sale: Sale): boolean {
  const p = sale.rewards?.points;
  if (!p) return false;
  return (p.xp || 0) > 0 || (p.rp || 0) > 0 || (p.fp || 0) > 0 || (p.hp || 0) > 0;
}

function saleHasChargedLog(saleId: string): Promise<boolean> {
  return entityHasLogEvent(EntityType.SALE, saleId, 'charged');
}

/**
 * Backfill missing CHARGED/COLLECTED rows from current sale state (idempotent).
 */
export async function ensureSaleLifecycleLogsForState(sale: Sale): Promise<void> {
  if (sale.status === SaleStatus.CANCELLED) return;

  const chargedOk =
    sale.status === SaleStatus.CHARGED && !sale.isNotPaid && !sale.isNotCharged;
  const isCollectedState = sale.status === SaleStatus.COLLECTED || sale.isCollected;
  const needsCharged = chargedOk || isCollectedState;

  if (needsCharged && !(await saleHasChargedLog(sale.id))) {
    const chargedAt = sale.chargedAt ? new Date(sale.chargedAt as Date) : undefined;
    const ts = sale.doneAt || chargedAt || sale.saleDate || sale.updatedAt || getUTCNow();
    await appendEntityLog(EntityType.SALE, sale.id, LogEventType.CHARGED, getSaleLogDetails(sale), ts);
  }

  if (isCollectedState && !(await entityHasLogEvent(EntityType.SALE, sale.id, 'collected'))) {
    let defaultCollectedAt: Date;
    if (sale.saleDate) {
      defaultCollectedAt = endOfMonthUTC(sale.saleDate);
    } else if (sale.createdAt) {
      defaultCollectedAt = endOfMonthUTC(sale.createdAt);
    } else {
      defaultCollectedAt = endOfMonthUTC(getUTCNow());
    }
    const collectedAt = sale.collectedAt ? new Date(sale.collectedAt) : defaultCollectedAt;
    await appendEntityLog(
      EntityType.SALE,
      sale.id,
      LogEventType.COLLECTED,
      {
        ...getSaleLogDetails(sale),
        collectedAt: toUTCISOString(collectedAt),
      },
      collectedAt
    );
  }
}

/** Precision repair: append CHARGED log when sale is charged/collected but row is missing. */
export async function ensureSaleChargedLog(saleId: string): Promise<{
  success: boolean;
  noop?: boolean;
  error?: string;
}> {
  const sale = await getSaleById(saleId);
  if (!sale) return { success: false, error: `Sale not found: ${saleId}` };
  if (sale.status === SaleStatus.CANCELLED) {
    return { success: false, error: 'Sale is cancelled.' };
  }
  const chargedOk =
    sale.status === SaleStatus.CHARGED && !sale.isNotPaid && !sale.isNotCharged;
  const isCollectedState = sale.status === SaleStatus.COLLECTED || sale.isCollected;
  const needsCharged = chargedOk || isCollectedState;
  if (!needsCharged) {
    return {
      success: false,
      error: 'Sale is not charged (paid) or collected; CHARGED log not implied.',
    };
  }
  if (await saleHasChargedLog(saleId)) {
    return { success: true, noop: true };
  }
  const chargedAt = sale.chargedAt ? new Date(sale.chargedAt as Date) : undefined;
  const ts = sale.doneAt || chargedAt || sale.saleDate || sale.updatedAt || getUTCNow();
  await appendEntityLog(EntityType.SALE, sale.id, LogEventType.CHARGED, getSaleLogDetails(sale), ts);
  return { success: true };
}

/** Precision repair: append COLLECTED log if sale is collected and row is missing. */
export async function ensureSaleCollectedLog(saleId: string): Promise<{
  success: boolean;
  noop?: boolean;
  error?: string;
}> {
  const sale = await getSaleById(saleId);
  if (!sale) return { success: false, error: `Sale not found: ${saleId}` };
  const isCollectedState = sale.status === SaleStatus.COLLECTED || sale.isCollected;
  if (!isCollectedState) {
    return { success: false, error: 'Sale is not in collected state (status/isCollected).' };
  }
  if (await entityHasLogEvent(EntityType.SALE, saleId, 'collected')) {
    return { success: true, noop: true };
  }
  let defaultCollectedAt: Date;
  if (sale.saleDate) {
    defaultCollectedAt = endOfMonthUTC(sale.saleDate);
  } else if (sale.createdAt) {
    defaultCollectedAt = endOfMonthUTC(sale.createdAt);
  } else {
    defaultCollectedAt = endOfMonthUTC(getUTCNow());
  }
  const collectedAt = sale.collectedAt ? new Date(sale.collectedAt) : defaultCollectedAt;
  await appendEntityLog(
    EntityType.SALE,
    sale.id,
    LogEventType.COLLECTED,
    {
      ...getSaleLogDetails(sale),
      collectedAt: toUTCISOString(collectedAt),
    },
    collectedAt
  );
  return { success: true };
}

/** @deprecated Use ensureSaleCollectedLog */
export const ensureSaleCollectedLifecycleLog = ensureSaleCollectedLog;

export async function onSaleUpsert(sale: Sale, previousSale?: Sale): Promise<void> {
  let effectiveSale = sale;
  const isNewSale = !previousSale;

  // New sale creation
  if (isNewSale) {
    const effectKey = EffectKeys.created('sale', sale.id);
    if (await hasEffect(effectKey)) return;

    await markEffect(effectKey);
  }

  // Character creation from emissary fields - when newCustomerName is provided
  if (effectiveSale.newCustomerName && !getSaleCharacterId(effectiveSale)) {
    const characterEffectKey = EffectKeys.sideEffect('sale', effectiveSale.id, 'characterCreated');
    if (!(await hasEffect(characterEffectKey))) {
      const createdCharacter = await createCharacterFromSale(effectiveSale);
      if (createdCharacter) {
        // Update sale with the created character ID
        effectiveSale = { ...effectiveSale, characterId: createdCharacter.id };
        await upsertSale(effectiveSale, { skipWorkflowEffects: true, skipLinkEffects: true });
        await markEffect(characterEffectKey);
        sale = effectiveSale;
      }
    }
  }

  // =========================================================================
  // HEALING & SYNC LOGIC (Runs for BOTH new and existing sales)
  // This ensures that resaving a sale (e.g. from UI) fills in any gaps.
  // =========================================================================

  // 1. FINANCIAL RECORD SYNC
  // Logic is centralized in updateFinancialRecordsFromSale (handles discovery/re-creation)
  await updateFinancialRecordsFromSale(sale, previousSale);

  // 1.1 ENSURE FINANCIAL LOGS FOR DONE RECORDS (Gated by payment status)
  const nowPending = sale.isNotPaid || sale.isNotCharged;
  const isCharged = sale.status !== SaleStatus.CANCELLED && (sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.COLLECTED) && !nowPending;
  const wasCharged =
    !!previousSale &&
    previousSale.status !== SaleStatus.CANCELLED &&
    (previousSale.status === SaleStatus.CHARGED ||
      previousSale.status === SaleStatus.COLLECTED ||
      !!previousSale.isCollected) &&
    !previousSale.isNotPaid &&
    !previousSale.isNotCharged;
  const isNowPending = sale.status === SaleStatus.PENDING || nowPending;
  const chargeStateWasRolledBack = !!previousSale && wasCharged && isNowPending && previousSale.status !== sale.status;

  if (isCharged) {
    const relatedFinancials = await getFinancialsBySourceSaleId(sale.id);
    for (const financial of relatedFinancials) {
      const isDone = !financial.isNotPaid && !financial.isNotCharged;
      if (isDone) {
        await ensureFinancialDoneLog(financial.id);
      }
    }
  }

  // 1.5 BOOTH COST CALCULATION (Must happen BEFORE log creation)
  // For booth sales, calculate cost before creating logs to ensure logs include correct profit
  if (sale.type === SaleType.BOOTH) {
    const { calculateBoothFinancials, calculatePartnerPayout } = await import('@/workflows/financial-record-utils');
    const split = await calculateBoothFinancials(sale);
    const payout = await calculatePartnerPayout(sale);
    const totalCalculatedCost = split.myBoothCost + payout;

    // If calculated cost differs from current cost, update it before log creation
    if (totalCalculatedCost >= 0 && Math.abs((sale.totals.totalCost || 0) - totalCalculatedCost) > 0.01) {
      sale = {
        ...sale,
        totals: {
          ...sale.totals,
          totalCost: totalCalculatedCost
        }
      };
      // Skip workflow interactions to prevent infinite loops, but allow simple persistence
      const { upsertSale } = await import('@/data-store/datastore');
      await upsertSale(sale, { skipWorkflowEffects: true, skipLinkEffects: true });
    }
  }

  // 2. MILESTONE LOGGING (CHARGED & COLLECTED)
  const isCollected = sale.status === SaleStatus.COLLECTED || !!sale.isCollected;

  // Log CHARGED milestone (if applicable and not already logged)
  if (isCharged) {
    const defaultChargedAt = sale.chargedAt ? new Date(sale.chargedAt) : getUTCNow();
    // Use doneAt as the primary timestamp for the "Done" milestone in the log
    const logTimestamp = sale.doneAt || defaultChargedAt;

    const chargedLoggedKey = EffectKeys.sideEffect('sale', sale.id, 'saleDoneLogged');
    if (!(await hasEffect(chargedLoggedKey))) {
      await appendEntityLog(
        EntityType.SALE,
        sale.id,
        LogEventType.CHARGED,
        getSaleLogDetails(sale),
        logTimestamp
      );
      await markEffect(chargedLoggedKey);
    }

    // Process charged state impacts (stock, optional emissary points — helpers no-op if no rewards)
    await processChargedSaleLines(sale);

    const chargedStagingKey = EffectKeys.sideEffect('sale', sale.id, 'pointsStaged');
    if (!(await hasEffect(chargedStagingKey))) {
      const playerId = sale.playerCharacterId || FOUNDER_CHARACTER_ID;
      const staged = await stagePointsForPlayer(
        playerId,
        sale.rewards?.points,
        sale.id,
        EntityType.SALE,
        sale.saleDate || logTimestamp
      );
      if (staged) await markEffect(chargedStagingKey);
    }
  }

  // Log COLLECTED milestone (if applicable and not already logged)
  if (isCollected) {
    let defaultCollectedAt: Date;
    if (sale.saleDate) {
      defaultCollectedAt = endOfMonthUTC(sale.saleDate);
    } else if (sale.createdAt) {
      defaultCollectedAt = endOfMonthUTC(sale.createdAt);
    } else {
      defaultCollectedAt = endOfMonthUTC(getUTCNow());
    }

    const collectedAtRaw = sale.collectedAt ?? defaultCollectedAt;
    const collectedAtCandidate = collectedAtRaw instanceof Date ? collectedAtRaw : new Date(collectedAtRaw);
    const collectedAt = Number.isFinite(collectedAtCandidate.getTime()) ? collectedAtCandidate : defaultCollectedAt;

    const saleCollectedLoggedKey = EffectKeys.sideEffect('sale', sale.id, 'saleCollectedLogged');
    if (!(await hasEffect(saleCollectedLoggedKey))) {
      await appendEntityLog(
        EntityType.SALE,
        sale.id,
        LogEventType.COLLECTED,
        {
          ...getSaleLogDetails(sale),
          collectedAt: toUTCISOString(collectedAt)
        },
        collectedAt
      );
      await markEffect(saleCollectedLoggedKey);
    }

    // Optional emissary points on collect (COLLECTED log/effects above always run; points helpers no-op if none)
    const pointsRewardedEffectKey = EffectKeys.sideEffect('sale', sale.id, 'pointsRewarded');
    if (!(await hasEffect(pointsRewardedEffectKey))) {
      const playerId = sale.playerCharacterId || FOUNDER_CHARACTER_ID;
      const collectedStagingKey = EffectKeys.sideEffect('sale', sale.id, 'pointsStaged');
      if (!(await hasEffect(collectedStagingKey))) {
        const staged = await stagePointsForPlayer(
          playerId,
          sale.rewards?.points,
          sale.id,
          EntityType.SALE,
          sale.saleDate || collectedAt
        );
        if (staged) await markEffect(collectedStagingKey);
      }
      await rewardPointsToPlayer(
        playerId,
        sale.rewards?.points,
        sale.id,
        EntityType.SALE,
        collectedAt
      );
      await markEffect(pointsRewardedEffectKey);
    }
  }

  // CANCELLED status change (only for existing sales)
  if (previousSale) {
    if (chargeStateWasRolledBack) {
      await rollbackChargedSaleToPending(sale, previousSale);
      if (!(await entityHasLogEvent(EntityType.SALE, sale.id, 'pending'))) {
        await appendEntityLog(EntityType.SALE, sale.id, LogEventType.PENDING, getSaleLogDetails(sale), sale.saleDate || getUTCNow());
      }
    } else if (previousSale.status !== sale.status && sale.status === SaleStatus.CANCELLED) {
      await appendEntityLog(
        EntityType.SALE,
        sale.id,
        LogEventType.CANCELLED,
        getSaleLogDetails(sale),
        sale.cancelledAt || sale.saleDate || getUTCNow()
      );
    } else if (!previousSale.isNotPaid && !previousSale.isNotCharged && (sale.isNotPaid || sale.isNotCharged)) {
      // Reverted to Pending
      await appendEntityLog(EntityType.SALE, sale.id, LogEventType.PENDING, getSaleLogDetails(sale), sale.saleDate || getUTCNow());
    }
  }

  // COMPREHENSIVE UPDATE PROPAGATION - when sale properties change
  if (previousSale) {
    const saleFinrecTimeKey = (v: unknown): string => {
      if (v == null || v === '') return '';
      const t = v instanceof Date ? v.getTime() : new Date(v as string).getTime();
      return Number.isFinite(t) ? String(t) : '';
    };

    const linesChanged = hasLinesChanged(sale, previousSale);
    // Check if relevant financial drivers changed (Revenue, Fee, Counterparty, identity, period, etc)
    const hasFinancialDriversChanged =
      linesChanged ||
      hasRevenueChanged(sale, previousSale) ||
      hasCostChanged(sale, previousSale) ||
      sale.boothFee !== previousSale.boothFee ||
      sale.partnerId !== previousSale.partnerId ||
      getSaleCharacterId(sale) !== getSaleCharacterId(previousSale) ||
      sale.name !== previousSale.name ||
      sale.siteId !== previousSale.siteId ||
      sale.salesChannel !== previousSale.salesChannel ||
      saleFinrecTimeKey(sale.doneAt) !== saleFinrecTimeKey(previousSale.doneAt) ||
      saleFinrecTimeKey(sale.saleDate) !== saleFinrecTimeKey(previousSale.saleDate) ||
      saleFinrecTimeKey(sale.collectedAt) !== saleFinrecTimeKey(previousSale.collectedAt) ||
      !!sale.isCollected !== !!previousSale.isCollected ||
      !!sale.isNotPaid !== !!previousSale.isNotPaid ||
      !!sale.isNotCharged !== !!previousSale.isNotCharged;

    // Propagate to Financial Records
    if (hasFinancialDriversChanged) {
      await updateFinancialRecordsFromSale(sale, previousSale);

      // [FIX] Update Sale Cost with Payout Amount (for Booth-Sales)
      // This ensures "Sale Log" shows correct Profit (Revenue - Cost)
      if (sale.type === SaleType.BOOTH) {
        const { calculateBoothFinancials, calculatePartnerPayout } = await import('@/workflows/financial-record-utils');
        const split = await calculateBoothFinancials(sale);
        const payout = await calculatePartnerPayout(sale);
        const totalCalculatedCost = split.myBoothCost + payout;

        // If calculated cost differs from current cost, update it
        if (totalCalculatedCost >= 0 && Math.abs((sale.totals.totalCost || 0) - totalCalculatedCost) > 0.01) {
          const updatedSaleWithCost = {
            ...sale,
            totals: {
              ...sale.totals,
              totalCost: totalCalculatedCost
            }
          };
          // Update sale with cost - allow workflow to run normally
          const { upsertSale } = await import('@/data-store/datastore');
          await upsertSale(updatedSaleWithCost);
        }
      }
    }

    // Propagate to Items (stock updates)
    if (linesChanged) {
      await updateItemsFromSale(sale, previousSale);
    }

    // Sale player points: staged/rewarded only via explicit sale.rewards + effects (task parity). No revenue deltas.
  }

  // Lean identity fields changed — cascade patch ALL log entries across ALL months and events
  if (previousSale) {
    const oldDetails = getSaleLogDetails(previousSale);
    const newDetails = getSaleLogDetails(sale);

    const leanFieldsChanged =
      oldDetails.name !== newDetails.name ||
      oldDetails.type !== newDetails.type ||
      oldDetails.station !== newDetails.station ||
      oldDetails.cost !== newDetails.cost ||
      oldDetails.revenue !== newDetails.revenue ||
      oldDetails.siteId !== newDetails.siteId;

    if (leanFieldsChanged) {
      await updateEntityLeanFields(EntityType.SALE, sale.id, newDetails);
    }
  }

  // ---------------------------------------------------------------------------
  // Reactive Archive Indexing & Ghost Cleanup
  // Ensure the entity is correctly placed in the right month's sorted set.
  // We sweep all available months to completely eradicate Snapshot-era ghost duplicates.
  // ---------------------------------------------------------------------------
  const isNowArchived = sale.status === SaleStatus.COLLECTED || sale.isCollected;
  const wasArchived = previousSale && (previousSale.status === SaleStatus.COLLECTED || previousSale.isCollected);

  const getArchiveMonth = (s: Sale) => {
    if (s.collectedAt) {
      const c = s.collectedAt instanceof Date ? s.collectedAt : new Date(s.collectedAt as string);
      if (Number.isFinite(c.getTime())) {
        const k = formatArchiveMonthKeyUTC(c);
        return k || null;
      }
    }
    const sDate = s.saleDate ? new Date(s.saleDate) : (s.createdAt ? new Date(s.createdAt) : getUTCNow());
    if (!Number.isFinite(sDate.getTime())) return null;
    const k = formatArchiveMonthKeyUTC(endOfMonthUTC(sDate));
    return k || null;
  };

  const newMonth = isNowArchived ? getArchiveMonth(sale) : null;
  const oldMonth = wasArchived ? getArchiveMonth(previousSale!) : null;

  if (newMonth !== oldMonth || (!newMonth && oldMonth)) {
    const { kvSAdd, kvSRem } = await import('@/lib/utils/kv');
    const { getAvailableArchiveMonths } = await import('@/data-store/datastore');
    const { buildArchiveMonthsKey, buildMonthIndexKey } = await import('@/data-store/keys');

    // Remove this sale from every archive month except the computed target month
    const allMonths = await getAvailableArchiveMonths();
    for (const m of allMonths) {
        if (m !== newMonth) {
        await kvSRem(buildMonthIndexKey(EntityType.SALE, m), sale.id);
      }
    }

    if (newMonth) {
      await kvSAdd(buildMonthIndexKey(EntityType.SALE, newMonth), sale.id);
      await kvSAdd(buildArchiveMonthsKey(), newMonth);

      // ── Log Sync ──────────────────────────────────────────────────────────
      // When an archived sale is re-saved for data correction (no status change),
      // no COLLECTED log event fires above. We must ensure the correct
      // entry exists in the target month's log and carries updated fields.
      const { getEntityLogs, removeLogEntriesAcrossMonths } = await import('../entities-logging');
      await removeLogEntriesAcrossMonths(EntityType.SALE, (entry: any) => {
        if (entry.entityId !== sale.id) return false;
        const ev = String(entry.event ?? entry.status ?? '').toLowerCase();
        return ev === 'collected' || ev === 'charged';
      });

      const collectedAt = sale.collectedAt || endOfMonthUTC(sale.saleDate || getUTCNow());

      const chargedOk =
        sale.status !== SaleStatus.CANCELLED && !sale.isNotPaid && !sale.isNotCharged;
      if (chargedOk) {
        const ts = sale.doneAt || (sale as { chargedAt?: Date }).chargedAt || sale.saleDate || getUTCNow();
        const chargedLoggedKey = EffectKeys.sideEffect('sale', sale.id, 'saleDoneLogged');
        if (!(await hasEffect(chargedLoggedKey))) {
          await appendEntityLog(
            EntityType.SALE,
            sale.id,
            LogEventType.CHARGED,
            getSaleLogDetails(sale),
            ts
          );
          await markEffect(chargedLoggedKey);
        }
      }

      const saleCollectedLoggedKey = EffectKeys.sideEffect('sale', sale.id, 'saleCollectedLogged');
      if (!(await hasEffect(saleCollectedLoggedKey))) {
        await appendEntityLog(EntityType.SALE, sale.id, LogEventType.COLLECTED, getSaleLogDetails(sale), collectedAt);
        await markEffect(saleCollectedLoggedKey);
      }
    }
  }

  // =========================================================================
  // ENSURE SOLD ITEM ENTITIES (same bar as "charged" pipeline above)
  // Runs when sale is CHARGED or COLLECTED, not CANCELLED, and flags are not pending
  // (!isNotPaid && !isNotCharged). Reuses `isCharged` so this never drifts from
  // processChargedSaleLines / milestone logging.
  // =========================================================================
  const hasItemLines = sale.lines?.some(l => l.kind === 'item');
  if (isCharged && hasItemLines) {
    await ensureSoldItemEntities(sale, previousSale);
    // Lines may now point at sold-item rows in KV; use reloaded sale so SOLD logs attach to those ids, not the first-persist snapshot.
    const saleForItemLogs = await getSaleById(sale.id);
    const saleAfterClones = saleForItemLogs ?? sale;
    // FINREC_ITEM was synced earlier in this same upsert from inventory line ids; align to sold clones.
    await resyncFinrecItemLinksAfterSoldItemClones(saleAfterClones);
    await ensureItemSoldLogsFromSale(saleAfterClones);
  }

  if (previousSale) {
    await ensureSaleLifecycleLogsForState(sale);
  }
}

async function processChargedSaleLines(sale: Sale): Promise<void> {
  const linesProcessedKey = EffectKeys.sideEffect('sale', sale.id, 'linesProcessed');
  if (await hasEffect(linesProcessedKey)) {
    return;
  }

  await processSaleLines(sale);
  await markEffect(linesProcessedKey);
}

/**
 * Remove sale effects when sale is deleted
 * Sales can have entries in multiple logs: sales, financials, character, items
 *
 * @param saleSnapshot — When the sale row is already gone from KV, pass the last loaded snapshot so sold-item rows and line ids can still be resolved.
 */
export async function removeSaleEffectsOnDelete(saleId: string, saleSnapshot?: Sale | null): Promise<void> {
  try {
    const sale = saleSnapshot ?? (await getSaleById(saleId));

    // 0. Remove sold-item entity rows for this sale (do not touch live inventory SKUs)
    await removeSoldItemRowsForDeletedSale(saleId, sale ?? null);

    // 1. Remove player points that were awarded by this sale (if points were badly given)
    await removePlayerPointsFromSale(saleId, sale ?? undefined);

    // 2. Remove all Links related to this sale
    const saleLinks = await getLinksFor({ type: EntityType.SALE, id: saleId });

    for (const link of saleLinks) {
      try {
        await removeLink(link.id);
      } catch (error) {
        console.error(`[removeSaleEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }

    // 2.5 Remove counterparty Financial Records
    const financialRecords = await getFinancialsBySourceSaleId(saleId);

    for (const record of financialRecords) {
      try {
        await removeFinancial(record.id);
      } catch (error) {
        console.error(`[removeSaleEffectsOnDelete] ❌ Failed to remove financial record ${record.id}:`, error);
      }
    }

    // 3. Clear effects registry
    await clearEffectsByPrefix(EntityType.SALE, saleId, 'sale:');
    await clearEffectsByPrefix(EntityType.SALE, saleId, 'pointsAwarded:');

    // Clear specific effects
    const { clearEffect } = await import('@/data-store/effects-registry');
    await clearEffect(EffectKeys.created('sale', saleId));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'characterCreated'));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'pointsAwarded'));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'saleCollectedLogged'));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'saleDoneLogged'));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'pointsRewarded'));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'pointsStaged'));

    // 4. Remove log entries from all relevant monthly lists

    // Remove from sales log
    await removeLogEntriesAcrossMonths(EntityType.SALE, entry => entry.entityId === saleId);

    // Also check and remove from player log if this sale awarded points
    if (sale && saleHasRewardPoints(sale)) {
      await removeLogEntriesAcrossMonths(EntityType.PLAYER, entry => entry.sourceId === saleId || entry.sourceSaleId === saleId);
    }

    // Check and remove from character log if this sale was purchased by a character
    await removeLogEntriesAcrossMonths(EntityType.CHARACTER, entry => entry.saleId === saleId || entry.sourceSaleId === saleId);

    // Remove from ITEM Logs (Lifecycle events)
    await removeLogEntriesAcrossMonths(EntityType.ITEM, entry => entry.sourceSaleId === saleId || entry.saleId === saleId);

  } catch (error) {
    console.error('Error removing sale effects:', error);
  }
}

/**
 * Remove player points that were awarded by a specific sale
 * This is used when rolling back a sale that incorrectly awarded points
 */
async function removePlayerPointsFromSale(saleId: string, sale?: Sale | null): Promise<void> {
  try {
    const resolved = sale ?? (await getSaleById(saleId));

    if (!resolved || !saleHasRewardPoints(resolved)) {
      return;
    }

    const playerId = resolved.playerCharacterId || FOUNDER_CHARACTER_ID;
    const player = await getPlayerById(playerId);

    if (!player) {
      return;
    }

    const pointsToRemove = resolved.rewards!.points;

    const hasPoints =
      (pointsToRemove.xp || 0) > 0 ||
      (pointsToRemove.rp || 0) > 0 ||
      (pointsToRemove.fp || 0) > 0 ||
      (pointsToRemove.hp || 0) > 0;

    if (!hasPoints) {
      return;
    }

    await removePointsFromPlayer(playerId, pointsToRemove);
  } catch (error) {
    console.error(`[removePlayerPointsFromSale] ❌ Failed to remove player points for sale ${saleId}:`, error);
  }
}

/**
 * Roll back charged/collected sale side effects when a charged-like sale returns to pending.
 * This removes sale-level milestones, sold-item clones, and charged-side effect flags so side effects can replay safely.
 */
async function rollbackChargedSaleToPending(sale: Sale, previousSale: Sale): Promise<void> {
  try {
    // Remove charged/collected sale milestones and keep non-lifecycle log history intact.
    await removeLogEntriesAcrossMonths(EntityType.SALE, entry =>
      entry.entityId === sale.id &&
      (() => {
        const event = String(entry.event || entry.status || '').toLowerCase();
        return event === 'charged' || event === 'collected';
      })()
    );

    // Remove sold-item clones created while charged (and their links/logs)
    const soldCloneIds = new Set<string>();
    const soldItemsBySource = await getItemsBySourceRecordId(sale.id);
    for (const item of soldItemsBySource) {
      if (item.id.includes('-sold-')) {
        soldCloneIds.add(item.id);
      }
    }

    for (const line of previousSale.lines ?? []) {
      if (line.kind !== 'item' || !line.itemId) continue;
      if (String(line.itemId).includes('-sold-')) {
        soldCloneIds.add(String(line.itemId));
      }
    }

    for (const itemId of soldCloneIds) {
      await removeLogEntriesAcrossMonths(EntityType.ITEM, entry => entry.entityId === itemId);
      await removeItem(itemId);
    }

    // Remove sold-item links for this sale so only canonical inventory links remain.
    const saleLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });
    for (const link of saleLinks) {
      const isSoldItemLink = link.source.type === EntityType.ITEM
        ? String(link.source.id).includes('-sold-')
        : link.target.type === EntityType.ITEM
          ? String(link.target.id).includes('-sold-')
          : false;
      if (!isSoldItemLink) continue;

      try {
        await removeLink(link.id);
      } catch (error) {
        console.error(`[rollbackChargedSaleToPending] ❌ Failed to remove sold clone link ${link.id}:`, error);
      }
    }

    // Remove charged-state effect flags so side effects can run again later if needed.
    await clearEffect(EffectKeys.sideEffect('sale', sale.id, 'linesProcessed'));
    await clearEffect(EffectKeys.sideEffect('sale', sale.id, 'saleDoneLogged'));
    await clearEffect(EffectKeys.sideEffect('sale', sale.id, 'saleCollectedLogged'));
    await clearEffect(EffectKeys.sideEffect('sale', sale.id, 'pointsStaged'));
    await clearEffect(EffectKeys.sideEffect('sale', sale.id, 'pointsRewarded'));
    await clearEffect(EffectKeys.sideEffect('sale', sale.id, 'financialCreated'));

    const previousItemLines = previousSale.lines?.filter((line): line is ItemSaleLine => line.kind === 'item') ?? [];
    for (const line of previousItemLines) {
      const lineId = line.lineId || line.itemId;
      if (!lineId) continue;
      await clearEffect(EffectKeys.sideEffect('sale', sale.id, `stockDecremented:${lineId}`));
      await clearEffect(EffectKeys.sideEffect('sale', sale.id, `soldItemEntity:${lineId}`));
      await clearEffect(EffectKeys.sideEffect('sale', sale.id, `soldItemEntity:bundle:${lineId}`));
    }

    // Remove points that were granted by this charged state, if any.
    await removePlayerPointsFromSale(sale.id, sale);
  } catch (error) {
    console.error(`[rollbackChargedSaleToPending] ❌ Failed for sale ${sale.id}:`, error);
  }
}

/**
 * Delete per-sale sold-item rows (KV clones). Live inventory rows are not adjusted here — stock was already reduced on charge.
 */
async function removeSoldItemRowsForDeletedSale(saleId: string, sale: Sale | null): Promise<void> {
  try {
    const cloneIds = new Set<string>();

    const fromSource = await getItemsBySourceRecordId(saleId);
    for (const it of fromSource) {
      if (it.sourceRecordId === saleId) {
        cloneIds.add(it.id);
      }
    }

    if (sale?.lines) {
      for (const line of sale.lines) {
        if (line.kind !== 'item') continue;
        const itemId = 'itemId' in line ? line.itemId : undefined;
        if (itemId && String(itemId).includes('-sold-')) {
          cloneIds.add(String(itemId));
        }
      }
    }

    for (const itemId of cloneIds) {
      try {
        const existing = await getItemById(itemId);
        if (!existing) continue;
        await removeItem(itemId);
      } catch (error) {
        console.error(`[removeSoldItemRowsForDeletedSale] ❌ Failed to remove sold row ${itemId}:`, error);
      }
    }
  } catch (error) {
    console.error(`[removeSoldItemRowsForDeletedSale] ❌ Failed for sale ${saleId}:`, error);
  }
}

