import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getCachedPixelbrainOutboundToken } from '@/lib/auth/outbound-pixelbrain-m2m';

export const dynamic = 'force-dynamic';

function pixelbrainBaseUrl(): string {
  const base = process.env.PIXELBRAIN_API_URL || '';
  return base.replace(/\/$/, '');
}

/**
 * Proxy Pixelbrain agent-tools catalog for Research AI Assistant (admin-only).
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.PIXELBRAIN_M2M_KEY;
  if (!apiKey) {
    return Response.json({ error: 'PIXELBRAIN_M2M_KEY not configured' }, { status: 500 });
  }

  const base = pixelbrainBaseUrl();
  if (!base) {
    return Response.json({ error: 'PIXELBRAIN_API_URL not configured' }, { status: 500 });
  }

  try {
    const { token } = await getCachedPixelbrainOutboundToken(apiKey);
    const url = `${base}/api/orchestration/agent-tools`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return Response.json(
        { error: 'Failed to fetch Pixelbrain agent tools', pixelbrainStatus: res.status, body: text.slice(0, 2000) },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      return Response.json({ error: 'Invalid JSON from Pixelbrain' }, { status: 502 });
    }
    return Response.json(json);
  } catch (e) {
    console.error('[GET /api/ai/pixelbrain/agent-tools]', e);
    return Response.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
