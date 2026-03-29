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


        // --- JOB: Automated monthly collection (tasks + sales). Items archive on SOLD only. ---
        if (isLastDayOfMonth) {
            const targetMonth = now.getMonth() + 1; // 1-12
            const targetYear = now.getFullYear();

            results.tasks = await CollectionService.collectTasks(targetMonth, targetYear);
            results.sales = await CollectionService.collectSales(targetMonth, targetYear);
        }

        // --- JOB: Pixelbrain Autonomous Pulse (Piggyback Strategy) ---
        // We read the shared KV directly from the common Redis instance
        const { kv } = await import('@/data-store/kv');
        const pulseOn = await kv.get('pixelbrain:config:pulse') === true || await kv.get('pixelbrain:config:pulse') === 'ON';
        
        if (pulseOn) {
            console.log('[Cron Orchestrator] Triggering Pixelbrain Autonomous Pulse...');
            try {
                // We hit the internal Pixelbrain API rather than direct imports to ensure
                // build stability and clean decoupling between 'thegame' and 'pixelbrain'.
                const baseUrl = process.env.PIXELBRAIN_API_URL || request.nextUrl.origin;
                const pulseResponse = await fetch(`${baseUrl}/api/pulse`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
                });
                
                if (pulseResponse.ok) {
                    results.pixelbrainPulse = pulseResponse.status === 204 ? { status: 'dormant' } : await pulseResponse.json();
                } else {
                    const errorText = await pulseResponse.text();
                    results.pixelbrainPulse = { error: `Pulse API returned ${pulseResponse.status}: ${errorText.substring(0, 100)}` };
                }
            } catch (pbError: any) {
                console.error('[Cron Orchestrator] Pixelbrain Pulse failed:', pbError);
                results.pixelbrainPulse = { error: pbError.message };
            }
        }

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
