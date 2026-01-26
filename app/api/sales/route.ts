// app/api/sales/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Sale } from '@/types/entities';
import { getAllSales, upsertSale, getSalesForMonth } from '@/data-store/datastore';
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
    let data: Sale[];
    if (month && year) {
      data = await getSalesForMonth(year, month);
    } else {
      const now = new Date();
      // Adjust for UTC rollover (User is UTC-6)
      const adjustedNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      data = await getSalesForMonth(adjustedNow.getFullYear(), adjustedNow.getMonth() + 1);
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as Sale;
    const sale = {
      ...body,
      id: body.id || uuid(),
      links: body.links || [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      saleDate: body.saleDate ? new Date(body.saleDate) : new Date(),
      postedAt: body.postedAt ? new Date(body.postedAt) : undefined,
      doneAt: body.doneAt ? new Date(body.doneAt) : undefined,
      cancelledAt: body.cancelledAt ? new Date(body.cancelledAt) : undefined
    };
    const forceSave = req.nextUrl.searchParams.get('force') === 'true';
    const saved = await upsertSale(sale, { forceSave });
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[API] Error saving sale:', error);

    if (error instanceof Error && error.message.includes('DUPLICATE_SALE_DETECTED')) {
      return NextResponse.json(
        { error: error.message, isDuplicate: true },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save sale' },
      { status: 500 }
    );
  }
}
