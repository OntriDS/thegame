import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import { requireAdminAuth } from '@/lib/api-auth';
import { iamService } from '@/lib/iam-service';
import { CharacterRole, EntityType, LinkType } from '@/types/enums';
import { characterHasSpecialRole, normalizeCharacterRole, normalizeCharacterRoles } from '@/lib/character-roles';
import { getAllCharacters, getCharacterById, upsertCharacter, getAllFinancials, getFinancialById } from '@/data-store/datastore';
import type { Character } from '@/types/entities';
import { getLinksFor } from '@/links/link-registry';

export const dynamic = 'force-dynamic';

type DirectorySortBy = 'name' | 'role';
type DirectorySortOrder = 'asc' | 'desc';
type DirectoryAmountTotals = {
  purchasedAmount: number;
  beneficiaryPaidAmount: number;
};

const parsePositiveInteger = (value: string | null, fallback: number, min: number): number => {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < min) return fallback;
  return parsed;
};

const parsePageSize = (value: string | null): number => {
  const parsed = parsePositiveInteger(value, 25, 1);
  return Math.min(Math.max(parsed, 5), 200);
};

const parseDirectorySortBy = (value: string | null): DirectorySortBy => {
  return value === 'role' ? 'role' : 'name';
};

const parseDirectorySortOrder = (value: string | null): DirectorySortOrder => {
  return value === 'desc' ? 'desc' : 'asc';
};

const getRoleSortValue = (character: Character): string => {
  return [...new Set(character.roles || [])]
    .map((role) => role)
    .sort((a, b) => a.localeCompare(b))
    .join('|')
    .toLowerCase();
};

const isCustomerRole = (role?: string | null): boolean => {
  const normalized = normalizeCharacterRole(role);
  return normalized == null || normalized === CharacterRole.CUSTOMER;
};

const buildDirectoryRoleCounts = (characters: Character[]): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const character of characters) {
    for (const role of character.roles || []) {
      result[role] = (result[role] ?? 0) + 1;
    }
  }
  return result;
};

