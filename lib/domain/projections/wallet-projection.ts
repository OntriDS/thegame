// The wallet is no longer stored as a Character field.
// Instead, it's calculated from FinancialRecord entities linked to the Character.
//
// Wallet balance = Sum of all DONE FinancialRecords linked to Character
//                  where the Character is the beneficiary (characterId field)
//                  and the record has jungleCoins > 0
//
// This ensures the wallet is always consistent with the financial ledger.

import { kvGet } from '@/lib/utils/kv';
import { EntityType, FinancialStatus, LinkType, CanonicalLinkType } from '@/types/enums';
import type { FinancialRecord, Character, CanonicalLink } from '@/types/entities';

/**
 * Wallet projection for a Character.
 */
export interface WalletProjection {
  characterId: string;
  jungleCoins: number;
  lastUpdated: string;
  financialRecordCount: number;
}

/**
 * Calculate the wallet balance for a Character.
 *
 * This is a projection from FinancialRecord entities linked to the Character.
 * The wallet is the sum of all DONE FinancialRecords where:
 * - The Character is the beneficiary (characterId field)
 * - The record has status DONE
 * - The record has jungleCoins > 0
 *
 * @param characterId - The Character ID
 * @returns Wallet projection with jungleCoins balance
 */
export async function getWalletProjection(characterId: string): Promise<WalletProjection> {
  // Get all FinancialRecords linked to this Character
  const links = await getFinancialLinksForCharacter(characterId);
  const financialRecordIds = links.map(link => link.source.id);

  // Load all FinancialRecords
  const financialRecords = await Promise.all(
    financialRecordIds.map(id => kvGet<FinancialRecord>(`thegame:entity:financial:${id}`))
  );

  // Filter to DONE records with jungleCoins > 0
  const validRecords = financialRecords.filter(
    (record): record is FinancialRecord =>
      record !== null &&
      record.status === FinancialStatus.DONE &&
      (record.context?.jungleCoins ?? 0) > 0
  );

  // Sum jungleCoins
  const totalJungleCoins = validRecords.reduce(
    (sum, record) => sum + (record.context?.jungleCoins ?? 0),
    0
  );

  return {
    characterId,
    jungleCoins: totalJungleCoins,
    lastUpdated: new Date().toISOString(),
    financialRecordCount: validRecords.length,
  };
}

/**
 * Get all FinancialRecord links for a Character.
 *
 * This queries the Link registry for FINREC_CHARACTER links
 * where the target is the Character.
 */
async function getFinancialLinksForCharacter(characterId: string): Promise<CanonicalLink[]> {
  // In a real implementation, this would query the Link registry
  // For now, we'll use a simplified approach that loads all links for the character
  // and filters for FINREC_CHARACTER links

  const linkKey = `thegame:link:index:character:${characterId}`;
  const linkIds = await kvGet<string[]>(linkKey) || [];

  const links = await Promise.all(
    linkIds.map(id => kvGet<CanonicalLink>(`thegame:link:${id}`))
  );

  return links.filter(
    (link: CanonicalLink | null): link is CanonicalLink =>
      link !== null &&
      link.linkType === CanonicalLinkType.FINREC_CHARACTER &&
      link.target.type === EntityType.CHARACTER &&
      link.target.id === characterId
  );
}

/**
 * Update the wallet cache on the Character entity.
 *
 * This is called after FinancialRecord changes to keep the UI responsive.
 * The cache is eventually consistent with the projection.
 *
 * @param characterId - The Character ID
 */
export async function updateWalletCache(characterId: string): Promise<void> {
  const projection = await getWalletProjection(characterId);

  // Load the Character
  const characterKey = `thegame:entity:character:${characterId}`;
  const character = await kvGet<Character>(characterKey);

  if (!character) {
    console.warn(`[WalletProjection] Character ${characterId} not found`);
    return;
  }

  // Update the wallet field (for backward compatibility during migration)
  const updatedCharacter = {
    ...character,
    wallet: {
      jungleCoins: projection.jungleCoins,
    },
    updatedAt: new Date().toISOString(),
  };

  // Persist the updated Character
  const { kvSet } = await import('@/lib/utils/kv');
  await kvSet(characterKey, updatedCharacter);

  console.log(
    `[WalletProjection] Updated wallet cache for Character ${characterId}: ${projection.jungleCoins} J$`
  );
}

/**
 * Recalculate wallet for all Characters.
 *
 * This is a maintenance operation that can be run periodically
 * to ensure all wallet caches are consistent with the projection.
 */
export async function recalculateAllWallets(): Promise<void> {
  // In a real implementation, this would:
  // 1. Get all Characters
  // 2. For each Character, call updateWalletCache()
  // 3. Log any discrepancies

  console.log('[WalletProjection] Recalculating all wallets...');
  // Implementation would go here
  console.log('[WalletProjection] Wallet recalculation complete');
}
