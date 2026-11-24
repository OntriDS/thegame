import { NextRequest, NextResponse } from 'next/server';

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

        // Monthly-close is no longer executed directly by this Vercel route.
        // The canonical automation Run boundary is invoked by its scheduler
        // (currently planned for local Hermes), and owns dry-run, lease,
        // idempotency, and workflow execution.
        results.monthlyClose = { status: 'not-run', reason: 'use-automation-run-boundary' };

        // --- JOB: Pixelbrain Autonomous Pulse (Piggyback Strategy) ---
        // We read the shared KV directly from the common Redis instance
        const { kv } = await import('@/lib/utils/kv');
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
            message: 'Orchestrator finished evaluating scheduled services.',
            date: now.toISOString(),
            jobsRun: results
        });

    } catch (error: any) {
        console.error('[Cron Orchestrator] Fatal Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

