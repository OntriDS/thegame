// app/api/tasks-log/route.ts
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
    const tasksLog = await kvGet(buildLogKey('tasks'));

    if (tasksLog) {
      return NextResponse.json({ entries: tasksLog });
    }

    // In development, read from filesystem
    const filePath = path.join(process.cwd(), 'logs-research', 'tasks-log.json');

    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const tasksLogData = JSON.parse(fileContent);
      return NextResponse.json({ entries: tasksLogData });
    } catch (fileError) {
      console.error('Error reading tasks-log.json:', fileError);
      return NextResponse.json({ entries: [] });
    }

  } catch (error) {
    console.error('Error fetching tasks log:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks log' }, { status: 500 });
  }
}