// app/api/accounts/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Account } from '@/types/entities';
import { getAllAccounts, upsertAccount } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const accounts = await getAllAccounts();
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json()) as Account;
  const account: Account = { 
    ...body, 
    id: body.id || uuid(), 
    createdAt: body.createdAt ? new Date(body.createdAt) : new Date(), 
    updatedAt: new Date(), 
    links: body.links || [] 
  };
  const saved = await upsertAccount(account);
  return NextResponse.json(saved);
}
