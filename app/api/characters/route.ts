// app/api/characters/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import { requireAdminAuth } from '@/lib/api-auth';
import { iamService } from '@/lib/iam-service';
import type { Character } from '@/types/entities';
import { upsertCharacter } from '@/data-store/datastore';

// Force dynamic rendering since this route accesses request cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Accounts section needs IAM-known character IDs so account->character linking works at login time.
  const iamCharacters = await iamService.listCharacters();

  const mapped = await Promise.all(
    iamCharacters.map(async (c) => {
      const player = await iamService.getPlayerByCharacterId(c.id);
      return {
        id: c.id,
        name: c.name,
        description: (c.profile as any)?.description,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        links: [],
        metadata: undefined,

        // IAM core -> DS shape
        accountId: c.accountId ?? null,
        roles: c.roles,
        commColor: (c.profile as any)?.commColor,

        contactPhone: (c.profile as any)?.contactPhone,
        contactEmail: (c.profile as any)?.contactEmail,
        CP: (c.profile as any)?.CP,
        achievementsCharacter: (c.profile as any)?.achievementsCharacter || [],
        purchasedAmount: (c.profile as any)?.purchasedAmount ?? 0,
        wallet: (c.profile as any)?.wallet || { jungleCoins: 0 },
        inventory: (c.profile as any)?.inventory || [],
        relationships: (c.profile as any)?.relationships || [],

        // DS Character requires playerId; set to '' if missing so UI fallback can kick in.
        playerId: player?.id || '',

        siteId: (c.profile as any)?.siteId ?? null,
        lastActiveAt: new Date(c.updatedAt || c.createdAt),
        isActive: true,
      } as Character;
    })
  );

  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = (await req.json()) as Character;
    const character = {
      ...body,
      id: body.id || uuid(),
      links: body.links || [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      lastActiveAt: body.lastActiveAt ? new Date(body.lastActiveAt) : new Date(),
    };
    const saved = await upsertCharacter(character);
    return NextResponse.json(saved);
  } catch (error: any) {
    console.error('[API] Error saving character:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save character' },
      { status: 500 }
    );
  }
}
