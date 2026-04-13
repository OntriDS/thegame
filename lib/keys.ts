/**
 * IAM Redis keys — shared across apps on the same Upstash: `iam:*` is the single IAM namespace.
 * `iam:account:email:{email}` is the canonical email → accountId map for login resolution; do not
 * register a second mapping when provisioning from Akiles (see `createAccount` skipGlobalEmailMapping).
 * Game entities use `thegame:data:*` — see `data-store/keys.ts`.
 */

export const buildAccountKey = (id: string) => `iam:account:${id}`;
export const buildAccountByEmailKey = (email: string) => `iam:account:email:${email.toLowerCase()}`;

// M2M API Keys: iam:m2m:{appId}
export const buildM2MKey = (appId: string) => `iam:m2m:${appId}`;

// Indices (Sets of IDs for scanning)
export const IAM_ACCOUNTS_INDEX = 'iam:index:accounts';
export const IAM_M2M_INDEX = 'iam:index:m2m';
