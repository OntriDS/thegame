import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import {
  getCharacterById,
  removeCharacter,
  upsertCharacter,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, LinkType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { iamService } from '@/lib/iam-service';

const characterId = 'entity-test-account-character-clean';
const email = 'entity-test-account-clean@example.test';

describe('entity-test: clean minimal Account', () => {
  let createdAccountId: string | null = null;

  beforeEach(async () => {
    for (const account of await iamService.listAccounts()) {
      if (account.email === email) await iamService.deleteAccountPermanently(account.id);
    }
    await removeCharacter(characterId);
  });

  afterEach(async () => {
    if (createdAccountId) await iamService.deleteAccountPermanently(createdAccountId);
    await removeCharacter(characterId);

    if (createdAccountId) {
      expect(await iamService.getAccountById(createdAccountId)).toBeNull();
      expect(await getLinksFor({ type: EntityType.ACCOUNT, id: createdAccountId })).toHaveLength(0);
    }
    expect(await getCharacterById(characterId)).toBeNull();
    createdAccountId = null;
  });

  it('persists the minimal flat IAM record and creates ACCOUNT_CHARACTER', async () => {
    const now = getUTCNow();

    await upsertCharacter({
      id: characterId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-account-character',
      roles: [],
      qualifications: [],
      lastActiveAt: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true, skipLinkEffects: true });

    const created = await iamService.createAccount(
      { name: 'testing-account', email },
      { skipGlobalEmailMapping: true },
    );
    createdAccountId = created.id;

    const linked = await iamService.linkAccountToCharacter(created.id, characterId);
    const persisted = await iamService.getAccountById(created.id);
    const character = await getCharacterById(characterId);
    const links = await getLinksFor({ type: EntityType.ACCOUNT, id: created.id });
    if (!persisted || !character) throw new Error('Account clean test did not persist its IAM or Character record.');

    const safeProjection = {
      id: persisted.id,
      name: persisted.name,
      email: persisted.email,
      isActive: persisted.isActive,
      isVerified: persisted.isVerified,
      characterId: character.id,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
    };
    const output = { account: safeProjection, links };
    writeFileSync(resolve(__dirname, 'account-entity-test-clean.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted safe Account view:\n${JSON.stringify(output, null, 2)}\n`);

    expect(persisted).not.toHaveProperty('authentication');
    expect(persisted).not.toHaveProperty('access');
    expect(persisted.passwordHash).toBeNull();
    expect(persisted.passphraseFlag).toBe(false);
    expect(persisted).not.toHaveProperty('characterId');
    expect(character).not.toHaveProperty('accountId');
    expect(linked.account.id).toBe(created.id);
    expect(links).toEqual([
      expect.objectContaining({
        linkType: LinkType.ACCOUNT_CHARACTER,
        source: { type: EntityType.ACCOUNT, id: created.id },
        target: { type: EntityType.CHARACTER, id: characterId },
        relationship: 'primary',
      }),
    ]);
    expect(safeProjection).not.toHaveProperty('passwordHash');
    expect(safeProjection).not.toHaveProperty('passphraseFlag');
    expect(safeProjection).not.toHaveProperty('resetToken');
    expect(safeProjection).not.toHaveProperty('verificationToken');
  });
});
