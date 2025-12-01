
import { NextResponse } from 'next/server';
import { getItemsForMonth, getAllItems, upsertItem } from '@/data-store/datastore';
import { formatMonthKey } from '@/lib/utils/date-utils';
import { ItemStatus } from '@/types/enums';

export const dynamic = 'force-dynamic';

export async function GET() {
    const logs = [];
    logs.push('--- Repairing Sold Items Index ---');

    try {
        // 1. Find all sold items
        const allItems = await getAllItems();
        const soldItems = allItems.filter(i =>
            i.status === ItemStatus.SOLD ||
            (i.status as string) === 'Sold' ||
            (i.status as string) === 'itemstatus.sold'
        );

        logs.push(`Found ${soldItems.length} sold items out of ${allItems.length} total items.`);

        // 2. Re-save each sold item to trigger the index update logic
        for (const item of soldItems) {
            logs.push(`Repairing item: ${item.name} (${item.id})`);

            // Ensure soldAt is set (if missing, use updatedAt or createdAt)
            if (!item.soldAt) {
                item.soldAt = item.updatedAt || item.createdAt || new Date();
                logs.push(`- Fixed missing soldAt date: ${item.soldAt}`);
            }

            // Force upsert to re-run indexing logic
            // We skip workflow effects to avoid creating duplicate logs or side effects
            await upsertItem(item, { skipWorkflowEffects: true, skipLinkEffects: true });

            const targetMonthKey = formatMonthKey(new Date(item.soldAt));
            logs.push(`- Re-indexed for month: ${targetMonthKey}`);
        }

        logs.push('--- Repair Complete ---');

    } catch (e) {
        logs.push(`Error repairing items: ${e}`);
    }

    return NextResponse.json({ logs });
}
