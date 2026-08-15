import type { EntityId, EntityRef, PointAmountV1, CommandId, UtcIsoString } from './entities';

/**
 * PLAYER POINT GRANT (Internal Progression Evidence)
 * Tracks progression evidence from Task and Sale completion.
 * Grants are staged on DONE/CHARGED and vested on COLLECTED.
 */
export interface PlayerPointGrantV1 {
  grantId: string;
  playerId: EntityId;
  source: EntityRef;
  policyVersion: string;
  points: PointAmountV1;
  state: 'pending' | 'vested' | 'compensated';
  stagedCommandId: CommandId;
  vestedCommandId?: CommandId;
  stagedAt: UtcIsoString;
  vestedAt?: UtcIsoString;
  compensatedAt?: UtcIsoString;
  version: number;
}
