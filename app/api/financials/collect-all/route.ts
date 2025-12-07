import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getFinancialsForMonth, upsertFinancial, archiveFinancialRecordSnapshot } from '@/data-store/datastore';
import { addMonthToArchiveIndex } from '@/data-store/repositories/archive.repo';
import { formatMonthKey } from '@/lib/utils/date-utils';
import { FinancialStatus, EntityType, LogEventType } from '@/types/enums';
import { appendEntityLog } from '@/workflows/entities-logging';

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

        // Ensure monthly index exists explicitly
        await addMonthToArchiveIndex(monthKey);

        // 1. Get all financials for the month
        const allFinancials = await getFinancialsForMonth(year, month);

        // 2. Filter for DONE/Processed financials that are not yet collected
        const recordsToCollect = allFinancials.filter(record =>
            record.status !== FinancialStatus.PENDING &&
            !record.isCollected
        );

        console.log(`[COLLECT-FINANCIALS] Found ${recordsToCollect.length} records to collect for ${monthKey}`);

        let collectedCount = 0;
        const errors: string[] = [];

        // 3. Process each record
        const results = await Promise.allSettled(recordsToCollect.map(async (record) => {
            try {
                // User Request: collectedAt should be the last day of the target month
                const collectionDate = new Date(year, month, 0);
                // Ensure we set the time to end of day
                collectionDate.setHours(12, 0, 0, 0); // Noon to avoid timezone rollover (safe "last day")

                const updatedRecord = {
                    ...record,
                    isCollected: true,
                    collectedAt: collectionDate,
                    status: FinancialStatus.COLLECTED
                };

                // Archive snapshot
                await archiveFinancialRecordSnapshot(updatedRecord, monthKey);

                // Save updated record
                await upsertFinancial(updatedRecord, { skipWorkflowEffects: true });

                // Log COLLECTED event (since workflow effects are skipped)
                await appendEntityLog(EntityType.FINANCIAL, updatedRecord.id, LogEventType.COLLECTED, {
                    name: updatedRecord.name,
                    collectedAt: updatedRecord.collectedAt
                });

                return { id: record.id, success: true };
            } catch (err: any) {
                console.error(`[COLLECT-FINANCIALS] Failed to collect financial ${record.id}:`, err);
                throw new Error(`Failed to collect ${record.name}: ${err.message}`);
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
        console.error('[COLLECT-FINANCIALS] General error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
