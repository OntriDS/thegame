import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getAllPlayers, getAllSites, getCharacterById, removeCharacter, upsertCharacter } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { CharacterRole, CommColor, CognitiveSkill, EntityType, LinkType, TechnicalSkill } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: full Character', () => {
  const characterId = 'entity-test-character-full';

  afterEach(async () => {
    await removeCharacter(characterId);
  });

  it('persists the full canonical Character shape without financial duplicates', async () => {
    const now = getUTCNow();
    const qualificationDate = new Date(now.getTime() - 86_400_000);
    const player = (await getAllPlayers())[0];
    if (!player) throw new Error('Cannot run full Character test: no Player exists for CHARACTER_PLAYER workflow verification.');
    const sites = await getAllSites();
    const site = sites.find((candidate) => candidate.id === 'hq') || sites[0];
    if (!site) throw new Error('Cannot run full Character test: no Site exists for CHARACTER_SITE workflow verification.');

    // The deprecated amount fields deliberately simulate an old caller. The
    // datastore boundary must remove them before persistence.
    await upsertCharacter({
      id: characterId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-character-full',
      description: 'Full Character entity test',
      accountId: 'entity-test-account',
      contactEmail: 'character-full@example.test',
      contactPhone: '+50688889999',
      contactPhoneCountryCode: '+506',
      roles: [CharacterRole.CUSTOMER, CharacterRole.GAMER],
      commColor: CommColor.BLUE,
      CP: 12,
      MP: 4,
      skills: {
        [CognitiveSkill.LOGIC]: 3,
        [TechnicalSkill.DESIGN_THINKING]: 2,
      },
      qualifications: [{
        id: 'qualification-game-demo',
        name: 'Designed a videogame demo',
        description: 'Evidence used for role progression.',
        createdAt: qualificationDate,
      }],
      // Transient compatibility input. The workflow must convert this to a
      // CHARACTER_PLAYER Link; it must not remain on the Character entity.
      playerId: player.id,
      // Transient compatibility input. The workflow must convert this to a
      // CHARACTER_SITE ownership Link; it must not remain on the Character.
      siteId: site.id,
      lastActiveAt: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      purchasedAmount: 999,
      beneficiaryPaidAmount: 555,
    } as any);

    const saved = await getCharacterById(characterId);
    if (!saved) throw new Error(`Entity-test Character ${characterId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const links = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });
    const playerLinks = await getLinksFor({ type: EntityType.PLAYER, id: player.id });
    const siteLinks = await getLinksFor({ type: EntityType.SITE, id: site.id });
    const relevantPlayerLinks = playerLinks.filter((link) =>
      link.linkType === LinkType.CHARACTER_PLAYER && link.source.id === characterId
    );
    const relevantSiteLinks = siteLinks.filter((link) =>
      link.linkType === LinkType.CHARACTER_SITE && link.source.id === characterId
    );
    const outputFile = resolve(__dirname, 'character-entity-test-full.output.json');
    const output = { character: persisted, links, playerLinks: relevantPlayerLinks, siteLinks: relevantSiteLinks };
    writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted full Character workflow output:\n${JSON.stringify(output, null, 2)}\n`);

    expect(persisted).toMatchObject({
      id: characterId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-character-full',
      description: 'Full Character entity test',
      accountId: 'entity-test-account',
      contactEmail: 'character-full@example.test',
      contactPhone: '+50688889999',
      contactPhoneCountryCode: '+506',
      roles: [CharacterRole.CUSTOMER, CharacterRole.GAMER],
      commColor: CommColor.BLUE,
      CP: 12,
      MP: 4,
      skills: {
        [CognitiveSkill.LOGIC]: 3,
        [TechnicalSkill.DESIGN_THINKING]: 2,
      },
      qualifications: [{
        id: 'qualification-game-demo',
        name: 'Designed a videogame demo',
      }],
      lastActiveAt: expect.any(String),
      isActive: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(persisted).not.toHaveProperty('purchasedAmount');
    expect(persisted).not.toHaveProperty('beneficiaryPaidAmount');
    expect(persisted).not.toHaveProperty('achievements');
    expect(persisted).not.toHaveProperty('inventory');
    expect(persisted).not.toHaveProperty('playerId');
    expect(persisted).not.toHaveProperty('siteId');
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: LinkType.CHARACTER_PLAYER,
        relationship: 'primary',
        source: { type: EntityType.CHARACTER, id: characterId },
        target: { type: EntityType.PLAYER, id: player.id },
      }),
    ]));
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: LinkType.CHARACTER_SITE,
        relationship: 'owns',
        source: { type: EntityType.CHARACTER, id: characterId },
        target: { type: EntityType.SITE, id: site.id },
      }),
    ]));
    expect(playerLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: LinkType.CHARACTER_PLAYER,
        source: { type: EntityType.CHARACTER, id: characterId },
      }),
    ]));
    expect(siteLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: LinkType.CHARACTER_SITE,
        relationship: 'owns',
        source: { type: EntityType.CHARACTER, id: characterId },
      }),
    ]));
  });
});
