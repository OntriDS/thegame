// workflows/entities-workflows/account.workflow.ts
// workflows/entities-workflows/account.workflow.ts
// Account-specific workflow with EMAIL_VERIFIED, PASSWORD_RESET, LOGIN, LOGOUT events

import { EntityType } from '@/types/enums';
import type { Account } from '@/types/entities';
import { acquireEffectClaim, resolveEffectClaim, deleteEffectClaim, deleteEffectClaimsByPrefix } from '@/lib/domain/effects/effect-claim-store';

import { EffectKeys } from '@/data-store/keys';
import { EffectClaimStatus } from '@/types/enums';
import { getLinksFor, removeLink } from '@/links/link-registry';

export async function onAccountUpsert(account: Account, previousAccount?: Account): Promise<void> {
  // Account is an infrastructure entity - no logging needed
  // Account only handles: triforce creation, player linking, character linking
  
  // New account creation - just mark effect for idempotency
  if (!previousAccount) {
    const effectKey = EffectKeys.created('account', account.id);
    const claim = await acquireEffectClaim({ idempotencyKey: effectKey, ownerId: `workflow`, commandId: `cmd`, leaseSeconds: 60 });
    if (!claim) return;
    await resolveEffectClaim({ idempotencyKey: effectKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });
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
    // 1. Remove all Links related to this account
    const accountLinks = await getLinksFor({ type: EntityType.ACCOUNT, id: accountId });
    for (const link of accountLinks) {
      try {
        await removeLink(link.id);
      } catch (error) {
        console.error(`[removeAccountEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 2. Clear all effects for this account
    await deleteEffectClaim(EffectKeys.created('account', accountId));
    await deleteEffectClaimsByPrefix(EffectKeys.sideEffect('account', accountId, ''));
    
    // 3. No log entries to remove - Account is infrastructure entity
  } catch (error) {
    console.error('Error removing account effects:', error);
  }
}
