import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { getAllCharacters } from '@/data-store/datastore';

async function verifyM2MRequest(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const verification = await iamService.verifyM2MToken(token);
  if (!verification.valid || verification.appId !== 'akiles-ecosystem') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authFailure = await verifyM2MRequest(request);
    if (authFailure) return authFailure;

    const characters = await getAllCharacters();
    return NextResponse.json({
      success: true,
      characters: characters.map(c => ({
        id: c.id,
        name: c.name,
        roles: c.roles
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
