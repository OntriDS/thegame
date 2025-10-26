// app/api/players/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Player } from '@/types/entities';
import { getAllPlayers, upsertPlayer } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
import { convertEntityDates } from '@/lib/constants/date-constants';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const players = await getAllPlayers();
  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const body = (await req.json()) as Player;
    const player = convertEntityDates(
      { ...body, id: body.id || uuid(), links: body.links || [] },
      ['lastActiveAt']
    );
    const saved = await upsertPlayer(player);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[API] Error saving player:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save player' },
      { status: 500 }
    );
  }
}
