import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { CollectionService } from '@/workflows/collection.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    if (!(await requireAdminAuth(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { month, year } = body;

        if (!month || !year) {
            return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
        }

        const results: any = {};

        // Execute all 4 collection processes sequentially
        results.tasks = await CollectionService.collectTasks(month, year);
        results.sales = await CollectionService.collectSales(month, year);
        results.financials = await CollectionService.collectFinancials(month, year);
        results.inventory = await CollectionService.collectInventory(month, year);

        return NextResponse.json({
            success: true,
            message: 'All rewards collected successfully.',
            results
        });

    } catch (error: any) {
        console.error('[Orchestrate All API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
