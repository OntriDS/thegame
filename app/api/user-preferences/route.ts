import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getUserPreferences, setUserPreference } from '@/data-store/repositories/user-preferences.repo';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request);
    const prefs = await getUserPreferences();
    return NextResponse.json(prefs);
  } catch (error) {
    console.error('User preferences GET error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request);
    
    const body = await request.json();
    
    // Handle both single preference and batch preferences
    if (body.preferences) {
      // Batch save multiple preferences
      const preferences = body.preferences;
      const keys = Object.keys(preferences);
      
      for (const key of keys) {
        await setUserPreference(key, preferences[key]);
      }
      
      console.log(`[UserPreferences] Batch saved to KV: ${keys.length} preferences`);
    } else {
      // Single preference save (backward compatibility)
      const { key, value } = body;
      await setUserPreference(key, value);
      console.log(`[UserPreferences] Saved to KV: ${key} = ${value}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User preferences POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
