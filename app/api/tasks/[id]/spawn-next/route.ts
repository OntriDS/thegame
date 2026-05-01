// app/api/tasks/[id]/spawn-next/route.ts
// Manual trigger endpoint for JIT Model - spawns single recurrent instance on demand

import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, upsertTask } from '@/data-store/datastore';
import { spawnNextRecurrentInstance, updateTemplateLastSpawnedDate, canSpawnMoreInstances } from '@/lib/utils/recurrent-task-utils';
import { EntityType, TaskType } from '@/types/enums';
import { toRecurrentUTC, fromRecurrentUTC } from '@/lib/utils/recurrent-date-utils';
import { requireAdminOrM2MAuth } from '@/lib/api-auth';

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
  if (!(await requireAdminOrM2MAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    // 2. Validate template using unified validation
    const { validateSpawnOperation } = await import('@/lib/utils/recurrent-validation');
    const validation = await validateSpawnOperation(template);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: validation.errorMessage || 'Validation failed',
          errorCode: validation.errorCode
        },
        { status: 400 }
      );
    }

    // 3. Spawn next instance
    const result = await spawnNextRecurrentInstance(template);
    const instance = result.instance;

    if (!instance) {
      return NextResponse.json(
        {
          error: result.errorMessage || 'Could not find a valid next occurrence.',
          errorCode: result.errorCode,
        },
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
    // Note: The onTaskUpsert workflow will handle logging of CREATED event to avoid duplicates
    const savedInstance = await upsertTask(instance);

    // 6. Update template's lastSpawnedDate
    await updateTemplateLastSpawnedDate(templateId, (instance.dueDate as Date) || new Date());

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
