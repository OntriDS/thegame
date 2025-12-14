// app/api/contracts/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getContractById, removeContract } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const contract = await getContractById(params.id);
  if (!contract) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(contract);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await removeContract(params.id);
  return new NextResponse(null, { status: 204 });
}
