import { NextRequest, NextResponse } from 'next/server';
import { CollectionService } from '@/workflows/collection.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // 1. Verify Vercel Cron Security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const results: any = {};
        const now = new Date();

        // Determine if today is the LAST day of the current month
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isLastDayOfMonth = tomorrow.getDate() === 1;


        // --- JOB: Automated Monthly Rewards Collection (All 4 Entities) ---
        if (isLastDayOfMonth) {
            const targetMonth = now.getMonth() + 1; // 1-12
            const targetYear = now.getFullYear();

            // Run all 4 collection processes sequentially to fit Hobby plan limits
            results.tasks = await CollectionService.collectTasks(targetMonth, targetYear);
            results.sales = await CollectionService.collectSales(targetMonth, targetYear);
            results.financials = await CollectionService.collectFinancials(targetMonth, targetYear);
            results.inventory = await CollectionService.collectInventory(targetMonth, targetYear);

        }

        // --- FUTURE JOBS GO HERE ---
        // if (condition) { fire task }

        return NextResponse.json({
            success: true,
            message: 'Orchestrator finished evaluating daily tasks.',
            date: now.toISOString(),
            jobsRun: results
        });

    } catch (error: any) {
        console.error('[Cron Orchestrator] Fatal Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
