import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    if (!(await requireAdminAuth(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
        { error: 'This legacy collection route is retired. Run the registered monthly-close Automation Task.' },
        { status: 410 }
    );
}
