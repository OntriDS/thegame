import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { SaleStatus } from '@/types/enums';
import { getSaleById, upsertSale, removeSale } from '@/data-store/datastore';

type CancelOrderRequest = {
  orderId?: string;
  ern?: string;
  reason?: string;
  deleteGhost?: boolean;
};

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * M2M Endpoint to cancel or delete a pending order.
 * Used by akiles-ecosystem when a checkout is abandoned or failed.
 */
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

    if (!verification.valid || verification.appId !== 'akiles-ecosystem') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Invalid or unauthorized M2M token' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CancelOrderRequest;
    const orderId = normalizeString(body.orderId) || normalizeString(body.ern);
    const shouldHardDelete = body.deleteGhost === true;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: orderId (or ern) is required' },
        { status: 400 },
      );
    }

    if (shouldHardDelete) {
      const sale = await getSaleById(orderId);
      if (!sale) {
        console.log(`[M2M Order Cancel] Ghost delete already processed or missing: ${orderId}`);
        return NextResponse.json({ success: true, orderId, action: 'NOOP' });
      }

      // Hard delete (completely remove from DB and cleanup all linked entities/logs)
      await removeSale(orderId);
      console.log(`[M2M Order Cancel] Hard-deleted ghost order: ${orderId}`);
      return NextResponse.json({ success: true, orderId, action: 'DELETED' });
    }

    const sale = await getSaleById(orderId);
    if (!sale) {
      return NextResponse.json(
        { success: false, error: `Order not found: ${orderId}` },
        { status: 404 },
      );
    }

    // Protection: Only allow cancelling PENDING or ON_HOLD orders via this endpoint
    if (sale.status !== SaleStatus.PENDING && sale.status !== SaleStatus.ON_HOLD) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot cancel order in status: ${sale.status}. Only PENDING/ON_HOLD orders can be cancelled.`,
          status: sale.status 
        },
        { status: 400 },
      );
    }

    // Soft cancel (update status)
    const nextSale = {
      ...sale,
      status: SaleStatus.CANCELLED,
      metadata: {
        ...sale.metadata,
        cancelReason: body.reason || 'Checkout abandoned or failed in ecosystem',
        cancelledAt: new Date().toISOString(),
      }
    };
    await upsertSale(nextSale);
    console.log(`[M2M Order Cancel] Soft-cancelled order: ${orderId}`);
    return NextResponse.json({ success: true, orderId, action: 'CANCELLED' });
  } catch (error) {
    console.error('[M2M Order Cancel] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process cancellation' },
      { status: 500 },
    );
  }
}
