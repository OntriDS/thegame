// app/api/company/j$-treasury/route.ts
// API route for getting company J$ treasury (buyback) data

import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllFinancials } from '@/data-store/datastore';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all FinancialRecords
    const allRecords = await getAllFinancials();

    // Filter for company records with Team station
    const companyRecords = allRecords.filter(record =>
      record.type === 'company' &&
      (record.station === 'Team')
    );

    if (companyRecords.length === 0) {
      return NextResponse.json({
        totalJ$BoughtBack: 0,
        totalUSDCost: 0,
        totalZapsCost: 0,
        buybackCount: 0,
        buybacks: []
      });
    }

    const buybackRecords = companyRecords.filter(
      r => r.exchangeType === 'J$_TO_USD' || r.exchangeType === 'J$_TO_ZAPS'
    );

    // Calculate totals
    let totalJ$BoughtBack = 0;
    let totalUSDCost = 0;
    let totalZapsCost = 0;

    const buybacks = buybackRecords.map((record) => {
      const j$BoughtBack = record.jungleCoins || 0;
      const cashOutType = record.exchangeType === 'J$_TO_ZAPS' ? 'ZAPS' : 'USD';
      const usdCost = cashOutType === 'USD' ? (record.cost || 0) : 0;
      const zapsCost = cashOutType === 'ZAPS' ? (record.exchangeCounterAmount ?? 0) : undefined;

      totalJ$BoughtBack += j$BoughtBack;
      totalUSDCost += usdCost;
      if (zapsCost !== undefined) {
        totalZapsCost += zapsCost;
      }

      return {
        id: record.id,
        name: record.name,
        date: record.createdAt || new Date().toISOString(),
        j$BoughtBack,
        usdCost,
        zapsCost,
        cashOutType: cashOutType as 'USD' | 'ZAPS',
        station: record.station as 'Team',
        playerCharacterId: record.playerCharacterId || null
      };
    });

    // Sort by date (newest first)
    buybacks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      totalJ$BoughtBack,
      totalUSDCost,
      totalZapsCost,
      buybackCount: buybacks.length,
      buybacks
    });

  } catch (error) {
    console.error('[API] Error getting company J$ treasury:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get company J$ treasury' },
      { status: 500 }
    );
  }
}

