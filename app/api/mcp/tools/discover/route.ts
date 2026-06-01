import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPixelbrainRouteAccess } from '@/lib/auth/pixelbrain-route-auth';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {

  try {
    const toolboxPath = path.resolve(process.cwd(), 'tools', 'toolbox.json');
    const content = fs.readFileSync(toolboxPath, 'utf8');
    const toolboxData = JSON.parse(content);

    // Transform standard toolbox format to MCP discover format
    const tools = toolboxData.tools.map((t: any) => ({
      id: t.id,
      name: t.id,
      description: t.description,
      systemId: 'thegame',
      parameters: t.parameters || { type: 'object', properties: {} },
    }));

    return NextResponse.json({ tools, systemId: 'thegame' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load toolbox.json', details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
