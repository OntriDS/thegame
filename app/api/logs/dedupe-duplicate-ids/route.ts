// POST: dry-run (default) or execute migration to remove duplicate log entry ids within each month list.
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';
import {
  LOG_ENTITY_TYPES_ALL,
  migrateDedupeDuplicateLogIdsAcrossAll,
} from '@/workflows/entities-logging';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set<string>(LOG_ENTITY_TYPES_ALL.map(t => String(t)));

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const confirm = body.confirm === true;
    const dryRun = !confirm;

    let entityTypes: EntityType[] | undefined;
    if (Array.isArray(body.entityTypes) && body.entityTypes.length > 0) {
      const bad = body.entityTypes.filter((t: string) => !ALLOWED.has(String(t)));
      if (bad.length > 0) {
        return NextResponse.json(
          { error: `Invalid entityTypes: ${bad.join(', ')}` },
          { status: 400 }
        );
      }
      entityTypes = body.entityTypes as EntityType[];
    }

    const result = await migrateDedupeDuplicateLogIdsAcrossAll({
      dryRun,
      entityTypes,
    });

    return NextResponse.json({
      ok: true,
      mode: dryRun ? 'dry-run' : 'executed',
      hint: dryRun
        ? 'No writes performed. Call again with { "confirm": true } to apply.'
        : 'Lists rewritten where duplicates were removed.',
      ...result,
    });
  } catch (e: any) {
    console.error('[POST /api/logs/dedupe-duplicate-ids]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Migration failed' },
      { status: 500 }
    );
  }
}
