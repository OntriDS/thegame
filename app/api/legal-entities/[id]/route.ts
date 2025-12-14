// app/api/legal-entities/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getLegalEntityById, removeLegalEntity } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const entity = await getLegalEntityById(params.id);
  if (!entity) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(entity);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await removeLegalEntity(params.id);
  return new NextResponse(null, { status: 204 });
}
