// workflows/entities-workflows/account.workflow.ts
// Account-specific workflow with EMAIL_VERIFIED, PASSWORD_RESET, LOGIN, LOGOUT events

import { EntityType } from '@/types/enums';
import type { Account } from '@/types/entities';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';

const STATE_FIELDS = ['isActive', 'isVerified', 'loginAttempts'];
const DESCRIPTIVE_FIELDS = ['name', 'email', 'phone', 'privacySettings'];

export async function onAccountUpsert(account: Account, previousAccount?: Account): Promise<void> {
  // Account is an infrastructure entity - no logging needed
  // Account only handles: triforce creation, player linking, character linking
  
  // New account creation - just mark effect for idempotency
  if (!previousAccount) {
    const effectKey = EffectKeys.created('account', account.id);
    if (await hasEffect(effectKey)) return;
    await markEffect(effectKey);
    return;
  }
  
  // Account updates - no logging needed
  // Account is pure infrastructure for authentication
}

/**
 * Remove account effects when account is deleted
 * Accounts can have related links but no log entries
 */
export async function removeAccountEffectsOnDelete(accountId: string): Promise<void> {
  try {
    console.log(`[removeAccountEffectsOnDelete] Starting cleanup for account: ${accountId}`);
    
    // 1. Remove all Links related to this account
    const accountLinks = await getLinksFor({ type: EntityType.ACCOUNT, id: accountId });
    console.log(`[removeAccountEffectsOnDelete] Found ${accountLinks.length} links to remove`);
    
    for (const link of accountLinks) {
      try {
        await removeLink(link.id);
        console.log(`[removeAccountEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeAccountEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 2. Clear all effects for this account
    await clearEffect(EffectKeys.created('account', accountId));
    await clearEffectsByPrefix(EntityType.ACCOUNT, accountId, '');
    
    // 3. No log entries to remove - Account is infrastructure entity
    
    console.log(`[removeAccountEffectsOnDelete] ✅ Cleared effects and removed links for account ${accountId}`);
  } catch (error) {
    console.error('Error removing account effects:', error);
  }
}
