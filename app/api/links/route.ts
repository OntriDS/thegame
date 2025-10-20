// app/api/links/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllLinks, getLinksFor } from '@/links/link-registry';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    let links: any[];

    if (entityType && entityId) {
      // Get links for specific entity
      links = await getLinksFor({ type: entityType as any, id: entityId });
    } else {
      // Get all links
      links = await getAllLinks();
    }

    return NextResponse.json(links);
  } catch (error) {
    console.error('[Links API] Error fetching links:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const link = await req.json();
    
    // Import createLink from server-side link registry
    const { createLink } = await import('@/links/link-registry');
    await createLink(link);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Links API] Error creating link:', error);
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}
