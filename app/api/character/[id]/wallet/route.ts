import { NextRequest, NextResponse } from 'next/server';
import { getCharacterById, getFinancialById } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, LinkType } from '@/types/enums';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const characterId = params.id;
        if (!characterId) {
            return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
        }

        // 1. Get Character with Wallet Balance
        const character = await getCharacterById(characterId);
        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }

        // 2. Get Transaction History (Coins Ledger)
        // We still fetch this for the history view, but NOT to calculate the balance on the fly anymore.
        const links = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });

        const relevantLinkTypes = [
            LinkType.FINREC_CHARACTER,
            LinkType.PLAYER_FINREC,
            LinkType.FINREC_PLAYER
        ];

        const financialLinks = links.filter(l => relevantLinkTypes.includes(l.linkType));

        const finRecIds = financialLinks.map(l => {
            if (l.target.type === EntityType.FINANCIAL) return l.target.id;
            if (l.source.type === EntityType.FINANCIAL) return l.source.id;
            return null;
        }).filter(id => id !== null) as string[];

        const uniqueFinRecIds = Array.from(new Set(finRecIds));

        const records = await Promise.all(
            uniqueFinRecIds.map(id => getFinancialById(id))
        );

        const validRecords = records.filter(r => r !== null && r.jungleCoins !== 0);

        validRecords.sort((a, b) => {
            const dateA = a!.collectedAt ? new Date(a!.collectedAt).getTime() : new Date(a!.createdAt).getTime();
            const dateB = b!.collectedAt ? new Date(b!.collectedAt).getTime() : new Date(b!.createdAt).getTime();
            return dateB - dateA;
        });

        // Audit (Optional: Check if Ledger matches Wallet)
        // const ledgerBalance = validRecords.reduce((sum, r) => sum + (r!.jungleCoins || 0), 0);
        // if (ledgerBalance !== (character.jungleCoins || 0)) { console.warn('Wallet Desync Detected', { wallet: character.jungleCoins, ledger: ledgerBalance }); }

        return NextResponse.json({
            characterId: character.id,
            characterName: character.name,
            cachedBalance: character.wallet?.jungleCoins || 0, // THE WALLET (Source of Truth)
            transactions: validRecords // THE LEDGER (History)
        });

    } catch (error) {
        console.error(`[API] Error fetching wallet for character ${params.id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
