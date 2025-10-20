// app/api/financials/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getFinancialById, removeFinancial } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  const financial = await getFinancialById(params.id);
  if (!financial) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(financial);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  await removeFinancial(params.id);
  return new NextResponse(null, { status: 204 });
}
