// app/api/financials/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { FinancialRecord } from '@/types/entities';
import { getAllFinancials, upsertFinancial, getFinancialsForMonth } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = req.nextUrl.searchParams;
  const monthParam = params.get('month');
  const yearParam = params.get('year');

  const now = new Date();
  // Adjust for UTC rollover (User is UTC-6)
  const adjustedNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  // 1. Strict Parsing and Validation
  let year = yearParam ? parseInt(yearParam, 10) : adjustedNow.getFullYear();
  let month = monthParam ? parseInt(monthParam, 10) : adjustedNow.getMonth() + 1;

  // Normalize year (e.g. 26 -> 2026)
  if (year < 100) year += 2000;

  // Bounds validation
  if (isNaN(year) || year < 2024 || year > 2100) year = adjustedNow.getFullYear();
  if (isNaN(month) || month < 1 || month > 12) month = adjustedNow.getMonth() + 1;

  try {
    // 2. Optimized Unified Fetching (Active + Archive)
    const data = await getFinancialsForMonth(year, month);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Failed to fetch financials:', error);
    return NextResponse.json({ error: 'Failed to fetch financial records' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as FinancialRecord;
    const financial = {
      ...body,
      id: body.id || uuid(),
      links: body.links || [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date()
    };
    const forceSave = req.nextUrl.searchParams.get('force') === 'true';
    const saved = await upsertFinancial(financial, { forceSave });
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[API] Error saving financial record:', error);

    if (error instanceof Error && error.message.includes('DUPLICATE_FINANCIAL_DETECTED')) {
      return NextResponse.json(
        { error: error.message, isDuplicate: true },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save financial record' },
      { status: 500 }
    );
  }
}
