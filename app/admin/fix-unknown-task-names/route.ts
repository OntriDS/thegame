// app/admin/fix-unknown-task-names/route.ts
// Admin endpoint to fix task log entries that have "Unknown" as the name

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';
import { getEntityLogs, getEntityLogMonths } from '@/data-store/datastore';
import { patchLogEntryById, getLogEntryById } from '@/workflows/entities-logging';
import { getTaskById } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

/**
 * POST /admin/fix-unknown-task-names
 *
 * Fixes all task log entries that have "Unknown" as the name by updating them
 * with the correct task names from the actual task entities.
 *
 * This is an admin-only endpoint for data cleanup.
 *
 * Request Body: None required
 *
 * Response: {
 *   success: true | false
 *   fixed: number - Number of log entries fixed
 *   errors: string[] - Any errors that occurred
 * }
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const months = await getEntityLogMonths(EntityType.TASK);
    const allMonthKeys = [...new Set(['current', ...months])];
    let totalFixed = 0;
    const errors: string[] = [];

    for (const monthKey of allMonthKeys) {
      try {
        // Get all task log entries for this month
        const entries = await getEntityLogs(EntityType.TASK, {
          month: monthKey === 'current' ? undefined : monthKey
        });

        // Find entries with "Unknown" as name
        const unknownEntries = entries.filter(
          entry => entry.name === 'Unknown' || !entry.name
        );

        if (unknownEntries.length === 0) continue;

        console.log(`[Fix Unknown Task Names] Found ${unknownEntries.length} unknown entries in month ${monthKey}`);

        // Fix each unknown entry
        for (const entry of unknownEntries) {
          try {
            // Get the actual task to get the correct name
            const task = await getTaskById(entry.entityId);
            if (!task) {
              errors.push(`Task ${entry.entityId} not found for log entry ${entry.id}`);
              continue;
            }

            // Skip if task also doesn't have a name
            if (!task.name || !task.name.trim()) {
              errors.push(`Task ${entry.entityId} has no name, cannot fix log entry ${entry.id}`);
              continue;
            }

            // Update the log entry with the correct task name
            await patchLogEntryById(EntityType.TASK, {
              logEntryId: entry.id,
              entityId: entry.entityId,
              taskLean: {
                name: task.name,
                taskType: task.type,
                station: task.station
              }
            });

            totalFixed++;
            console.log(`[Fix Unknown Task Names] Fixed entry ${entry.id} with name "${task.name}"`);
          } catch (error: any) {
            errors.push(`Failed to fix entry ${entry.id}: ${error.message}`);
            console.error(`[Fix Unknown Task Names] Error fixing entry ${entry.id}:`, error);
          }
        }
      } catch (error: any) {
        errors.push(`Error processing month ${monthKey}: ${error.message}`);
        console.error(`[Fix Unknown Task Names] Error processing month ${monthKey}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      fixed: totalFixed,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('[Fix Unknown Task Names] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fix unknown task names', details: error.message },
      { status: 500 }
    );
  }
}
