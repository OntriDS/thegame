// app/api/players/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Player } from '@/types/entities';
import { getAllPlayers, upsertPlayer } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const players = await getAllPlayers();
  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json()) as Player;
  const player: Player = { 
    ...body, 
    id: body.id || uuid(), 
    createdAt: body.createdAt ? new Date(body.createdAt) : new Date(), 
    updatedAt: new Date(), 
    links: body.links || [] 
  };
  const saved = await upsertPlayer(player);
  return NextResponse.json(saved);
}
