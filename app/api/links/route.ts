// app/api/links/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminOrM2MAuth } from '@/lib/api-auth';
import { getAllLinks, getLinksFor } from '@/links/link-registry';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminOrM2MAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const entityIds = (searchParams.get('entityIds') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    let links: any[];

    if (entityType && entityId) {
      // Get links for specific entity
      links = await getLinksFor({ type: entityType as any, id: entityId });
    } else if (entityType && entityIds.length > 0) {
      // Batched read for entity projections; preserve getLinksFor semantics.
      const grouped = await Promise.all(entityIds.map((id) => getLinksFor({ type: entityType as any, id })));
      links = grouped.flat();
      const seen = new Set<string>();
      links = links.filter((link) => !seen.has(link.id) && seen.add(link.id));
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
  if (!(await requireAdminOrM2MAuth(req))) {
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
