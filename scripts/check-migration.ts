import { iamService } from '../lib/iam-service';
import { kvSMembers, kvGet } from '../data-store/kv';
import { EntityType, PLAYER_ONE_ID } from '../types/enums';
import { buildIndexKey } from '../data-store/keys';
import { IAM_ACCOUNTS_INDEX } from '../lib/keys';

async function check() {
  console.log('--- MIGRATION DIAGNOSTIC ---');
  
  // 1. Check Legacy Status
  const legacyAccounts = await kvSMembers(buildIndexKey(EntityType.ACCOUNT));
  console.log('Legacy Account Index:', legacyAccounts);
  console.log('Player One in Legacy Index:', legacyAccounts.includes(PLAYER_ONE_ID));
  
  const legacyAccountData = await kvGet(buildIndexKey(EntityType.ACCOUNT) + ':' + PLAYER_ONE_ID);
  console.log('Player One Data exists:', !!legacyAccountData);

  // 2. Check IAM Status
  const iamAccounts = await kvSMembers(IAM_ACCOUNTS_INDEX);
  console.log('IAM Account Index:', iamAccounts);
  
  for (const id of iamAccounts) {
    const acc = await iamService.getAccountById(id);
    if (acc) {
      console.log(`IAM Account Found: ${acc.id} (${acc.email})`);
    }
  }

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
