import { NextResponse } from 'next/server';
import { CollectionService } from '@/workflows/collection.service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { month, year } = body;

        if (month === undefined || year === undefined) {
            return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
        }

        const { collectedCount } = await CollectionService.collectTasks(month, year);
        return NextResponse.json({ collectedCount });
    } catch (error) {
        console.error('[API] Error in bulk collect tasks:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
