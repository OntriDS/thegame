import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getSalesForMonth, upsertSale, archiveSaleSnapshot } from '@/data-store/datastore';
import { addMonthToArchiveIndex } from '@/data-store/repositories/archive.repo';
import { formatMonthKey } from '@/lib/utils/date-utils';
import { SaleStatus, EntityType, LogEventType } from '@/types/enums'; // Added enums
import { appendEntityLog } from '@/workflows/entities-logging'; // Added logging

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    if (!(await requireAdminAuth(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { month, year } = body;

        if (!month || !year) {
            return NextResponse.json({ error: 'Missing month or year' }, { status: 400 });
        }

        const date = new Date(year, month - 1, 1);
        const monthKey = formatMonthKey(date);

        // Ensure monthly index exists explicitly to prevent empty vault
        await addMonthToArchiveIndex(monthKey);

        // 1. Get all sales for the month
        const allSales = await getSalesForMonth(year, month);

        // 2. Filter for DONE/Processed sales that are not yet collected
        // We exclude Pending (not fully paid/charged/closed).
        // Sales usually go Pending -> Charged (Done) -> Collected
        const recordsToCollect = allSales.filter(sale =>
            sale.status !== 'PENDING' &&
            !sale.isCollected
        );



        let collectedCount = 0;
        const errors: string[] = [];

        // 3. Process each record
        const results = await Promise.allSettled(recordsToCollect.map(async (sale) => {
            try {
                // User requirement: collectedAt should be the last day of the sale's month
                // Use saleDate if available, or fallback to requested month logic
                const saleDate = sale.saleDate ? new Date(sale.saleDate) : new Date(year, month - 1, 1);

                // End of the month of the SALE (or the bucket month if we enforce it)
                // Enforcing the *sale's* actual month is safer for history, 
                // but checking if it aligns with the requested bucket?
                // If I collect "Nov Sales", and a sale is dated "Oct 31" but shows up because of index drift...
                // safer to use the sale's own date to determine its archive home.

                const endOfMonth = new Date(saleDate.getFullYear(), saleDate.getMonth() + 1, 0);
                endOfMonth.setHours(12, 0, 0, 0); // Noon to avoid timezone rollover

                const updatedSale = {
                    ...sale,
                    isCollected: true,
                    collectedAt: endOfMonth,
                    status: SaleStatus.COLLECTED
                };

                // Archive snapshot
                await archiveSaleSnapshot(updatedSale, monthKey);

                // Save updated record
                await upsertSale(updatedSale, { skipWorkflowEffects: true });

                // Log COLLECTED event (since workflow effects are skipped)
                await appendEntityLog(EntityType.SALE, updatedSale.id, LogEventType.COLLECTED, {
                    name: updatedSale.counterpartyName || 'Sale',
                    saleDate: updatedSale.saleDate,
                    collectedAt: updatedSale.collectedAt
                });

                return { id: sale.id, success: true };
            } catch (err: any) {
                console.error(`[COLLECT-SALES] Failed to collect sale ${sale.id}:`, err);
                throw new Error(`Failed to collect ${sale.counterpartyName || 'Sale'}: ${err.message}`);
            }
        }));

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                collectedCount++;
            } else {
                errors.push(result.reason.message);
            }
        });

        return NextResponse.json({
            success: true,
            collected: collectedCount,
            total: recordsToCollect.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('[COLLECT-SALES] General error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
