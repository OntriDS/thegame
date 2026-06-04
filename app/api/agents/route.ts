import { NextResponse } from 'next/server';
import { getAllAgents } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const agents = await getAllAgents();
    return NextResponse.json({ success: true, data: agents });
  } catch (error) {
    console.error('[Agents API] Error fetching agents:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch agents' }, { status: 500 });
  }
}
