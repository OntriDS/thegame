// app/api/project-status/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering since this route accesses request cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('🔥 [Project Status API] GET request received');
  
  if (!(await requireAdminAuth(req))) {
    console.log('🔥 [Project Status API] ❌ Auth failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // In production with KV, read from KV
    if (process.env.UPSTASH_REDIS_REST_URL) {
      console.log('🔥 [Project Status API] Using KV (production)');
      const { kvGet } = await import('@/data-store/kv');
      const projectStatus = await kvGet('data:project-status');
      console.log('🔥 [Project Status API] KV data:', projectStatus ? 'FOUND' : 'NOT FOUND');

      if (projectStatus) {
        console.log('🔥 [Project Status API] ✅ Returning project status from KV');
        console.log('🔥 [Project Status API] Data structure:', {
          hasPhasePlan: !!projectStatus.phasePlan,
          hasCurrentSprint: !!projectStatus.currentSprint,
          keys: Object.keys(projectStatus)
        });
        return NextResponse.json(projectStatus);
      } else {
        console.log('🔥 [Project Status API] ⚠️ No project status in KV, returning empty object');
        return NextResponse.json({});
      }
    } else {
      console.log('🔥 [Project Status API] Using filesystem (development)');
      // In development, read from filesystem
      const filePath = path.join(process.cwd(), 'PROJECT-STATUS.json');
      console.log('🔥 [Project Status API] Reading from:', filePath);

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const projectStatus = JSON.parse(fileContent);
        console.log('🔥 [Project Status API] ✅ File read successfully');
        return NextResponse.json(projectStatus);
      } catch (fileError) {
        console.error('🔥 [Project Status API] ❌ Error reading PROJECT-STATUS.json:', fileError);
        return NextResponse.json({});
      }
    }
  } catch (error) {
    console.error('🔥 [Project Status API] ❌ Error loading project status:', error);
    return NextResponse.json({ error: 'Failed to load project status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projectStatusData = await req.json();

    // In production with KV, write to KV
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const { kvSet } = await import('@/data-store/kv');
      await kvSet('data:project-status', projectStatusData);
      return NextResponse.json({ success: true, message: 'Project status updated successfully' });
    } else {
      // In development, write to filesystem
      const filePath = path.join(process.cwd(), 'PROJECT-STATUS.json');
      fs.writeFileSync(filePath, JSON.stringify(projectStatusData, null, 2));
      return NextResponse.json({ success: true, message: 'Project status updated successfully' });
    }
  } catch (error) {
    console.error('Error saving project status:', error);
    return NextResponse.json({ error: 'Failed to save project status' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { phaseKey, newStatus } = await req.json();

    if (!phaseKey || !newStatus) {
      return NextResponse.json({ 
        error: 'Missing required fields: phaseKey and newStatus' 
      }, { status: 400 });
    }

    // Get current project status
    let projectStatus: any;
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const { kvGet, kvSet } = await import('@/data-store/kv');
      projectStatus = await kvGet('data:project-status');
      
      if (projectStatus && projectStatus.phasePlan && projectStatus.phasePlan[phaseKey]) {
        projectStatus.phasePlan[phaseKey].status = newStatus;
        projectStatus.lastUpdated = new Date().toISOString();
        await kvSet('data:project-status', projectStatus);
      } else {
        return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
      }
    } else {
      // In development, read from filesystem
      const filePath = path.join(process.cwd(), 'PROJECT-STATUS.json');
      projectStatus = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (projectStatus.phasePlan && projectStatus.phasePlan[phaseKey]) {
        projectStatus.phasePlan[phaseKey].status = newStatus;
        projectStatus.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(projectStatus, null, 2));
      } else {
        return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Phase ${phaseKey} status updated to ${newStatus}`,
      data: projectStatus
    });

  } catch (error) {
    console.error('Error updating phase status:', error);
    return NextResponse.json({ error: 'Failed to update phase status' }, { status: 500 });
  }
}