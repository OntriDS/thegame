// app/api/player/[id]/financial-records/route.ts
// API route for getting player's FinancialRecord transactions (J$ history)

import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getLinksFor } from '@/links/link-registry';
import { getFinancialById } from '@/data-store/datastore';
import { EntityType, LinkType } from '@/types/enums';
import type { FinancialRecord } from '@/types/entities';

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
    
    // Get all PLAYER_FINREC links for this player
    const links = await getLinksFor({ type: EntityType.PLAYER, id: playerId });
    const finrecLinks = links.filter(link => link.linkType === LinkType.PLAYER_FINREC);
    const finrecIds = finrecLinks.map(link => link.target.id);
    
    if (finrecIds.length === 0) {
      return NextResponse.json([]);
    }
    
    // Fetch all FinancialRecords in parallel
    const financialRecords = await Promise.all(
      finrecIds.map(id => getFinancialById(id))
    );
    
    // Filter out null records and only include PERSONAL records (player's J$ transactions)
    const validRecords = financialRecords.filter((record): record is FinancialRecord => record !== null);
    const personalRecords = validRecords.filter(record => record.type === 'personal');
    
    // Enrich records with exchangeType from link metadata
    const enrichedRecords = personalRecords.map(record => {
      const link = finrecLinks.find(l => l.target.id === record.id);
      const exchangeType = link?.metadata?.exchangeType || null;
      
      return {
        ...record,
        exchangeType: exchangeType as 'POINTS_TO_J$' | 'J$_TO_USD' | 'J$_TO_ZAPS' | null
      };
    });
    
    // Sort by date (newest first)
    enrichedRecords.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    return NextResponse.json(enrichedRecords);
    
  } catch (error) {
    console.error('[API] Error getting player financial records:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get player financial records' },
      { status: 500 }
    );
  }
}

