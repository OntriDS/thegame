// app/api/player/exchange-points/route.ts
// API route for exchanging points for Jungle Coins

import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { createFinancialRecordFromPointsExchange } from '@/workflows/financial-record-utils';
import { upsertPlayer } from '@/data-store/datastore';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { 
      playerId, 
      playerCharacterId, 
      pointsToExchange, 
      j$Received 
    } = body;
    
    if (!playerId || !pointsToExchange || !j$Received) {
      return NextResponse.json(
        { error: 'Missing required fields: playerId, pointsToExchange, j$Received' },
        { status: 400 }
      );
    }
    
    // Create FinancialRecord for the exchange
    const financialRecord = await createFinancialRecordFromPointsExchange(
      playerId,
      playerCharacterId || null,
      pointsToExchange,
      j$Received
    );
    
    // Return the created FinancialRecord
    return NextResponse.json({
      success: true,
      financialRecord,
      message: 'Points exchanged for Jungle Coins'
    });
    
  } catch (error) {
    console.error('[API] Error exchanging points:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to exchange points' },
      { status: 500 }
    );
  }
}

