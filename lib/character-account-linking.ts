import { v4 as uuidv4 } from 'uuid';
import type { Character } from '@/types/entities';
import { getAllCharacters, upsertCharacter } from '@/data-store/datastore';
import { getCharacterById } from '@/data-store/repositories/character.repo';
import { kvDel, kvScan, kvSAdd, kvSMembers } from '@/data-store/kv';
import {
  buildCharacterEmailIndexKey,
  buildCharacterPhoneIndexKey,
} from '@/data-store/keys';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, LinkType } from '@/types/enums';
import { iamService } from '@/lib/iam-service';
import { getUTCNow } from '@/lib/utils/utc-utils';

export type ProvisionMatchType = 'EMAIL_AUTO_LINK' | 'PHONE_AUTO_LINK' | 'NO_MATCH_CREATED';

export type ProvisionErrorCode =
  | 'AMBIGUOUS_MATCH'
  | 'LINK_BLOCKED'
  | 'INVALID_PHONE'
  | 'INVALID_COUNTRY_CODE'
  | 'PROVISION_ERROR';

export class ProvisionError extends Error {
  public readonly status: number;
  public readonly code: ProvisionErrorCode;
  public readonly details?: string;

  constructor(message: string, code: ProvisionErrorCode, status = 400, details?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type ProvisionReason =
  | 'NO_MATCH'
  | 'UNIQUE'
  | 'AMBIGUOUS'
  | 'BLOCKED';

export interface ProvisionMatchResult {
  reason: ProvisionReason;
  character?: Character;
  matchStrategy?: 'EMAIL' | 'PHONE';
}

export interface ProvisionInput {
  name: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  password: string;
}

export interface ProvisionResponse {
  character: Character;
  account: {
    id: string;
    name: string;
    email: string;
  };
  matchType: ProvisionMatchType;
}

export interface ProvisioningBackfillSummary {
  totalCharacters: number;
  emailIndexed: number;
  phoneIndexed: number;
  removedEmailIndexKeys: number;
  removedPhoneIndexKeys: number;
  addedPhoneIndexKeys: number;
}

const SUPPORTED_COUNTRY_CODES = ['+506', '+1'] as const;
const DEFAULT_COUNTRY_CODE = '+506';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeCountryCode(countryCode?: string): string {
  const raw = (countryCode || '').trim();
  const normalized = raw.startsWith('+') ? raw : `+${raw}`;
  if (!SUPPORTED_COUNTRY_CODES.includes(normalized as (typeof SUPPORTED_COUNTRY_CODES)[number])) {
    throw new ProvisionError('Unsupported phone country code.', 'INVALID_COUNTRY_CODE', 400, `Allowed values: ${SUPPORTED_COUNTRY_CODES.join(', ')}`);
  }
  return normalized;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

function stripCountryCodeFromPhone(phoneDigits: string, countryCode: string): string {
  const normalizedCountryDigits = countryCode.replace('+', '');
  return phoneDigits.startsWith(normalizedCountryDigits) ? phoneDigits.slice(normalizedCountryDigits.length) : phoneDigits;
}

function normalizeProvisionPhone(phone: string, phoneCountryCode: string): string {
  const normalizedCode = normalizeCountryCode(phoneCountryCode || DEFAULT_COUNTRY_CODE);
  const digits = normalizePhone(phone);
  if (!digits) {
    throw new ProvisionError('Phone is required for registration.', 'INVALID_PHONE', 400);
  }

  const localDigits = stripCountryCodeFromPhone(digits, normalizedCode);
  if (normalizedCode === '+506' && localDigits.length !== 8) {
    throw new ProvisionError('Costa Rica phone numbers must be 8 digits.', 'INVALID_PHONE', 400);
  }
  if (normalizedCode === '+1' && localDigits.length !== 10) {
    throw new ProvisionError('US phone numbers must be 10 digits.', 'INVALID_PHONE', 400);
  }

  return `${normalizedCode}${localDigits}`;
}

function normalizeContactPhoneForIndex(phone?: string, countryCode?: string): string {
  if (!phone) return '';
  const digits = normalizePhone(phone);
  if (!digits) return '';
  if (!countryCode) return digits;
  const normalizedCode = normalizeCountryCode(countryCode);
  const localDigits = stripCountryCodeFromPhone(digits, normalizedCode);
  return `${normalizedCode}${localDigits}`;
}

async function isCharacterAlreadyLinked(characterId: string): Promise<boolean> {
  const links = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });
  return links.some((link) => link.linkType === LinkType.ACCOUNT_CHARACTER);
}

async function isCharacterAvailableForProvisioning(character: Character): Promise<boolean> {
  if (character.isActive === false) return false;
  if (character.allowAccountLinking === false) return false;
  if (character.accountId) return false;

  return !(await isCharacterAlreadyLinked(character.id));
}

type CandidateMatchProbe = {
  candidate: Character;
  available: boolean;
};

async function resolveCandidateMatch(
  ids: string[],
  strategy: 'EMAIL' | 'PHONE'
): Promise<ProvisionMatchResult> {
  const uniqueIds = [...new Set(ids)].slice(0, 100);
  const characters = await Promise.all(uniqueIds.map((id) => getCharacterById(id)));
  const validCharacters = characters.filter((c): c is Character => Boolean(c));

  if (validCharacters.length === 0) {
    return { reason: 'NO_MATCH', matchStrategy: strategy };
  }

  const candidateProbes = await Promise.all(
    validCharacters.map(async (candidate: Character): Promise<CandidateMatchProbe> => ({
      candidate,
      available: await isCharacterAvailableForProvisioning(candidate),
    }))
  );
  const eligibleCharacters = candidateProbes
    .filter((entry: CandidateMatchProbe): boolean => entry.available)
    .map((entry: CandidateMatchProbe) => entry.candidate);

  if (eligibleCharacters.length === 1) {
    return { reason: 'UNIQUE', character: eligibleCharacters[0], matchStrategy: strategy };
  }

  if (eligibleCharacters.length > 1) {
    return { reason: 'AMBIGUOUS', matchStrategy: strategy };
  }

  return { reason: 'BLOCKED', matchStrategy: strategy };
}

export async function findExistingCharacterForRegistration(
  email: string,
  phone?: string,
  phoneCountryCode?: string
): Promise<{ strategy?: 'EMAIL' | 'PHONE'; result: ProvisionMatchResult }> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new ProvisionError('Email is required.', 'PROVISION_ERROR', 400);
  }

  const emailKey = buildCharacterEmailIndexKey(normalizedEmail);
  const emailMatch = await resolveCandidateMatch(await kvSMembers(emailKey), 'EMAIL');
  if (emailMatch.reason === 'UNIQUE') {
    return { strategy: 'EMAIL', result: emailMatch };
  }
  if (emailMatch.reason === 'AMBIGUOUS') {
    return { strategy: 'EMAIL', result: emailMatch };
  }
  if (emailMatch.reason === 'BLOCKED') {
    return { strategy: 'EMAIL', result: emailMatch };
  }

  if (!phone) {
    return { strategy: undefined, result: emailMatch };
  }

  const normalizedPhone = normalizeContactPhoneForIndex(phone, phoneCountryCode || DEFAULT_COUNTRY_CODE);
  if (!normalizedPhone) {
    return { strategy: undefined, result: emailMatch };
  }

  const phoneMatch = await resolveCandidateMatch(
    await kvSMembers(buildCharacterPhoneIndexKey(normalizedPhone)),
    'PHONE'
  );
  return { strategy: 'PHONE', result: phoneMatch };
}

