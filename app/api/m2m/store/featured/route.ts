import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import {
  getFeaturedItemIds,
  getItemById,
  setFeaturedItemIds,
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
      main: cdnUrlForObjectKey(item.media?.main),
      thumb: cdnUrlForObjectKey(item.media?.thumb),
      gallery: item.media?.gallery?.map((url) => cdnUrlForObjectKey(url)) || [],
    },
    sourceFileUrl: item.sourceFileUrl || undefined,
  };
}

function parseFeaturedIds(body: unknown): string[] {
  if (typeof body !== 'object' || body === null || !('ids' in body)) {
    throw new Error('Request body must be a JSON object with an ids array');
  }

  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids)) {
    throw new Error('Request body must be a JSON object with an ids array');
  }

  const seen = new Set<string>();
  const normalizedIds: string[] = [];

  for (const id of ids) {
    if (typeof id !== 'string') {
      throw new Error('Each featured ID must be a non-empty string');
    }
    const trimmedId = id.trim();
    if (!trimmedId || seen.has(trimmedId)) continue;
    seen.add(trimmedId);
    normalizedIds.push(trimmedId);
  }

  return normalizedIds;
}

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
      { success: false, error: 'Forbidden: Only akiles-ecosystem can access featured store list' },
      { status: 403 },
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authFailure = await verifyM2MRequest(request);
    if (authFailure) {
      return authFailure;
    }

    const featuredItemIds = await getFeaturedItemIds();
    if (featuredItemIds.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
      });
    }

    const storeItems: ReturnType<typeof toStoreItemPayload>[] = [];
    for (const itemId of featuredItemIds) {
      const item = await getItemById(itemId);
      if (!item) {
        continue;
      }
      storeItems.push(toStoreItemPayload(item));
    }

    return NextResponse.json({
      success: true,
      items: storeItems,
      count: storeItems.length,
    });
  } catch (error) {
    console.error('[M2M Store Featured] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
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

    const normalizedIds = parseFeaturedIds(body);
    await setFeaturedItemIds(normalizedIds);

    return NextResponse.json({
      success: true,
      ids: normalizedIds,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Request body must') ||
        error.message.includes('Each featured ID must'))
    ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    console.error('[M2M Store Featured] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
