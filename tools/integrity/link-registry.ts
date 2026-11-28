import 'server-only';

import { CanonicalLinkType, EntityType, LinkType } from '@/types/enums';
import { buildLinkKey, buildLinksGlobalIndexKey } from '@/data-store/keys';
import { kvMGet, kvScan, kvSMembers } from '@/lib/utils/kv';
import { validateBusinessRules, validateLinkTypeCompatibility } from '@/links/link-validation';
import type { Link } from '@/types/entities';

const MAX_LINKS = 5000;
const MAX_INDEX_KEYS = 20000;
const MAX_ISSUES = 200;
const LINK_KEY_PREFIX = buildLinkKey('');
const ENTITY_INDEX_PREFIX = 'thegame:index:links:by-entity:';
const CANONICAL_RELATIONSHIPS: Partial<Record<CanonicalLinkType, readonly string[]>> = {
  [CanonicalLinkType.TASK_ITEM]: ['requested', 'produced', 'repaired'],
  [CanonicalLinkType.ITEM_SITE]: ['stored-at', 'displayed-at', 'in-transit'],
  [CanonicalLinkType.ACCOUNT_CHARACTER]: ['primary'],
  [CanonicalLinkType.CHARACTER_PLAYER]: ['primary'],
  [CanonicalLinkType.CHARACTER_SITE]: ['owns'],
  [CanonicalLinkType.TASK_TASK]: ['parent'],
  [CanonicalLinkType.TASK_SITE]: ['performed-at'],
  [CanonicalLinkType.TASK_CHARACTER]: ['owner', 'customer', 'beneficiary', 'creator'],
  [CanonicalLinkType.TASK_PLAYER]: ['points-earned'],
  [CanonicalLinkType.TASK_FINREC]: ['task-record'],
  [CanonicalLinkType.ITEM_CHARACTER]: ['owned-by'],
  [CanonicalLinkType.SALE_ITEM]: ['sold-item'],
  [CanonicalLinkType.SALE_TASK]: ['sold-service'],
  [CanonicalLinkType.SALE_FINREC]: ['sale-record'],
  [CanonicalLinkType.SALE_PLAYER]: ['points-earned'],
  [CanonicalLinkType.SALE_CHARACTER]: ['customer', 'owner', 'partner'],
  [CanonicalLinkType.FINREC_SITE]: ['source-site', 'target-site'],
  [CanonicalLinkType.FINREC_ITEM]: ['item-bought'],
  [CanonicalLinkType.SALE_SITE]: ['sold-at'],
  [CanonicalLinkType.SITE_SETTLEMENT]: ['located-in'],
  [CanonicalLinkType.FINREC_CHARACTER]: ['customer', 'beneficiary'],
  [CanonicalLinkType.SITE_SITE]: ['moved-to'],
  [CanonicalLinkType.CHARACTER_CONTRACT]: ['owner', 'counterparty'],
  [CanonicalLinkType.CHARACTER_BUSINESS]: ['owns', 'represents'],
};
const BUSINESS_RULE_LINK_TYPES = new Set<LinkType>([
  LinkType.PLAYER_CHARACTER,
  LinkType.TASK_SITE,
  LinkType.ITEM_SITE,
  LinkType.SALE_ITEM,
  LinkType.CHARACTER_PLAYER,
  LinkType.SALE_CHARACTER,
  LinkType.SALE_BUSINESS,
  LinkType.ACCOUNT_CHARACTER,
  LinkType.CHARACTER_ACCOUNT,
  LinkType.CHARACTER_ITEM,
  LinkType.SITE_CHARACTER,
]);

type Issue = {
  code: string;
  linkId?: string;
  entityType?: string;
  entityId?: string;
  detail: string;
};

type LinkRow = Link & Record<string, unknown>;

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function endpoint(value: unknown): { type: string; id: string } | null {
  const row = asObject(value);
  return row && typeof row.type === 'string' && row.type.length > 0 &&
    typeof row.id === 'string' && row.id.length > 0
    ? { type: row.type, id: row.id }
    : null;
}

async function entityExists(type: string, id: string): Promise<boolean> {
  if (!Object.values(EntityType).includes(type as EntityType)) return false;
  if (type === EntityType.ACCOUNT) {
    const { iamService } = await import('@/lib/iam-service');
    return !!(await iamService.getAccountById(id));
  }
  const { buildDataKey } = await import('@/data-store/keys');
  const { kvGet } = await import('@/lib/utils/kv');
  return !!(await kvGet(buildDataKey(type as EntityType, id)));
}

function cachedEntityExists(cache: Map<string, Promise<boolean>>, type: string, id: string): Promise<boolean> {
  const key = `${type}:${id}`;
  let result = cache.get(key);
  if (!result) {
    result = entityExists(type, id);
    cache.set(key, result);
  }
  return result;
}

function pushIssue(issues: Issue[], total: { count: number }, issue: Issue) {
  total.count += 1;
  if (issues.length < MAX_ISSUES) issues.push(issue);
}

