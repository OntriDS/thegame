// workflows/entities-workflows/account.workflow.ts
// Account-specific workflow with EMAIL_VERIFIED, PASSWORD_RESET, LOGIN, LOGOUT events

import { EntityType, LogEventType } from '@/types/enums';
import type { Account } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { ClientAPI } from '@/lib/client-api';

const STATE_FIELDS = ['isActive', 'isVerified', 'loginAttempts'];
const DESCRIPTIVE_FIELDS = ['name', 'email', 'phone', 'privacySettings'];

export async function onAccountUpsert(account: Account, previousAccount?: Account): Promise<void> {
  // New account creation
  if (!previousAccount) {
    const effectKey = `account:${account.id}:created`;
    if (await hasEffect(effectKey)) return;
    
    await appendEntityLog(EntityType.ACCOUNT, account.id, LogEventType.CREATED, { 
      name: account.name, 
      email: account.email,
      isActive: account.isActive,
      isVerified: account.isVerified
    });
    await markEffect(effectKey);
    return;
  }
  
  // Email verification changes - EMAIL_VERIFIED event
  if (!previousAccount.isVerified && account.isVerified) {
    await appendEntityLog(EntityType.ACCOUNT, account.id, LogEventType.EMAIL_VERIFIED, {
      name: account.name,
      email: account.email,
      verifiedAt: new Date().toISOString()
    });
  }
  
  // Password reset changes - PASSWORD_RESET event
  if (previousAccount.resetToken && !account.resetToken) {
    await appendEntityLog(EntityType.ACCOUNT, account.id, LogEventType.PASSWORD_RESET, {
      name: account.name,
      resetAt: new Date().toISOString()
    });
  }
  
  // Login attempts changes - LOGIN event
  if (previousAccount.loginAttempts !== account.loginAttempts) {
    if (account.loginAttempts === 0 && previousAccount.loginAttempts > 0) {
      // Successful login (reset attempts)
      await appendEntityLog(EntityType.ACCOUNT, account.id, LogEventType.LOGIN, {
        name: account.name,
        loginAt: new Date().toISOString()
      });
    }
  }
  
  // General updates - UPDATED event
  const hasSignificantChanges = 
    previousAccount.isActive !== account.isActive ||
    previousAccount.isVerified !== account.isVerified;
    
  if (hasSignificantChanges) {
    await appendEntityLog(EntityType.ACCOUNT, account.id, LogEventType.UPDATED, {
      name: account.name,
      isActive: account.isActive,
      isVerified: account.isVerified
    });
  }
  
  // Descriptive changes - update in-place
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousAccount as any)[field] !== (account as any)[field]) {
      await updateEntityLogField(EntityType.ACCOUNT, account.id, field, (previousAccount as any)[field], (account as any)[field]);
    }
  }
}

/**
 * Remove account effects when account is deleted
 * Accounts can have entries in account log and related links
 */
export async function removeAccountEffectsOnDelete(accountId: string): Promise<void> {
  try {
    console.log(`[removeAccountEffectsOnDelete] Starting cleanup for account: ${accountId}`);
    
    // 1. Remove all Links related to this account
    const accountLinks = await ClientAPI.getLinksFor({ type: EntityType.ACCOUNT, id: accountId });
    console.log(`[removeAccountEffectsOnDelete] Found ${accountLinks.length} links to remove`);
    
    for (const link of accountLinks) {
      try {
        await ClientAPI.removeLink(link.id);
        console.log(`[removeAccountEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeAccountEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 2. Clear all effects for this account
    await clearEffect(`account:${accountId}:created`);
    await clearEffectsByPrefix(EntityType.ACCOUNT, accountId, '');
    
    // 3. Remove log entries from account log
    console.log(`[removeAccountEffectsOnDelete] Starting log entry removal for account: ${accountId}`);
    
    const result = await ClientAPI.removeLogEntry(EntityType.ACCOUNT, accountId);
    
    if (result.success) {
      console.log(`[removeAccountEffectsOnDelete] ✅ Account log entries removed successfully for account: ${accountId}`);
    } else {
      console.error(`[removeAccountEffectsOnDelete] Failed to remove account log entries: ${result.message}`);
    }
    
    console.log(`[removeAccountEffectsOnDelete] ✅ Cleared effects, removed links, and removed log entries for account ${accountId}`);
  } catch (error) {
    console.error('Error removing account effects:', error);
  }
}
