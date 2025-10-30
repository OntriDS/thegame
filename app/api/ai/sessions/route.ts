import { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/utils/session-manager';
import { kvGet, kvSet } from '@/data-store/kv';

const ACTIVE_KEY = 'groq_active_session:akiles';
const INDEX_KEY = 'groq_session_index:akiles'; // stores array of recent sessionIds
const MAX_INDEX = 20;

export async function GET(request: NextRequest) {
  try {
    const activeSessionId = await kvGet<string>(ACTIVE_KEY);
    const index: string[] = (await kvGet<string[]>(INDEX_KEY)) || [];
    const stats = activeSessionId ? await SessionManager.getSessionStats(activeSessionId) : null;
    return Response.json({ activeSessionId, activeStats: stats, recentSessionIds: index });
  } catch (error) {
    console.error('[Sessions API][GET] error:', error);
    return Response.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, sessionId } = await request.json();

    if (action === 'create') {
      const session = await SessionManager.createSession('akiles', 'THEGAME');
      await kvSet(ACTIVE_KEY, session.id);
      const index: string[] = (await kvGet<string[]>(INDEX_KEY)) || [];
      const updated = [session.id, ...index.filter(id => id !== session.id)].slice(0, MAX_INDEX);
      await kvSet(INDEX_KEY, updated);
      return Response.json({ sessionId: session.id });
    }

    if (action === 'set-active') {
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
      const isValid = await SessionManager.isValidSession(sessionId);
      if (!isValid) return Response.json({ error: 'Invalid sessionId' }, { status: 400 });
      await kvSet(ACTIVE_KEY, sessionId);
      const index: string[] = (await kvGet<string[]>(INDEX_KEY)) || [];
      const updated = [sessionId, ...index.filter(id => id !== sessionId)].slice(0, MAX_INDEX);
      await kvSet(INDEX_KEY, updated);
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


