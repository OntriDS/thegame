// __tests__/workflows/logging-idempotency.test.ts
// Lightweight unit tests validating helper behaviors used for reader normalization.
// Full E2E would run against repositories; here we sanity-check processing utils.

import { buildLatestStatusMap, buildLatestNameMap, sortLogEntries, getEntryEventKind } from '@/lib/utils/logging-utils';

describe('logging utils - reader normalization', () => {
  const mk = (id: string, event: string, ts: string, name?: string) => ({
    entityId: id,
    event,
    timestamp: ts,
    name,
    data: name ? { name } : {},
  });

  it('buildLatestStatusMap chooses latest by timestamp', () => {
    const entries = [
      mk('a', 'created', '2025-01-01T00:00:00.000Z'),
      mk('a', 'done', '2025-02-01T00:00:00.000Z'),
      mk('a', 'status_changed', '2024-12-01T00:00:00.000Z'),
    ];
    const map = buildLatestStatusMap(entries as any);
    expect(map['a']).toBe('done');
  });

  it('buildLatestNameMap captures newest name', () => {
    const entries = [
      mk('b', 'created', '2025-01-01T00:00:00.000Z', 'Old'),
      mk('b', 'updated', '2025-03-01T00:00:00.000Z', 'New'),
    ];
    const map = buildLatestNameMap(entries as any);
    expect(map['b']).toBe('New');
  });

  it('sortLogEntries respects _logOrder tie-breaker', () => {
    const entries = [
      { entityId: 'c', event: 'done', timestamp: '2025-01-01T00:00:00.000Z', _logOrder: 1 },
      { entityId: 'c', event: 'created', timestamp: '2025-01-01T00:00:00.000Z', _logOrder: 0 },
    ];
    const sorted = sortLogEntries(entries as any, 'newest');
    expect(sorted[0].event).toBe('created');
    expect(sorted[1].event).toBe('done');
  });

  it('getEntryEventKind normalizes kind', () => {
    expect(getEntryEventKind({ event: 'DONE' })).toBe('done');
    expect(getEntryEventKind({ status: 'Created' })).toBe('created');
    expect(getEntryEventKind({ type: 'unknown' })).toBe('unknown');
  });
});


