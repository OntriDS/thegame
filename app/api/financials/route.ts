// app/api/financials/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { FinancialRecord } from '@/types/entities';
import { getAllFinancials, upsertFinancial } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const financials = await getAllFinancials();
  return NextResponse.json(financials);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json()) as FinancialRecord;
  const financial: FinancialRecord = { 
    ...body, 
    id: body.id || uuid(), 
    createdAt: body.createdAt ? new Date(body.createdAt) : new Date(), 
    updatedAt: new Date(), 
    links: body.links || [] 
  };
  const saved = await upsertFinancial(financial);
  return NextResponse.json(saved);
}
