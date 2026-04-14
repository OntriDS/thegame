import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { presignedPrivateUpload } from '@/lib/storage/presigned-private';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const area = sp.get('area') ?? '';
  const station = sp.get('station') ?? '';
  const filename = sp.get('filename') ?? '';
  const contentType = sp.get('contentType') ?? '';
  const contentLengthRaw = sp.get('contentLength');

  if (!area || !station || !filename || !contentType) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required query params: area, station, filename, contentType, contentLength',
      },
      { status: 400 },
    );
  }

  const contentLength = contentLengthRaw != null ? Number(contentLengthRaw) : NaN;
  if (!Number.isFinite(contentLength)) {
    return NextResponse.json(
      { success: false, error: 'contentLength must be a number (bytes)' },
      { status: 400 },
    );
  }

  const result = await presignedPrivateUpload({
    area,
    station,
    filename,
    contentType,
    contentLength,
  });

  if (!result.success) {
    const isLimit =
      result.error?.includes('limit') ||
      result.error?.includes('exceeded') ||
      result.error?.includes('800k');
    const status = isLimit ? 429 : 400;
    return NextResponse.json({ success: false, error: result.error }, { status });
  }

  return NextResponse.json({
    success: true,
    uploadUrl: result.uploadUrl,
    path: result.path,
    isPrivate: true,
  });
}
