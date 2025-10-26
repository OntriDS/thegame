// app/api/financials/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { FinancialRecord } from '@/types/entities';
import { getAllFinancials, upsertFinancial } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
import { convertEntityDates } from '@/lib/constants/date-constants';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const financials = await getAllFinancials();
  return NextResponse.json(financials);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const body = (await req.json()) as FinancialRecord;
    const financial = convertEntityDates(
      { ...body, id: body.id || uuid(), links: body.links || [] },
      []
    );
    const saved = await upsertFinancial(financial);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[API] Error saving financial record:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save financial record' },
      { status: 500 }
    );
  }
}
