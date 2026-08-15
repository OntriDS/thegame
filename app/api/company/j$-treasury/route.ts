// app/api/company/j$-treasury/route.ts
// API route for getting company J$ treasury (buyback) data

import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllFinancials } from '@/data-store/datastore';
import { extractMoneyValue } from '@/lib/utils/financial-utils';
import type { FinancialRecord } from '@/types/entities';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const records = await getAllFinancials();

    // A buyback is represented by the company-side financial record created by
    // the J$ cash-out workflow. Canonical V1 stores the exchange fields in
    // `context`; the root fallbacks keep this endpoint readable during the
    // compatibility window for records written before the migration.
    const buybacks = records
      .filter((record: FinancialRecord) => {
        const legacy = record as FinancialRecord & {
          jungleCoins?: number;
          exchangeType?: string;
        };
        const exchangeType = record.context?.exchangeType ?? legacy.exchangeType;
        const jungleCoins = Number(record.context?.jungleCoins ?? legacy.jungleCoins ?? 0);
        return record.type === 'company'
          && (exchangeType === 'J$_TO_USD' || exchangeType === 'J$_TO_ZAPS')
          && Number.isFinite(jungleCoins)
          && jungleCoins > 0;
      })
      .map((record: FinancialRecord) => {
        const legacy = record as FinancialRecord & {
          jungleCoins?: number;
          exchangeType?: string;
          exchangeCounterAmount?: number;
        };
        const exchangeType = record.context?.exchangeType ?? legacy.exchangeType;
        const jungleCoins = Number(record.context?.jungleCoins ?? legacy.jungleCoins ?? 0);
        const counterAmount = Number(
          record.context?.exchangeCounterAmount ?? legacy.exchangeCounterAmount ?? 0
        );
        const isUsd = exchangeType === 'J$_TO_USD';

        return {
          id: record.id,
          name: record.name,
          date: record.createdAt,
          j$BoughtBack: jungleCoins,
          usdCost: isUsd ? extractMoneyValue(record.cost) : 0,
          zapsCost: !isUsd && Number.isFinite(counterAmount) ? counterAmount : 0,
          cashOutType: isUsd ? 'USD' as const : 'ZAPS' as const,
          station: 'Team' as const,
          playerCharacterId: record.playerCharacterId ?? null,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({
      totalJ$BoughtBack: buybacks.reduce((sum, item) => sum + item.j$BoughtBack, 0),
      totalUSDCost: buybacks.reduce((sum, item) => sum + item.usdCost, 0),
      totalZapsCost: buybacks.reduce((sum, item) => sum + item.zapsCost, 0),
      buybackCount: buybacks.length,
      buybacks,
    });
  } catch (error) {
    console.error('[J$ Treasury] Failed to calculate treasury data:', error);
    return NextResponse.json({ error: 'Failed to load J$ treasury data' }, { status: 500 });
  }
}
