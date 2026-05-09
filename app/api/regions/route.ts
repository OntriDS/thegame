// app/api/regions/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Region } from '@/types/entities';
import { getAllRegions, upsertRegion } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const regions = await getAllRegions();
    return NextResponse.json(regions);
  } catch (error) {
    console.error('[Regions API] Failed to fetch regions:', error);
    return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Region;
    const region: Region = {
      ...body,
      id: body.id || uuid(),
      defaultZoom: Number.isFinite(body.defaultZoom) ? body.defaultZoom : 8,
      maxBounds: body.maxBounds,
      isUnlocked: body.isUnlocked ?? false,
      shape: body.shape,
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      isActive: body.isActive ?? true,
    };

    const saved = await upsertRegion(region);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[Regions API] Failed to save region:', error);
    return NextResponse.json({ error: 'Failed to save region' }, { status: 500 });
  }
}
