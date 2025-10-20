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

    // In development, read from filesystem
    const filePath = path.join(process.cwd(), 'logs-research', 'financials-log.json');

    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const financialsLogData = JSON.parse(fileContent);
      return NextResponse.json({ entries: financialsLogData });
    } catch (fileError) {
      console.error('Error reading financials-log.json:', fileError);
      return NextResponse.json({ entries: [] });
    }

  } catch (error) {
    console.error('Error fetching financials log:', error);
    return NextResponse.json({ error: 'Failed to fetch financials log' }, { status: 500 });
  }
}