import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllItems } from '@/data-store/datastore';
import { buildItemActiveIndexKey, buildItemLegacyIndexKey, buildIndexKey } from '@/data-store/keys';
import { kvSAdd, kvSRem, kvDel } from '@/data-store/kv';
import { ItemStatus } from '@/types/enums';
import { isSoldStatus } from '@/lib/utils/status-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await getAllItems();
    
    // Clear the active and legacy sets completely first to ensure a pristine state
    await kvDel(buildItemActiveIndexKey());
    await kvDel(buildItemLegacyIndexKey());

    const activeIds: string[] = [];
    const legacyIds: string[] = [];

    let legacyCount = 0;
    let activeCount = 0;
    let ignoredCount = 0; // sold / collected items are neither, but stay in the main index

    for (const item of items) {
      if (item.status === ItemStatus.LEGACY) {
        legacyIds.push(item.id);
        legacyCount++;
        // Remove from main index if desired (based on our repo logic, legacy is hidden purely)
        await kvSRem(buildIndexKey('item'), item.id);
      } else if (!isSoldStatus(item.status)) {
        activeIds.push(item.id);
        activeCount++;
      } else {
        ignoredCount++;
      }
    }

    // Add in bulk
    for (const id of legacyIds) {
      await kvSAdd(buildItemLegacyIndexKey(), id);
    }

    for (const id of activeIds) {
      await kvSAdd(buildItemActiveIndexKey(), id);
    }

    return NextResponse.json({
      success: true,
      message: 'Items re-indexed successfully.',
      reindexedCount: activeCount + legacyCount,
      details: {
        activeUnitsDetected: activeCount,
        legacyUnitsDetected: legacyCount,
        archivedUnitsIgnored: ignoredCount,
        totalScanned: items.length
      }
    });
  } catch (error) {
    console.error('[init/reindex-items] Failed:', error);
    return NextResponse.json({ error: 'Failed to reindex items' }, { status: 500 });
  }
}
