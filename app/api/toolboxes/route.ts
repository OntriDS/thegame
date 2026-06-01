import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ToolboxService } from '@/data-store/services/toolbox.service';

export async function GET(req: NextRequest) {
  try {
    const toolboxes = await ToolboxService.getToolboxes();
    return NextResponse.json({ success: true, data: toolboxes });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const toolboxes = await ToolboxService.syncToolboxes();
    return NextResponse.json({ success: true, data: toolboxes });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
