import { NextResponse } from 'next/server';
import { syncUniversityState } from '@/tools/core/sync-university-state';

export async function POST() {
  try {
    await syncUniversityState();
    return NextResponse.json({ success: true, message: 'Agents successfully synchronized from university-state.md' });
  } catch (error: any) {
    console.error('[Agents Sync API] Error synchronizing agents:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to synchronize agents' }, { status: 500 });
  }
}
