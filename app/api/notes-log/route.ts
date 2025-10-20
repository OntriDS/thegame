// app/api/notes-log/route.ts
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
      const notesData = await kvGet('data:notes-log');

      if (notesData) {
        return NextResponse.json(notesData);
      } else {
        return NextResponse.json({ entries: [] });
      }
    } else {
      // In development, read from filesystem
      const filePath = path.join(process.cwd(), 'logs-research', 'notes-log.json');

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const notesData = JSON.parse(fileContent);
        return NextResponse.json(notesData);
      } catch (fileError) {
        console.error('Error reading notes-log.json:', fileError);
        return NextResponse.json({ entries: [] });
      }
    }
  } catch (error) {
    console.error('Error loading notes log:', error);
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 });
  }
}