const buildDirectoryAmountTotals = async (characterIds: string[]): Promise<Map<string, DirectoryAmountTotals>> => {
  const totals = new Map<string, DirectoryAmountTotals>();
  const idSet = new Set(characterIds);

  for (const characterId of characterIds) {
    totals.set(characterId, { purchasedAmount: 0, beneficiaryPaidAmount: 0 });
  }

  if (characterIds.length === 0) return totals;

  // Charged amount: based on customer-character relations from Financial records
  const financials = await getAllFinancials();
  for (const record of financials) {
    const customerCharacterId = record.customerCharacterId;
    if (!customerCharacterId || !idSet.has(customerCharacterId)) continue;
    if (!isCustomerRole(record.customerCharacterRole)) continue;

    const amount = Number(record.revenue || 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const current = totals.get(customerCharacterId);
    if (!current) continue;
    current.purchasedAmount += amount;
  }

  // Beneficiary paid amount: based on FINREC links + record cost
  const financialIdToCharacterIds = new Map<string, Set<string>>();
  const characterLinks = await Promise.all(
    characterIds.map((characterId) =>
      getLinksFor({
        type: EntityType.CHARACTER,
        id: characterId
      })
        .then((links) => ({ characterId, links }))
    )
  );

  for (const { characterId, links } of characterLinks) {
    for (const link of links) {
      if (![LinkType.FINREC_CHARACTER, LinkType.CHARACTER_FINREC].includes(link.linkType)) continue;

      const financialRecordId = link.source.type === EntityType.FINANCIAL
        ? link.source.id
        : link.target.type === EntityType.FINANCIAL
          ? link.target.id
          : null;

      if (!financialRecordId) continue;

      const linkedCharacters = financialIdToCharacterIds.get(financialRecordId) || new Set<string>();
      linkedCharacters.add(characterId);
      financialIdToCharacterIds.set(financialRecordId, linkedCharacters);
    }
  }

  const beneficiaryFinancialIds = Array.from(financialIdToCharacterIds.keys());
  const beneficiaryFinancials = await Promise.all(beneficiaryFinancialIds.map((id) => getFinancialById(id)));

  for (const financial of beneficiaryFinancials) {
    if (!financial) continue;

      const amount = Number(financial.cost || 0);
      if (!Number.isFinite(amount) || amount === 0) continue;

      // Costs are stored as negative values in this codebase, so convert for payout totals.
      const paidAmount = Math.abs(amount);
      if (paidAmount <= 0) continue;

    const linkedCharacters = financialIdToCharacterIds.get(financial.id);
    if (!linkedCharacters) continue;

    for (const characterId of linkedCharacters) {
      const current = totals.get(characterId);
      if (!current) continue;
        current.beneficiaryPaidAmount += paidAmount;
    }
  }

  return totals;
};

/**
 * GET /api/characters
 * Returns characters from the Game Data-Store.
 * If ?filter=special, only characters with at least one SPECIAL role are returned.
 * The Accounts modal should always use ?filter=special.
 */
export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const filter = req.nextUrl.searchParams.get('filter');
  const view = req.nextUrl.searchParams.get('view');

  if (view === 'directory') {
    const search = (req.nextUrl.searchParams.get('search') || '').trim().toLowerCase();
    const roleFilter = normalizeCharacterRole(req.nextUrl.searchParams.get('role') || '');
    const sortBy = parseDirectorySortBy(req.nextUrl.searchParams.get('sortBy'));
    const sortOrder = parseDirectorySortOrder(req.nextUrl.searchParams.get('sortOrder'));
    const page = parsePositiveInteger(req.nextUrl.searchParams.get('page'), 1, 1);
    const pageSize = parsePageSize(req.nextUrl.searchParams.get('pageSize'));

    let characters = await getAllCharacters();

    if (filter === 'special') {
      characters = characters.filter((c) => characterHasSpecialRole(c.roles));
    }

    if (search) {
      characters = characters.filter((character) => {
        const searchable = [character.name, character.description, character.contactEmail, character.contactPhone]
          .map((value) => (value || '').toLowerCase())
          .join(' ');
        return searchable.includes(search);
      });
    }

    const roleCandidates = [...characters];
    if (roleFilter) {
      characters = characters.filter((character) => character.roles.includes(roleFilter));
    }

    const sortedCharacters = [...characters].sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'role') {
        comparison = getRoleSortValue(a).localeCompare(getRoleSortValue(b));
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
      } else {
        comparison = a.name.localeCompare(b.name);
      }

      if (comparison === 0) {
        comparison = a.id.localeCompare(b.id);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const total = sortedCharacters.length;
    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 0;
    const safePage = total > 0 ? Math.min(Math.max(page, 1), totalPages) : 1;
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    const items = sortedCharacters.slice(start, end);
    const amountTotals = await buildDirectoryAmountTotals(items.map((character) => character.id));
    const enrichedItems = items.map((character) => {
      const totals = amountTotals.get(character.id);
      return {
        ...character,
        purchasedAmount: totals?.purchasedAmount ?? 0,
        beneficiaryPaidAmount: totals?.beneficiaryPaidAmount ?? 0,
      };
    });

    return NextResponse.json({
      items: enrichedItems,
      total,
      page: safePage,
      pageSize,
      totalPages,
      sortBy,
      sortOrder,
      search,
      roleFilter: roleFilter || null,
      roleCounts: buildDirectoryRoleCounts(roleCandidates),
      view: 'directory',
    });
  }

  let characters = await getAllCharacters();

  if (filter === 'special') {
    characters = characters.filter(c => characterHasSpecialRole(c.roles));
  }

  return NextResponse.json(characters);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    const token =
      req.headers.get('Authorization')?.startsWith('Bearer ')
        ? req.headers.get('Authorization')!.substring(7).trim()
        : req.cookies.get('iam_session')?.value;

  try {
    const body = (await req.json()) as Character;
    const tokenUser = token ? await iamService.verifyJWT(token) : null;

    if (!tokenUser || !tokenUser.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isFounder = tokenUser.roles.includes(CharacterRole.FOUNDER);
    const normalizedIncomingRoles = normalizeCharacterRoles(body.roles);
    const existingCharacter = body.id ? await getCharacterById(body.id) : null;
    const existingRoles = existingCharacter ? existingCharacter.roles : [];

    const rolesCanChange =
      normalizedIncomingRoles.length === existingRoles.length &&
      new Set(existingRoles).size === new Set(normalizedIncomingRoles).size &&
      normalizedIncomingRoles.every(role => existingRoles.includes(role));

    if (!isFounder && !rolesCanChange) {
      return NextResponse.json(
        { error: 'Forbidden: Only founders can change character roles' },
        { status: 403 }
      );
    }

    const character = {
      ...body,
      roles: normalizedIncomingRoles,
      id: body.id || uuid(),
      links: body.links || [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      lastActiveAt: body.lastActiveAt ? new Date(body.lastActiveAt) : new Date(),
    };
    const saved = await upsertCharacter(character);
    return NextResponse.json(saved);
  } catch (error: any) {
    console.error('[API] Error saving character:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save character' },
      { status: 500 }
    );
  }
}
