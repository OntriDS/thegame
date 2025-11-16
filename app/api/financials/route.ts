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

  const normalizeYear = (y: string | null): number | null => {
    if (!y) return null;
    const n = parseInt(y, 10);
    if (isNaN(n)) return null;
    return n < 100 ? 2000 + n : n;
  };
  const parseMonth = (m: string | null): number | null => {
    if (!m) return null;
    const n = parseInt(m, 10);
    if (isNaN(n) || n < 1 || n > 12) return null;
    return n;
  };

  const month = parseMonth(monthParam);
  const year = normalizeYear(yearParam);

  try {
    let data: FinancialRecord[];
    if (month && year) {
      data = await getFinancialsForMonth(year, month);
    } else {
      const now = new Date();
      data = await getFinancialsForMonth(now.getFullYear(), now.getMonth() + 1);
    }
    return NextResponse.json(data);
  } catch (error) {
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
