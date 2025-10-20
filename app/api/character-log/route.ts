// app/api/character-log/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
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
    const characterLog = await kvGet(buildLogKey('character'));

    if (characterLog) {
      return NextResponse.json({ entries: characterLog });
    }

    // In development, read from filesystem
    const filePath = path.join(process.cwd(), 'logs-research', 'character-log.json');

    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const characterLogData = JSON.parse(fileContent);
      return NextResponse.json({ entries: characterLogData });
    } catch (fileError) {
      console.error('Error reading character-log.json:', fileError);
      return NextResponse.json({ entries: [] });
    }

  } catch (error) {
    console.error('Error fetching character log:', error);
    return NextResponse.json({ error: 'Failed to fetch character log' }, { status: 500 });
  }
}