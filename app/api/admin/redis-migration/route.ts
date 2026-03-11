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
  const dryRun = searchParams.get('dryRun') !== 'false';
  const cursorParam = searchParams.get('cursor') || '0';
  const batchSize = parseInt(searchParams.get('batchSize') || '1000');

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

    // 1. SCAN for a single batch
    const [nextCursor, keys] = await kv.scan(parseInt(cursorParam), { count: batchSize });
    
    // 2. Process keys in this batch
    // To avoid Vercel timeouts, we limit the number of ACTUAL renames per request
    const MAX_RENAMES_PER_REQUEST = 300; 

    for (const key of keys) {
      summary.totalFound++;
      
      if (summary.migrated >= MAX_RENAMES_PER_REQUEST && !dryRun) {
        logs.push(`[Info] Reached batch limit of ${MAX_RENAMES_PER_REQUEST} renames. Please continue with next cursor.`);
        break;
      }

      if (IGNORE_PREFIXES.some(p => key.startsWith(p))) {
        summary.skipped++;
        continue;
      }

      const newKey = `${NAMESPACE}${key}`;
      
      if (dryRun) {
        logs.push(`[Dry Run] "${key}" -> "${newKey}"`);
        summary.migrated++;
      } else {
        try {
          const type = await (kv as any).type(key);
          
          if (type === 'string') {
            const value = await kv.get(key);
            await kv.set(newKey, value);
          } else if (type === 'set') {
            const members = await (kv as any).smembers(key);
            if (members?.length) await (kv as any).sadd(newKey, ...members);
          } else if (type === 'list') {
            const elements = await (kv as any).lrange(key, 0, -1);
            if (elements?.length) await (kv as any).rpush(newKey, ...elements);
          } else if (type === 'hash') {
            const hash = await (kv as any).hgetall(key);
            if (hash && Object.keys(hash).length > 0) await (kv as any).hset(newKey, hash);
          } else {
            logs.push(`[Skip] Unhandled type ${type} for "${key}"`);
            continue;
          }
          
          await kv.del(key);
          logs.push(`[Live] SUCCESS [${type}]: "${key}" -> "${newKey}"`);
          summary.migrated++;
        } catch (err: any) {
          summary.failed++;
          logs.push(`[Error] FAILED "${key}": ${err.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary,
      nextCursor: nextCursor.toString(),
      hasMore: nextCursor !== '0',
      logs: logs.slice(0, 500)
    });

  } catch (error: any) {
    console.error('[Migration Error]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
