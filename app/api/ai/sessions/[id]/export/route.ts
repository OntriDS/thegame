import { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/utils/session-manager';
import { requireAdminAuth } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdminAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sessionData = await SessionManager.exportSession(params.id);
    return new Response(sessionData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ai-session-${params.id.substring(0, 8)}.json"`
      }
    });
  } catch (error) {
    console.error('[Sessions API][GET /id/export] error:', error);
    return Response.json({ error: 'Failed to export session' }, { status: 500 });
  }
}
