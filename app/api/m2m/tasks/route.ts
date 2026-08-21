// @ts-nocheck
import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { TaskStatus, TaskType, EntityType, LinkType } from '@/types/enums';
import { getActiveTasks, getAllTasks, getTaskById, upsertTask } from '@/data-store/datastore';
import { getLinksFor, createLink, removeLink } from '@/links/link-registry';
import { randomUUID } from 'crypto';
import type { Task, Link } from '@/types/entities';
import { getUTCNow, endOfMonthUTC } from '@/lib/utils/utc-utils';
import { parseDateToUTC } from '@/lib/utils/date-parsers';

/**
 * M2M Tasks API Endpoint
 * Requires M2M Bearer token authentication
 */
async function verifyM2MRequest(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Missing Bearer token' },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  const verification = await iamService.verifyM2MToken(token);
  if (!verification.valid) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired M2M token' },
      { status: 401 },
    );
  }

  if (verification.appId !== 'akiles-ecosystem') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Only akiles-ecosystem can access tasks' },
      { status: 403 },
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authFailure = await verifyM2MRequest(request);
    if (authFailure) return authFailure;

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const includeDoneThisMonth = searchParams.get('includeDoneThisMonth') === 'true';

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: 'ownerId is required' },
        { status: 400 },
      );
    }

    // Optional done count for current month
    let doneThisMonth = 0;
    
    // Query Link Registry to find all Tasks owned by this character
    const ownerLinks = await getLinksFor({ type: EntityType.CHARACTER, id: ownerId });
    const ownedTaskIds = new Set(
      ownerLinks
        .filter(l => l.linkType === LinkType.TASK_CHARACTER && l.relationship === 'owner' && l.source.type === EntityType.TASK)
        .map(l => l.source.id)
    );

    if (includeDoneThisMonth) {
      const now = getUTCNow();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const allTasks = await getAllTasks();
      const doneTaskIds = new Set<string>();
      allTasks.forEach((task) => {
        // Support legacy owner fields for unmigrated tasks, but prioritize link registry
        const legacyOwnerIds = task.ownerIds || (task.ownerId ? [task.ownerId] : []);
        const isOwner = ownedTaskIds.has(task.id) || legacyOwnerIds.includes(ownerId);
        
        if (!isOwner) return;
        if (task.status !== TaskStatus.DONE) return;

        const progressVal = typeof task.progress === 'object' ? task.progress?.percentage : task.progress;
        if (progressVal !== undefined && Number(progressVal) < 100) return;

        if (!task.doneAt) return;
        const doneDate = new Date(task.doneAt);
        if (!Number.isFinite(doneDate.getTime())) return;
        if (Number.isNaN(doneDate.getTime())) return;

        if (doneDate < monthStart || doneDate >= nextMonthStart) return;

        doneTaskIds.add(task.id);
        return;
      });

      doneThisMonth = doneTaskIds.size;
    }

    const activeTasks = await getActiveTasks();
    const assignedTasks = activeTasks.filter(t => {
      const legacyOwnerIds = t.ownerIds || (t.ownerId ? [t.ownerId] : []);
      const isOwner = ownedTaskIds.has(t.id) || legacyOwnerIds.includes(ownerId);
      return isOwner && t.status !== TaskStatus.COLLECTED;
    });

    // Enrich assigned tasks with parent names and counterparty links
    const tasksWithParentNames = await Promise.all(assignedTasks.map(async task => {
      let result = task;

      // Hydrate parent name
      if (task.parentId) {
        const parent = activeTasks.find(t => t.id === task.parentId);
        if (parent) {
          result = { ...result, parentName: parent.name };
        }
      }

      // Hydrate characterId from Link Registry
      try {
        const links = await getLinksFor({ type: EntityType.TASK, id: task.id });
        const charLink = links.find(l => l.linkType === LinkType.TASK_CHARACTER && l.target.type === EntityType.CHARACTER);
        if (charLink) {
          result = {
            ...result,
            context: {
              ...(result.context || {}),
              counterparty: {
                ...result.context?.counterparty,
                counterpartyId: charLink.target.id,
                role: charLink.relationship || 'beneficiary'
              }
            }
          };
        }
      } catch (e) {
        console.error('[M2M Tasks GET] Failed to hydrate links for task:', task.id, e);
      }

      return result;
    }));

    return NextResponse.json({
      success: true,
      tasks: tasksWithParentNames,
      doneThisMonth,
    });
  } catch (error) {
    console.error('[M2M Tasks GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authFailure = await verifyM2MRequest(request);
    if (authFailure) return authFailure;

    const body = await request.json();
    const {
      id,
      status,
      progress,
      description,
      name,
      characterId,
      siteId,
      priority,
      cost,
      revenue,
      ownerId,
      customerCharacterRole,
      doneAt: rawDoneAt,
      collectedAt: rawCollectedAt,
    } = body;

    const normalizedStatus = typeof status === 'string' ? (status as TaskStatus) : undefined;
    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid name value' },
        { status: 400 },
      );
    }

    if (name !== undefined && name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task name cannot be empty' },
        { status: 400 },
      );
    }

    if (normalizedStatus === TaskStatus.COLLECTED) {
      return NextResponse.json(
        { success: false, error: 'AKILES ecosystem cannot set task status to COLLECTED. Use TheGame reward flow.' },
        { status: 400 },
      );
    }

    if (rawCollectedAt !== undefined) {
      return NextResponse.json(
        { success: false, error: 'AKILES ecosystem cannot modify collectedAt. Collection is handled by TheGame.' },
        { status: 400 },
      );
    }

    let explicitDoneAt: Date | undefined = undefined;
    let explicitCollectedAt: Date | undefined = undefined;

    const parseDateInput = (value: any): Date | undefined => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return undefined;
      try {
        return parseDateToUTC(value);
      } catch (error) {
        return undefined;
      }
    };

    if (rawDoneAt !== undefined) {
      explicitDoneAt = parseDateInput(rawDoneAt);
      if (explicitDoneAt === undefined && rawDoneAt !== null) {
        return NextResponse.json(
          { success: false, error: 'Invalid doneAt value' },
          { status: 400 },
        );
      }
    }

    if (rawCollectedAt !== undefined) {
      explicitCollectedAt = parseDateInput(rawCollectedAt);
      if (explicitCollectedAt === undefined && rawCollectedAt !== null) {
        return NextResponse.json(
          { success: false, error: 'Invalid collectedAt value' },
          { status: 400 },
        );
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 },
      );
    }

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 },
      );
    }

    // Templates cannot be edited directly (except maybe status, but user says templates are not suppose to be editable)
    if (task.type === TaskType.RECURRENT_TEMPLATE && (name || description || cost || revenue || priority || ownerId)) {
       return NextResponse.json(
        { success: false, error: 'Recurrent templates are not editable. Edit instances instead.' },
        { status: 403 },
      );
    }

    const nextStatus = normalizedStatus || task.status;
    const isTerminalStatus = (value?: TaskStatus) =>
      value === TaskStatus.DONE ||
      value === TaskStatus.COLLECTED ||
      value === TaskStatus.FAILED;
    const isRevertingFromTerminal =
      isTerminalStatus(task.status) && Boolean(status) && !isTerminalStatus(nextStatus);

    const preserveDoneAt =
      !status
        ? task.doneAt
        : isRevertingFromTerminal
          ? undefined
          : isTerminalStatus(nextStatus)
            ? (task.doneAt ?? getUTCNow())
            : task.doneAt;

    const preserveCollectedAt =
      !status
        ? task.collectedAt
        : isRevertingFromTerminal
          ? undefined
          : nextStatus === TaskStatus.COLLECTED
            ? (task.collectedAt ?? (task.doneAt ? endOfMonthUTC(task.doneAt) : getUTCNow()))
            : task.collectedAt;

    const incomingDoneAt = explicitDoneAt;
    const incomingCollectedAt = explicitCollectedAt;

    const nextDoneAt = rawDoneAt !== undefined ? incomingDoneAt : preserveDoneAt;
    const nextCollectedAt = rawCollectedAt !== undefined ? incomingCollectedAt : preserveCollectedAt;
    const currentProgressPercent = typeof task.progress === 'object' ? task.progress?.percentage || 0 : Number(task.progress) || 0;
    const incomingProgressPercent = typeof progress === 'object' ? progress?.percentage : progress;
    const nextProgressPercent = incomingProgressPercent !== undefined ? Number(incomingProgressPercent) : isRevertingFromTerminal ? 0 : currentProgressPercent;

    const updatedContext = { ...(task.context || {}) };
    if (cost !== undefined || revenue !== undefined) {
      updatedContext.financialIntent = {
        ...updatedContext.financialIntent,
        ...(cost !== undefined ? { costIntent: { minorUnits: Math.round(Number(cost) * 100).toString(), currency: 'USD' } } : {}),
        ...(revenue !== undefined ? { revenueIntent: { minorUnits: Math.round(Number(revenue) * 100).toString(), currency: 'USD' } } : {}),
      };
    }

    const updatedTask: Task = {
      ...task,
      ...(status ? { status: nextStatus } : {}),
      progress: { percentage: nextProgressPercent, lastUpdated: new Date().toISOString() },
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(siteId !== undefined ? { siteId } : {}),
      ...(priority !== undefined ? { priority } : {}),
      context: updatedContext,
      ...(rawDoneAt !== undefined || status ? { doneAt: nextDoneAt } : {}),
      ...(rawCollectedAt !== undefined || status ? { collectedAt: nextCollectedAt } : {}),
      updatedAt: new Date(),
    };

    // Clean up legacy fields to conform to V1 schema
    delete (updatedTask as any).cost;
    delete (updatedTask as any).revenue;
    delete (updatedTask as any).characterId;
    delete (updatedTask as any).ownerId;
    delete (updatedTask as any).customerCharacterRole;
    // TASK_CHARACTER is the relationship authority. Legacy counterparty roots
    // are accepted only as transient migration input and must not be stored.
    const legacyCounterpartyId = (task as any).counterpartyCharacterId;
    const legacyCounterpartyRole = (task as any).counterpartyRole;
    if (!(updatedTask as any).__counterparty && legacyCounterpartyId) {
      (updatedTask as any).__counterparty = {
        id: legacyCounterpartyId,
        role: legacyCounterpartyRole || 'customer',
      };
    }
    delete (updatedTask as any).counterpartyCharacterId;
    delete (updatedTask as any).counterpartyRole;

    const saved = await upsertTask(updatedTask);

    // Reconcile TASK_CHARACTER link if characterId was provided
    if (characterId !== undefined) {
      try {
        const links = await getLinksFor({ type: EntityType.TASK, id: task.id });
        const existingCharLink = links.find(
          l => l.linkType === LinkType.TASK_CHARACTER && l.target.type === EntityType.CHARACTER
        );

        if (characterId === '' || characterId === null) {
          if (existingCharLink) {
            await removeLink(existingCharLink.id);
          }
        } else {
          const desiredRole = customerCharacterRole || 'beneficiary';
          let needUpdate = true;

          if (existingCharLink) {
            if (existingCharLink.target.id === characterId && existingCharLink.relationship === desiredRole) {
              needUpdate = false;
            } else {
              await removeLink(existingCharLink.id);
            }
          }

          if (needUpdate) {
            const newLink: Link = {
              id: randomUUID(),
              linkType: LinkType.TASK_CHARACTER,
              source: { type: EntityType.TASK, id: task.id },
              target: { type: EntityType.CHARACTER, id: characterId },
              relationship: desiredRole,
              metadata: {},
              createdAt: new Date(),
              updatedAt: new Date()
            };
            await createLink(newLink, { skipValidation: true });
          }
        }
      } catch (e) {
        console.error('[M2M Tasks PATCH] Failed to reconcile TASK_CHARACTER link:', e);
      }
    }

    // Reconcile TASK_CHARACTER owner link if ownerId was provided
    if (ownerId !== undefined) {
      try {
        const links = await getLinksFor({ type: EntityType.TASK, id: task.id });
        const existingOwnerLinks = links.filter(
          l => l.linkType === LinkType.TASK_CHARACTER && l.relationship === 'owner'
        );

        for (const existingLink of existingOwnerLinks) {
          if (existingLink.target.id !== ownerId || ownerId === '' || ownerId === null) {
            await removeLink(existingLink.id);
          }
        }

        if (ownerId !== '' && ownerId !== null) {
          const alreadyExists = existingOwnerLinks.some(l => l.target.id === ownerId);
          if (!alreadyExists) {
            const newLink: Link = {
              id: randomUUID(),
              linkType: LinkType.TASK_CHARACTER,
              source: { type: EntityType.TASK, id: task.id },
              target: { type: EntityType.CHARACTER, id: ownerId },
              relationship: 'owner',
              metadata: {},
              createdAt: new Date(),
              updatedAt: new Date()
            };
            await createLink(newLink, { skipValidation: true });
          }
        }
      } catch (e) {
        console.error('[M2M Tasks PATCH] Failed to reconcile TASK_CHARACTER owner link:', e);
      }
    }

    return NextResponse.json({
      success: true,
      task: saved,
    });
  } catch (error) {
    console.error('[M2M Tasks PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

