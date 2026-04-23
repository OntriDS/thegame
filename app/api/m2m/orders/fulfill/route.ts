import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { CharacterRole, SaleStatus } from '@/types/enums';
import { getSaleById, upsertSale } from '@/data-store/datastore';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { ensureCounterpartyRoleDatastore } from '@/lib/utils/character-role-sync-server';

type FulfillOrderRequest = {
  orderId?: string;
  ern?: string;
  tokenTrans?: string;
  reference?: string;
  saleStatus?: string;
  commission?: number;
};

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStatus(value: unknown): SaleStatus {
  const candidate = normalizeString(value)?.toLowerCase();
  return candidate === SaleStatus.COLLECTED ? SaleStatus.COLLECTED : SaleStatus.CHARGED;
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
        { success: false, error: 'Forbidden: Only akiles-ecosystem can access sale fulfillment' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as FulfillOrderRequest;
    const orderId = normalizeString(body.orderId) || normalizeString(body.ern);

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: orderId (or ern) is required' },
        { status: 400 },
      );
    }

    const sale = await getSaleById(orderId);
    if (!sale) {
      return NextResponse.json(
        { success: false, error: `Sale not found for orderId=${orderId}` },
        { status: 404 },
      );
    }

    const terminalStatuses = new Set<SaleStatus>([SaleStatus.CHARGED, SaleStatus.COLLECTED, SaleStatus.CANCELLED]);

    if (terminalStatuses.has(sale.status)) {
      return NextResponse.json({
        success: true,
        orderId: sale.id,
        status: sale.status,
        note: 'Sale already completed or terminal; idempotent fulfill skipped',
      });
    }

    const requestedStatus = normalizeStatus(body.saleStatus);
    if (requestedStatus !== SaleStatus.CHARGED && requestedStatus !== SaleStatus.COLLECTED) {
      return NextResponse.json(
        { success: false, error: `Unsupported saleStatus: ${normalizeString(body.saleStatus) || 'missing'}` },
        { status: 400 },
      );
    }

    const commission = typeof body.commission === 'number' ? body.commission : 0;

    const nextSale = {
      ...sale,
      status: requestedStatus,
      isNotPaid: false,
      isNotCharged: false,
      chargedAt: getUTCNow(),
      totals: {
        ...sale.totals,
        totalCost: (sale.totals.totalCost || 0) + commission,
      },
      metadata: {
        ...sale.metadata,
        m2m: {
          ...(sale.metadata?.m2m as Record<string, unknown>),
          tokenTrans: normalizeString(body.tokenTrans) || null,
          reference: normalizeString(body.reference) || null,
          saleStatus: requestedStatus,
          commission,
          source: 'akiles-ecosystem',
        },
      },
    };

    const saved = await upsertSale(nextSale);

    if (saved.customerId) {
      await ensureCounterpartyRoleDatastore(saved.customerId, CharacterRole.CUSTOMER);
    }

    return NextResponse.json({ success: true, orderId: saved.id, status: saved.status });
  } catch (error) {
    console.error('[M2M Orders Fulfill] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fulfill order' },
      { status: 500 },
    );
  }
}
