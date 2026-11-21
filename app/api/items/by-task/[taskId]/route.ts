// app/api/items/by-task/[taskId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getItemsBySourceTaskId } from '@/data-store/datastore';
import { requireAdminOrM2MAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { taskId: string } }) {
  if (!(await requireAdminOrM2MAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const items = await getItemsBySourceTaskId(params.taskId);
  return NextResponse.json(items);
}

