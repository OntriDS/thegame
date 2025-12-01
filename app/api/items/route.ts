// app/api/items/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Item } from '@/types/entities';
import { getAllItems, getItemsByType, upsertItem, getItemsForMonth } from '@/data-store/datastore';
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
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  const normalizeYear = (y: string | null): number | null => {
    if (!y) return null;
    const n = parseInt(y, 10);
    if (isNaN(n)) return null;
    return n < 100 ? 2000 + n : n;
  };
  const parseMonth = (m: string | null): number | null => {
    if (!m) return null;
    const n = parseInt(m, 10);
    if (isNaN(n) || n < 1 || n > 12) return null;
    return n;
  };

  const month = parseMonth(monthParam);
  const year = normalizeYear(yearParam);

  let items: Item[];
  if (month && year) {
    items = await getItemsForMonth(year, month);
    // Apply optional type filter on top of month scope
    if (typeFilter) {
      const types = typeFilter.split(',').map(t => t.trim());
      items = items.filter(i => types.includes(i.type as any));
    }
  } else {
    // Default: Return ALL active items (Inventory)
    // This supports the "Active Inventory" view which is not time-bound
    const allItems = await getAllItems();
    // Filter out SOLD items to show only active inventory
    items = allItems.filter(item => item.status !== 'Sold');
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
