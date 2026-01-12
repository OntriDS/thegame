import { NextRequest, NextResponse } from 'next/server';
import { getCharacterById, getFinancialById } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, LinkType } from '@/types/enums';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Auth Check (Admin only for now, or owner)
        // Assuming cookie based auth is handled by middleware.

        const characterId = params.id;
        if (!characterId) {
            return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
        }

        // 2. Get Character (for name/validation)
        const character = await getCharacterById(characterId);
        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }

        // 3. Get Linked Financial Records
        const links = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });

        // Filter for J$ relevant links
        const relevantLinkTypes = [
            LinkType.FINREC_CHARACTER,
            LinkType.PLAYER_FINREC,
            LinkType.FINREC_PLAYER
        ];

        const financialLinks = links.filter(l => relevantLinkTypes.includes(l.linkType));

        // Map to Financial Record IDs
        const finRecIds = financialLinks.map(l => {
            if (l.target.type === EntityType.FINANCIAL) return l.target.id;
            if (l.source.type === EntityType.FINANCIAL) return l.source.id;
            return null;
        }).filter(id => id !== null) as string[];

        const uniqueFinRecIds = Array.from(new Set(finRecIds)); // Dedupe

        // Fetch Records
        const records = await Promise.all(
            uniqueFinRecIds.map(id => getFinancialById(id))
        );

        // Filter valid records and those with J$ impact
        const validRecords = records.filter(r => r !== null && r.jungleCoins !== 0);

        // Sort by Date (Desc)
        validRecords.sort((a, b) => {
            const dateA = a!.collectedAt ? new Date(a!.collectedAt).getTime() : new Date(a!.createdAt).getTime();
            const dateB = b!.collectedAt ? new Date(b!.collectedAt).getTime() : new Date(b!.createdAt).getTime();
            return dateB - dateA;
        });

        // Calculate Real-Time Balance (Audit)
        const calculatedBalance = validRecords.reduce((sum, r) => sum + (r!.jungleCoins || 0), 0);

        return NextResponse.json({
            characterId: character.id,
            characterName: character.name,
            cachedBalance: character.jungleCoins || 0,
            auditBalance: calculatedBalance,
            transactions: validRecords
        });

    } catch (error) {
        console.error(`[API] Error fetching wallet for character ${params.id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
