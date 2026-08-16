import type { Task } from '@/types/entities';
import { EntityType, LinkType } from '@/types/enums';
import { getLinksFor } from '@/links/link-registry';
import { getCharacterById } from '@/data-store/repositories/character.repo';
import { getPlayerById } from '@/data-store/repositories/player.repo';

/** Resolve the Player that belongs to the Task owner. No founder fallback. */
export async function resolveTaskOwnerPlayerId(task: Task): Promise<string | null> {
  const links = await getLinksFor({ type: EntityType.TASK, id: task.id });
  const ownerLink = links.find(link =>
    link.linkType === LinkType.TASK_CHARACTER &&
    String(link.relationship || '').toLowerCase() === 'owner'
  );

  const ownerCharacterId = ownerLink?.target.id || (task as any).playerCharacterId || null;
  if (!ownerCharacterId) return null;

  const directPlayer = await getPlayerById(ownerCharacterId);
  if (directPlayer) return directPlayer.id;

  const ownerCharacter = await getCharacterById(ownerCharacterId);
  return ownerCharacter?.playerId || null;
}
