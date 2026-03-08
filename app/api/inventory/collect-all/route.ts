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
            return NextResponse.json({ error: 'Missing month or year' }, { status: 400 });
        }

        const { collectedCount } = await CollectionService.collectInventory(month, year);

        return NextResponse.json({
            success: true,
            collected: collectedCount
        });

    } catch (error: any) {
        console.error('[COLLECT-INVENTORY] General error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
