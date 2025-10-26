// app/api/sales/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Sale } from '@/types/entities';
import { getAllSales, upsertSale } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sales = await getAllSales();
  return NextResponse.json(sales);
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
    const saved = await upsertSale(sale);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[API] Error saving sale:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save sale' },
      { status: 500 }
    );
  }
}