async function createCustomerCharacter(input: {
  name: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
}): Promise<Character> {
  const now = getUTCNow();
  const newCharacter: Character = {
    id: uuidv4(),
    name: input.name,
    description: `Customer account for ${input.email}`,
    roles: [],
    achievementsCharacter: [],
    purchasedAmount: 0,
    inventory: [],
    playerId: `customer-player-${uuidv4()}`,
    lastActiveAt: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    links: [],
    contactEmail: input.email,
    contactPhone: input.phone,
    contactPhoneCountryCode: input.phoneCountryCode,
    allowAccountLinking: true,
  };

  return upsertCharacter(newCharacter);
}

async function provisionMatchToAccount(character: Character, input: ProvisionInput, matchType: ProvisionMatchType): Promise<ProvisionResponse> {
  const createdAccount = await iamService.createAccount(
    {
      name: input.name,
      email: input.email,
      phone: input.phone,
      phoneCountryCode: input.phoneCountryCode,
      password: input.password,
    },
    { skipGlobalEmailMapping: true },
  );

  await iamService.linkAccountToCharacter(createdAccount.id, character.id);

  const linkedAccount = await iamService.getAccountById(createdAccount.id);
  if (!linkedAccount) {
    throw new ProvisionError('Account was not found after linking.', 'PROVISION_ERROR', 500);
  }

  return {
    character,
    account: {
      id: linkedAccount.id,
      name: linkedAccount.name,
      email: linkedAccount.email,
    },
    matchType,
  };
}

