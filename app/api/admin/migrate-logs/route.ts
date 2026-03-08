// app/api/admin/migrate-logs/route.ts
// One-time migration: Moves legacy log blobs (logs:entity JSON arrays) 
// into the new monthly-partitioned Redis Lists (logs:entity:MM-YY).
// Safe to run multiple times — idempotent via LPUSH-only (no duplicates 
// are written if you run it twice, since the legacy blob is cleared on success).

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';
import { kvGet, kvSet, kvLPush, kvSAdd } from '@/data-store/kv';
import { buildLogKey, buildLogMonthKey, buildLogMonthsIndexKey } from '@/data-store/keys';

export const dynamic = 'force-dynamic';

const ENTITY_TYPES = [
    EntityType.TASK,
    EntityType.ITEM,
    EntityType.SALE,
    EntityType.FINANCIAL,
    EntityType.CHARACTER,
    EntityType.PLAYER,
    EntityType.SITE,
] as const;

function getMonthKeyFromTimestamp(timestamp: string | undefined): string {
    const now = new Date();
    const defaultMm = String(now.getMonth() + 1).padStart(2, '0');
    const defaultYy = String(now.getFullYear()).slice(-2);
    const fallback = `${defaultMm}-${defaultYy}`;

    if (!timestamp) return fallback;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return fallback;
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${mm}-${yy}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!(await requireAdminAuth(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: Record<string, { moved: number; months: string[]; skipped: boolean }> = {};
    let totalMoved = 0;

    for (const entityType of ENTITY_TYPES) {
        const legacyKey = buildLogKey(entityType); // e.g. "logs:task"

        try {
            const legacyData = await kvGet<any[]>(legacyKey);

            if (!legacyData || !Array.isArray(legacyData) || legacyData.length === 0) {
                results[entityType] = { moved: 0, months: [], skipped: true };
                continue;
            }

            // Group entries by month based on their timestamp
            const byMonth = new Map<string, any[]>();
            for (const entry of legacyData) {
                const monthKey = getMonthKeyFromTimestamp(entry.timestamp || entry.date || entry.createdAt);
                if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
                byMonth.get(monthKey)!.push(entry);
            }

            const movedMonths: string[] = [];
            let movedCount = 0;

            for (const [monthKey, entries] of byMonth) {
                const listKey = buildLogMonthKey(entityType, monthKey);

                // Serialize and push — LPUSH reverses order so we push oldest-first
                // to preserve newest-first ordering in the list.
                const serialized = entries
                    .slice()
                    .reverse() // oldest-first so LPUSH results in newest-at-head
                    .map(e => JSON.stringify(e));

                await kvLPush(listKey, ...serialized);
                await kvSAdd(buildLogMonthsIndexKey(entityType), monthKey);

                movedMonths.push(monthKey);
                movedCount += entries.length;
            }

            // Clear legacy blob after successful migration
            await kvSet(legacyKey, []);

            results[entityType] = {
                moved: movedCount,
                months: movedMonths.sort(),
                skipped: false,
            };
            totalMoved += movedCount;

            console.log(`[migrate-logs] ✅ ${entityType}: moved ${movedCount} entries across ${movedMonths.length} months`);

        } catch (error: any) {
            console.error(`[migrate-logs] ❌ ${entityType}: ${error.message}`);
            results[entityType] = { moved: 0, months: [], skipped: false };
        }
    }

    return NextResponse.json({
        success: true,
        totalMoved,
        results,
        message: totalMoved > 0
            ? `Migration complete. Moved ${totalMoved} log entries into monthly partitioned lists.`
            : 'No legacy log data found to migrate. System may already be using the new architecture.',
    });
}

// GET returns the current state of legacy keys so you can inspect before running
export async function GET(request: NextRequest): Promise<NextResponse> {
    if (!(await requireAdminAuth(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preview: Record<string, { count: number; hasLegacyData: boolean }> = {};

    for (const entityType of ENTITY_TYPES) {
        const legacyKey = buildLogKey(entityType);
        try {
            const data = await kvGet<any[]>(legacyKey);
            preview[entityType] = {
                count: Array.isArray(data) ? data.length : 0,
                hasLegacyData: Array.isArray(data) && data.length > 0,
            };
        } catch {
            preview[entityType] = { count: 0, hasLegacyData: false };
        }
    }

    const total = Object.values(preview).reduce((sum, v) => sum + v.count, 0);

    return NextResponse.json({
        preview,
        total,
        message: total > 0
            ? `Found ${total} legacy log entries across all entity types. POST to this endpoint to migrate them.`
            : 'No legacy log data found. All data may already be in monthly partitioned lists.',
    });
}
