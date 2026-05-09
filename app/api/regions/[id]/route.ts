// app/api/regions/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getRegionById, upsertRegion, removeRegion } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
import type { Region } from '@/types/entities';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const region = await getRegionById(params.id);
    if (!region) return NextResponse.json({ error: 'Region not found' }, { status: 404 });
    return NextResponse.json(region);
  } catch (error) {
    console.error('[Regions API] Failed to fetch region:', error);
    return NextResponse.json({ error: 'Failed to fetch region' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Region;
    const existing = await getRegionById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Region not found' }, { status: 404 });
    }

    const region: Region = {
      ...body,
      id: params.id,
      defaultZoom: Number.isFinite(body.defaultZoom) ? body.defaultZoom : 8,
      maxBounds: body.maxBounds,
      isUnlocked: body.isUnlocked !== undefined ? body.isUnlocked : existing.isUnlocked,
      shape: body.shape,
      isActive: body.isActive ?? true,
      updatedAt: new Date(),
      createdAt: body.createdAt ? new Date(body.createdAt) : existing.createdAt,
    };

    const saved = await upsertRegion(region);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[Regions API] Failed to update region:', error);
    return NextResponse.json({ error: 'Failed to update region' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await removeRegion(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Regions API] Failed to delete region:', error);
    return NextResponse.json({ error: 'Failed to delete region' }, { status: 500 });
  }
}
