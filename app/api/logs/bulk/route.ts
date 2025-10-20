// app/api/logs/bulk/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { appendBulkOperationLog } from '@/workflows/entities-logging';

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
    const validEntityTypes = ['tasks', 'items', 'financials', 'sites', 'characters', 'players', 'sales'];
    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entityType. Must be one of: ${validEntityTypes.join(', ')}` },
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
