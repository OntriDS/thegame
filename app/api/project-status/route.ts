// app/api/project-status/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // In production (Vercel), read from KV
    if (process.env.VERCEL) {
      const { kvGet } = await import('@/data-store/kv');
      const projectStatus = await kvGet('data:project-status');

      if (projectStatus) {
        return NextResponse.json(projectStatus);
      } else {
        return NextResponse.json({});
      }
    } else {
      // In development, read from filesystem
      const filePath = path.join(process.cwd(), 'PROJECT-STATUS.json');

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const projectStatus = JSON.parse(fileContent);
        return NextResponse.json(projectStatus);
      } catch (fileError) {
        console.error('Error reading PROJECT-STATUS.json:', fileError);
        return NextResponse.json({});
      }
    }
  } catch (error) {
    console.error('Error loading project status:', error);
    return NextResponse.json({ error: 'Failed to load project status' }, { status: 500 });
  }
}