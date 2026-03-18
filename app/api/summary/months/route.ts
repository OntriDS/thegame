// app/api/summary/months/route.ts
import { NextResponse } from 'next/server';
import { getAvailableMonths } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const months = await getAvailableMonths();
    return NextResponse.json(months);
  } catch (error: any) {
    console.error('[Summary Months API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available months' },
      { status: 500 }
    );
  }
}
