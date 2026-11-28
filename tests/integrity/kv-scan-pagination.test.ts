import { beforeEach, describe, expect, it, vi } from 'vitest';

const { scan } = vi.hoisted(() => ({ scan: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@upstash/redis', () => ({ Redis: { fromEnv: () => ({ scan }) } }));

import { kvScan } from '@/lib/utils/kv';

describe('kvScan cursor pagination', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves large Upstash cursors as strings until the scan finishes', async () => {
    const largeCursor = '9995164567208174304';
    scan
      .mockResolvedValueOnce([largeCursor, ['link-1']])
      .mockResolvedValueOnce(['0', ['link-2']]);

    const result = await kvScan('thegame:links:link:', 500);

    expect(scan).toHaveBeenNthCalledWith(1, '0', { match: 'thegame:links:link:*', count: 500 });
    expect(scan).toHaveBeenNthCalledWith(2, largeCursor, { match: 'thegame:links:link:*', count: 500 });
    expect(result).toEqual(['link-1', 'link-2']);
  });
});
