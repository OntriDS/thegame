import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request);
    
    // For now, return empty preferences since we don't have a user preferences system yet
    // This prevents the useUserPreferences hook from failing
    return NextResponse.json({});
  } catch (error) {
    console.error('User preferences GET error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request);
    
    const body = await request.json();
    const { key, value } = body;
    
    // For now, just acknowledge the request since we don't have a user preferences system yet
    // This prevents the useUserPreferences hook from failing
    console.log(`[UserPreferences] Setting ${key} = ${value}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User preferences POST error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
