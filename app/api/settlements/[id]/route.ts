// app/api/settlements/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getSettlementById, upsertSettlement, removeSettlement } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
import type { Settlement } from '@/types/entities';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settlement = await getSettlementById(params.id);
    if (!settlement) return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    return NextResponse.json(settlement);
  } catch (error) {
    console.error('Failed to get settlement:', error);
    return NextResponse.json({ error: 'Failed to get settlement' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as Settlement;
    const settlement: Settlement = { 
      ...body, 
      id: params.id,
      updatedAt: new Date()
    };
    const saved = await upsertSettlement(settlement);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('Failed to update settlement:', error);
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await removeSettlement(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete settlement:', error);
    return NextResponse.json({ error: 'Failed to delete settlement' }, { status: 500 });
  }
}
