import { NextResponse } from 'next/server';
import { kvSMembers } from '@/data-store/kv';
import { buildLinksGlobalIndexKey } from '@/data-store/keys';

export const dynamic = 'force-dynamic';

export async function GET() {
  const globalKey = buildLinksGlobalIndexKey();
  const ids = await kvSMembers(globalKey);
  return NextResponse.json({
    count: ids.length,
    hasLink: ids.includes('7a5400f1-269c-4684-bd78-f89e44916624')
  });
}
