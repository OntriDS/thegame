import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPixelbrainRouteAccess } from '@/lib/auth/pixelbrain-route-auth';
import { enhancedMcpServer } from '@/mcp/mcp-server';

export async function POST(req: NextRequest) {
  const auth = await verifyPixelbrainRouteAccess(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: { toolId?: string; parameters?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const toolId = body.toolId;
  const parameters = body.parameters ?? {};

  if (!toolId || typeof toolId !== 'string') {
    return NextResponse.json({ success: false, error: 'toolId is required' }, { status: 400 });
  }

  try {
    const result = await enhancedMcpServer.callTool(toolId, parameters);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    console.error('[MCP execute]', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Execution failed' },
      { status: 500 }
    );
  }
}
