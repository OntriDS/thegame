// app/api/sites-log/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || undefined;

    const { getEntityLogs, getEntityLogMonths } = await import('@/data-store/datastore');
    const entries = await getEntityLogs(EntityType.SITE, { month });
    const months = await getEntityLogMonths(EntityType.SITE);

    return NextResponse.json({ entries, months });
  } catch (error) {
    console.error('Error fetching sites log:', error);
    return NextResponse.json({ error: 'Failed to fetch sites log' }, { status: 500 });
  }
}