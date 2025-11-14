// app/api/company/j$-treasury/route.ts
// API route for getting company J$ treasury (buyback) data

import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllFinancials } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, LinkType } from '@/types/enums';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get all FinancialRecords
    const allRecords = await getAllFinancials();
    
    // Filter for company records with Founder or Team station
    const companyRecords = allRecords.filter(record => 
      record.type === 'company' && 
      (record.station === 'Founder' || record.station === 'Team')
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
    
    // Get all PLAYER_FINREC links to find buyback records
    // We need to check link metadata for exchangeType
    const buybackRecords: Array<{
      record: typeof companyRecords[0];
      linkMetadata: any;
    }> = [];
    
    // For each company record, check if it has a PLAYER_FINREC link with buyback metadata
    for (const record of companyRecords) {
      const links = await getLinksFor({ type: EntityType.FINANCIAL, id: record.id });
      const finrecLinks = links.filter(link => 
        link.linkType === LinkType.PLAYER_FINREC &&
        (link.metadata?.exchangeType === 'J$_TO_USD' || link.metadata?.exchangeType === 'J$_TO_ZAPS')
      );
      
      if (finrecLinks.length > 0) {
        // This is a buyback record
        buybackRecords.push({
          record,
          linkMetadata: finrecLinks[0].metadata
        });
      }
    }
    
    // Calculate totals
    let totalJ$BoughtBack = 0;
    let totalUSDCost = 0;
    let totalZapsCost = 0;
    
    const buybacks = buybackRecords.map(({ record, linkMetadata }) => {
      const j$BoughtBack = record.jungleCoins || 0;
      const cashOutType = linkMetadata?.exchangeType === 'J$_TO_ZAPS' ? 'ZAPS' : 'USD';
      const usdCost = cashOutType === 'USD' ? (record.cost || 0) : 0;
      const zapsCost = cashOutType === 'ZAPS' ? (linkMetadata?.amountPaid || 0) : undefined;
      
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
        station: record.station as 'Founder' | 'Team',
        playerCharacterId: linkMetadata?.playerCharacterId || null
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

