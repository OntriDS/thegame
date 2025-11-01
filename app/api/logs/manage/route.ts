// app/api/logs/manage/route.ts
// Unified log management endpoint for all core entity logs
// KV-only implementation - no server→server HTTP anti-pattern

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';
import { softDeleteLogEntry, restoreLogEntry, editLogEntry } from '@/workflows/entities-logging';
import { PLAYER_ONE_ID } from '@/types/enums';

export const dynamic = 'force-dynamic';

const SUPPORTED_ENTITY_TYPES = [
  EntityType.TASK,
  EntityType.ITEM,
  EntityType.SALE,
  EntityType.FINANCIAL,
  EntityType.CHARACTER,
  EntityType.PLAYER,
  EntityType.SITE
];

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { logType, action, entryId, updates, reason } = body;

    // Validate required fields
    if (!logType || !action || !entryId) {
      return NextResponse.json(
        { error: 'Missing required fields: logType, action, entryId' },
        { status: 400 }
      );
    }

    // Validate logType
    if (!SUPPORTED_ENTITY_TYPES.includes(logType as EntityType)) {
      return NextResponse.json(
        { error: `Unsupported logType. Supported: ${SUPPORTED_ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate action
    if (!['edit', 'delete', 'restore'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Supported: edit, delete, restore' },
        { status: 400 }
      );
    }

    // Get character ID (V0.1: Player One = FOUNDER)
    const characterId = PLAYER_ONE_ID;

    // Route to appropriate handler based on action
    let auditEntry;
    switch (action) {
      case 'delete':
        await softDeleteLogEntry(logType, entryId, characterId, reason);
        auditEntry = {
          entryId,
          action: 'delete',
          timestamp: new Date().toISOString(),
          editedBy: characterId
        };
        break;

      case 'restore':
        await restoreLogEntry(logType, entryId, characterId, reason);
        auditEntry = {
          entryId,
          action: 'restore',
          timestamp: new Date().toISOString(),
          editedBy: characterId
        };
        break;

      case 'edit':
        if (!updates || typeof updates !== 'object') {
          return NextResponse.json(
            { error: 'Missing or invalid updates field for edit action' },
            { status: 400 }
          );
        }
        await editLogEntry(logType, entryId, updates, characterId, reason);
        auditEntry = {
          entryId,
          action: 'edit',
          timestamp: new Date().toISOString(),
          editedBy: characterId
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Entry ${entryId} ${action === 'delete' ? 'soft-deleted' : action === 'restore' ? 'restored' : 'updated'} successfully`,
      auditEntry
    });

  } catch (error: any) {
    console.error('[Log Management API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Log management operation failed' 
      },
      { status: 500 }
    );
  }
}

