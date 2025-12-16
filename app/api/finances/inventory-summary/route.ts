import { NextResponse, NextRequest } from 'next/server';
import { getAllItems } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
import { ItemType } from '@/types/enums';
import { Item } from '@/types/entities';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type InventoryBucketTotals = Record<
    'materials' | 'equipment' | 'artworks' | 'prints' | 'stickers' | 'merch' | 'crafts',
    { value: number; cost: number }
>;

const EMPTY_INVENTORY_TOTALS: InventoryBucketTotals = {
    materials: { value: 0, cost: 0 },
    equipment: { value: 0, cost: 0 },
    artworks: { value: 0, cost: 0 },
    prints: { value: 0, cost: 0 },
    stickers: { value: 0, cost: 0 },
    merch: { value: 0, cost: 0 },
    crafts: { value: 0, cost: 0 },
};

const ITEM_TYPE_TO_BUCKET: Partial<Record<ItemType, keyof InventoryBucketTotals>> = {
    [ItemType.MATERIAL]: 'materials',
    [ItemType.EQUIPMENT]: 'equipment',
    [ItemType.ARTWORK]: 'artworks',
    [ItemType.PRINT]: 'prints',
    [ItemType.STICKER]: 'stickers',
    [ItemType.MERCH]: 'merch',
    [ItemType.CRAFT]: 'crafts',
    [ItemType.DIGITAL]: 'artworks',
    [ItemType.BUNDLE]: 'stickers',
};

export async function GET(req: NextRequest) {
    if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Fetch all items from the server-side datastore
        // This is still heavy server-side but avoids sending MBs to the client
        const items = await getAllItems();

        const totals: InventoryBucketTotals = JSON.parse(JSON.stringify(EMPTY_INVENTORY_TOTALS));

        items.forEach((item) => {
            // Skip sold items or non-active items if necessary, strictly following existing logic
            // The previous front-end logic didn't explicitly filter by status in calculateInventoryTotalsFromItems, 
            // but usually we want to count what we have in stock.
            // The getAllItems() returns all items. 
            // The stock quantity logic handles availability.

            const bucketKey = ITEM_TYPE_TO_BUCKET[item.type as ItemType];
            if (!bucketKey) return;

            const quantity = (item.stock || []).reduce((sum, stockPoint) => sum + (Number(stockPoint.quantity) || 0), 0);

            // If no quantity, it contributes 0 to value/cost
            if (quantity <= 0) return;

            const pricePerUnit = Number(item.price ?? item.value ?? 0);
            const costPerUnit = Number(item.unitCost ?? 0) + Number(item.additionalCost ?? 0);

            totals[bucketKey].value += pricePerUnit * quantity;
            totals[bucketKey].cost += costPerUnit * quantity;
        });

        return NextResponse.json(totals);
    } catch (error) {
        console.error('[API] Error calculating inventory summary:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to calculate inventory summary' },
            { status: 500 }
        );
    }
}
