import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { ItemStatus, ItemType, Collection } from '@/types/enums';
import type { SubItemType } from '@/types/type-aliases';
import {
  getActiveItems,
  getItemById,
  getLegacyItems,
  getItemsByType,
  upsertItem,
  updateItem,
} from '@/data-store/repositories/item.repo';
import type { Item } from '@/types/entities';
import { getUTCNow } from '@/lib/utils/utc-utils';

const NEW_ITEM_MEDIA_PLACEHOLDER = 'items/system/placeholder/no-image-main.png';
const NEW_ITEM_STATUS: ItemStatus = (ItemStatus as { DRAFT?: ItemStatus }).DRAFT ?? ItemStatus.CREATED;

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
async function verifyM2MRequest(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Missing Bearer token' },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  const verification = await iamService.verifyM2MToken(token);
  if (!verification.valid) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired M2M token' },
      { status: 401 },
    );
  }

  if (verification.appId !== 'akiles-ecosystem') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Only akiles-ecosystem can access store inventory' },
      { status: 403 },
    );
  }

  return null;
}

function parseCatalogUpdateBody(body: unknown) {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Request body must be a JSON object');
  }

  const payload = body as {
    id?: unknown;
    name?: unknown;
    description?: unknown;
    price?: unknown;
    status?: unknown;
    media?: unknown;
    collection?: unknown;
    type?: unknown;
    subItemType?: unknown;
    year?: unknown;
  };

  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (!id) {
    throw new Error('id must be a non-empty string');
  }

  const hasPatchField =
    Object.prototype.hasOwnProperty.call(payload, 'name') ||
    Object.prototype.hasOwnProperty.call(payload, 'description') ||
    Object.prototype.hasOwnProperty.call(payload, 'price') ||
    Object.prototype.hasOwnProperty.call(payload, 'status') ||
    Object.prototype.hasOwnProperty.call(payload, 'media') ||
    Object.prototype.hasOwnProperty.call(payload, 'collection') ||
    Object.prototype.hasOwnProperty.call(payload, 'type') ||
    Object.prototype.hasOwnProperty.call(payload, 'subItemType') ||
    Object.prototype.hasOwnProperty.call(payload, 'year');

  if (!hasPatchField) {
    throw new Error('At least one updatable field is required');
  }

  const next: {
    id: string;
    name?: string;
    description?: string;
    price?: number;
    status?: ItemStatus;
    media?: { main?: string; thumb?: string; gallery?: string[] };
    collection?: Collection;
    type?: ItemType;
    subItemType?: SubItemType;
    year?: number;
  } = {
    id,
  };

  if ('name' in payload && payload.name !== undefined) {
    if (typeof payload.name !== 'string') {
      throw new Error('name must be a string');
    }
    const name = payload.name.trim();
    if (!name) {
      throw new Error('name must be a non-empty string');
    }
    next.name = name;
  }

  if ('description' in payload && payload.description !== undefined) {
    if (typeof payload.description !== 'string') {
      throw new Error('description must be a string');
    }
    next.description = payload.description;
  }

  if ('price' in payload && payload.price !== undefined) {
    if (typeof payload.price !== 'number' || Number.isNaN(payload.price) || payload.price < 0) {
      throw new Error('price must be a non-negative number');
    }
    next.price = payload.price;
  }

  if ('status' in payload && payload.status !== undefined) {
    if (!Object.values(ItemStatus).includes(payload.status as ItemStatus)) {
      throw new Error('status must be a valid ItemStatus value');
    }
    next.status = payload.status as ItemStatus;
  }

  if ('media' in payload && payload.media !== undefined) {
    if (typeof payload.media !== 'object' || payload.media === null) {
      throw new Error('media must be an object');
    }

    const mediaPayload = payload.media as Record<string, unknown>;
    const mediaKeys = Object.keys(mediaPayload);
    if (mediaKeys.length === 0) {
      throw new Error('media must include at least one field');
    }
    const allowedMediaKeys = new Set(['main', 'thumb', 'gallery']);
    if (mediaKeys.some((key) => !allowedMediaKeys.has(key))) {
      throw new Error('media contains unsupported fields');
    }

    const typedMediaPayload = mediaPayload as {
      main?: unknown;
      thumb?: unknown;
      gallery?: unknown;
    };

    const mediaPatch: { main?: string; thumb?: string; gallery?: string[] } = {};

    if ('main' in typedMediaPayload && typedMediaPayload.main !== undefined) {
      if (typeof typedMediaPayload.main !== 'string' || !typedMediaPayload.main.trim()) {
        throw new Error('media.main must be a non-empty string');
      }
      mediaPatch.main = typedMediaPayload.main.trim();
    }

    if ('thumb' in typedMediaPayload && typedMediaPayload.thumb !== undefined) {
      if (typeof typedMediaPayload.thumb !== 'string' || !typedMediaPayload.thumb.trim()) {
        throw new Error('media.thumb must be a non-empty string');
      }
      mediaPatch.thumb = typedMediaPayload.thumb.trim();
    }

    if ('gallery' in typedMediaPayload && typedMediaPayload.gallery !== undefined) {
      if (!Array.isArray(typedMediaPayload.gallery)) {
        throw new Error('media.gallery must be an array');
      }
      mediaPatch.gallery = typedMediaPayload.gallery.map((entry, index) => {
        if (typeof entry !== 'string' || !entry.trim()) {
          throw new Error(`media.gallery[${index}] must be a non-empty string`);
        }
        return entry.trim();
      });
    }

    if (Object.keys(mediaPatch).length > 0) {
      next.media = mediaPatch;
    }
  }

  if ('collection' in payload && payload.collection !== undefined) {
    if (typeof payload.collection !== 'string') {
      throw new Error('collection must be a string');
    }
    next.collection = payload.collection.trim() as Collection;
  }

  if ('type' in payload && payload.type !== undefined) {
    if (!Object.values(ItemType).includes(payload.type as ItemType)) {
      throw new Error('type must be a valid ItemType value');
    }
    next.type = payload.type as ItemType;
  }

  if ('subItemType' in payload && payload.subItemType !== undefined) {
    if (typeof payload.subItemType !== 'string') {
      throw new Error('subItemType must be a string');
    }
    next.subItemType = payload.subItemType.trim() as SubItemType;
  }

  if ('year' in payload && payload.year !== undefined) {
    const yearNum = Number(payload.year);
    if (!Number.isFinite(yearNum)) {
      throw new Error('year must be a number');
    }
    next.year = yearNum;
  }

  return next;
}

