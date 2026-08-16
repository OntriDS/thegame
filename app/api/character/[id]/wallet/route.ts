import { NextRequest, NextResponse } from 'next/server';
import { getAllFinancials, getAllPlayers, getCharacterById, getFinancialById } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, CanonicalLinkType, LinkType } from '@/types/enums';
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

        // Player-attributed financials are part of the character's wallet even
        // when they correctly have no FINREC_CHARACTER counterparty link.
        // `playerCharacterId` is the operational player association; it is not
        // a customer/beneficiary relationship.
        const playerFinancialIds = (await getAllFinancials())
            .filter((record) => record.playerCharacterId === characterId)
            .map((record) => record.id);

        const playerIds = (await getAllPlayers())
            .filter((player) => player.characterId === characterId)
            .map((player) => player.id);
        const playerLinks = (await Promise.all(
            playerIds.map((playerId) => getLinksFor({ type: EntityType.PLAYER, id: playerId }))
        )).flat();
        const canonicalPlayerFinancialIds = playerLinks
            .filter((link) => link.linkType === LinkType.PLAYER_FINREC && link.target.type === EntityType.FINANCIAL)
            .map((link) => link.target.id);

        const uniqueFinRecIds = Array.from(new Set([...finRecIds, ...canonicalPlayerFinancialIds, ...playerFinancialIds]));

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
