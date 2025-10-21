// app/api/dev-log/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering since this route accesses request cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // In production with KV, read from KV
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const { kvGet } = await import('@/data-store/kv');
      const devLog = await kvGet('data:dev-log');

      if (devLog) {
        return NextResponse.json(devLog);
      } else {
        return NextResponse.json({ sprints: [], phases: [] });
      }
    } else {
      // In development, read from filesystem
      const filePath = path.join(process.cwd(), 'logs-research', 'dev-log.json');

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const devLog = JSON.parse(fileContent);
        return NextResponse.json(devLog);
      } catch (fileError) {
        console.error('Error reading dev-log.json:', fileError);
        return NextResponse.json({ sprints: [], phases: [] });
      }
    }
  } catch (error) {
    console.error('Error loading dev log:', error);
    return NextResponse.json({ error: 'Failed to load dev log' }, { status: 500 });
  }
}