function parseCatalogCreateBody(body: unknown) {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Request body must be a JSON object');
  }

  const payload = body as {
    name?: unknown;
    type?: unknown;
    price?: unknown;
    description?: unknown;
    collection?: unknown;
    subItemType?: unknown;
    year?: unknown;
  };

  if (typeof payload.name !== 'string') {
    throw new Error('name must be a string');
  }
  const name = payload.name.trim();
  if (!name) {
    throw new Error('name must be a non-empty string');
  }

  if (typeof payload.type !== 'string') {
    throw new Error('type must be a string');
  }
  const type = payload.type.trim();
  if (!type) {
    throw new Error('type must be a non-empty string');
  }
  if (!Object.values(ItemType).includes(type as ItemType)) {
    throw new Error('type must be a valid ItemType value');
  }

  if (typeof payload.price !== 'number' || Number.isNaN(payload.price) || payload.price < 0) {
    throw new Error('price must be a non-negative number');
  }

  if (payload.description !== undefined && typeof payload.description !== 'string') {
    throw new Error('description must be a string');
  }

  return {
    name,
    type: type as ItemType,
    price: payload.price,
    description: payload.description as string | undefined,
    collection: typeof payload.collection === 'string' ? (payload.collection.trim() as Collection) : undefined,
    subItemType: typeof payload.subItemType === 'string' ? (payload.subItemType.trim() as SubItemType) : undefined,
    year: typeof payload.year === 'number' ? payload.year : (typeof payload.year === 'string' ? parseInt(payload.year, 10) : undefined),
  } as {
    name: string;
    type: ItemType;
    price: number;
    description?: string;
    collection?: Collection;
    subItemType?: SubItemType;
    year?: number;
  };
}

function buildDraftItem(input: {
  name: string;
  type: ItemType;
  price: number;
  description?: string;
  collection?: Collection;
  subItemType?: SubItemType;
  year?: number;
}): Item {
  const now = getUTCNow();
  return {
    id: crypto.randomUUID(),
    name: input.name,
    type: input.type,
    status: NEW_ITEM_STATUS,
    station: 'strategy',
    stock: [],
    unitCost: 0,
    additionalCost: 0,
    price: input.price,
    value: 0,
    quantitySold: 0,
    links: [],
    media: {
      main: NEW_ITEM_MEDIA_PLACEHOLDER,
    },
    createdAt: now,
    updatedAt: now,
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.collection !== undefined ? { collection: input.collection } : {}),
    ...(input.subItemType !== undefined ? { subItemType: input.subItemType } : {}),
    ...(input.year !== undefined ? { year: input.year } : {}),
  };
}

