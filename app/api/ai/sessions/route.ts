import { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/utils/session-manager';
import { kvGet, kvSet } from '@/data-store/kv';
import { requireAdminAuth } from '@/lib/api-auth';

const ACTIVE_KEY = 'active:session:akiles';

export async function GET(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let activeSessionId = await kvGet<string>(ACTIVE_KEY);
    const sessions = await SessionManager.getRecentSessions();
    
    // Validate active session exists - clear stale reference if session was deleted
    let stats = null;
    if (activeSessionId) {
      stats = await SessionManager.getSessionStats(activeSessionId);
      // If session doesn't exist, clear the stale activeSessionId reference
      if (!stats) {
        await kvSet(ACTIVE_KEY, '');
        activeSessionId = null;
      }
    }
    
    return Response.json({ 
      activeSessionId, 
      activeStats: stats, 
      sessions 
    });
  } catch (error) {
    console.error('[Sessions API][GET] error:', error);
    return Response.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, sessionId, model } = await request.json();

    if (action === 'create') {
      const session = await SessionManager.createSession('akiles', 'THEGAME', model || 'openai/gpt-oss-120b');
      await kvSet(ACTIVE_KEY, session.id);
      return Response.json({ sessionId: session.id, session });
    }

    if (action === 'set-active') {
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
      const isValid = await SessionManager.isValidSession(sessionId);
      if (!isValid) return Response.json({ error: 'Invalid sessionId' }, { status: 400 });
      await kvSet(ACTIVE_KEY, sessionId);
      return Response.json({ sessionId });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Sessions API][POST] error:', error);
    return Response.json({ error: 'Failed to update sessions' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await kvSet(ACTIVE_KEY, '');
    return Response.json({ cleared: true });
  } catch (error) {
    console.error('[Sessions API][DELETE] error:', error);
    return Response.json({ error: 'Failed to clear active session' }, { status: 500 });
  }
}


