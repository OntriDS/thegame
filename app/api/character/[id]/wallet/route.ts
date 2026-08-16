import { NextRequest, NextResponse } from 'next/server';
import { getCharacterById, getFinancialById } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, CanonicalLinkType } from '@/types/enums';
import { FinancialRecord } from '@/types/entities';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id: characterId } = params;
        if (!characterId) {
            return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
        }

        // 1. Get Character
        const character = await getCharacterById(characterId);
        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }

        // 2. Get Transaction History (Coins Ledger)
        const links = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });

        // Use valid CanonicalLinkTypes (legacy PLAYER_FINREC and FINREC_PLAYER don't exist in the canonical enum)
        const relevantLinkTypes = [
            CanonicalLinkType.FINREC_CHARACTER
        ];

        const financialLinks = links.filter(l => relevantLinkTypes.includes(l.linkType as CanonicalLinkType));

        const finRecIds = financialLinks.map(l => {
            if (l.target.type === EntityType.FINANCIAL) return l.target.id;
            if (l.source.type === EntityType.FINANCIAL) return l.source.id;
            return null;
        }).filter(id => id !== null) as string[];

        const uniqueFinRecIds = Array.from(new Set(finRecIds));

        const records = await Promise.all(
            uniqueFinRecIds.map(id => getFinancialById(id))
        );

        const validRecords = records.filter((r): r is FinancialRecord => r != null && (r.context.jungleCoins ?? 0) !== 0);

        validRecords.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
        });

        // Compute cached balance strictly from the V1 ledger
        const cachedBalance = validRecords.reduce((sum, r) => sum + (r.context.jungleCoins ?? 0), 0);

        return NextResponse.json({
            characterId: character.id,
            characterName: character.name,
            cachedBalance: cachedBalance,
            transactions: validRecords
        });

    } catch (error) {
        console.error(`[API] Error fetching wallet for character:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
