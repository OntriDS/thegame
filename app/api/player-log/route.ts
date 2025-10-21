// app/api/player-log/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';
import { buildLogKey } from '@/data-store/keys';
import path from 'path';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🔥 [Player Log API] GET request received');
  
  if (!(await requireAdminAuth(request))) {
    console.log('🔥 [Player Log API] ❌ Auth failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Try KV first (production)
    const { kvGet } = await import('@/data-store/kv');
    const logKey = buildLogKey(EntityType.PLAYER);
    console.log('🔥 [Player Log API] Looking for key:', logKey);
    
    const playerLog = await kvGet(logKey);
    console.log('🔥 [Player Log API] Found:', playerLog ? 'YES' : 'NO');
    console.log('🔥 [Player Log API] Entries:', playerLog?.length || 0);
    console.log('🔥 [Player Log API] Data:', JSON.stringify(playerLog, null, 2));

    if (playerLog) {
      return NextResponse.json({ entries: playerLog });
    }

    // KV-only system - return empty array if no data in KV
    return NextResponse.json({ entries: [] });

  } catch (error) {
    console.error('🔥 [Player Log API] ❌ Error:', error);
    return NextResponse.json({ error: 'Failed to fetch player log' }, { status: 500 });
  }
}
