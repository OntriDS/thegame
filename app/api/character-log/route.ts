// app/api/character-log/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';
import { buildLogKey } from '@/data-store/keys';
import path from 'path';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Try KV first (production)
    const { kvGet } = await import('@/data-store/kv');
    const logKey = buildLogKey(EntityType.CHARACTER);
    console.log('🔥 CHARACTER LOG API DEBUG - Looking for key:', logKey);
    
    const characterLog = await kvGet(logKey);
    console.log('🔥 CHARACTER LOG API DEBUG - Found in KV:', characterLog ? 'YES' : 'NO', characterLog);

    if (characterLog) {
      return NextResponse.json({ entries: characterLog });
    }

    // KV-only system - return empty array if no data in KV
    return NextResponse.json({ entries: [] });

  } catch (error) {
    console.error('Error fetching character log:', error);
    return NextResponse.json({ error: 'Failed to fetch character log' }, { status: 500 });
  }
}