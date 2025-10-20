// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import {
  ResetDataWorkflow,
  ClearLogsWorkflow,
  ClearCacheWorkflow,
  BackfillLogsWorkflow,
  ExportDataWorkflow,
  ImportDataWorkflow,
  SeedDataWorkflow
} from '@/workflows/settings';

// Force dynamic rendering since this route accesses request cookies for auth
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, parameters } = await request.json();

    switch (action) {
      case 'clear-logs': {
        const result = await ClearLogsWorkflow.execute();
        return NextResponse.json({
          success: result.success,
          message: result.message,
          data: result.data
        }, { status: result.success ? 200 : 500 });
      }

      case 'reset-data': {
        const result = await ResetDataWorkflow.execute(parameters?.mode || 'defaults');
        return NextResponse.json({
          success: result.success,
          message: result.message,
          data: result.data
        }, { status: result.success ? 200 : 500 });
      }

      case 'clear-cache': {
        const result = await ClearCacheWorkflow.execute();
        return NextResponse.json({
          success: result.success,
          message: result.message,
          data: result.data
        }, { status: result.success ? 200 : 500 });
      }

      case 'backfill-logs': {
        const result = await BackfillLogsWorkflow.execute();
        return NextResponse.json({
          success: result.success,
          message: result.message,
          data: result.data
        }, { status: result.success ? 200 : 500 });
      }

      case 'seed-data': {
        const result = await SeedDataWorkflow.execute(parameters?.source || 'backup', parameters?.entityTypes);
        return NextResponse.json({
          success: result.success,
          message: result.message,
          data: result.data
        }, { status: result.success ? 200 : 500 });
      }

      case 'export-data': {
        const result = await ExportDataWorkflow.execute();
        return NextResponse.json({
          success: result.success,
          message: result.message,
          data: result.data
        }, { status: result.success ? 200 : 500 });
      }

      case 'import-data': {
        const result = await ImportDataWorkflow.execute(parameters?.data);
        return NextResponse.json({
          success: result.success,
          message: result.message,
          data: result.data
        }, { status: result.success ? 200 : 500 });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
