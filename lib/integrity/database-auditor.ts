import { getCharacterById, getFinancialById } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { kvMGet, kvScan, kvSMembers } from '@/lib/utils/kv';
import { buildDataKey, buildIndexKey } from '@/data-store/keys';
import { EntityType, LinkType } from '@/types/enums';
import { parseEntityTypeParameter } from '@/lib/mcp/parse-entity-type-param';

const EMPTY_POINTS = { hp: 0, rp: 0, fp: 0, xp: 0 };
const POINT_KEYS: ReadonlyArray<keyof typeof EMPTY_POINTS> = ['hp', 'rp', 'fp', 'xp'];
const MAX_ENTITY_IDS_PER_MGET = 100;
const MAX_ISSUES = 500;
const PLAYER_FIELDS = ['id', 'name', 'createdAt', 'updatedAt', 'lastActiveAt', 'level', 'totalPoints', 'points', 'badges', 'achievements', 'isActive', 'characterId'] as const;

export type AuditSeverity = 'error' | 'warning' | 'info';

export interface AuditIssue {
  code: string;
  detail: string;
  severity: AuditSeverity;
  entityType?: string;
  entityId?: string;
}

export interface PlayerAuditResult {
  entity: 'player';
  totalIndexed: number;
  totalStored: number;
  indexDataIssues: {
    idsIndexedButMissingData: number;
    idsDataButNotIndexed: number;
  };
  indexGhostSamples: string[];
  dataGhostSamples: string[];
  points: {
    invalidPointsCount: number;
    totalLessThanAvailableCount: number;
  };
  links: {
    missingCharacterLinkCount: number;
    missingTargetCount: number;
    playerFinrecRecordCount: number;
    personalFinrecRecordCount: number;
    personalJungleCoinsBalance: number;
  };
  issues: AuditIssue[];
  ok: boolean;
}

type RawPlayer = Record<string, any>;

function chunked<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function pushIssue(issues: AuditIssue[], total: { n: number }, issue: Omit<AuditIssue, 'severity'> & { severity?: AuditSeverity }) {
  total.n += 1;
  issues.push({
    severity: issue.severity ?? 'error',
    ...issue,
  });
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isValidDateValue(value: unknown): boolean {
  if (value == null) return false;
  const raw = value instanceof Date
    ? value.getTime()
    : typeof value === 'string'
      ? Date.parse(value)
      : asFiniteNumber(value);
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0;
}

function normalizePoints(value: unknown): Record<'hp' | 'rp' | 'fp' | 'xp', number> | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const result: Record<'hp' | 'rp' | 'fp' | 'xp', number> = { ...EMPTY_POINTS };
  for (const key of POINT_KEYS) {
    const parsed = asFiniteNumber(candidate[key]);
    if (parsed == null) return null;
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    result[key] = parsed;
  }
  return result;
}

async function loadPlayerDataByKeys(keys: string[]): Promise<Record<string, RawPlayer>> {
  const result: Record<string, RawPlayer> = {};
  if (!keys.length) return result;
  for (const chunk of chunked(keys, MAX_ENTITY_IDS_PER_MGET)) {
    const rows = await kvMGet<RawPlayer>(chunk);
    for (let i = 0; i < chunk.length; i++) {
      const key = chunk[i];
      const id = key.replace(buildDataKey(EntityType.PLAYER, ''), '');
      const row = rows[i];
      if (row) result[id] = row;
    }
  }
  return result;
}

function parseIdFromDataKey(key: string): string {
  return key.replace(buildDataKey(EntityType.PLAYER, ''), '');
}

