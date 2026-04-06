// app/api/tasks/[id]/spawn-next/route.ts
// Manual trigger endpoint for JIT Model - spawns single recurrent instance on demand

import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, upsertTask } from '@/data-store/datastore';
import { spawnNextRecurrentInstance, updateTemplateLastSpawnedDate, canSpawnMoreInstances } from '@/lib/utils/recurrent-task-utils';
import { appendEntityLog } from '@/workflows/entities-logging';
import { EntityType, LogEventType, TaskType } from '@/types/enums';
import { toRecurrentUTC, fromRecurrentUTC } from '@/lib/utils/recurrent-date-utils';

/**
 * POST /api/tasks/[id]/spawn-next
 * Triggers manual generation of next recurrent instance from a template
 *
 * Request Body: None required
 *
 * Response: {
 *   success: true | false
 *   instance?: Task - The spawned instance (if successful)
 *   error?: string - Error message if unsuccessful
 * }
 *
 * Authentication: Currently open (add authentication checks as needed)
 * Rate Limiting: Add rate limiting to prevent abuse (optional enhancement)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const templateId = params.id;
  const { searchParams } = new URL(req.url);
  const isPreview = searchParams.get('preview') === '1';

  try {
    // 1. Validate template exists and is correct type
    const template = await getTaskById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (template.type !== TaskType.RECURRENT_TEMPLATE) {
      return NextResponse.json(
        { error: 'Not a RECURRENT_TEMPLATE' },
        { status: 400 }
      );
    }

    // 2. Validate template has frequency configuration
    if (!template.frequencyConfig) {
      return NextResponse.json(
        { error: 'Template has no repeat configuration. Open the template, enable \"Repeat Task\" and set a frequency first.' },
        { status: 400 }
      );
    }

    // 3. Check whether template is still allowed to spawn
    const canSpawn = await canSpawnMoreInstances(template);
    if (!canSpawn) {
      return NextResponse.json(
        { error: 'Template cannot spawn more instances (stop condition or safety limit reached).' },
        { status: 400 }
      );
    }

    // 4. Spawn next instance (in-memory)
    const instance = await spawnNextRecurrentInstance(template);

    if (!instance) {
      return NextResponse.json(
        { error: 'Could not find a valid next occurrence based on this frequency (all dates used or beyond safety limit).' },
        { status: 400 }
      );
    }

    // If this is just a preview, return the calculated date without side effects
    if (isPreview) {
      return NextResponse.json({
        success: true,
        nextDate: (instance.dueDate as Date).toISOString()
      });
    }

    // 5. Persist instance (the API will convert to UTC midnight)
    const savedInstance = await upsertTask(instance);

    // 6. Update template's lastSpawnedDate
    await updateTemplateLastSpawnedDate(templateId, (instance.dueDate as Date) || new Date());

    // 7. Log instance creation
    await appendEntityLog(
      EntityType.TASK,
      savedInstance.id,
      LogEventType.CREATED,
      {
        name: savedInstance.name,
        taskType: savedInstance.type,
        station: savedInstance.station,
        templateId: templateId,
        spawnedAt: new Date().toISOString()
      }
    );

    return NextResponse.json({
      success: true,
      instance: savedInstance
    });

  } catch (error: any) {
    console.error('[Spawn Next Instance] Error:', error);

    return NextResponse.json(
      { error: 'Failed to spawn instance' },
      { status: 500 }
    );
  }
}
