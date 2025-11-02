// app/api/links/[linkId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { linkId: string } }
) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { removeLink } = await import('@/links/link-registry');
    await removeLink(params.linkId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Links API] Error removing link:', error);
    return NextResponse.json({ error: 'Failed to remove link' }, { status: 500 });
  }
}


