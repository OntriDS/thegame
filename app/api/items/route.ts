// app/api/items/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Item } from '@/types/entities';
import { getAllItems, getItemsByType, upsertItem, getItemsForMonth } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
import { ItemStatus } from '@/types/enums';

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
  const statusFilter = searchParams.get('status'); // New: Allow filtering by status

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

  // Strategy 1: Time-based fetching (Priority)
  if (month && year) {
    items = await getItemsForMonth(year, month);
  }
  // Strategy 2: Type-based fetching (Optimized)
  else if (typeFilter) {
    const types = typeFilter.split(',').map(t => t.trim());
    items = await getItemsByType(types);
  }
  // Strategy 3: Fetch All (Fallback)
  else {
    items = await getAllItems();
  }

  // Apply filters in memory

  // 1. Type Filter (if not already applied by Strategy 2)
  if (typeFilter && (month || !typeFilter)) { // If we fetched by month or fetched all, we still need to filter by type
    // Note: If we used Strategy 2, items are already filtered by type, but double-checking doesn't hurt
    // Actually, Strategy 2 uses getItemsByType which returns exactly what we want.
    // But if we used Strategy 1 (Month), we definitely need to filter by type if requested.
    if (month && year) {
      const types = typeFilter.split(',').map(t => t.trim());
      items = items.filter(i => types.includes(i.type as any));
    }
  }

  // 2. Status Filter
  if (statusFilter) {
    // If status is explicitly requested (e.g. 'Sold'), filter by it
    items = items.filter(item => item.status === statusFilter);
  } else if (!month && !year) {
    // Default behavior for Active Inventory (no month/year specified):
    // Show only active items (unsold)
    items = items.filter(item => item.status !== ItemStatus.SOLD);
  }
  // Note: If month/year IS specified, we do NOT default filter by status.
  // This allows "Sold Items" tab to fetch items for a month without filtering them out.
  // The client is responsible for filtering if it wants specific status in month view,
  // OR it can pass ?status=Sold explicitly.

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
