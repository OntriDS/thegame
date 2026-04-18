// app/api/items/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Item } from '@/types/entities';
import { getAllItems, getItemsByType, upsertItem, getItemsForMonth, getActiveItems, getLegacyItems } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
import { ItemStatus } from '@/types/enums';
import { isSoldStatus } from '@/lib/utils/status-utils';
import { parseFlexibleDate } from '@/lib/utils/date-utils';

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
  const statusFilter = searchParams.get('status')?.toLowerCase();
  const siteFilter = searchParams.get('siteId');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');
  const sortOption = searchParams.get('sort') || 'date-desc';
  const searchQuery = searchParams.get('search')?.trim().toLowerCase() || '';

  const page = pageParam ? parseInt(pageParam, 10) : undefined;
  const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : undefined;

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
  if (month && year) {
    items = await getItemsForMonth(year, month);
  }
  // Strategy 2: Legacy fetching (Optimized)
  else if (statusFilter === ItemStatus.LEGACY) {
    items = await getLegacyItems();
  }
  // Strategy 3: Type-based fetching (Optimized)
  // Ignore 'all' type filter as it's a client-side concept
  else if (typeFilter && typeFilter !== 'all') {
    const types = typeFilter.split(',').map(t => t.trim());
    items = await getItemsByType(types);
  }
  // Strategy 4: Active fetching (Optimized fallback for standard Active Inventory loads)
  else if (!statusFilter || statusFilter === 'active') {
    items = await getActiveItems();
  }
  // Strategy 5: Fetch All (Explicit Fallback)
  else {
    items = await getAllItems();
  }

  // Apply filters in memory

  // 1. Type Filter (if not already applied by Strategy 2)
  if (typeFilter && typeFilter !== 'all' && (month || !typeFilter)) {
    // If we fetched by month, we still need to filter by type
    // If we fetched by type (Strategy 2), this is redundant but harmless
    const types = typeFilter.split(',').map(t => t.trim());
    items = items.filter(i => types.includes(i.type as any));
  }

  // 2. Status Filter
  if (statusFilter) {
    const targetStatus = statusFilter;

    // If 'all' is explicitly requested, bypass status filtering entirely to fetch everything (including SOLD)
    if (targetStatus !== 'all') {
      items = items.filter(item => {
        const isSold = isSoldStatus(item.status);
          
        if (targetStatus === ItemStatus.SOLD) return isSold;
        return (item.status || '').toString().toLowerCase() === targetStatus;
      });
    }
  } else if (!month && !year && statusFilter !== ItemStatus.LEGACY) {
    // Default behavior for Active Inventory (no month/year specified AND no explicit status):
    // Show only active items (unsold). The active index already excludes sold/legacy,
    // so this is just a safety catch for any strategy leaks.
    items = items.filter(item => !isSoldStatus(item.status) && item.status !== ItemStatus.LEGACY);
  }

  // 3. Month Filter (if not using Strategy 1)
  // If we fetched all items (e.g. because of status filter), we still need to filter by month if provided
  if (month && year && (statusFilter || typeFilter)) {
    // When filtering sold items by month, we use soldAt date
    if (statusFilter === ItemStatus.SOLD) {
      items = items.filter(item => {
        // Fallback to updatedAt or createdAt if soldAt is missing (e.g. imported items)
        const dateStr = item.soldAt || item.updatedAt || item.createdAt;
        if (!dateStr) return false;
        const d = parseFlexibleDate(dateStr);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    } else {
      // For other items, use createdAt or similar logic if needed
      items = items.filter(item => {
        const d = parseFlexibleDate(item.createdAt);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }
  }
  
  // 4. Site Filter
  if (siteFilter) {
    items = items.filter(item => {
      // Check if any stock entry matches the siteId
      const stockAtSite = item.stock?.some(s => s.siteId === siteFilter);
      return !!stockAtSite;
    });
  }

  const isLegacyTab = statusFilter === ItemStatus.LEGACY;

  if (isLegacyTab) {
    if (searchQuery) {
      items = items.filter(item => (item.name || '').toLowerCase().includes(searchQuery));
    }

    items = [...items].sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
      switch (sortOption) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'type-asc':
          return (a.type || '').localeCompare(b.type || '');
        case 'site-asc':
          return ((a.stock?.[0]?.siteId || '')).localeCompare((b.stock?.[0]?.siteId || ''));
        case 'price-asc':
          return ((a.value ?? (a.price * (a.quantitySold || 0))) || 0) - ((b.value ?? (b.price * (b.quantitySold || 0))) || 0);
        case 'price-desc':
          return ((b.value ?? (b.price * (b.quantitySold || 0))) || 0) - ((a.value ?? (a.price * (a.quantitySold || 0))) || 0);
        case 'date-asc':
          return aDate - bDate;
        case 'date-desc':
        default:
          return bDate - aDate;
      }
    });

    if (typeof page === 'number' && Number.isFinite(page) && typeof pageSize === 'number' && Number.isFinite(pageSize)) {
      const normalizedPage = Math.max(1, page);
      const normalizedPageSize = Math.max(1, Math.min(100, pageSize));
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
      const pagedItems = items.slice(
        (normalizedPage - 1) * normalizedPageSize,
        normalizedPage * normalizedPageSize
      );

      return NextResponse.json({
        items: pagedItems,
        total,
        page: normalizedPage,
        pageSize: normalizedPageSize,
        totalPages,
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
      lastRestockDate: body.lastRestockDate ? new Date(body.lastRestockDate) : undefined,
      soldAt: body.soldAt ? new Date(body.soldAt) : undefined,
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
