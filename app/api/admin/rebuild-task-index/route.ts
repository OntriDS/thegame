// app/api/admin/rebuild-task-index/route.ts
import { NextResponse } from 'next/server';
import { rebuildTaskParentChildIndex } from '@/lib/utils/task-index-migration';

export async function POST() {
  try {
    const result = await rebuildTaskParentChildIndex();
    return NextResponse.json({ 
      success: true, 
      message: 'Task parent-child index rebuilt successfully',
      ...result
    });
  } catch (error: any) {
    console.error('[API] Index rebuild failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
