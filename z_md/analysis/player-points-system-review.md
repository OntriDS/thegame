# Player, Character & Points System – Findings (2025-11-11)

## Executive Summary
- Points awarded from tasks, financial records, and sales never reach non-founder players. Workflows forward the **character id** (`playerCharacterId`) into `awardPointsToPlayer`, but that helper expects a **player id** and silently exits when the lookup fails. Net effect: only `PLAYER_ONE_ID` ever gains points.
- The points delta reconciler (`updatePlayerPointsFromSource`) hardcodes `PLAYER_ONE_ID`, so edits to any other player’s rewards do nothing.
- UI surfaces lifetime stats using the *spendable* `points` field instead of `totalPoints`, understating historical progress after exchanges/spends. Player log entries echo the same mismatch.
- Player modal UX assumes exactly one linked character, hides `totalPoints`, and shows outdated conversions; character view renders inconsistent currency data because Jungle Coins live in both personal assets and the player entity.

## Detailed Findings
### 1. Workflow → Player Mapping Breaks for Multi-Character Players
- Task completion, financial record creation, and charged sales call:
  - `workflows/entities-workflows/task.workflow.ts` → `awardPointsToPlayer(task.rewards.points, task.playerCharacterId, ...)`
  - `workflows/entities-workflows/financial.workflow.ts` (lines 85-103)
  - `workflows/entities-workflows/sale.workflow.ts` (lines 110-121)
- `awardPointsToPlayer` (`workflows/points-rewards-utils.ts`, lines 16-104) immediately does `getPlayerById(playerId)`. Passing a character id returns `null`, so the helper logs and returns without side effects.
- Result: any task/record/sale linked to a character whose id differs from its parent player never awards points, doesn’t log, and no link is created.

#### COMPARE: Proposed vs Reality (Problem 1)
| Aspect | Reality | Proposed | Implemented |
|---|---|---|---|
| ID passed into award | `playerCharacterId` (character id) | Accept either id; resolve to player | ✅ `resolveToPlayerIdMaybeCharacter()` in `workflows/points-rewards-utils.ts` |
| Lookup behavior | Fails `getPlayerById` and exits | If not a player, map character → `character.playerId`; fallback to founder | ✅ `awardPointsToPlayer` now resolves before applying |
| Delta updater source | Hardcoded `PLAYER_ONE_ID` | Resolve from `playerCharacterId` when present | ✅ `updatePlayerPointsFromSource` now resolves via helper |

Status: FIXED. Both immediate awarding and delta reconciliation now resolve character ids to the correct player id, with safe fallback to `PLAYER_ONE_ID`.

### 2. Delta Updater Reinforces the Founder-Only Path
- `updatePlayerPointsFromSource` (`workflows/update-propagation-utils.ts`, lines 481-586) always uses `const playerId = PLAYER_ONE_ID;`.
- Even if we fix the direct awarding path, edits (e.g. changing task rewards) will continue to ignore other players, so reconciliation stays wrong.

Status: FIXED. The updater now derives a candidate from `source.playerCharacterId` (new or old), then resolves to the actual player id using the shared helper.

### 3. Metrics & Log Drift
- Player modal tabs (`components/modals/modals-tabs/player-state-tab.tsx` & `player-stats-tab.tsx`) label “All Points Ever Earned” but sum `playerData.points`, i.e. the *current spendable* balance.
- Player log “points changed” entry (`workflows/entities-logging.ts`, lines 194-213) writes the spendable `points` to the description instead of `totalPoints`.
- Exchange modal updates `personalAssets.personalJ$`, but `player.jungleCoins` remains untouched. The character dashboard pulls from personal assets while the player entity still shows zero.

### 4. Player Modal / Character UX Gaps
- `PlayerModal` only passes `characters[0]` to the Character submodal (`components/modals/player-modal.tsx`, lines 260-264). Additional player characters are invisible in this flow.
- Tabs render placeholders (level 0, empty achievements) because real progression fields (`totalPoints`, level) never update beyond Player One due to the mapping bug.
- Data fetch sequence fires three serial API calls, so the modal stays in “Loading” longer than necessary.

## Recommended Fixes
1. Resolve `playerCharacterId` → `character.playerId` (with fallback) before calling `awardPointsToPlayer` in task/financial/sale workflows; log failures.
2. Update `updatePlayerPointsFromSource` to read `playerCharacterId` from the source entity or accept the correct player id and remove the `PLAYER_ONE_ID` constant.
3. Switch UI + logs to display lifetime totals from `totalPoints`, keep spendable points for “available” figures, and ensure exchange flows sync both player and personal assets.
4. In the Player modal, expose all linked characters (or state the limitation), pull data in parallel, and surface `totalPoints` + level sourced from corrected workflows.

## Next Steps
- Patch workflows & delta updater, then run regression tests around task, sale, and financial completion.
- Update Player modal tabs and logs once the backend yields correct totals.
- Reconcile Jungle Coin storage to a single source of truth (likely personal assets) and align the player entity accordingly.