function mapMatchToResponseCode(matchResult: ProvisionMatchResult, strategy: 'EMAIL' | 'PHONE', fallbackCode: ProvisionMatchType): ProvisionMatchType {
  if (matchResult.reason === 'UNIQUE' && matchResult.character) {
    return strategy === 'EMAIL' ? 'EMAIL_AUTO_LINK' : 'PHONE_AUTO_LINK';
  }
  return fallbackCode;
}

export async function provisionCustomerOnRegistration(input: ProvisionInput): Promise<ProvisionResponse> {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizeProvisionPhone(input.phone, input.phoneCountryCode);

  const match = await findExistingCharacterForRegistration(
    normalizedEmail,
    normalizedPhone,
    input.phoneCountryCode
  );

  if (match.result.reason === 'UNIQUE' && match.result.character) {
    const strategy = match.strategy || 'EMAIL';
    const matchType = mapMatchToResponseCode(match.result, strategy, 'NO_MATCH_CREATED');
    return provisionMatchToAccount(match.result.character, {
      ...input,
      email: normalizedEmail,
      phone: normalizedPhone,
    }, matchType);
  }

  if (match.result.reason === 'AMBIGUOUS') {
    const strategy = match.strategy || 'EMAIL';
    throw new ProvisionError(
      `More than one Character matches this ${strategy.toLowerCase()} and auto-link is blocked.`,
      'AMBIGUOUS_MATCH',
      409,
      `Multiple matches found for ${strategy}`
    );
  }

  if (match.result.reason === 'BLOCKED') {
    const strategy = match.strategy || 'EMAIL';
    throw new ProvisionError(
      `Character for this ${strategy.toLowerCase()} has account linking disabled.`,
      'LINK_BLOCKED',
      409,
      `Character linking is disabled for matched ${strategy}`
    );
  }

  const createdCharacter = await createCustomerCharacter({
    name: input.name,
    email: normalizedEmail,
    phone: normalizedPhone,
    phoneCountryCode: normalizeCountryCode(input.phoneCountryCode || DEFAULT_COUNTRY_CODE),
  });
  return provisionMatchToAccount(
    createdCharacter,
    { ...input, email: normalizedEmail, phone: normalizedPhone },
    'NO_MATCH_CREATED'
  );
}

export async function rebuildCharacterContactIndexes(): Promise<ProvisioningBackfillSummary> {
  const emailIndexKeys = await kvScan('thegame:index:character:email:');
  const phoneIndexKeys = await kvScan('thegame:index:character:phone:');

  let removedEmailIndexKeys = 0;
  let removedPhoneIndexKeys = 0;
  if (emailIndexKeys.length > 0) {
    await Promise.all(emailIndexKeys.map((key) => kvDel(key)));
    removedEmailIndexKeys = emailIndexKeys.length;
  }
  if (phoneIndexKeys.length > 0) {
    await Promise.all(phoneIndexKeys.map((key) => kvDel(key)));
    removedPhoneIndexKeys = phoneIndexKeys.length;
  }

  const characters = await getAllCharacters();
  let emailIndexed = 0;
  let phoneIndexed = 0;

  for (const character of characters) {
    const normalizedEmail = normalizeEmail(character.contactEmail || '');
    if (normalizedEmail) {
      await kvSAdd(buildCharacterEmailIndexKey(normalizedEmail), character.id);
      emailIndexed++;
    }

    const normalizedPhone = normalizeContactPhoneForIndex(character.contactPhone || '', character.contactPhoneCountryCode);
    if (normalizedPhone) {
      await kvSAdd(buildCharacterPhoneIndexKey(normalizedPhone), character.id);
      phoneIndexed++;
    }
  }

  return {
    totalCharacters: characters.length,
    emailIndexed,
    phoneIndexed,
    removedEmailIndexKeys,
    removedPhoneIndexKeys,
    addedPhoneIndexKeys: phoneIndexed,
  };
}
