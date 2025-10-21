// app/api/dev-log/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering since this route accesses request cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('🔥 [Dev Log API] GET request received');
  
  if (!(await requireAdminAuth(req))) {
    console.log('🔥 [Dev Log API] ❌ Auth failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // In production with KV, read from KV
    if (process.env.UPSTASH_REDIS_REST_URL) {
      console.log('🔥 [Dev Log API] Using KV (production)');
      const { kvGet } = await import('@/data-store/kv');
      const devLog = await kvGet('data:dev-log');
      console.log('🔥 [Dev Log API] KV data:', devLog ? 'FOUND' : 'NOT FOUND');

      if (devLog) {
        console.log('🔥 [Dev Log API] ✅ Returning dev log from KV');
        console.log('🔥 [Dev Log API] Data structure:', {
          hasSprints: !!devLog.sprints,
          hasPhases: !!devLog.phases,
          sprintsLength: devLog.sprints?.length || 0,
          phasesLength: devLog.phases?.length || 0,
          keys: Object.keys(devLog)
        });
        return NextResponse.json(devLog);
      } else {
        console.log('🔥 [Dev Log API] ⚠️ No dev log in KV, returning empty structure');
        return NextResponse.json({ sprints: [], phases: [] });
      }
    } else {
      console.log('🔥 [Dev Log API] Using filesystem (development)');
      // In development, read from filesystem
      const filePath = path.join(process.cwd(), 'logs-research', 'dev-log.json');
      console.log('🔥 [Dev Log API] Reading from:', filePath);

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const devLog = JSON.parse(fileContent);
        console.log('🔥 [Dev Log API] ✅ File read successfully');
        return NextResponse.json(devLog);
      } catch (fileError) {
        console.error('🔥 [Dev Log API] ❌ Error reading dev-log.json:', fileError);
        return NextResponse.json({ sprints: [], phases: [] });
      }
    }
  } catch (error) {
    console.error('🔥 [Dev Log API] ❌ Error loading dev log:', error);
    return NextResponse.json({ error: 'Failed to load dev log' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const devLogData = await req.json();

    // In production with KV, write to KV
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const { kvSet } = await import('@/data-store/kv');
      await kvSet('data:dev-log', devLogData);
      return NextResponse.json({ success: true, message: 'Dev log updated successfully' });
    } else {
      // In development, write to filesystem
      const filePath = path.join(process.cwd(), 'logs-research', 'dev-log.json');
      fs.writeFileSync(filePath, JSON.stringify(devLogData, null, 2));
      return NextResponse.json({ success: true, message: 'Dev log updated successfully' });
    }
  } catch (error) {
    console.error('Error saving dev log:', error);
    return NextResponse.json({ error: 'Failed to save dev log' }, { status: 500 });
  }
}