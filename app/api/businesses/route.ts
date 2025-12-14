// app/api/businesses/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Business } from '@/types/entities';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllBusinesses, upsertBusiness } from '@/data-store/datastore';
import { onBusinessUpsert } from '@/workflows/entities-workflows/business.workflow';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const entities = await getAllBusinesses();
    return NextResponse.json(entities);
  } catch (error) {
    console.error('[Businesses API] Failed to fetch:', error);
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Business;
    const entity: Business = {
      ...body,
      id: body.id || uuid(),
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      links: body.links || []
    };
    const saved = await upsertBusiness(entity);

    // Trigger workflow for logging
    await onBusinessUpsert(saved);

    return NextResponse.json(saved);
  } catch (error) {
    console.error('[Businesses API] Failed to save:', error);
    return NextResponse.json({ error: 'Failed to save business' }, { status: 500 });
  }
}
