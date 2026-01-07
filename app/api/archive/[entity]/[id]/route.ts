import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { deleteArchivedItem, deleteArchivedTask } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { entity: string; id: string } }
) {
    if (!(await requireAdminAuth(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity, id } = params;
    const month = request.nextUrl.searchParams.get('month');

    console.log(`[DELETE DEBUG] Attempting delete. Entity: ${entity}, ID: ${id}, Month: ${month}`);

    if (!month) {
        return NextResponse.json({ error: 'Missing month parameter' }, { status: 400 });
    }

    try {
        switch (entity) {
            case 'items':
                await deleteArchivedItem(id, month);
                break;
            case 'tasks':
                await deleteArchivedTask(id, month);
                break;
            default:
                return NextResponse.json({ error: 'Unsupported archive entity for deletion' }, { status: 400 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`[DELETE /api/archive/${entity}/${id}] Failed:`, error);
        return NextResponse.json(
            { error: `Failed to delete archived ${entity}` },
            { status: 500 }
        );
    }
}
