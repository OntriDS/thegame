// app/api/admin/migrate-personas/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { kv, kvScan } from '@/data-store/kv';
import { requireAdminAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const NAMESPACE = 'thegame:';

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { dryRun = true } = await req.json().catch(() => ({ dryRun: true }));

  try {
    const results: { oldKey: string; newKey: string }[] = [];
    const patterns = [
      `${NAMESPACE}data:persona:*`,
      `${NAMESPACE}index:persona`,
      `${NAMESPACE}index:persona:*`,
      `${NAMESPACE}archive:persona:*`,
      `${NAMESPACE}archive:index:*:persona`,
      `${NAMESPACE}index:persona:by-month:*`,
      `${NAMESPACE}index:persona:collected:*`,
      `${NAMESPACE}logs:persona`,
      `${NAMESPACE}logs:persona:*`,
      `${NAMESPACE}logs:index:months:persona`,
      `${NAMESPACE}index:links:by-entity:persona:*`,
      `${NAMESPACE}persona:*`, // Effect keys often follow this
    ];

    // Find all keys matching the patterns
    // Note: kvScan implementation in kv.ts adds '*' at the end of prefix
    // We'll use a more direct approach here since we need exact patterns or manual scanning
    
    // Actually, let's just find ALL keys starting with thegame: and filter them
    // This is safer for a one-time migration
    const allTheGameKeys: string[] = [];
    let cursor = 0;
    do {
        const [newCursor, foundKeys] = await kv.scan(cursor, {
            match: `${NAMESPACE}*`,
            count: 1000
        });
        allTheGameKeys.push(...foundKeys);
        cursor = parseInt(newCursor);
    } while (cursor !== 0);

    for (const key of allTheGameKeys) {
        if (key.includes(':persona:') || key.endsWith(':persona')) {
            const newKey = key.replace(/:persona:/g, ':character:').replace(/:persona$/g, ':character');
            results.push({ oldKey: key, newKey });
        }
    }

    if (dryRun) {
      return NextResponse.json({
        message: 'Dry run completed. No changes made.',
        count: results.length,
        migration: results,
      });
    }

    // Execute migration
    let migratedCount = 0;
    for (const { oldKey, newKey } of results) {
        // We use a simple GET/SET/DEL approach for safety and to avoid RENAME issues if clustered
        const value = await kv.get(oldKey);
        if (value !== null) {
            // If the value itself contains "persona" strings (e.g. in links or entity fields)
            // we should potentially update it too.
            let updatedValue = value;
            if (typeof value === 'object' && value !== null) {
                const stringified = JSON.stringify(value);
                if (stringified.includes('"persona"')) {
                    updatedValue = JSON.parse(stringified.replace(/"persona"/g, '"character"'));
                }
            } else if (typeof value === 'string') {
                if (value === 'persona') {
                    updatedValue = 'character';
                }
            }

            await kv.set(newKey, updatedValue);
            await kv.del(oldKey);
            migratedCount++;
        }
    }

    return NextResponse.json({
      message: 'Migration completed successfully.',
      migratedCount,
      details: results,
    });
  } catch (error) {
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
