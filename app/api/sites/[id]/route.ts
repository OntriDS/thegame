// app/api/sites/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getSiteById, removeSite } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  const site = await getSiteById(params.id);
  if (!site) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(site);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  await removeSite(params.id);
  return new NextResponse(null, { status: 204 });
}
