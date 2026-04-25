import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { ItemStatus, ItemType } from '@/types/enums';
import {
  getActiveItems,
  getItemById,
  getLegacyItems,
} from '@/data-store/repositories/item.repo';
import type { Item } from '@/types/entities';

function getPublicCdnOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_R2_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN?.trim() ||
    'https://media.akilesecosystem.com';
  const withoutSlash = raw.replace(/\/+$/, '');
  if (withoutSlash.startsWith('http://') || withoutSlash.startsWith('https://')) {
    return withoutSlash;
  }
  return `https://${withoutSlash}`;
}

/**
 * M2M Store Inventory API Endpoint
 * Returns items where status === 'for-sale' or status === 'legacy'
 * Requires M2M Bearer token authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify M2M token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing Bearer token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = await iamService.verifyM2MToken(token);

    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired M2M token' },
        { status: 401 }
      );
    }

    // Verify app ID (only akiles-ecosystem allowed)
    if (verification.appId !== 'akiles-ecosystem') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only akiles-ecosystem can access store inventory' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'for-sale';
    const isLegacyRequest = status === 'legacy';
    const itemId = searchParams.get('itemId')?.trim() || undefined;

    if (itemId) {
      const raw = await getItemById(itemId);
      if (!raw) {
        return NextResponse.json(
          { success: false, error: 'Item not found' },
          { status: 404 }
        );
      }
      
      // Ensure the item status matches the request mode
      const isItemLegacy = raw.status === ItemStatus.LEGACY;
      if (isLegacyRequest !== isItemLegacy) {
         return NextResponse.json(
          { success: false, error: 'Item is not available in this section' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        item: toStoreItemPayload(raw),
      });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const category = searchParams.get('category')?.trim() || undefined;
    const collection = searchParams.get('collection')?.trim() || undefined;
    const search = searchParams.get('search')?.trim().toLowerCase() || undefined;

    // 1. Determine which index to hit
    const items = isLegacyRequest
      ? await getLegacyItems()
      : await getActiveItems();
    
    // 2. Filter by status (Store mode needs to exclude DRAFTs, Legacy is already pure)
    // AND Exclude internal logistic items (Bundle, Material, Equipment)
    let filteredItems = isLegacyRequest
      ? items
      : items.filter((i) => 
          i.status === ItemStatus.FOR_SALE && 
          i.type !== ItemType.BUNDLE &&
          i.type !== ItemType.MATERIAL &&
          i.type !== ItemType.EQUIPMENT
        );

    // 3. Filter by Category (ItemType)
    if (category) {
      filteredItems = filteredItems.filter((i) => i.type === category);
    }

    // 4. Filter by Collection
    if (collection) {
      filteredItems = filteredItems.filter((i) => i.collection === collection);
    }

    // 5. Filter by Search (Name or Description)
    if (search) {
      filteredItems = filteredItems.filter((i) => 
        i.name.toLowerCase().includes(search) || 
        i.description?.toLowerCase().includes(search)
      );
    }

    const startIndex = (page - 1) * limit;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);
    const storeItems = paginatedItems.map((item) => toStoreItemPayload(item));

    return NextResponse.json({
      success: true,
      items: storeItems,
      count: filteredItems.length,
      page,
      totalPages: Math.ceil(filteredItems.length / limit)
    });
  } catch (error) {
    console.error('[M2M Store Inventory] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function itemVisibleInStore(item: Item, legacyMode: boolean): boolean {
  if (legacyMode) {
    return item.status === ItemStatus.LEGACY;
  }
  return item.status === ItemStatus.FOR_SALE;
}

function cdnUrlForObjectKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  
  // If it's already a full URL, sanitize the domain and return it directly
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key.replace('akiles-ecosystem-media.r2.dev', 'media.akilesecosystem.com');
  }
  
  // If it's a relative path, prepend the custom domain
  const path = key.replace(/^\//, '');
  return `${getPublicCdnOrigin()}/${path}`;
}

function toStoreItemPayload(item: Item) {
  const cdn = cdnUrlForObjectKey;
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    type: item.type,
    subItemType: item.subItemType,
    collection: item.collection,
    dimensions: item.dimensions,
    size: item.size,
    status: item.status,
    station: item.station,
    price: item.price,
    year: item.year,
    media: {
      main: cdn(item.media?.main),
      thumb: cdn(item.media?.thumb),
      gallery: item.media?.gallery?.map((url) => cdn(url)) || [],
    },
    sourceFileUrl: item.sourceFileUrl || undefined,
  };
}
