/**
 * IAM Redis key patterns — shared across TheGame, Akiles-Ecosystem, and Pixelbrain when they use
 * the same Upstash database: all IAM data lives under `iam:*` (not under `thegame:` / per-app prefix).
 * Game entities (characters, items, …) use `thegame:data:*` — see `data-store/keys.ts`.
 */

export const buildAccountKey = (id: string) => `iam:account:${id}`;
export const buildAccountByEmailKey = (email: string) => `iam:account:email:${email.toLowerCase()}`;

// M2M API Keys: iam:m2m:{appId}
export const buildM2MKey = (appId: string) => `iam:m2m:${appId}`;

// Indices (Sets of IDs for scanning)
export const IAM_ACCOUNTS_INDEX = 'iam:index:accounts';
export const IAM_M2M_INDEX = 'iam:index:m2m';
