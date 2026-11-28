import { beforeEach, describe, expect, it, vi } from 'vitest';

const { kvGet, kvMGet, kvScan, kvSMembers, validateBusinessRules, validateLinkTypeCompatibility } = vi.hoisted(() => ({
  kvGet: vi.fn(),
  kvMGet: vi.fn(),
  kvScan: vi.fn(),
  kvSMembers: vi.fn(),
  validateBusinessRules: vi.fn(),
  validateLinkTypeCompatibility: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/utils/kv', () => ({ kvGet, kvMGet, kvScan, kvSMembers }));
vi.mock('@/links/link-validation', () => ({ validateBusinessRules, validateLinkTypeCompatibility }));

import { auditLinkRegistry } from '@/tools/integrity/link-registry';
import { buildDataKey, buildLinkKey, buildLinksGlobalIndexKey, buildLinksIndexKey } from '@/data-store/keys';

describe('auditLinkRegistry', () => {
  const link = {
    id: 'l1',
    linkType: 'TASK_ITEM',
    source: { type: 'task', id: 't1' },
    target: { type: 'item', id: 'i1' },
    relationship: 'produced',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    kvScan.mockImplementation(async (prefix: string) => {
      if (prefix === buildLinkKey('')) return [buildLinkKey('l1')];
      if (prefix === 'thegame:index:links:by-entity:') return [
        buildLinksIndexKey('task', 't1'),
        buildLinksIndexKey('item', 'i1'),
      ];
      return [];
    });
    kvMGet.mockImplementation(async (keys: string[]) => keys.map((key) => key === buildLinkKey('l1') ? link : null));
    kvSMembers.mockImplementation(async (key: string) => {
      if (key === buildLinksGlobalIndexKey()) return ['l1'];
      if (key === buildLinksIndexKey('task', 't1') || key === buildLinksIndexKey('item', 'i1')) return ['l1'];
      return [];
    });
    kvGet.mockResolvedValue({ id: 'exists' });
    validateLinkTypeCompatibility.mockReturnValue({ isValid: true });
    validateBusinessRules.mockResolvedValue({ isValid: true });
  });

  it('reports a consistent registry as checked and performs reads only', async () => {
    const result = await auditLinkRegistry();

    expect(result.status).toBe('checked');
    expect(result.ok).toBe(true);
    expect(result.summary.linkRowsChecked).toBe(1);
    expect(result.summary.issueCount).toBe(0);
    expect(kvGet).toHaveBeenCalledWith(buildDataKey('task' as any, 't1'));
    expect(kvGet).toHaveBeenCalledWith(buildDataKey('item' as any, 'i1'));
  });

  it('reports incompatible endpoints, absent index membership, and stale index IDs', async () => {
    validateLinkTypeCompatibility.mockReturnValue({ isValid: false, reason: 'bad endpoint pair' });
    kvSMembers.mockImplementation(async (key: string) => {
      if (key === buildLinksGlobalIndexKey()) return ['l1', 'missing-global'];
      if (key === buildLinksIndexKey('task', 't1')) return ['stale-endpoint'];
      if (key === buildLinksIndexKey('item', 'i1')) return [];
      return [];
    });

    const result = await auditLinkRegistry();
    const codes = result.issues.map((issue) => issue.code);

    expect(result.ok).toBe(false);
    expect(codes).toContain('LINK_ENDPOINT_TYPES_INVALID');
    expect(codes).toContain('LINK_MISSING_ENDPOINT_INDEX');
    expect(codes).toContain('LINK_INDEX_STALE_MEMBERSHIP');
    expect(codes).toContain('LINK_GLOBAL_INDEX_STALE_MEMBERSHIP');
  });
});
