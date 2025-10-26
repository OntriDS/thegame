// app/api/settlements/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Settlement } from '@/types/entities';
import { getAllSettlements, upsertSettlement } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settlements = await getAllSettlements();
    return NextResponse.json(settlements);
  } catch (error) {
    console.error('Failed to get settlements:', error);
    return NextResponse.json({ error: 'Failed to get settlements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as Settlement;
    const settlement = {
      ...body,
      id: body.id || uuid(),
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date()
    };
    const saved = await upsertSettlement(settlement);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('Failed to create settlement:', error);
    return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 });
  }
}
