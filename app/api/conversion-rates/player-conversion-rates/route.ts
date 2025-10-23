import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getPlayerConversionRates, savePlayerConversionRates } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rates = await getPlayerConversionRates();
  return NextResponse.json(rates);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  await savePlayerConversionRates(body);
  return NextResponse.json({ success: true });
}
