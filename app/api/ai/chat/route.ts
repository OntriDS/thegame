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

    const pbUrl = `${base}/api/orchestration/chat`;
    const pbRes = await fetch(pbUrl, {
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

    /** Cap raw body in JSON responses (avoid huge HTML error pages). */
    const bodyPreview = pbText.length > 12000 ? `${pbText.slice(0, 12000)}…` : pbText;

    if (!pbRes.ok) {
      console.error('[api/ai/chat] Pixelbrain HTTP error', {
        status: pbRes.status,
        url: pbUrl,
        body: pbText,
      });

      let parsedErr: string | undefined;
      try {
        const j = pbText ? JSON.parse(pbText) : null;
        if (j && typeof j === 'object' && typeof (j as { error?: unknown }).error === 'string') {
          parsedErr = (j as { error: string }).error;
        }
      } catch {
        /* body is not JSON — use raw text below */
      }

      const errorMessage = parsedErr ?? (bodyPreview || `HTTP ${pbRes.status}`);
      const proxyStatus = pbRes.status >= 400 && pbRes.status < 600 ? pbRes.status : 502;

      return Response.json(
        {
          error: errorMessage,
          pixelbrainStatus: pbRes.status,
          pixelbrainBody: bodyPreview,
        },
        { status: proxyStatus }
      );
    }

    let pbJson: Record<string, unknown>;
    try {
      pbJson = pbText ? JSON.parse(pbText) : {};
    } catch {
      console.error('[api/ai/chat] Pixelbrain returned non-JSON (ok status)', {
        status: pbRes.status,
        url: pbUrl,
        body: pbText,
      });
      return Response.json(
        {
          error: bodyPreview || 'Empty or non-JSON body from Pixelbrain',
          pixelbrainStatus: pbRes.status,
          pixelbrainBody: bodyPreview,
        },
        { status: 502 }
      );
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
