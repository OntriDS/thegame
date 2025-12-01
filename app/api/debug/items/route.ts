
import { NextResponse } from 'next/server';
import { getItemsForMonth, getAllItems } from '@/data-store/datastore';
import { formatMonthKey } from '@/lib/utils/date-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
    const logs = [];
    logs.push('--- Debugging Items ---');

    // 1. Check November 2025 Index
    const novKey = formatMonthKey(new Date(2025, 10, 1));
    logs.push(`Checking index for: ${novKey}`);

    try {
        const novItems = await getItemsForMonth(2025, 11);
        logs.push(`Found ${novItems.length} items in November 2025 index.`);
        novItems.forEach(i => {
            logs.push(`- ${i.name} (${i.id}): Status=${i.status}, SoldAt=${i.soldAt}`);
        });
    } catch (e) {
        logs.push(`Error fetching November items: ${e}`);
    }

    // 2. Search for specific items globally
    const targetNames = ['El Titi', 'Capo Chino', 'Spider'];
    logs.push(`\nSearching globally for: ${targetNames.join(', ')}`);

    try {
        const allItems = await getAllItems();
        const found = allItems.filter(i => targetNames.includes(i.name));

        if (found.length === 0) {
            logs.push('No matching items found globally in active storage.');
        } else {
            found.forEach(i => {
                logs.push(`FOUND: ${i.name} (${i.id})`);
                logs.push(`  Status: ${i.status}`);
                logs.push(`  SoldAt: ${i.soldAt}`);
                logs.push(`  CreatedAt: ${i.createdAt}`);
                logs.push(`  Month Index Key should be: ${i.soldAt ? formatMonthKey(new Date(i.soldAt)) : 'N/A'}`);
            });
        }
    } catch (e) {
        logs.push(`Error fetching all items: ${e}`);
    }

    return NextResponse.json({ logs });
}
