// app/api/items/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Item } from '@/types/entities';
import { getAllItems, upsertItem } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
import { convertEntityDates } from '@/lib/constants/date-constants';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await getAllItems();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const body = (await req.json()) as Item;
    const item = convertEntityDates(
      { ...body, id: body.id || uuid(), links: body.links || [] },
      ['lastRestockDate']
    );
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
