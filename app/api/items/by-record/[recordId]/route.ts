// app/api/items/by-record/[recordId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getItemsBySourceRecordId } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { recordId: string } }) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const items = await getItemsBySourceRecordId(params.recordId);
  return NextResponse.json(items);
}