async function runPlayerAudit(): Promise<PlayerAuditResult> {
  const issues: AuditIssue[] = [];
  const issueStats = { n: 0 };

  const indexKey = buildIndexKey(EntityType.PLAYER);
  const indexedIds = await kvSMembers(indexKey);

  const dataKeys = await kvScan(buildDataKey(EntityType.PLAYER, ''));
  const dataIds = dataKeys.map(parseIdFromDataKey);
  const playersById = await loadPlayerDataByKeys(dataKeys);

  const indexSet = new Set(indexedIds);
  const dataSet = new Set(dataIds);
  const idsIndexedButMissingData = indexedIds.filter((id) => !dataSet.has(id));
  const idsDataButNotIndexed = dataIds.filter((id) => !indexSet.has(id));

  for (const id of idsIndexedButMissingData) {
    pushIssue(
      issues,
      issueStats,
      {
        code: 'PLAYER_INDEX_DATA_MISMATCH',
        detail: `Index contains Player ${id} but player data row is missing.`,
        entityType: EntityType.PLAYER,
        entityId: id,
        severity: 'error',
      },
    );
  }

  for (const id of idsDataButNotIndexed) {
    pushIssue(
      issues,
      issueStats,
      {
        code: 'PLAYER_DATA_INDEX_MISMATCH',
        detail: `Player data exists for ${id} but is not in the player index set.`,
        entityType: EntityType.PLAYER,
        entityId: id,
        severity: 'warning',
      },
    );
  }

  let invalidPointsCount = 0;
  let totalLessThanAvailableCount = 0;
  let missingCharacterLinkCount = 0;
  let missingTargetCount = 0;
  let playerFinrecRecordCount = 0;
  let personalFinrecRecordCount = 0;
  let personalJungleCoinsBalance = 0;

  for (const [id, raw] of Object.entries(playersById)) {
    const player = raw as RawPlayer;
    for (const field of PLAYER_FIELDS) {
      if (player[field] == null || player[field] === '') {
        pushIssue(
          issues,
          issueStats,
          {
            code: 'PLAYER_FIELD_MISSING',
            detail: `Player ${id} is missing required field "${field}".`,
            entityType: EntityType.PLAYER,
            entityId: id,
            severity: 'error',
          },
        );
      }
    }

    if (!isValidDateValue(player.createdAt) || !isValidDateValue(player.updatedAt) || !isValidDateValue(player.lastActiveAt)) {
      pushIssue(
        issues,
        issueStats,
        {
          code: 'PLAYER_INVALID_DATE',
          detail: `Player ${id} has invalid date fields (createdAt/updatedAt/lastActiveAt).`,
          entityType: EntityType.PLAYER,
          entityId: id,
          severity: 'error',
        },
      );
    }

    const level = asFiniteNumber(player.level);
    if (!Number.isInteger(level ?? NaN) || (level ?? 0) < 0) {
      pushIssue(
        issues,
        issueStats,
        {
          code: 'PLAYER_INVALID_LEVEL',
          detail: `Player ${id} has invalid level value.`,
          entityType: EntityType.PLAYER,
          entityId: id,
          severity: 'error',
        },
      );
    }

    const points = normalizePoints(player.points);
    const totalPoints = normalizePoints(player.totalPoints);
    if (!points || !totalPoints) {
      pushIssue(
        issues,
        issueStats,
        {
          code: 'PLAYER_INVALID_POINTS',
          detail: `Player ${id} has malformed points or totalPoints buckets.`,
          entityType: EntityType.PLAYER,
          entityId: id,
          severity: 'error',
        },
      );
      invalidPointsCount += 1;
    } else {
      const isTotalLower = ['hp', 'rp', 'fp', 'xp'].some((key) => totalPoints[key as keyof typeof totalPoints] < points[key as keyof typeof points]);
      if (isTotalLower) {
        invalidPointsCount += 1;
        totalLessThanAvailableCount += 1;
        pushIssue(
          issues,
          issueStats,
          {
            code: 'PLAYER_POINTS_TOTAL_INVARIANT',
            detail: `Player ${id} has totalPoints lower than points for one or more buckets.`,
            entityType: EntityType.PLAYER,
            entityId: id,
            severity: 'warning',
          },
        );
      }
    }

    const links = await getLinksFor({ type: EntityType.PLAYER, id });
    const characterLinks = links.filter((link) => link.linkType === LinkType.PLAYER_CHARACTER);
    const finrecLinks = links.filter((link) => link.linkType === LinkType.PLAYER_FINREC);
    playerFinrecRecordCount += finrecLinks.length;

    const characterId = typeof player.characterId === 'string' ? player.characterId.trim() : '';
    if (characterId) {
      const character = await getCharacterById(characterId);
      if (!character) {
        missingTargetCount += 1;
        pushIssue(
          issues,
          issueStats,
          {
            code: 'PLAYER_CHARACTER_LINK_GHOST',
            detail: `Player ${id} references characterId ${characterId}, but character does not exist.`,
            entityType: EntityType.PLAYER,
            entityId: id,
            severity: 'warning',
          },
        );
      }
      const hasCanonicalCharacterLink = characterLinks.some((link) => link.target.type === EntityType.CHARACTER && link.target.id === characterId);
      if (!hasCanonicalCharacterLink) {
        missingCharacterLinkCount += 1;
        pushIssue(
          issues,
          issueStats,
          {
            code: 'PLAYER_CHARACTER_LINK_MISSING',
            detail: `Player ${id} has characterId ${characterId} but no PLAYER_CHARACTER link was found.`,
            entityType: EntityType.PLAYER,
            entityId: id,
            severity: 'warning',
          },
        );
      }
    } else if (characterLinks.length > 0) {
      const linkTargets = characterLinks.map((link) => link.target.id);
      missingTargetCount += linkTargets.length;
      pushIssue(
        issues,
        issueStats,
        {
          code: 'PLAYER_CHARACTER_LINK_EXTRA',
          detail: `Player ${id} has PLAYER_CHARACTER links (${linkTargets.join(', ')}) but no characterId in the entity.`,
          entityType: EntityType.PLAYER,
          entityId: id,
          severity: 'warning',
        },
      );
    }

    for (const link of finrecLinks) {
      const finRecId = link.target.id;
      const finRec = await getFinancialById(finRecId);
      if (!finRec) {
        missingTargetCount += 1;
        pushIssue(
          issues,
          issueStats,
          {
            code: 'PLAYER_FINREC_ORPHAN',
            detail: `Player ${id} has PLAYER_FINREC link to missing FinancialRecord ${finRecId}.`,
            entityType: EntityType.PLAYER,
            entityId: id,
            severity: 'warning',
          },
        );
        continue;
      }

      if (finRec.type === 'personal') {
        personalFinrecRecordCount += 1;
        const value = asFiniteNumber(finRec.jungleCoins);
        if (value) {
          personalJungleCoinsBalance += value;
        }
      }
    }
  }

  const totalInconsistencyCount = idsIndexedButMissingData.length + idsDataButNotIndexed.length;
  const result: PlayerAuditResult = {
    entity: 'player',
    totalIndexed: indexedIds.length,
    totalStored: dataIds.length,
    indexDataIssues: {
      idsIndexedButMissingData: idsIndexedButMissingData.length,
      idsDataButNotIndexed: idsDataButNotIndexed.length,
    },
    indexGhostSamples: idsIndexedButMissingData.slice(0, 25),
    dataGhostSamples: idsDataButNotIndexed.slice(0, 25),
    points: {
      invalidPointsCount,
      totalLessThanAvailableCount,
    },
    links: {
      missingCharacterLinkCount,
      missingTargetCount,
      playerFinrecRecordCount,
      personalFinrecRecordCount,
      personalJungleCoinsBalance,
    },
    issues: issues.slice(0, MAX_ISSUES),
    ok: totalInconsistencyCount === 0 && issues.every((issue) => issue.severity !== 'error'),
  };

  return result;
}

export async function runDatabaseAudit(entityType: string): Promise<{ entity: string; data: PlayerAuditResult } | { error: string }> {
  const normalized = parseEntityTypeParameter(entityType);
  if (normalized !== EntityType.PLAYER) {
    return { error: `Unsupported entityType "${entityType}". Supported: player` };
  }
  const data = await runPlayerAudit();
  return { entity: 'player', data };
}
