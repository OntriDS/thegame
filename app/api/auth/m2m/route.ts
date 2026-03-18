import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';

/**
 * M2M Token Exchange Endpoint
 * POST /api/auth/m2m
 * Body: { appId, apiKey }
 */
export async function POST(req: NextRequest) {
  try {
    const { appId, apiKey } = await req.json();

    if (!appId || !apiKey) {
      return NextResponse.json({ error: 'appId and apiKey are required' }, { status: 400 });
    }

    const token = await iamService.authenticateM2M(appId, apiKey);

    if (!token) {
      return NextResponse.json({ error: 'Invalid M2M credentials' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      token,
      expiresIn: '10m'
    });

  } catch (error: any) {
    console.error('[IAM] M2M Auth Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
