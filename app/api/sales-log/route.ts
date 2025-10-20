// app/api/sales-log/route.ts
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
    const salesLog = await kvGet(buildLogKey('sales'));

    if (salesLog) {
      return NextResponse.json({ entries: salesLog });
    }

    // In development, read from filesystem
    const filePath = path.join(process.cwd(), 'logs-research', 'sales-log.json');

    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const salesLogData = JSON.parse(fileContent);
      return NextResponse.json({ entries: salesLogData });
    } catch (fileError) {
      console.error('Error reading sales-log.json:', fileError);
      return NextResponse.json({ entries: [] });
    }

  } catch (error) {
    console.error('Error fetching sales log:', error);
    return NextResponse.json({ error: 'Failed to fetch sales log' }, { status: 500 });
  }
}