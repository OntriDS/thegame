import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllItems } from '@/data-store/datastore';
import { ItemStatus } from '@/types/enums';
import { calculateClosingDate, formatMonthKey } from '@/lib/utils/date-utils';
import { buildArchiveMonthsKey } from '@/data-store/keys';
import { kvSAdd } from '@/data-store/kv';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
    if (!(await requireAdminAuth(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const items = await getAllItems();

        // Find all SOLD or COLLECTED items using robust case-insensitive matching
        // Built to catch legacy "Ghost Items" with status 'SOLD' instead of ItemStatus.SOLD
        const archivableItems = items.filter(item => {
            const itemStatus = (item.status || '').toString().toLowerCase();
            return (
                itemStatus === 'sold' ||
                itemStatus === 'itemstatus.sold' ||
                itemStatus === 'collected' ||
                itemStatus === 'itemstatus.collected' ||
                !!item.isCollected
            );
        });

        const results = {
            scanned: items.length,
            archivable: archivableItems.length,
            repaired: 0,
            monthsAffected: new Set<string>()
        };

        for (const item of archivableItems) {
            // Determine the target date
            let targetDate: Date;
            if (item.collectedAt) {
                targetDate = new Date(item.collectedAt);
            } else if (item.soldAt) {
                targetDate = new Date(item.soldAt);
            } else if (item.createdAt) {
                targetDate = new Date(item.createdAt);
            } else {
                targetDate = new Date();
            }

            // Calculate the closing month and format the key
            const archiveMonth = calculateClosingDate(targetDate);
            const monthKey = formatMonthKey(archiveMonth);

            // Add to index
            const indexKey = `index:items:collected:${monthKey}`;
            await kvSAdd(indexKey, item.id);

            // Ensure the month is registered in the global archive index map
            await kvSAdd(buildArchiveMonthsKey(), monthKey);

            results.repaired++;
            results.monthsAffected.add(monthKey);
        }

        return NextResponse.json({
            success: true,
            message: 'Repair complete',
            stats: {
                scanned: results.scanned,
                archivableFound: results.archivable,
                itemsRepairedAndIndexed: results.repaired,
                monthsAffected: Array.from(results.monthsAffected)
            }
        });

    } catch (error) {
        console.error('[API] /api/admin/repair-items-index Failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
