import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { kvDel, kvSAdd, kvSMembers } from '@/lib/utils/kv';
import { buildMonthIndexKey, buildArchiveMonthsKey, buildSummaryMonthsKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type MonthMigrationSummary = {
  scannedMonths: number;
  processedMonths: number;
  movedIds: number;
  legacyKeysDeleted: number;
  months: Array<{
    month: string;
    entity: EntityType.ITEM | EntityType.SALE | EntityType.FINANCIAL;
    legacyKey: string;
    sourceCount: number;
    missingInCanonicalCount: number;
    destinationCountAfter: number | null;
  }>;
};

const MIGRATION_ENTITIES = [
  { legacy: 'items', entity: EntityType.ITEM },
  { legacy: 'sales', entity: EntityType.SALE },
  { legacy: 'financials', entity: EntityType.FINANCIAL },
] as const;

const MONTH_INDEX_SIZE_BATCH = 500;

function legacyArchiveMonthIndexKey(legacyEntity: string, mmyy: string): string {
  return `thegame:index:${legacyEntity}:collected:${mmyy}`;
}

async function migrateLegacyMonthIndex({
  dryRun,
  legacy,
  mmyy,
  entityType,
  summary,
}: {
  dryRun: boolean;
  legacy: (typeof MIGRATION_ENTITIES)[number]['legacy'];
  mmyy: string;
  entityType: (typeof MIGRATION_ENTITIES)[number]['entity'];
  summary: MonthMigrationSummary;
}): Promise<void> {
  const legacyKey = legacyArchiveMonthIndexKey(legacy, mmyy);
  const legacyIds = await kvSMembers(legacyKey);
  const canonicalKey = buildMonthIndexKey(entityType, mmyy);
  const existingCanonical = new Set<string>(await kvSMembers(canonicalKey));

  const uniqueLegacyIds = [...new Set(legacyIds)];
  const missingInCanonical = uniqueLegacyIds.filter((id) => !existingCanonical.has(id));

  summary.months.push({
    month: mmyy,
    entity: entityType,
    legacyKey,
    sourceCount: uniqueLegacyIds.length,
    missingInCanonicalCount: missingInCanonical.length,
    destinationCountAfter: dryRun ? null : null,
  });
  summary.processedMonths += 1;
  summary.movedIds += missingInCanonical.length;

  if (!dryRun) {
    for (let i = 0; i < missingInCanonical.length; i += MONTH_INDEX_SIZE_BATCH) {
      const batch = missingInCanonical.slice(i, i + MONTH_INDEX_SIZE_BATCH);
      await kvSAdd(canonicalKey, ...batch);
    }
    await kvDel(legacyKey);
    summary.legacyKeysDeleted += 1;
    summary.months[summary.months.length - 1].destinationCountAfter =
      existingCanonical.size + missingInCanonical.length;
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const dryRun = body?.dryRun !== false;
  const requestedMonths = Array.isArray(body?.months) ? (body.months as string[]) : undefined;

  try {
    const archiveMonths = await kvSMembers(buildArchiveMonthsKey());
    const summaryMonths = await kvSMembers(buildSummaryMonthsKey());
    const monthSet = new Set<string>([...archiveMonths, ...summaryMonths]);

    if (requestedMonths && requestedMonths.length > 0) {
      for (const mmyy of requestedMonths) {
        if (typeof mmyy === 'string') monthSet.add(mmyy);
      }
    }

    const months = [...monthSet].sort();

    const summary: MonthMigrationSummary = {
      scannedMonths: months.length,
      processedMonths: 0,
      movedIds: 0,
      legacyKeysDeleted: 0,
      months: [],
    };

    for (const mmyy of months) {
      for (const entity of MIGRATION_ENTITIES) {
        await migrateLegacyMonthIndex({
          dryRun,
          legacy: entity.legacy,
          mmyy,
          entityType: entity.entity,
          summary,
        });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun
        ? `Dry-run complete. Legacy keys retained for review.`
        : `Migration complete. Legacy keys deleted and records unioned into by-month index.`,
      summary,
    });
  } catch (error) {
    console.error('[migrate-unified-month-indexes] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to migrate legacy month indexes' },
      { status: 500 }
    );
  }
}
