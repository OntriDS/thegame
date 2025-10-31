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
    const session = await SessionManager.getSession(params.id);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }
    return Response.json(session);
  } catch (error) {
    console.error('[Sessions API][GET /id] error:', error);
    return Response.json({ error: 'Failed to get session' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdminAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    if (!name) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }
    
    await SessionManager.updateSessionName(params.id, name);
    const session = await SessionManager.getSession(params.id);
    return Response.json(session);
  } catch (error) {
    console.error('[Sessions API][PUT /id] error:', error);
    return Response.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdminAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await SessionManager.deleteSession(params.id);
    return Response.json({ deleted: true });
  } catch (error) {
    console.error('[Sessions API][DELETE /id] error:', error);
    return Response.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

