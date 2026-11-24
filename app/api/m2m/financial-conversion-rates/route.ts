import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { getFinancialConversionRates } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

async function verifyM2MRequest(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing Bearer token' }, { status: 401 });
  }

  const verification = await iamService.verifyM2MToken(authHeader.substring(7));
  if (!verification.valid) {
    return NextResponse.json({ success: false, error: 'Invalid or expired M2M token' }, { status: 401 });
  }

  if (verification.appId !== 'akiles-ecosystem' && verification.appId !== 'pixelbrain') {
    return NextResponse.json({ success: false, error: 'Forbidden: unauthorized application' }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authFailure = await verifyM2MRequest(request);
  if (authFailure) return authFailure;

  try {
    const rates = await getFinancialConversionRates();
    return NextResponse.json({ success: true, rates });
  } catch (error) {
    console.error('[M2M Financial Conversion Rates GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