/** Full read-only scan of Link rows and the active Link indexes. */
export async function auditLinkRegistry() {
  const issues: Issue[] = [];
  const total = { count: 0 };
  const endpointExistence = new Map<string, Promise<boolean>>();
  const allLinkKeys = [...new Set(await kvScan(LINK_KEY_PREFIX, 500))].sort();
  const indexKeysAll = [...new Set(await kvScan(ENTITY_INDEX_PREFIX, 500))].sort();
  const allIndexKeySet = new Set(indexKeysAll);
  const globalIds = new Set(await kvSMembers(buildLinksGlobalIndexKey()));
  const selectedLinkKeys = allLinkKeys.slice(0, MAX_LINKS);
  const selectedIndexKeys = indexKeysAll.slice(0, MAX_INDEX_KEYS);
  const persistedLinkIds = new Set(selectedLinkKeys.map((key) => key.slice(LINK_KEY_PREFIX.length)));
  const rawRows = selectedLinkKeys.length ? await kvMGet<unknown>(selectedLinkKeys) : [];
  const linksById = new Map<string, LinkRow>();
  let malformedRows = 0;

  for (let index = 0; index < selectedLinkKeys.length; index += 1) {
    const key = selectedLinkKeys[index];
    const row = asObject(rawRows[index]);
    const keyId = key.slice(LINK_KEY_PREFIX.length);
    const source = endpoint(row?.source);
    const target = endpoint(row?.target);
    const linkId = typeof row?.id === 'string' ? row.id : keyId;
    if (!row || !linkId || !source || !target || typeof row.linkType !== 'string') {
      malformedRows += 1;
      pushIssue(issues, total, { code: 'LINK_ROW_MALFORMED', linkId, detail: `Persisted Link row at ${key} is missing a valid id, linkType, source, or target.` });
      continue;
    }
    const link = { ...row, id: linkId, source, target } as LinkRow;
    linksById.set(linkId, link);
    if (keyId !== linkId) {
      pushIssue(issues, total, { code: 'LINK_KEY_ID_MISMATCH', linkId, detail: `Storage key id ${keyId} differs from row id ${linkId}.` });
    }
    if (!globalIds.has(linkId)) {
      pushIssue(issues, total, { code: 'LINK_MISSING_GLOBAL_INDEX', linkId, detail: 'Persisted Link row is absent from the active global Link index.' });
    }

    if (!Object.values(LinkType).includes(link.linkType as LinkType)) {
      pushIssue(issues, total, { code: 'LINK_TYPE_UNKNOWN', linkId, detail: `Unknown Link type: ${String(link.linkType)}.` });
    } else {
      const compatibility = validateLinkTypeCompatibility(
        link.linkType as LinkType,
        source.type as EntityType,
        target.type as EntityType,
      );
      if (!compatibility.isValid) {
        pushIssue(issues, total, { code: 'LINK_ENDPOINT_TYPES_INVALID', linkId, detail: compatibility.reason || 'Link type does not match endpoint types.' });
      }
    }
    const canonicalRelationships = CANONICAL_RELATIONSHIPS[link.linkType as CanonicalLinkType];
    if (canonicalRelationships && (!canonicalRelationships.includes(String(link.relationship ?? '')))) {
      pushIssue(issues, total, { code: 'LINK_RELATIONSHIP_INVALID', linkId, detail: `Relationship ${String(link.relationship ?? '(missing)')} is invalid for ${String(link.linkType)}; expected one of: ${canonicalRelationships.join(', ')}.` });
    }

    if (source.type === target.type && source.id === target.id) {
      pushIssue(issues, total, { code: 'LINK_SELF_REFERENCE', linkId, detail: `Link points from ${source.type}:${source.id} to itself.` });
    }

    for (const [side, ref] of [['source', source], ['target', target]] as const) {
      try {
        if (!(await cachedEntityExists(endpointExistence, ref.type, ref.id))) {
          pushIssue(issues, total, {
            code: side === 'source' ? 'LINK_SOURCE_MISSING' : 'LINK_TARGET_MISSING',
            linkId,
            entityType: ref.type,
            entityId: ref.id,
            detail: `${side} entity ${ref.type}:${ref.id} does not exist in its canonical store.`,
          });
        }
      } catch (error) {
        pushIssue(issues, total, { code: 'LINK_ENDPOINT_CHECK_UNAVAILABLE', linkId, entityType: ref.type, entityId: ref.id, detail: `Could not verify ${side} entity: ${error instanceof Error ? error.message : 'read failed'}.` });
      }
    }
  }

  const semanticLinks = new Map<string, string>();
  for (const link of linksById.values()) {
    const source = endpoint(link.source)!;
    const target = endpoint(link.target)!;
    const signature = [link.linkType, source.type, source.id, target.type, target.id, String(link.relationship ?? '')].join('|');
    const firstId = semanticLinks.get(signature);
    if (firstId) {
      pushIssue(issues, total, { code: 'LINK_DUPLICATE_SEMANTIC', linkId: link.id, detail: `Duplicates Link ${firstId} for the same directed endpoints, type, and relationship.` });
    } else {
      semanticLinks.set(signature, link.id);
    }

    if (BUSINESS_RULE_LINK_TYPES.has(link.linkType as LinkType)) {
      try {
        const rules = await validateBusinessRules(link.linkType as LinkType, source as any, target as any, typeof link.relationship === 'string' ? link.relationship : undefined);
        if (!rules.isValid) {
          pushIssue(issues, total, { code: 'LINK_BUSINESS_RULE_INVALID', linkId: link.id, detail: rules.reason || 'Link failed a business rule.' });
        }
        for (const warning of rules.warnings ?? []) {
          pushIssue(issues, total, { code: 'LINK_BUSINESS_RULE_WARNING', linkId: link.id, detail: warning });
        }
      } catch (error) {
        pushIssue(issues, total, { code: 'LINK_BUSINESS_RULE_CHECK_UNAVAILABLE', linkId: link.id, detail: error instanceof Error ? error.message : 'Business-rule check failed.' });
      }
    }
  }

  let endpointIndexMemberships = 0;
  let staleEndpointMemberships = 0;
  let missingEndpointMemberships = 0;
  const endpointMembersByKey = new Map<string, Set<string>>();
  for (const indexKey of selectedIndexKeys) {
    const entityKey = indexKey.slice(ENTITY_INDEX_PREFIX.length);
    const separator = entityKey.indexOf(':');
    const entityType = separator < 0 ? entityKey : entityKey.slice(0, separator);
    const entityId = separator < 0 ? '' : entityKey.slice(separator + 1);
    const memberIds = await kvSMembers(indexKey);
    endpointMembersByKey.set(indexKey, new Set(memberIds));
    endpointIndexMemberships += memberIds.length;
    for (const linkId of memberIds) {
      if (!persistedLinkIds.has(linkId) && allLinkKeys.length <= MAX_LINKS) {
        staleEndpointMemberships += 1;
        pushIssue(issues, total, { code: 'LINK_INDEX_STALE_MEMBERSHIP', linkId, entityType, entityId, detail: `Endpoint index ${indexKey} refers to a Link row that does not exist.` });
      }
    }
  }

  for (const link of linksById.values()) {
    for (const ref of [endpoint(link.source), endpoint(link.target)]) {
      if (!ref) continue;
      const indexKey = `${ENTITY_INDEX_PREFIX}${ref.type}:${ref.id}`;
      if (allIndexKeySet.has(indexKey) && !endpointMembersByKey.has(indexKey)) continue;
      const members = endpointMembersByKey.get(indexKey);
      if (!members?.has(link.id)) {
        missingEndpointMemberships += 1;
        pushIssue(issues, total, { code: 'LINK_MISSING_ENDPOINT_INDEX', linkId: link.id, entityType: ref.type, entityId: ref.id, detail: `Link is absent from endpoint index ${indexKey}.` });
      }
    }
  }

  for (const linkId of globalIds) {
    const existsInScannedRows = persistedLinkIds.has(linkId);
    if (!existsInScannedRows && allLinkKeys.length <= MAX_LINKS) {
      pushIssue(issues, total, { code: 'LINK_GLOBAL_INDEX_STALE_MEMBERSHIP', linkId, detail: 'Active global Link index refers to a Link row that does not exist.' });
    }
  }

  const partial = allLinkKeys.length > MAX_LINKS || indexKeysAll.length > MAX_INDEX_KEYS;
  return {
    ok: total.count === 0 && !partial,
    audit: 'linkRegistryIntegrity',
    scope: 'all persisted TheGame Link rows and active Link indexes',
    status: partial ? 'partial' : 'checked',
    summary: {
      linkRowsFound: allLinkKeys.length,
      linkRowsChecked: selectedLinkKeys.length,
      malformedRows,
      globalIndexMembers: globalIds.size,
      endpointIndexKeysFound: indexKeysAll.length,
      endpointIndexKeysChecked: selectedIndexKeys.length,
      endpointIndexMembershipsRead: endpointIndexMemberships,
      missingEndpointMemberships,
      staleEndpointMemberships,
      issueCount: total.count,
      issuesReturned: issues.length,
      truncated: total.count > issues.length,
      caps: { links: MAX_LINKS, endpointIndexKeys: MAX_INDEX_KEYS, issues: MAX_ISSUES },
      notes: 'Read-only scan. Missing required business relationships are not inferred; only explicit Link records and registry rules are checked.',
    },
    issues,
  };
}

export async function execute() {
  try {
    return await auditLinkRegistry();
  } catch (error) {
    return {
      ok: false,
      audit: 'linkRegistryIntegrity',
      scope: 'all persisted TheGame Link rows and active Link indexes',
      status: 'unavailable',
      summary: { issueCount: 0, issuesReturned: 0, truncated: false, notes: error instanceof Error ? error.message : 'Link registry scan failed.' },
      issues: [],
    };
  }
}
