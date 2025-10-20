// app/api/items-log/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { kvGet } from '@/data-store/kv';
import { buildLogKey } from '@/data-store/keys';
import path from 'path';

export async function GET(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Try KV first (production)
    const { kvGet } = await import('@/data-store/kv');
    const itemsLog = await kvGet(buildLogKey('items'));

    if (itemsLog) {
      return NextResponse.json({ entries: itemsLog });
    }

    // In development, read from filesystem
    const filePath = path.join(process.cwd(), 'logs-research', 'items-log.json');

    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const itemsLogData = JSON.parse(fileContent);
      return NextResponse.json({ entries: itemsLogData });
    } catch (fileError) {
      console.error('Error reading items-log.json:', fileError);
      return NextResponse.json({ entries: [] });
    }

  } catch (error) {
    console.error('Error fetching items log:', error);
    return NextResponse.json({ error: 'Failed to fetch items log' }, { status: 500 });
  }
}