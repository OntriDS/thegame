import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { presignedPrivateDownload } from '@/lib/storage/presigned-private';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const key = request.nextUrl.searchParams.get('key');
  if (!key?.trim()) {
    return NextResponse.json({ success: false, error: 'Missing key' }, { status: 400 });
  }

  const result = await presignedPrivateDownload(key.trim());
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    url: result.url,
    isPrivate: true,
  });
}
