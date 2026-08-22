import { NextResponse } from 'next/server';
import { getLinksFor, getAllLinks } from '@/links/link-registry';
import { EntityType } from '@/types/enums';

export const dynamic = 'force-dynamic';

export async function GET() {
  const taskId = '2610085f-d539-413d-8de5-5d0c06844b6d';
  const links = await getLinksFor({ type: EntityType.TASK, id: taskId });
  const allLinks = await getAllLinks();
  const foundInAll = allLinks.some(l => l.source.id === taskId);

  return NextResponse.json({
    taskLinks: links,
    foundInAllIndex: foundInAll,
    totalLinksCount: allLinks.length
  });
}
