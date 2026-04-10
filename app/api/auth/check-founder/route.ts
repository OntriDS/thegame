import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { iamService } from '@/lib/iam-service';
import { CharacterRole } from '@/types/enums';

// Force dynamic rendering since this route accesses request cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdminAuth(request))) {
      return NextResponse.json({ isAuthorized: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token =
      request.cookies.get('admin_session')?.value || request.cookies.get('auth_session')?.value;
    const user = token ? await iamService.verifyJWT(token) : null;
    const isAuthorized = Boolean(user?.roles?.includes(CharacterRole.FOUNDER));
    const characterId = isAuthorized ? user?.characterId : undefined;

    return NextResponse.json({
      isAuthorized,
      characterId
    });
  } catch (error) {
    console.error('[Auth Check Founder] Error:', error);
    return NextResponse.json({ isAuthorized: false, error: 'Auth check failed' }, { status: 500 });
  }
}

