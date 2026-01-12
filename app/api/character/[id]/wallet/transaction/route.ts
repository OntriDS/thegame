import { NextRequest, NextResponse } from 'next/server';
import { getCharacterById } from '@/data-store/datastore';
import { upsertFinancial } from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { appendLinkLog } from '@/links/links-logging';
import { EntityType, LinkType, Station, CharacterRole } from '@/types/enums';
import { FinancialRecord } from '@/types/entities';

// POST /api/character/[id]/wallet/transaction
// Body: { type: 'transfer' | 'exchange', amount: number, note?: string }
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const characterId = params.id;
        if (!characterId) return NextResponse.json({ error: 'Character ID required' }, { status: 400 });

        const body = await request.json();
        const { type, amount, note } = body;

        if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

        const character = await getCharacterById(characterId);
        if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

        const currentDate = new Date();

        // Define Record Properties based on Type
        let finRecord: FinancialRecord;

        if (type === 'transfer') {
            finRecord = {
                id: `finrec-transfer-${characterId}-${Date.now()}`,
                name: `Transfer from HQ`,
                description: note || `Manual transfer of ${amount} J$ to ${character.name}`,
                year: currentDate.getFullYear(),
                month: currentDate.getMonth() + 1,
                station: 'Admin' as Station,
                type: 'company',
                siteId: undefined,
                cost: 0,
                revenue: 0,
                jungleCoins: amount, // Positive = Added to wallet
                isNotPaid: false,
                isNotCharged: false, // Instant
                netCashflow: 0,
                jungleCoinsValue: amount * 10,
                isCollected: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                links: []
            };

        } else if (type === 'exchange') {
            // Exchange OUT (Spend)
            finRecord = {
                id: `finrec-exchange-${characterId}-${Date.now()}`,
                name: `Exchange by ${character.name}`,
                description: note || `Exchanged ${amount} J$`,
                year: currentDate.getFullYear(),
                month: currentDate.getMonth() + 1,
                station: 'Admin' as Station,
                type: 'company',
                siteId: undefined,
                cost: 0,
                revenue: 0,
                jungleCoins: -amount, // Negative = Deducted
                isNotPaid: false,
                isNotCharged: false,
                netCashflow: 0,
                jungleCoinsValue: amount * 10,
                isCollected: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                links: []
            };
        } else {
            return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
        }

        // Upsert Record
        const savedRecord = await upsertFinancial(finRecord);

        // Create Link
        const link = makeLink(
            LinkType.FINREC_CHARACTER,
            { type: EntityType.FINANCIAL, id: savedRecord.id },
            { type: EntityType.CHARACTER, id: characterId },
            {
                role: CharacterRole.ASSOCIATE, // Or undefined?
                amount: amount,
                type: type
            }
        );

        await createLink(link);
        await appendLinkLog(link, 'created');

        return NextResponse.json({ success: true, record: savedRecord });

    } catch (error) {
        console.error(`[API] Transaction failed:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
