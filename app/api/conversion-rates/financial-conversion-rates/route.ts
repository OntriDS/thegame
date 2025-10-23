import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getFinancialConversionRates, saveFinancialConversionRates } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rates = await getFinancialConversionRates();
  return NextResponse.json(rates);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  await saveFinancialConversionRates(body);
  return NextResponse.json({ success: true });
}
