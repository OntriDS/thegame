import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/data-store/kv';
import { AuthService } from '@/lib/auth-service';

/**
 * DATABASE NAMESPACE MIGRATION UTILITY
 * 
 * Safely migrates keys from global namespace to 'thegame:' prefix.
 * USAGE: POST /api/admin/migration?action=migrate&dryRun=true
 */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1. STYRIC AUTH CHECK
  const authSession = request.cookies.get('auth_session')?.value || request.cookies.get('admin_session')?.value;
  if (!authSession) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = await AuthService.verifySession(authSession);
  if (!user || (!user.roles.includes('founder') && !user.roles.includes('admin'))) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const dryRun = searchParams.get('dryRun') !== 'false'; // Default to true for safety

  if (action !== 'migrate') {
    return NextResponse.json({ error: 'Invalid action. Supported: migrate' }, { status: 400 });
  }

  try {
    const NAMESPACE = 'thegame:';
    const IGNORE_PREFIXES = [NAMESPACE, 'pixelbrain:', 'akiles-ecosystem:'];
    
    const logs: string[] = [];
    const summary = {
      totalFound: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
    };

    let cursor = 0;
    
    // We scan for all keys because we need to filter them manually to be sure
    do {
      const [newCursor, keys] = await kv.scan(cursor, { count: 1000 });
      cursor = parseInt(newCursor);

      for (const key of keys) {
        summary.totalFound++;
        
        // Skip keys that already have a known project prefix
        if (IGNORE_PREFIXES.some(p => key.startsWith(p))) {
          summary.skipped++;
          continue;
        }

        const newKey = `${NAMESPACE}${key}`;
        
        if (dryRun) {
          logs.push(`[Dry Run] RENAMING: "${key}" -> "${newKey}"`);
          summary.migrated++;
        } else {
          try {
            const value = await kv.get(key);
            if (value === null || value === undefined) {
              logs.push(`[Skip] Key "${key}" vanished during scan`);
              continue;
            }
            
            await kv.set(newKey, value);
            await kv.del(key);
            
            logs.push(`[Live] SUCCESS: "${key}" -> "${newKey}"`);
            summary.migrated++;
          } catch (err: any) {
            summary.failed++;
            logs.push(`[Error] FAILED "${key}": ${err.message}`);
          }
        }
      }
    } while (cursor !== 0);

    return NextResponse.json({
      success: true,
      dryRun,
      summary,
      logs: logs.slice(0, 500) // Truncate logs for response size
    });

  } catch (error: any) {
    console.error('[Migration Error]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
