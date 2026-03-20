# Accounts × IAM × Characters — Architecture (Resolved)

**Status:** Refactored. Single Source of Truth enforced.

---

## Architecture Rules (Enforced in Code)

### Rule 1 — Single Source of Truth for Characters
Characters live **only** in the Game Data-Store: `thegame:data:character:{uuid}`.
IAM never creates, stores, or indexes `iam:character:*` records.

### Rule 2 — Accounts Modal Character List
`GET /api/characters?filter=special` returns DS characters filtered to `CHARACTER_ROLE_TYPES.SPECIAL` roles only.
The Account Modal calls `ClientAPI.getCharacters('special')`.

### Rule 3 — Account Creation Flow
`POST /api/accounts` creates an `iam:account:{uuid}`, then uses `iamService.linkAccountToCharacter()` which:
1. Stores `account.characterId` pointer on the IAM account.
2. Creates a Rosetta Stone `ACCOUNT_CHARACTER` Link entity (`thegame:links:link:{id}`).
3. **Does not** create any duplicate character record.

### Rule 4 — Authentication Resolver
`authenticatePassphrase` and `authenticateEmailPassword` both:
1. Validate credentials against `iam:account:*`.
2. Call `resolveCharacterForAccount(accountId)`:
   - Fast path: `account.characterId` → `dsGetCharacterById()` from `thegame:data:character:*`.
   - Fallback: query `ACCOUNT_CHARACTER` link in Rosetta Stone → fetch target character from DS.
3. Pack the DS character's roles into the JWT.

### Rule 5 — Single Source of Truth for Players
Players live **only** in the Game Data-Store: `thegame:data:player:{uuid}`.
IAM never writes `iam:player:*` or `iam:index:players`.

After `linkAccountToCharacter`, if the character is eligible (PLAYER, FOUNDER, or TEAM role), `ensureDataStorePlayerForLinkedCharacter`:
1. Reuses an existing DS player if `character.playerId` or `CHARACTER_PLAYER` / `PLAYER_CHARACTER` links already resolve one.
2. Otherwise creates a DS `Player` via `upsertPlayer`, sets `character.playerId`, and creates **CHARACTER_PLAYER** + **PLAYER_CHARACTER** Rosetta links.
3. Sets optional **`account.playerId`** on the IAM account for UI convenience only (not a second player store).

**Intentionally not used for IAM:** `ACCOUNT_PLAYER` — IAM accounts are not `thegame:data:account` rows, so that link type is reserved for legacy Triforce / DS-only account entities.

---

## Key Files

| Concern | File |
|---------|------|
| IAM Service (accounts + auth) | `lib/iam-service.ts` |
| IAM key patterns | `lib/keys.ts` |
| Account Modal (UI) | `components/modals/account-modal.tsx` |
| Accounts API (client-facing) | `app/api/accounts/route.ts`, `app/api/accounts/[id]/route.ts` |
| Admin Accounts API | `app/api/admin/accounts/route.ts` |
| Characters API (DS + filter) | `app/api/characters/route.ts` |
| IAM Console snapshot | `app/api/admin/iam/route.ts` |
| IAM Repair (founder re-link) | `app/api/admin/iam-repair/route.ts` |
| Rosetta Stone Links | `links/link-registry.ts`, `links/link-validation.ts` |
| DS Character repo | `data-store/repositories/character.repo.ts` |
| DS Player repo | `data-store/repositories/player.repo.ts` |
| Client API | `lib/client-api.ts` |

---

## Deleted Concepts

- `iam:character:{uuid}` keys — no longer written or read.
- `iam:index:characters` set — removed from `lib/keys.ts`.
- `buildCharacterKey` — removed from `lib/keys.ts`.
- `IAMService.createCharacter()` — deleted.
- `IAMService.listCharacters()` — deleted.
- `IAMService.getCharacterById()` — deleted (was reading `iam:character:*`).
- `IAMService.getCharacterByAccountId()` — replaced by `resolveCharacterForAccount()` which follows links.
- `IAMService.assignCharacterToAccount()` — replaced by `linkAccountToCharacter()`.
- `IAMService.assignCharacterRoles()` — deleted (roles live on DS character, not IAM).
- `IAMService.hydrateCharactersFromDataStore()` — deleted (no IAM characters to hydrate).
- Private IAM `createLink()` method (wrote to `iam:link:*`) — replaced by Rosetta Stone `createLink()`.
- `iam:player:{uuid}` keys — no longer written or read.
- `iam:index:players` and `buildPlayerKey` — removed from `lib/keys.ts`.
- `IAMService.createPlayer()` (IAM duplicate) — replaced by DS `upsertPlayer` inside `ensureDataStorePlayerForLinkedCharacter`.

---

## Genesis / Repair

`GET /api/admin/iam-repair?passphrase=KEY` (or POST with body):

- **Repair:** If `iam:index:accounts` already has rows, it picks the founder (passphrase flag / single account), then links to the DS founder character.
- **Genesis:** If there are **no** IAM accounts, it **creates** the founder IAM account (requires **`FOUNDER_EMAIL`** in env; optional **`FOUNDER_DISPLAY_NAME`**, default `Founder`), sets `passphraseFlag: true`, verifies the account, then runs the same character link.
- If IAM is empty and `FOUNDER_EMAIL` is missing, returns **500** with a clear message (so you don’t “repair” into a dead end).

After Genesis, use **passphrase** login or set email/password in Admin → Accounts.

---

*Updated after architecture mandate implementation.*
