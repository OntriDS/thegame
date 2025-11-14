// app/api/player/[id]/jungle-coins/route.ts
// API route for getting player's Jungle Coins balance from FinancialRecord entries

import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getLinksFor } from '@/links/link-registry';
import { getFinancialById } from '@/data-store/datastore';
import { EntityType, LinkType } from '@/types/enums';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const playerId = params.id;
    
    if (!playerId) {
      return NextResponse.json(
        { error: 'Missing player ID' },
        { status: 400 }
      );
    }
    
    // Get all PLAYER_FINREC links for this player (most efficient approach)
    const links = await getLinksFor({ type: EntityType.PLAYER, id: playerId });
    const finrecLinks = links.filter(link => link.linkType === LinkType.PLAYER_FINREC);
    
    // Get all FinancialRecord IDs from the links
    const finrecIds = finrecLinks.map(link => link.target.id);
    
    if (finrecIds.length === 0) {
      // No FinancialRecords linked to this player yet
      return NextResponse.json({
        totalJ$: 0,
        recordCount: 0,
        exchangeRecords: 0,
        records: []
      });
    }
    
    // Fetch all FinancialRecords in parallel
    const financialRecords = await Promise.all(
      finrecIds.map(id => getFinancialById(id))
    );
    
    // Filter out null records and only include PERSONAL records (company records are for buyback tracking)
    const validRecords = financialRecords.filter((record): record is NonNullable<typeof record> => record !== null);
    const personalRecords = validRecords.filter(record => record.type === 'personal');
    const totalJ$ = personalRecords.reduce((sum, record) => sum + (record.jungleCoins || 0), 0);
    
    // Get exchange records (POINTS_TO_J$) for reference (only from personal records)
    const exchangeRecords = personalRecords.filter(record => 
      record.description?.includes('Points exchanged for J$') ||
      finrecLinks.some(link => link.target.id === record.id && link.metadata?.exchangeType === 'POINTS_TO_J$')
    );
    
    return NextResponse.json({
      totalJ$,
      recordCount: personalRecords.length, // Only count personal records
      exchangeRecords: exchangeRecords.length,
      records: personalRecords.map(record => ({
        id: record.id,
        name: record.name,
        jungleCoins: record.jungleCoins,
        createdAt: record.createdAt,
        description: record.description
      }))
    });
    
  } catch (error) {
    console.error('[API] Error getting player Jungle Coins:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get player Jungle Coins' },
      { status: 500 }
    );
  }
}

