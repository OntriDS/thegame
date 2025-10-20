// app/api/logs/bulk/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { appendBulkOperationLog } from '@/workflows/entities-logging';
import { EntityType } from '@/types/enums';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

// Centralized list of entity types that support bulk operations
const BULK_OPERATION_ENTITY_TYPES = [
  EntityType.TASK,
  EntityType.ITEM,
  EntityType.FINANCIAL,
  EntityType.SITE,
  EntityType.CHARACTER,
  EntityType.PLAYER,
  EntityType.SALE
];

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { entityType, operation, count, source, importMode, exportFormat, extra } = body;

    // Validate required fields
    if (!entityType || !operation || typeof count !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: entityType, operation, count' },
        { status: 400 }
      );
    }

    // Validate operation type
    if (!['import', 'export'].includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid operation. Must be "import" or "export"' },
        { status: 400 }
      );
    }

    // Validate entityType
    if (!BULK_OPERATION_ENTITY_TYPES.includes(entityType as EntityType)) {
      return NextResponse.json(
        { error: `Invalid entityType. Must be one of: ${BULK_OPERATION_ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    await appendBulkOperationLog(entityType, operation, {
      count,
      source,
      importMode,
      exportFormat,
      extra
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to log bulk operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
