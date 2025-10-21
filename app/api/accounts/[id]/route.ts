// app/api/accounts/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAccountById, removeAccount } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  const account = await getAccountById(params.id);
  if (!account) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(account);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  await removeAccount(params.id);
  return new NextResponse(null, { status: 204 });
}


