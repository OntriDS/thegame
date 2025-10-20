// app/api/player-log/route.ts
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
    const playerLog = await kvGet(buildLogKey(EntityType.PLAYER));

    if (playerLog) {
      return NextResponse.json({ entries: playerLog });
    }

    // In development, read from filesystem
    const filePath = path.join(process.cwd(), 'logs-research', 'player-log.json');

    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const playerLogData = JSON.parse(fileContent);
      return NextResponse.json({ entries: playerLogData });
    } catch (fileError) {
      console.error('Error reading player-log.json:', fileError);
      return NextResponse.json({ entries: [] });
    }

  } catch (error) {
    console.error('Error fetching player log:', error);
    return NextResponse.json({ error: 'Failed to fetch player log' }, { status: 500 });
  }
}
