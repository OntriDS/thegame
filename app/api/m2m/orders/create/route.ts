import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getUTCNow, startOfDayUTC } from '@/lib/utils/utc-utils';
import { iamService } from '@/lib/iam-service';
import { SaleStatus, SaleType, type Station } from '@/types/enums';
import type { Sale, SaleLine, ItemSaleLine } from '@/types/entities';
import { upsertSale } from '@/data-store/datastore';

type CreateOrderRequest = {
  orderId?: string;
  items?: {
    productId?: string;
    name?: string;
    price?: number;
    quantity?: number;
  }[];
  total?: number;
  status?: string;
  siteId?: string;
  characterId?: string | null;
  counterpartyName?: string;
};

function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeLines(items: CreateOrderRequest['items'] = []): ItemSaleLine[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): ItemSaleLine | null => {
      const itemId = normalizeString(item?.productId);
      if (!itemId) return null;

      const qty = Math.max(1, Math.floor(normalizeNumber(item?.quantity, 1)));
      const unitPrice = Math.max(0, normalizeNumber(item?.price, 0));
      const quantity = Number.isFinite(qty) ? qty : 1;

      return {
        lineId: uuid(),
        kind: 'item',
        itemId,
        description: normalizeString(item?.name),
        quantity,
        unitPrice,
      };
    })
    .filter((line): line is ItemSaleLine => line !== null);
}

function buildTotals(lines: ItemSaleLine[], fallbackTotal?: number): Sale['totals'] {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const totalRevenue = normalizeNumber(fallbackTotal, subtotal);

  return {
    subtotal,
    discountTotal: 0,
    taxTotal: 0,
    totalRevenue: Number.isFinite(totalRevenue) ? totalRevenue : subtotal,
  };
}

export async function POST(request: NextRequest) {
  try {
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
        { success: false, error: 'Forbidden: Only akiles-ecosystem can access M2M order creation' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateOrderRequest;
    const lines = normalizeLines(body.items);
    if (!lines.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: missing sale items' },
        { status: 400 },
      );
    }

    const now = getUTCNow();
    const orderId = normalizeString(body.orderId) || uuid();
    const total = buildTotals(lines, body.total);
    const sale: Sale = {
      id: orderId,
      name: `Ecosystem Order ${orderId}`,
      links: [],
      createdAt: now,
      updatedAt: now,
      description: `Order created by M2M from Akiles Ecosystem`,
      metadata: {
        source: 'akiles-ecosystem',
      },
      saleDate: startOfDayUTC(now),
      type: SaleType.ONLINE,
      status: SaleStatus.PENDING,
      siteId: normalizeString(body.siteId) || 'site-akiles-ecosystem',
      counterpartyName: normalizeString(body.counterpartyName) || `akiles-ecosystem-${orderId}`,
      characterId: body.characterId ?? null,
      salesChannel: 'online-sales' as Station,
      lines: lines as SaleLine[],
      totals: total,
      isNotPaid: true,
      isNotCharged: true,
      isCollected: false,
    };

    const saved = await upsertSale(sale);

    return NextResponse.json({
      success: true,
      orderId: saved.id,
      sale: saved,
    });
  } catch (error) {
    console.error('[M2M Orders Create] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create pending order' },
      { status: 500 },
    );
  }
}
