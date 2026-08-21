import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import {
  getCharacterById,
  getPlayerById,
  removeCharacter,
  removePlayer,
  upsertCharacter,
  upsertPlayer,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, LinkType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { iamService } from '@/lib/iam-service';

const characterId = 'entity-test-account-character-full';
const playerId = 'entity-test-account-player-full';
const email = 'entity-test-account-full@example.test';

describe('entity-test: full Account with optional Player', () => {
  let createdAccountId: string | null = null;

  beforeEach(async () => {
    for (const account of await iamService.listAccounts()) {
      if (account.email === email) await iamService.deleteAccountPermanently(account.id);
    }
    await removePlayer(playerId);
    await removeCharacter(characterId);

    expect(await getLinksFor({ type: EntityType.CHARACTER, id: characterId })).toHaveLength(0);
    expect(await getLinksFor({ type: EntityType.PLAYER, id: playerId })).toHaveLength(0);
  });

  afterEach(async () => {
    if (createdAccountId) await iamService.deleteAccountPermanently(createdAccountId);
    await removePlayer(playerId);
    await removeCharacter(characterId);

    if (createdAccountId) {
      expect(await iamService.getAccountById(createdAccountId)).toBeNull();
      expect(await getLinksFor({ type: EntityType.ACCOUNT, id: createdAccountId })).toHaveLength(0);
    }
    expect(await getCharacterById(characterId)).toBeNull();
    expect(await getPlayerById(playerId)).toBeNull();
    createdAccountId = null;
  });

  it('resolves the optional Player through Character and never creates ACCOUNT_PLAYER', async () => {
    const now = getUTCNow();

    await upsertCharacter({
      id: characterId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-account-character-full',
      roles: ['player'],
      qualifications: [],
      lastActiveAt: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true, skipLinkEffects: true });

    expect(await getLinksFor({ type: EntityType.CHARACTER, id: characterId })).toHaveLength(0);

    const created = await iamService.createAccount(
      { name: 'testing-account-full', email },
      { skipGlobalEmailMapping: true },
    );
    createdAccountId = created.id;

    expect(await getLinksFor({ type: EntityType.ACCOUNT, id: created.id })).toHaveLength(0);

    await iamService.linkAccountToCharacter(created.id, characterId);

    const accountCharacterLinks = await getLinksFor({ type: EntityType.ACCOUNT, id: created.id });
    expect(accountCharacterLinks).toHaveLength(1);
    expect(accountCharacterLinks[0].linkType).toBe(LinkType.ACCOUNT_CHARACTER);
    expect(await getLinksFor({ type: EntityType.PLAYER, id: playerId })).toHaveLength(0);

    // This is the optional evolution step: Player is linked to Character,
    // never directly to Account.
    await upsertPlayer({
      id: playerId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-account-player-full',
      level: 1,
      rewards: {
        points: {
          pending: { hp: 0, fp: 0, rp: 0, xp: 0 },
          vested: { hp: 0, fp: 0, rp: 0, xp: 0 },
          current: { hp: 0, fp: 0, rp: 0, xp: 0 },
          exchanged: { hp: 0, fp: 0, rp: 0, xp: 0 },
          historic: { hp: 0, fp: 0, rp: 0, xp: 0 },
        },
        achievements: [],
        badges: [],
      },
      characterId,
      lastActiveAt: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any);

    const linksAfterPlayerCreation = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });
    expect(linksAfterPlayerCreation.some((link) => link.linkType === LinkType.ACCOUNT_CHARACTER)).toBe(true);
    expect(linksAfterPlayerCreation.some((link) => link.linkType === LinkType.CHARACTER_PLAYER)).toBe(true);

    const accountCharacter = await iamService.resolveCharacterForAccount(created.id);
    const characterPlayer = await iamService.getPlayerByCharacterId(characterId);
    const accountLinks = await getLinksFor({ type: EntityType.ACCOUNT, id: created.id });
    const characterLinks = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });
    const playerLinks = await getLinksFor({ type: EntityType.PLAYER, id: playerId });
    const player = await getPlayerById(playerId);

    const persistedAccount = JSON.parse(JSON.stringify(await iamService.getAccountById(created.id)));
    const output = {
      account: persistedAccount,
      links: accountLinks,
      characterLinks,
      playerLinks,
      player,
    };
    writeFileSync(resolve(__dirname, 'account-entity-test-full.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted full Account workflow output:\n${JSON.stringify(output, null, 2)}\n`);

    expect(accountCharacter?.id).toBe(characterId);
    expect(characterPlayer?.id).toBe(playerId);
    expect(player).not.toHaveProperty('accountId');
    expect(accountLinks).toEqual([
      expect.objectContaining({
        linkType: LinkType.ACCOUNT_CHARACTER,
        source: { type: EntityType.ACCOUNT, id: created.id },
        target: { type: EntityType.CHARACTER, id: characterId },
      }),
    ]);
    expect(characterLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: LinkType.ACCOUNT_CHARACTER,
        source: { type: EntityType.ACCOUNT, id: created.id },
        target: { type: EntityType.CHARACTER, id: characterId },
      }),
      expect.objectContaining({
        linkType: LinkType.CHARACTER_PLAYER,
        source: { type: EntityType.CHARACTER, id: characterId },
        target: { type: EntityType.PLAYER, id: playerId },
      }),
    ]));
    expect(playerLinks).toEqual([
      expect.objectContaining({
        linkType: LinkType.CHARACTER_PLAYER,
        source: { type: EntityType.CHARACTER, id: characterId },
        target: { type: EntityType.PLAYER, id: playerId },
      }),
    ]);
    expect(accountLinks.some((link) => String(link.linkType) === 'ACCOUNT_PLAYER')).toBe(false);
  });
});
