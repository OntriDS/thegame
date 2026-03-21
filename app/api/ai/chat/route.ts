import { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/utils/session-manager';
import { kvGet, kvSet } from '@/data-store/kv';
import { getCachedPixelbrainOutboundToken } from '@/lib/auth/outbound-pixelbrain-m2m';

const activeSessionKey = 'active:session:akiles';

function pixelbrainBaseUrl(): string {
  const base =
    process.env.PIXELBRAIN_API_URL ||
    process.env.NEXT_PUBLIC_PIXELBRAIN_URL ||
    process.env.NEXT_PUBLIC_PIXELBRAIN_ENDPOINT ||
    '';
  return base.replace(/\/$/, '');
}

/**
 * Proxies Research AI chat to Pixelbrain orchestration ingress.
 * Preserves SessionManager + response shape expected by use-ai-chat (same as former groq/route).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      model = 'openai/gpt-oss-120b',
      sessionId: incomingSessionId,
      enableTools = false,
    } = body;

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.PIXELBRAIN_M2M_KEY;
    if (!apiKey) {
      return Response.json({ error: 'PIXELBRAIN_M2M_KEY not configured' }, { status: 500 });
    }

    const base = pixelbrainBaseUrl();
    if (!base) {
      return Response.json(
        { error: 'PIXELBRAIN_API_URL or NEXT_PUBLIC_PIXELBRAIN_URL not configured' },
        { status: 500 }
      );
    }

    let currentSessionId: string | null | undefined = incomingSessionId;
    if (!currentSessionId) {
      const saved = await kvGet<string>(activeSessionKey);
      if (saved) currentSessionId = saved;
    }

    let modelToUse = model || 'openai/gpt-oss-120b';
    let currentSession: Awaited<ReturnType<typeof SessionManager.getSession>> = null;

    if (currentSessionId) {
      const session = await SessionManager.getSession(currentSessionId);
      if (session) {
        currentSession = session;
        if (session.model) {
          modelToUse = session.model;
        }
      } else {
        currentSessionId = null;
      }
    }

    const systemMessage = SessionManager.getSystemMessage(currentSession);
    const rawHistory = currentSessionId
      ? await SessionManager.getSessionMessages(currentSessionId)
      : [];

    const conversationMessages = rawHistory
      .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; content?: string }) => ({
        role: m.role,
        content: String(m.content ?? ''),
      }));

    const { token } = await getCachedPixelbrainOutboundToken(apiKey);

    const pbRes = await fetch(`${base}/api/orchestration/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId: currentSessionId ?? undefined,
        model: modelToUse,
        targetAgent: 'orchestrator',
        enableTools,
        systemMessage: systemMessage ?? undefined,
        conversationMessages,
      }),
    });

    const pbText = await pbRes.text();
    let pbJson: Record<string, unknown>;
    try {
      pbJson = pbText ? JSON.parse(pbText) : {};
    } catch {
      return Response.json(
        { error: 'Invalid response from Pixelbrain' },
        { status: 502 }
      );
    }

    if (!pbRes.ok) {
      const errMsg =
        typeof pbJson.error === 'string' ? pbJson.error : `Pixelbrain HTTP ${pbRes.status}`;
      return Response.json({ error: errMsg }, { status: pbRes.status >= 400 ? pbRes.status : 502 });
    }

    const assistantResponse =
      typeof pbJson.response === 'string' ? pbJson.response : String(pbJson.response ?? '');
    const returnedModel =
      typeof pbJson.model === 'string' && pbJson.model ? pbJson.model : modelToUse;
    const rateLimits =
      pbJson.rateLimits && typeof pbJson.rateLimits === 'object'
        ? pbJson.rateLimits
        : {
            remainingRequests: null,
            limitRequests: null,
            remainingTokens: null,
            limitTokens: null,
          };
    const toolCalls = Array.isArray(pbJson.toolCalls) ? pbJson.toolCalls : [];
    const toolResults = Array.isArray(pbJson.toolResults) ? pbJson.toolResults : [];

    if (!currentSessionId) {
      const session = await SessionManager.createSession('akiles', 'THEGAME', returnedModel);
      currentSessionId = session.id;
      await kvSet(activeSessionKey, currentSessionId);
    }

    await SessionManager.addMessage(currentSessionId, 'user', message);
    await SessionManager.addMessage(currentSessionId, 'assistant', assistantResponse);

    return Response.json({
      response: assistantResponse,
      model: returnedModel,
      rateLimits,
      sessionId: currentSessionId,
      toolCalls,
      toolResults,
    });
  } catch (error) {
    console.error('[api/ai/chat] proxy error:', error);
    return Response.json({ error: 'Failed to process AI request' }, { status: 500 });
  }
}
