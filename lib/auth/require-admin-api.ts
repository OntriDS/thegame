import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { isGameAdmin } from '@/integrity/iam/permissions';

export async function requireAdminApi(
  request: NextRequest,
): Promise<NextResponse | null> {
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearerToken || request.cookies.get('iam_session')?.value;

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await iamService.verifyJWT(token);
  if (!user || !user.isActive) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isGameAdmin(user.roles)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  return null;
}
