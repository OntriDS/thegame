import { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/utils/session-manager';
import { kvGet, kvSet } from '@/lib/utils/kv';
import { getCachedPixelbrainOutboundToken } from '@/lib/auth/outbound-pixelbrain-m2m';
import {
  aiAssistantModelFromSession,
  validateAiAssistantModelInput,
  type AiAssistantModelId,
} from '@/lib/ai/ai-assistant-models';

const activeSessionKey = 'active:session:akiles';

/** Safe Pixelbrain routing id: auto | orchestrator | specialist ids from catalog. */
function sanitizeTargetAgent(raw: unknown): string {
  if (raw == null || typeof raw !== 'string') return 'auto';
  const t = raw.trim().toLowerCase();
  if (!t || t === 'default') return 'auto';
  if (!/^[a-z][a-z0-9_-]{0,47}$/.test(t)) return 'auto';
  return t;
}

function pixelbrainBaseUrl(): string {
  const base = process.env.PIXELBRAIN_API_URL || '';
  return base.replace(/\/$/, '');
}

/**
 * Proxies AI Assistant chat to Pixelbrain orchestration ingress.
 * Preserves SessionManager + response shape expected by use-ai-chat (same as former groq/route).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      model: rawModel,
      sessionId: incomingSessionId,
      enableTools = false,
      targetAgent: targetAgentBody,
    } = body;

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Validate incoming model (may be undefined → will fall back to session or default)
    const modelValidation = validateAiAssistantModelInput(rawModel);
    if ('error' in modelValidation) {
      return Response.json({ error: modelValidation.error }, { status: 400 });
    }
    // If rawModel was explicitly provided and valid, use it; otherwise fall back later
    const incomingModelExplicit =
      typeof rawModel === 'string' && rawModel.trim() ? modelValidation.model : null;
    let modelToUse: AiAssistantModelId = modelValidation.model;

    const apiKey = process.env.PIXELBRAIN_M2M_KEY;
    if (!apiKey) {
      return Response.json({ error: 'PIXELBRAIN_M2M_KEY not configured' }, { status: 500 });
    }

    const base = pixelbrainBaseUrl();
    if (!base) {
      return Response.json(
        { error: 'PIXELBRAIN_API_URL not configured' },
        { status: 500 }
      );
    }

    let currentSessionId: string | null | undefined = incomingSessionId;
    if (!currentSessionId) {
      const saved = await kvGet<string>(activeSessionKey);
      if (saved) currentSessionId = saved;
    }

    let currentSession: Awaited<ReturnType<typeof SessionManager.getSession>> = null;

    if (currentSessionId) {
      const session = await SessionManager.getSession(currentSessionId);
      if (session) {
        currentSession = session;
        // Only fall back to session.model if request didn't explicitly provide one
        if (!incomingModelExplicit && session.model) {
          modelToUse = aiAssistantModelFromSession(session.model);
        }
      } else {
        currentSessionId = null;
      }
    }

    // Persist model choice on session so future messages default to it
    if (currentSession && incomingModelExplicit && currentSession.model !== incomingModelExplicit) {
      await SessionManager.updateSessionModel(currentSession.id, incomingModelExplicit);
    }

    const targetAgent =
      targetAgentBody !== undefined && targetAgentBody !== null && String(targetAgentBody).trim() !== ''
        ? sanitizeTargetAgent(targetAgentBody)
        : sanitizeTargetAgent(currentSession?.pixelbrainTargetAgent ?? 'auto');

    const systemMessage = SessionManager.getSystemMessage(currentSession);
    const rawHistory = currentSessionId
      ? await SessionManager.getSessionMessages(currentSessionId)
      : [];

    // History pruning: Default to empty history (only send the current message) to save tokens.
    // In the future, we can add a flag to include more context.
    const historySlice = body.includeHistory ? rawHistory.slice(-10) : [];

    const conversationMessages = historySlice
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
        targetAgent,
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

