// app/api/legal-entities/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { LegalEntity } from '@/types/entities';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllLegalEntities, upsertLegalEntity } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const entities = await getAllLegalEntities();
    return NextResponse.json(entities);
  } catch (error) {
    console.error('[LegalEntities API] Failed to fetch:', error);
    return NextResponse.json({ error: 'Failed to fetch legal entities' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await req.json()) as LegalEntity;
    const entity: LegalEntity = {
      ...body,
      id: body.id || uuid(),
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      links: body.links || []
    };
    const saved = await upsertLegalEntity(entity);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[LegalEntities API] Failed to save:', error);
    return NextResponse.json({ error: 'Failed to save legal entity' }, { status: 500 });
  }
}
