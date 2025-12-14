// app/api/contracts/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Contract } from '@/types/entities';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllContracts, upsertContract } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const contracts = await getAllContracts();
    return NextResponse.json(contracts);
  } catch (error) {
    console.error('[Contracts API] Failed to fetch:', error);
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Contract;
    const contract: Contract = {
      ...body,
      id: body.id || uuid(),
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      links: body.links || []
    };
    const saved = await upsertContract(contract);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[Contracts API] Failed to save:', error);
    return NextResponse.json({ error: 'Failed to save contract' }, { status: 500 });
  }
}
