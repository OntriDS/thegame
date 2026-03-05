import { NextRequest, NextResponse } from 'next/server';
import { bulkCollectMonthTasks } from '@/workflows/bulk-collect.workflow';

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
        // We do this by checking if tomorrow is the 1st of the next month.
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isLastDayOfMonth = tomorrow.getDate() === 1;

        console.log(`[Cron Orchestrator] Triggered at ${now.toISOString()}. Last day of month: ${isLastDayOfMonth}`);

        // --- JOB 1: Automated Monthly Rewards Collection ---
        if (isLastDayOfMonth) {
            console.log(`[Cron Orchestrator] Running Monthly Rewards Collection...`);
            const targetMonth = now.getMonth() + 1; // 1-12
            const targetYear = now.getFullYear();

            const collectionResult = await bulkCollectMonthTasks(targetMonth, targetYear);
            results.monthlyCollection = collectionResult;
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
