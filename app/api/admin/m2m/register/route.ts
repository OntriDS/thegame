import { NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';

/**
 * M2M Registration API Route (Admin Only)
 * Generates an API key for a system component (e.g., pixelbrain).
 */
export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (!adminKey || adminKey !== process.env.ADMIN_ACCESS_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appId } = await req.json();

    if (!appId) {
      return NextResponse.json({ error: 'appId is required (e.g., pixelbrain, thegame)' }, { status: 400 });
    }

    const apiKey = await iamService.generateM2MKey(appId);

    return NextResponse.json({
      success: true,
      appId,
      apiKey,
      message: 'Store this key in the target app environment variables (e.g., THEGAME_PIXELBRAIN_M2M_KEY)'
    });

  } catch (error: any) {
    console.error('[IAM] M2M Registry Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
