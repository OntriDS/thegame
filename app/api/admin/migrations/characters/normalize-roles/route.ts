import { NextResponse, NextRequest } from 'next/server';
import { Character } from '@/types/entities';
import { EntityType, CharacterRole } from '@/types/enums';
import { buildDataKey, buildIndexKey } from '@/data-store/keys';
import { kvMGet, kvSMembers } from '@/data-store/kv';
import { iamService } from '@/lib/iam-service';
import { normalizeCharacterRoles } from '@/lib/character-roles';
import { upsertCharacter } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

function getBearerOrCookieToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7).trim()
    : null;
  const authCookie = req.cookies.get('auth_session')?.value ?? null;
  const adminCookie = req.cookies.get('admin_session')?.value ?? null;
  return bearerToken || authCookie || adminCookie;
}

function isCanonicalizedAlready(
  rawRoles: unknown,
  normalizedRoles: CharacterRole[]
): boolean {
  if (!Array.isArray(rawRoles)) {
    return normalizedRoles.length === 0;
  }

  const rawRoleStrings = rawRoles.map((role) => String(role).trim());
  const rawRoleSet = new Set(rawRoleStrings);
  const canonicalRoleSet = new Set<string>(normalizedRoles);

  if (rawRoleStrings.length !== normalizedRoles.length) return false;
  if (rawRoleSet.size !== canonicalRoleSet.size) return false;

  for (const role of rawRoleSet) {
    if (!canonicalRoleSet.has(role)) return false;
  }

  return true;
}

export async function GET() {
  return NextResponse.json({
    error: 'Method Not Allowed',
    instruction: 'POST to this endpoint to run canonical role migration.',
    hint: 'Use ?dryRun=true to preview changes before writing.'
  }, { status: 405 });
}

export async function POST(req: NextRequest) {
  const token = getBearerOrCookieToken(req);
  const adminKey = req.headers.get('x-admin-key');
  const isAdminKeyRequest = adminKey && adminKey === process.env.ADMIN_ACCESS_KEY;
  const user = token && !isAdminKeyRequest ? await iamService.verifyJWT(token) : null;
  const normalizedUserRoles = user ? normalizeCharacterRoles(user.roles) : [];
  const isFounder = normalizedUserRoles.includes(CharacterRole.FOUNDER);

  if (!isAdminKeyRequest && !isFounder) {
    return NextResponse.json({ error: 'Unauthorized: Only founder role or admin key required' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const dryRun = String(searchParams.get('dryRun') || '').toLowerCase() === 'true';

  const indexKey = buildIndexKey(EntityType.CHARACTER);
  const ids = await kvSMembers(indexKey);

  if (ids.length === 0) {
    return NextResponse.json({ scanned: 0, rewritten: 0, dryRun, message: 'No characters found.' });
  }

  const keys = ids.map((id) => buildDataKey(EntityType.CHARACTER, id));
  const rawCharacters = await kvMGet<Character>(keys);

  let scanned = 0;
  let rewritten = 0;

  for (let i = 0; i < rawCharacters.length; i += 1) {
    const rawCharacter = rawCharacters[i];
    if (!rawCharacter) continue;

    scanned += 1;
    const normalizedRoles = normalizeCharacterRoles(rawCharacter.roles);
    const needsRewrite = !isCanonicalizedAlready(rawCharacter.roles, normalizedRoles);

    if (needsRewrite) {
      rewritten += 1;
      if (!dryRun) {
        await upsertCharacter({
          ...rawCharacter,
          roles: normalizedRoles,
        });
      }
    }
  }

  return NextResponse.json({
    scanned,
    rewritten,
    dryRun,
    message: dryRun
      ? 'Dry run completed. Add ?dryRun=false to apply changes.'
      : 'Canonicalization applied to all found characters.'
  });
}
