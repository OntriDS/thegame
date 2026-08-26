// This route accepts command envelopes and routes them to the atomic command handler.
// It provides idempotency, version enforcement, and structured outcomes.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { executeTaskCommand } from '@/lib/domain/commands/task-command-handler';
import type { EntityCommandEnvelope, TaskCommand, CommandOutcomeV1 } from '@/lib/domain/commands/contracts';
import { v4 as uuid } from 'uuid';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tasks/command
 *
 * Accepts a command envelope and executes it atomically.
 * Returns a structured CommandOutcomeV1.
 *
 * Request body:
 * {
 *   commandId?: string,        // Optional: client-provided command ID (for idempotency)
 *   expectedVersion: number,   // Required: expected aggregate version (0 for creation)
 *   payload: TaskCommand       // Required: the command to execute
 * }
 *
 * Response:
 * {
 *   commandId: string,
 *   aggregate: { type: 'task', id: string },
 *   aggregateVersion: number,
 *   state: 'completed' | 'failed' | 'related-work-pending' | 'needs-reconciliation',
 *   createdAt: string,
 *   message?: string,
 *   errorCode?: string
 * }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { commandId, expectedVersion, payload } = body as {
      commandId?: string;
      expectedVersion: number;
      payload: TaskCommand;
    };

    // Validate required fields
    if (expectedVersion === undefined || expectedVersion === null) {
      return NextResponse.json(
        { error: 'expectedVersion is required' },
        { status: 400 }
      );
    }

    if (!payload || !payload.kind) {
      return NextResponse.json(
        { error: 'payload.kind is required' },
        { status: 400 }
      );
    }

    // Build command envelope
    const envelope: EntityCommandEnvelope<TaskCommand> = {
      commandId: (commandId || uuid()) as any,
      actorId: 'admin' as any, // TODO: Extract from auth context
      expectedVersion,
      occurredAt: new Date().toISOString() as any,
      payload,
    };

    // Execute command
    const outcome: CommandOutcomeV1 = await executeTaskCommand(envelope);

    // Map outcome state to HTTP status
    let httpStatus = 200;
    if (outcome.state === 'failed') {
      if (outcome.errorCode === 'VERSION_CONFLICT') {
        httpStatus = 409; // Conflict
      } else if (outcome.errorCode === 'TASK_NOT_FOUND') {
        httpStatus = 404;
      } else {
        httpStatus = 400;
      }
    }

    return NextResponse.json(outcome, { status: httpStatus });
  } catch (error) {
    console.error('[API] Error executing task command:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute command' },
      { status: 500 }
    );
  }
}
