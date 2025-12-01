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

  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get('type');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const statusFilter = searchParams.get('status');

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

  const year = normalizeYear(yearParam);
  const month = parseMonth(monthParam);

  let items: Item[];

  // Strategy 1: Time-based fetching (Priority)
  // If we have a specific month, use the optimized month index
  if (month && year && !statusFilter) {
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
  if (typeFilter && (month || !typeFilter)) {
    // If we fetched by month, we still need to filter by type
    // If we fetched by type (Strategy 2), this is redundant but harmless
    const types = typeFilter.split(',').map(t => t.trim());
    items = items.filter(i => types.includes(i.type as any));
  }

  // 2. Status Filter
  if (statusFilter) {
    // Case-insensitive status check
    const targetStatus = statusFilter.toLowerCase();
    items = items.filter(item => {
      const itemStatus = (item.status || '').toString().toLowerCase();
      // Check for exact match or "ItemStatus.SOLD" literal match
      return itemStatus === targetStatus ||
        (targetStatus === 'sold' && itemStatus === 'itemstatus.sold');
    });
  } else if (!month && !year) {
    // Default behavior for Active Inventory (no month/year specified):
    // Show only active items (unsold)
    items = items.filter(item => item.status !== ItemStatus.SOLD);
  }

  // 3. Month Filter (if not using Strategy 1)
  // If we fetched all items (e.g. because of status filter), we still need to filter by month if provided
  if (month && year && (statusFilter || typeFilter)) {
    // When filtering sold items by month, we use soldAt date
    if (statusFilter?.toLowerCase() === 'sold') {
      items = items.filter(item => {
        if (!item.soldAt) return false;
        const d = new Date(item.soldAt);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    } else {
      // For other items, use createdAt or similar logic if needed
      items = items.filter(item => {
        const d = new Date(item.createdAt);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }
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
