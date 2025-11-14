// app/api/player/cash-out-j$/route.ts
// API route for cashing out J$ for USD or Zaps

import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { createFinancialRecordFromJ$CashOut } from '@/workflows/financial-record-utils';
import { getLinksFor } from '@/links/link-registry';
import { getFinancialById } from '@/data-store/datastore';
import { EntityType, LinkType } from '@/types/enums';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

/**
 * Calculate player's J$ balance from FinancialRecord ledger
 */
async function getPlayerJ$Balance(playerId: string): Promise<number> {
  const links = await getLinksFor({ type: EntityType.PLAYER, id: playerId });
  const finrecLinks = links.filter(link => link.linkType === LinkType.PLAYER_FINREC);
  const finrecIds = finrecLinks.map(link => link.target.id);
  
  if (finrecIds.length === 0) {
    return 0;
  }
  
  const financialRecords = await Promise.all(
    finrecIds.map(id => getFinancialById(id))
  );
  
  const validRecords = financialRecords.filter((record): record is NonNullable<typeof record> => record !== null);
  // Only sum personal records (company records are for buyback tracking)
  const personalRecords = validRecords.filter(record => record.type === 'personal');
  const totalJ$ = personalRecords.reduce((sum, record) => sum + (record.jungleCoins || 0), 0);
  
  return totalJ$;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { 
      playerId, 
      playerCharacterId, 
      j$Sold, 
      j$Rate = 10, // Default: 1 J$ = $10 USD (for USD cash-out)
      cashOutType = 'USD', // Default to USD
      zapsRate // Required for ZAPS cash-out: sats per J$
    } = body;
    
    if (!playerId || !j$Sold || j$Sold <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields: playerId, j$Sold (must be > 0)' },
        { status: 400 }
      );
    }
    
    if (cashOutType !== 'USD' && cashOutType !== 'ZAPS') {
      return NextResponse.json(
        { error: 'Invalid cashOutType. Must be "USD" or "ZAPS"' },
        { status: 400 }
      );
    }
    
    // Note: zapsRate is optional - will be calculated from Bitcoin price if not provided
    
    // Validate player has sufficient J$ balance
    const currentBalance = await getPlayerJ$Balance(playerId);
    
    if (j$Sold > currentBalance) {
      return NextResponse.json(
        { error: `Insufficient J$ balance. Current: ${currentBalance.toFixed(2)} J$, Requested: ${j$Sold.toFixed(2)} J$` },
        { status: 400 }
      );
    }
    
    // Create financial records for cash-out
    const { personalRecord, companyRecord } = await createFinancialRecordFromJ$CashOut(
      playerId,
      playerCharacterId || null,
      j$Sold,
      j$Rate,
      cashOutType,
      zapsRate
    );
    
    // Return both FinancialRecords
    return NextResponse.json({
      success: true,
      personalRecord,
      companyRecord,
      message: `Successfully cashed out ${j$Sold} J$ for ${cashOutType}`
    });
    
  } catch (error) {
    console.error('[API] Error cashing out J$:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cash out J$' },
      { status: 500 }
    );
  }
}