export async function GET(request: NextRequest) {
  try {
    const authFailure = await verifyM2MRequest(request);
    if (authFailure) {
      return authFailure;
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'for-sale';
    const statusFilter = status.toLowerCase().trim();
    const isLegacyRequest = statusFilter === 'legacy';
    const itemId = searchParams.get('itemId')?.trim() || undefined;

    if (!['all', 'legacy', 'for-sale'].includes(statusFilter)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status filter' },
        { status: 400 },
      );
    }

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
      if (statusFilter === 'legacy' && !isItemLegacy) {
         return NextResponse.json(
          { success: false, error: 'Item is not available in this section' },
          { status: 404 }
        );
      }

      if (statusFilter === 'for-sale' && raw.status !== ItemStatus.FOR_SALE) {
        return NextResponse.json(
          { success: false, error: 'Item is not available in this section' },
          { status: 404 },
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

    // 1. Determine which index to hit - OPTIMIZED
    let items: Item[] = [];
    if (category) {
      // UTILIZE Redis Sets index for specific type to prevent loading entire DB
      items = await getItemsByType(category as ItemType);
    } else if (statusFilter === 'legacy') {
      items = await getLegacyItems();
    } else if (statusFilter === 'all') {
      const [activeItems, legacyItems] = await Promise.all([getActiveItems(), getLegacyItems()]);
      items = [...activeItems, ...legacyItems];
    } else {
      items = await getActiveItems();
    }

    // 2. Filter by status mode
    let filteredItems: Item[] = [];
    if (statusFilter === 'legacy') {
      filteredItems = items.filter(i => i.status === ItemStatus.LEGACY);
    } else if (statusFilter === 'all') {
      const unique = new Map<string, Item>();
      for (const item of items) {
        unique.set(item.id, item);
      }
      filteredItems = Array.from(unique.values());
    } else {
      // 'for-sale' mode: filter and exclude bundles/materials/equipment
      filteredItems = items.filter((i) =>
        i.status === ItemStatus.FOR_SALE &&
        i.type !== ItemType.BUNDLE &&
        i.type !== ItemType.MATERIAL &&
        i.type !== ItemType.EQUIPMENT
      );
    }

    // 3. Filter by Category (ItemType) - redundant if category was used in Step 1, but keeps logic consistent
    if (category) {
      filteredItems = filteredItems.filter((i) => i.type === category);
    }

    // 4. Filter by Collection
    if (collection) {
      filteredItems = filteredItems.filter((i) => i.collection === collection);
    }

    // 5. Filter by Search (Name or Collection) - UPDATED per instructions
    if (search) {
      filteredItems = filteredItems.filter((i) => 
        i.name.toLowerCase().includes(search) || 
        i.collection?.toLowerCase().includes(search)
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

export async function POST(request: NextRequest) {
  try {
    const authFailure = await verifyM2MRequest(request);
    if (authFailure) {
      return authFailure;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }

    const parsed = parseCatalogCreateBody(body);
    const draftItem = buildDraftItem(parsed);
    const saved = await upsertItem(draftItem);

    return NextResponse.json({
      success: true,
      item: toStoreItemPayload(saved),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Request body must') ||
        error.message.includes('must be a JSON object') ||
        error.message.includes('must be a string') ||
        error.message.includes('must be a non-empty string') ||
        error.message.includes('must be a non-negative number') ||
        error.message.includes('must be a valid ItemType') ||
        error.message.includes('description must be a string'))
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    console.error('[M2M Store Inventory POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authFailure = await verifyM2MRequest(request);
    if (authFailure) {
      return authFailure;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }

    const parsed = parseCatalogUpdateBody(body);
    const current = await getItemById(parsed.id);
    if (!current) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 },
      );
    }

    const mediaPayload = (parsed as { media?: { main?: string; thumb?: string; gallery?: string[] } }).media;
    const mergedMedia =
      mediaPayload
        ? {
            ...(current.media || {}),
            ...mediaPayload,
            ...(mediaPayload.gallery !== undefined ? { gallery: mediaPayload.gallery } : {}),
          }
        : undefined;

    const updated = await updateItem(parsed.id, {
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.price !== undefined ? { price: parsed.price } : {}),
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      ...(parsed.collection !== undefined ? { collection: parsed.collection as Collection } : {}),
      ...(parsed.type !== undefined ? { type: parsed.type } : {}),
      ...(parsed.subItemType !== undefined ? { subItemType: parsed.subItemType as SubItemType } : {}),
      ...(parsed.year !== undefined ? { year: parsed.year } : {}),
      ...(mergedMedia ? { media: mergedMedia } : {}),
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      item: toStoreItemPayload(updated),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Request body must') ||
        error.message.includes('must be a') ||
        error.message.includes('At least one updatable field') ||
        error.message.includes('media must') ||
        error.message.includes('media contains unsupported fields'))
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('id must be a non-empty string')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    console.error('[M2M Store Inventory PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
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
    createdAt: item.createdAt,
    stock: item.stock || [],
    media: {
      main: cdn(item.media?.main),
      thumb: cdn(item.media?.thumb),
      gallery: item.media?.gallery?.map((url) => cdn(url)) || [],
    },
    sourceFileUrl: item.sourceFileUrl || undefined,
  };
}
