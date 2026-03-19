/**
 * IAM System Redis Key Patterns
 * Standardized across all projects (thegame, pixelbrain, akiles-ecosystem)
 */

export const buildAccountKey = (id: string) => `iam:account:${id}`;
export const buildAccountByEmailKey = (email: string) => `iam:account_by_email:${email.toLowerCase()}`;
export const buildCharacterKey = (id: string) => `iam:character:${id}`;
export const buildPlayerKey = (id: string) => `iam:player:${id}`;

// Link keys: iam:link:{type}:{sourceId}:{targetId}
export const buildLinkKey = (sourceId: string, targetId: string, type: string) =>
  `iam:link:${type}:${sourceId}:${targetId}`;

// M2M API Keys: iam:m2m:{appId}
export const buildM2MKey = (appId: string) => `iam:m2m:${appId}`;

// Indices (Sets of IDs for scanning)
export const IAM_ACCOUNTS_INDEX = 'iam:index:accounts';
export const IAM_CHARACTERS_INDEX = 'iam:index:characters';
export const IAM_PLAYERS_INDEX = 'iam:index:players';
export const IAM_M2M_INDEX = 'iam:index:m2m';
