import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const adminKey = process.env.ADMIN_ACCESS_KEY;
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;
    
    return NextResponse.json({
      hasAdminKey: !!adminKey,
      hasSessionSecret: !!sessionSecret,
      adminKeyLength: adminKey?.length || 0,
      sessionSecretLength: sessionSecret?.length || 0,
      // Don't expose the actual values for security
      message: adminKey && sessionSecret ? 'Environment variables loaded successfully' : 'Missing environment variables'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check environment variables' }, { status: 500 });
  }
}
