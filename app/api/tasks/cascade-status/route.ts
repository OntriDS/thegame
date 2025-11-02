import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { cascadeStatusToInstances, getUndoneInstancesCount } from '@/lib/utils/recurrent-task-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { templateId, newStatus, oldStatus } = await req.json();
    
    if (!templateId || !newStatus || !oldStatus) {
      return NextResponse.json({ error: 'Missing required fields: templateId, newStatus, oldStatus' }, { status: 400 });
    }

    const result = await cascadeStatusToInstances(templateId, newStatus, oldStatus);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error cascading status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cascade status' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('templateId');
    const targetStatus = searchParams.get('targetStatus');

    if (!templateId || !targetStatus) {
      return NextResponse.json({ error: 'Missing required params: templateId, targetStatus' }, { status: 400 });
    }

    const count = await getUndoneInstancesCount(templateId, targetStatus);
    return NextResponse.json({ count });
  } catch (error) {
    console.error('[API] Error getting undone instances count:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get count' },
      { status: 500 }
    );
  }
}

