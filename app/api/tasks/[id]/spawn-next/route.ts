// app/api/tasks/[id]/spawn-next/route.ts
// Manual trigger endpoint for JIT Model - spawns single recurrent instance on demand

import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, upsertTask } from '@/data-store/datastore';
import { spawnNextRecurrentInstance, updateTemplateLastSpawnedDate } from '@/lib/utils/recurrent-task-utils';
import { appendEntityLog } from '@/workflows/entities-logging';
import { EntityType, LogEventType, TaskType } from '@/types/enums';

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
        { error: 'Template has no frequency configuration' },
        { status: 400 }
      );
    }

    // 3. Spawn next instance
    const instance = await spawnNextRecurrentInstance(template);

    if (!instance) {
      return NextResponse.json(
        { error: 'Could not spawn instance - limit reached or invalid date' },
        { status: 400 }
      );
    }

    // 4. Update template's lastSpawnedDate
    await updateTemplateLastSpawnedDate(templateId, (instance.dueDate as Date) || new Date());

    // 5. Log instance creation
    await appendEntityLog(
      EntityType.TASK,
      instance.id,
      LogEventType.CREATED,
      {
        name: instance.name,
        taskType: instance.type,
        station: instance.station,
        templateId: templateId,
        spawnedAt: new Date().toISOString()
      }
    );

    return NextResponse.json({
      success: true,
      instance
    });

  } catch (error: any) {
    console.error('[Spawn Next Instance] Error:', error);

    return NextResponse.json(
      { error: 'Failed to spawn instance' },
      { status: 500 }
    );
  }
}
