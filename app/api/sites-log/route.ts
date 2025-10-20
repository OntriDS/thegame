// app/api/sites-log/route.ts
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
    const sitesLog = await kvGet(buildLogKey(EntityType.SITE));

    if (sitesLog) {
      return NextResponse.json({ entries: sitesLog });
    }

    // In development, read from filesystem
    const filePath = path.join(process.cwd(), 'logs-research', 'sites-log.json');

    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const sitesLogData = JSON.parse(fileContent);
      return NextResponse.json({ entries: sitesLogData });
    } catch (fileError) {
      console.error('Error reading sites-log.json:', fileError);
      return NextResponse.json({ entries: [] });
    }

  } catch (error) {
    console.error('Error fetching sites log:', error);
    return NextResponse.json({ error: 'Failed to fetch sites log' }, { status: 500 });
  }
}