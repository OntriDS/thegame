// app/api/items/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Item } from '@/types/entities';
import { getAllItems, getItemsByType, upsertItem } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';
// Increased timeout for loading all items (can be large datasets)
export const maxDuration = 300; // 5 minutes

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Check for type filter in query params
  const searchParams = req.nextUrl.searchParams;
  const typeFilter = searchParams.get('type');
  
  let items: Item[];
  if (typeFilter) {
    // Support comma-separated types: ?type=Sticker,Print
    const types = typeFilter.split(',').map(t => t.trim());
    items = await getItemsByType(types);
  } else {
    // No filter - get all items
    items = await getAllItems();
  }
  
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const body = (await req.json()) as Item;
    const item = {
      ...body,
      id: body.id || uuid(),
      links: body.links || [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      lastRestockDate: body.lastRestockDate ? new Date(body.lastRestockDate) : undefined
    };
    const saved = await upsertItem(item);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[API] Error saving item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save item' },
      { status: 500 }
    );
  }
}
