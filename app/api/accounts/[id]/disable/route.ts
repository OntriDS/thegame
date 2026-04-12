import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { iamService } from '@/lib/iam-service';

export const dynamic = 'force-dynamic';

/** Disable login and unlink character; IAM row remains (listed as Inactive). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await iamService.disableAccount(params.id);
  return new NextResponse(null, { status: 204 });
}
