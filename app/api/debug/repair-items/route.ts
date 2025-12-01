import { NextResponse } from 'next/server';
import { getAllItems, upsertItem } from '@/data-store/datastore';
import { ItemStatus } from '@/types/enums';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const allItems = await getAllItems();
        let fixedCount = 0;
        const fixedItems = [];

        for (const item of allItems) {
            let needsUpdate = false;
            const updates: any = {};

            // 1. Fix Status Case and "ItemStatus.SOLD" literal
            // Check if status is a string and matches "SOLD" or "ItemStatus.SOLD"
            const status = item.status as string;
            if (status && (status.toUpperCase() === 'SOLD' || status === 'ItemStatus.SOLD') && status !== ItemStatus.SOLD) {
                updates.status = ItemStatus.SOLD;
                needsUpdate = true;
            }

            // 2. Ensure soldAt exists for Sold items
            if ((item.status === ItemStatus.SOLD || updates.status === ItemStatus.SOLD) && !item.soldAt) {
                // Fallback to createdAt if soldAt is missing
                updates.soldAt = item.createdAt;
                needsUpdate = true;
            }

            if (needsUpdate) {
                const updatedItem = { ...item, ...updates };
                await upsertItem(updatedItem); // This re-indexes the item correctly
                fixedCount++;
                fixedItems.push({ id: item.id, name: item.name, updates });
            }
        }

        return NextResponse.json({
            message: 'Repair complete',
            fixedCount,
            fixedItems
        });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
