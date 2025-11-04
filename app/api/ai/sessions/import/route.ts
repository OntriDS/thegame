import { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/utils/session-manager';
import { requireAdminAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionData } = await request.json();

    if (!sessionData) {
      return Response.json({ error: 'Session data is required' }, { status: 400 });
    }

    const session = await SessionManager.importSession(sessionData);
    return Response.json(session);
  } catch (error) {
    console.error('[Sessions API][POST /import] error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to import session';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
