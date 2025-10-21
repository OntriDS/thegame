// app/api/financials-log/route.ts
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
    const financialsLog = await kvGet(buildLogKey(EntityType.FINANCIAL));

    if (financialsLog) {
      return NextResponse.json({ entries: financialsLog });
    }

    // KV-only system - return empty array if no data in KV
    return NextResponse.json({ entries: [] });

  } catch (error) {
    console.error('Error fetching financials log:', error);
    return NextResponse.json({ error: 'Failed to fetch financials log' }, { status: 500 });
  }
}