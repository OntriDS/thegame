import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { kvGet, kvSet } from '@/data-store/kv';

export const dynamic = 'force-dynamic';

const MATRIX_STATE_KEY = 'thegame:research:matrix-state';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request);
    const state = await kvGet(MATRIX_STATE_KEY);
    return NextResponse.json(state || { tasks: null, rules: null });
  } catch (error) {
    console.error('Matrix state GET error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request);
    
    const body = await request.json();
    await kvSet(MATRIX_STATE_KEY, body);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Matrix state POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
