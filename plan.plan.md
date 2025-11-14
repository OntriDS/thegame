# J$ Monetary System & Player Architecture - Unified Implementation Plan

## Executive Summary

This plan addresses foundational issues in the player points and J$ currency systems. We will migrate J$ storage to a ledger-based FinancialRecord system, refine the Player Modal UI for clarity, and ensure accurate points display. All phases are to be implemented today, step-by-step, to avoid mistakes.

**Key Principles:**
- Use **J$** terminology (not "jungleCoins" except in code where $ symbol cannot be used)
- Preserve existing Player Modal structure (footer and third tab are correct)
- Use existing FinancialRecord structure (no new subtypes needed)
- All phases implemented today in sequential order

---

## Part 1: Current State Analysis

### What's Already Implemented ✅

1. **Points Exchange Flow**: 
   - `createFinancialRecordFromPointsExchange()` function exists (workflows/financial-record-utils.ts:334-407)
   - Currently creates FinancialRecord with `type: 'personal'`, `station: 'Other P'` ❌ NEEDS UPDATE
   - Should use `station: 'Rewards'` for Points → J$ exchange
   - Creates PLAYER_FINREC link with metadata
   - API route `/api/player/exchange-points` operational

2. **Player Modal Structure**:
   - 3-tab layout: State | Stats | Progression
   - Footer with action buttons (correct - preserve this)
   - Third tab (Progression) is correct - preserve this
   - Parallel data fetching already implemented (Promise.all)

3. **J$ Balance Calculation**:
   - `getPlayerJungleCoinsBalance()` API function exists
   - Player Stats tab already shows J$ from FinancialRecord (line 131)
   - Player Modal already fetches J$ balance from FinancialRecord (line 86-91)

4. **Points Display**:
   - State tab shows "Available Points" and "Lifetime Earned"
   - Stats tab shows lifetime points with available points below

### What Needs to Be Fixed ❌

1. **Data Migration**:
   - Existing J$ in `Player.jungleCoins` field needs migration to FinancialRecord
   - Existing J$ in `Character.personalAssets.personalJ$` needs migration to FinancialRecord
   - These fields still used as fallback in UI (player-stats-tab.tsx:131)

2. **Terminology Consistency**:
   - Code uses `jungleCoins` field name (acceptable for code)
   - UI should use "J$" terminology consistently
   - Some UI still references "Jungle Coins" instead of "J$"

3. **Points Labels**:
   - State tab title says "Current Points (Uncollected)" - confusing
   - Should clearly say "Available Points" vs "Lifetime Earned"

4. **J$ → USD Cash-Out**:
   - Not yet implemented (Phase 2)

---

## Part 2: Core Architecture

### 2.1 J$ Lifecycle Model

**Complete Lifecycle:**

1. **Mint / Allocation (Points → J$)** ✅ IMPLEMENTED
   - Player converts points into J$
   - Company does NOT pay USD yet
   - Creates personal FinancialRecord with:
     - `type: 'personal'`
     - `station: 'Rewards'` (Personal station for Points → J$ exchange)
     - `jungleCoins: +amount`, `cost: 0`
   - Metadata: `exchangeType: 'POINTS_TO_J$'`

2. **Holdings / Governance** ✅ IMPLEMENTED
   - Player holds J$ in FinancialRecord ledger
   - Balance calculated by summing `jungleCoins` from personal FinancialRecords
   - Linked via PLAYER_FINREC

3. **Buyback / Cash-Out (J$ → USD)** ❌ NOT YET IMPLEMENTED
   - Player cashes out J$ for USD
   - Company pays actual USD (true cost)
   - Creates two FinancialRecords:
     - Personal: `type: 'personal'`, `station: 'Earnings'`, `jungleCoins: -amount`, `cost: 0`, `revenue: 0`
     - Company: `type: 'company'`, `station: 'Founder'` or `'Team'` (based on character role), `jungleCoins: +amount`, `cost: usdPaid`, `revenue: 0`
   - Metadata: `exchangeType: 'J$_TO_USD'`

4. **Alternative Cash-Out (J$ → Zaps)** ❌ NOT YET IMPLEMENTED (Future)
   - Player cashes out J$ for Bitcoin Zaps (sats)
   - Similar structure to USD cash-out but with different exchange rate
   - Personal: `station: 'Earnings'` (same as USD cash-out)
   - Company: `station: 'Founder'` or `'Team'` (based on character role)
   - Metadata: `exchangeType: 'J$_TO_ZAPS'`

### 2.2 Data Model (Using Existing Architecture)

**FinancialRecord Structure** (NO CHANGES NEEDED):
- `type: 'company' | 'personal'` - company vs personal perspective
- `station: Station` - Personal: `'Rewards'` (Points → J$), `'Earnings'` (J$ → USD/Zaps) | Company: `'Founder'` (Founder role), `'Team'` (Team role)
- `jungleCoins: number` - J$ delta (positive or negative)
- `cost: number` - real USD cost (company only, at cash-out)
- `revenue: number` - optional future flows
- `rewards.points` - when points are consumed to mint J$
- Link metadata: `exchangeType: 'POINTS_TO_J$' | 'J$_TO_USD' | 'J$_TO_ZAPS'`

**Links**:
- `PLAYER_FINREC` - Player ↔ FinancialRecord (already implemented)
- Optional: `CHARACTER_FINREC` - Character ↔ FinancialRecord (future)

**Balance Queries**:
- **Player J$ balance**: Sum `jungleCoins` from all personal FinancialRecords linked via PLAYER_FINREC
- **Company J$ cost in USD**: Sum `cost` from company records with `exchangeType: 'J$_TO_USD'`
- **Company J$ treasury**: `TotalMintedJ$ - TotalPlayerHoldingsJ$` (analytics, not required for v0.1)

---

## Part 3: Implementation Phases

### Phase 0: Agreement & Station Naming ✅ COMPLETE

**Decisions Confirmed:**
- ✅ Points → J$ → USD lifecycle model confirmed
- ✅ Points → J$ → Zaps lifecycle model confirmed (future implementation)
- ✅ Station names confirmed:
  - **Personal J$ records**:
    - `'Rewards'` - for Points → J$ exchange
    - `'Earnings'` - for J$ → USD or J$ → Zaps cash-out
  - **Company J$ buyback records**:
    - `'Founder'` - for Founder Role characters ✅ IMPLEMENTED
    - `'Team'` - for Team Role characters ✅ IMPLEMENTED

**Status**: ✅ Complete - Ready to proceed with implementation

---

### Phase 1: Data Migration & Clean J$ Ledger ✅ NOT NEEDED

**Goal**: Migrate existing J$ balances to FinancialRecord ledger, remove redundant fields as source of truth

**VERIFICATION RESULTS:**
- ✅ `Player.jungleCoins` field **DOES NOT EXIST** in `types/entities.ts` (removed from type definition)
- ✅ `Character.personalAssets.personalJ$` field **DOES NOT EXIST** in `types/entities.ts` (never existed in Character type)
- ✅ User confirmed: "I haven't exchanged any points for J$ yet in the system"
- ✅ User confirmed: "There is only one player, Player One, the Founder, me"
- ✅ System was rebuilt this month - no legacy data to migrate

**NOTE:** `personalAssets.personalJ$` exists as a **separate KV storage system** (not part of Player/Character entities), but:
- It's used in Finances page for display
- It's not the source of truth for J$ (FinancialRecord is)
- No migration needed since user hasn't used the system yet

#### 1.1 Migration Script
- ✅ **NOT NEEDED** - No fields exist to migrate from, no data to migrate

#### 1.2 Update Balance Calculation
- ✅ **COMPLETE** - `app/api/player/[id]/jungle-coins/route.ts` only uses FinancialRecord ledger
- ✅ **COMPLETE** - No fallback to `Player.jungleCoins` (field doesn't exist)
- ✅ **COMPLETE** - All UI components now use FinancialRecord balance via `ClientAPI.getPlayerJungleCoinsBalance()`
  - `app/admin/finances/page.tsx` - Updated to fetch and display J$ from FinancialRecord
  - `app/admin/player/page.tsx` - Updated to fetch and display J$ from FinancialRecord
  - ✅ **COMPLETE** - `workflows/entities-workflows/task.workflow.ts` no longer modifies `personalAssets.personalJ$` (J$ is only created via explicit exchange, not from task rewards)

#### 1.3 UI Updates
- ✅ **COMPLETE** - `player-stats-tab.tsx` uses `jungleCoinsBalance` from FinancialRecord
- ✅ **COMPLETE** - `player-modal.tsx` removed fallback logic
- ✅ **COMPLETE** - Finances page now uses FinancialRecord balance

#### 1.4 Cleanup
- ✅ **COMPLETE** - `Player.jungleCoins` field removed from type (not deprecated, fully removed)
- ✅ **COMPLETE** - `Character.personalAssets.personalJ$` never existed in type

**Status**: ✅ **COMPLETE** - No migration needed, system is clean

---

### Phase 2: Points Exchange Refinement

**Goal**: Ensure points exchange flow is clean and uses FinancialRecord correctly

#### 2.1 Update Exchange Flow ✅ COMPLETE
- ✅ `createFinancialRecordFromPointsExchange()` matches spec:
  - ✅ Creates personal FinancialRecord (line 357: `type: 'personal'`)
  - ✅ Uses `station: 'Rewards'` from BUSINESS_STRUCTURE.PERSONAL (lines 346-348, verified in types/enums.ts line 15)
  - ✅ Sets `jungleCoins: +j$Received` (line 361: `jungleCoins: j$Received`)
  - ✅ Sets `rewards.points` with negative values (lines 366-369: all points are negative)
  - ✅ Creates PLAYER_FINREC link (lines 393-400: LinkType.PLAYER_FINREC)
  - ✅ Metadata includes `exchangeType: 'POINTS_TO_J$'` (line 388)

#### 2.2 Remove Backward Compatibility Code ✅ COMPLETE
- ✅ No `personalAssets.personalJ$` update in player-modal.tsx (verified: lines 300-347, grep found no matches)
- ✅ No `ClientAPI.savePersonalAssets()` call (verified: grep found no matches in player-modal.tsx)
- ✅ Exchange flow ONLY creates FinancialRecord and updates player.points:
  - Line 317-322: Calls `ClientAPI.exchangePointsForJungleCoins()` (creates FinancialRecord)
  - Lines 304-309: Updates player.points locally
  - Line 325: Saves player with updated points
  - Lines 328-333: Reloads J$ balance from FinancialRecord (not from personalAssets)

#### 2.3 Points Display Clarity ✅ COMPLETE
- ✅ player-state-tab.tsx: All labels updated and clear
  - ✅ Line 81 (PlayerStateContent component): "Available Points"
  - ✅ Lines 104, 110 (PlayerStateContent): "Available Points:" and "Lifetime Earned:" are clear
  - ✅ Line 210 (PlayerStateTab Dialog CardTitle): Fixed to "Available Points"
  - ✅ Lines 230, 236 (PlayerStateTab Dialog): "Available Points:" and "Lifetime Earned:" are clear
- ✅ player-stats-tab.tsx labels are correct:
  - Line 104: "Lifetime Points Earned:" (clear)
  - Line 110: "Currently Available:" (clear)

**Status**: ✅ COMPLETE

---

### Phase 3: J$ → USD Cash-Out Implementation

**Goal**: Implement buyback flow where company pays USD for J$

#### 3.1 Cash-Out Function ✅ COMPLETE
- ✅ `createFinancialRecordFromJ$CashOut()` exists in workflows/financial-record-utils.ts (line 417)
- ✅ Function implementation matches spec:
  - ✅ Accepts: `playerId`, `playerCharacterId`, `j$Sold`, `j$Rate` (default 10), `cashOutType: 'USD' | 'ZAPS'`, `zapsRate?` (optional) (lines 417-423)
  - ✅ Determines company station based on character role (lines 428-451):
    - ✅ If character has `Founder` role → `station: 'Founder'` (lines 432-435)
    - ✅ If character has `Team` role → `station: 'Team'` (lines 436-439)
    - ✅ Defaults to `'Founder'` if role not found (lines 441-444, 447-450)
  - ✅ Calculates payment amount (lines 453-484):
    - ✅ For USD: `amountPaid = j$Sold * j$Rate` (line 459)
    - ✅ For Zaps: Calculates from real Bitcoin price (lines 462-483, requires real price, no fallback)
  - ✅ Creates personal FinancialRecord (lines 494-515):
    - ✅ `type: 'personal'` (line 502)
    - ✅ `station: 'Earnings'` from BUSINESS_STRUCTURE.PERSONAL (lines 490-492, 501)
    - ✅ `jungleCoins: -j$Sold` (line 506)
    - ✅ `cost: 0`, `revenue: 0` (lines 504-505)
    - ✅ Link metadata includes `exchangeType: 'J$_TO_USD'` or `'J$_TO_ZAPS'` (lines 487, 551)
  - ✅ Creates company FinancialRecord (lines 517-538):
    - ✅ `type: 'company'` (line 525)
    - ✅ `station: 'Founder'` or `'Team'` based on character role (line 524)
    - ✅ `jungleCoins: +j$Sold` (line 529)
    - ✅ `cost: amountPaid` for USD, `0` for Zaps (line 527)
    - ✅ `revenue: 0` (line 528)
    - ✅ Link metadata includes `exchangeType`, `playerCharacterId`, `companyStation` (lines 563-573)
  - ✅ Creates PLAYER_FINREC links for both records (lines 556-583)

#### 3.2 API Route ✅ COMPLETE
- ✅ `/app/api/player/cash-out-j$/route.ts` exists (line 1)
- ✅ Protected with `requireAdminAuth` (line 37)
- ✅ Accepts: `{ playerId, playerCharacterId, j$Sold, j$Rate?` (default 10), `cashOutType: 'USD' | 'ZAPS'`, `zapsRate?` (optional) (lines 43-50)
- ✅ Validates player has sufficient J$ balance (lines 68-76):
  - Uses `getPlayerJ$Balance()` helper function (lines 17-34)
  - Sums only personal FinancialRecords (fixed to match balance calculation pattern)
  - Returns error if `j$Sold > currentBalance`
- ✅ Character role determination: Handled by `createFinancialRecordFromJ$CashOut()` workflow function (not in API route - correct separation of concerns)
- ✅ Calls cash-out function (line 79): `createFinancialRecordFromJ$CashOut()` with all required parameters
- ✅ Returns success with both FinancialRecords (lines 89-94): `{ success, personalRecord, companyRecord, message }`

#### 3.3 UI Component ✅ COMPLETE
- ✅ Cash-out modal exists: `components/modals/submodals/cash-out-j$-submodal.tsx` (lines 1-262)
- ✅ ClientAPI method exists: `cashOutJ$` in `lib/client-api.ts` (lines 475-500)
- ✅ Integrated into Player Modal: `components/modals/player-modal.tsx` (lines 21, 42, 247-256, 362-392)
- ✅ All required features implemented:
  - ✅ Shows current J$ balance (lines 135-149 in cash-out modal)
  - ✅ Input for J$ amount to cash out (lines 151-175, NumericInput with max validation)
  - ✅ Select cash-out type (USD/Zaps) (lines 177-203, button selection)
  - ✅ Displays USD/Zaps equivalent (lines 94-97, 220-230, preview section)
  - ✅ Shows company station (Founder/Team) (lines 40-50, 234-238, determined from character role)
  - ✅ Submits to `/api/player/cash-out-j$` route (lines 372-379 in player-modal.tsx)
  - ✅ Refreshes balance after success (lines 380-382 in player-modal.tsx)

#### 3.4 Admin Tooling ✅ COMPLETE
- ✅ API endpoint created: `app/api/company/j$-treasury/route.ts` (lines 1-112)
- ✅ ClientAPI method added: `getCompanyJ$Treasury` in `lib/client-api.ts` (lines 502-522)
- ✅ Treasury display added to Finances page: `app/admin/finances/page.tsx`
  - ✅ State management: `treasuryData` state (line 166)
  - ✅ Data loading: Called in `loadAssets()` (lines 344-351)
  - ✅ Treasury card display (lines 760-820):
    - ✅ Shows total J$ bought back (line 777)
    - ✅ Shows total USD spent (line 783)
    - ✅ Shows transaction count (line 788)
    - ✅ Historical buyback list (lines 791-817):
      - ✅ Date, J$ amount, USD/Zaps cost
      - ✅ Cash-out type (USD/Zaps)
      - ✅ Station (Founder/Team)
      - ✅ Sorted by date (newest first, handled in API)

---

### Phase 4: Player Modal Refinement

**Goal**: Improve UI clarity while preserving existing structure

#### 4.1 Preserve Existing Structure ✅ COMPLETE
- ✅ Footer buttons layout preserved (verified: lines 196-258 in player-modal.tsx)
- ✅ Third tab (Progression) content preserved (verified: tab structure intact)
- ✅ Tab structure (State | Stats | Progression) preserved (verified: lines 154-193 in player-modal.tsx)
- ✅ Parallel data fetching verified (lines 77-94 in player-modal.tsx: Promise.all for characters, assets, j$Balance)

#### 4.2 Points Display Improvements ✅ COMPLETE
- ✅ State tab: Title already says "Available Points" (verified: line 81 in player-state-tab.tsx)
- ✅ Dialog version also says "Available Points" (verified: line 210 in player-state-tab.tsx)
- ✅ "Available Points" vs "Lifetime Earned" distinction is clear:
  - "Available Points" shows current unspent points (lines 81, 104, 210, 230 in player-state-tab.tsx)
  - "Lifetime Earned" shows total points ever earned (lines 110, 236 in player-state-tab.tsx)
- **Note**: Tooltips not added - distinction is already clear from labels

#### 4.3 J$ Display Improvements ✅ COMPLETE
- ✅ Stats tab: Labeled "Current J$ (from Financial Records)" (verified: line 133 in player-stats-tab.tsx)
- ✅ USD equivalent clearly shown (verified: lines 137-139 in player-stats-tab.tsx)
- ⚠️ Link to transaction history: Not implemented (marked as future in plan)

#### 4.4 Terminology Updates ✅ COMPLETE
- ✅ Updated `character-modal.tsx`: "Jungle Coins (J$)" → "J$" (verified: line 439)
- ✅ Updated `conversion-rates-submodal.tsx`: "Jungle Coins" → "J$" (verified: line 75)
- ✅ Updated `player-character-submodal.tsx`: Removed J$ display (Character entity no longer has jungleCoins field)
- ✅ Updated `assets-edit-submodal.tsx`: "Jungle Coins" → "J$" (verified: line 442)
- ✅ Code variable names using `jungleCoins` preserved (acceptable per plan)
- ✅ Only remaining "Jungle Coins" reference is in console.error message (code/logging, not UI)

---

### Phase 5: Multi-Player Foundation & Transaction History ✅ COMPLETE

**Goal**: Ensure architecture supports multiple players and provide transaction history transparency

#### 5.1 Verify Multi-Player Readiness ✅ COMPLETE
- ✅ **PLAYER_FINREC links work for any playerId**: Verified
  - All API routes use `getLinksFor({ type: EntityType.PLAYER, id: playerId })` (player-specific query)
  - Links created in `createFinancialRecordFromPointsExchange()` (line 393-398 in workflows/financial-record-utils.ts)
  - Links created in `createFinancialRecordFromJ$CashOut()` (line 557-561, 576-580 in workflows/financial-record-utils.ts)
  - Source entity is always PLAYER with specific playerId, ensuring player isolation
- ✅ **Balance calculation is player-specific**: Verified
  - `app/api/player/[id]/jungle-coins/route.ts`: Uses `getLinksFor` with specific playerId (line 32)
  - `app/api/player/cash-out-j$/route.ts`: `getPlayerJ$Balance` function uses specific playerId (line 18)
  - Only sums `personal` FinancialRecords linked to that specific player
  - No cross-player balance contamination
- ✅ **No global/shared J$ balances**: Verified
  - No hardcoded player IDs found in balance calculations
  - All API routes accept playerId as parameter
  - UI components fetch balance for specific player (player-modal.tsx, finances/page.tsx)

#### 5.2 Transaction History Link ✅ COMPLETE
- ✅ **API Endpoint**: `app/api/player/[id]/financial-records/route.ts` (lines 1-79)
  - Fetches all PLAYER_FINREC links for the player
  - Returns personal FinancialRecords with exchangeType metadata
  - Sorted by date (newest first)
- ✅ **ClientAPI Method**: `getPlayerFinancialRecords` in `lib/client-api.ts` (lines 524-528)
- ✅ **Transaction History Modal**: `components/modals/submodals/player-j$-transactions-submodal.tsx` (lines 1-153)
  - Displays all J$ transactions for the player
  - Shows transaction type (Points → J$, J$ → USD, J$ → Zaps)
  - Shows J$ amount with color coding (green for earned, red for spent)
  - Shows running balance after each transaction
  - Displays date, description, and station
- ✅ **UI Integration**: 
  - "View History" link added to PlayerStatsTab (lines 137-145, 286-294 in player-stats-tab.tsx)
  - Integrated into PlayerModal (lines 43, 187, 397-404 in player-modal.tsx)

#### 5.3 Character Financial Records (Optional) ⚠️ NOT IMPLEMENTED
- ⚠️ **CHARACTER_FINREC links**: Not implemented
  - Link type exists in enum (`types/enums.ts` line 590)
  - FinancialRecords store `playerCharacterId` as a field (not as a link)
  - No CHARACTER_FINREC links are created for J$ transactions
  - **Status**: Optional feature, not required for v0.1, can be added later if needed

**Status**: ✅ Multi-player ready and transaction history complete

---

### Phase 6: Testing & Validation

**Goal**: Ensure data integrity and correct behavior

#### 6.1 Migration Testing
- [ ] Test migration script with sample data
- [ ] Verify balances match before/after migration
- [ ] Verify links created correctly
- [ ] Test rollback procedure if needed

#### 6.2 Exchange Flow Testing
- [ ] Test points → J$ exchange
- [ ] Verify FinancialRecord created correctly
- [ ] Verify player.points updated correctly
- [ ] Verify J$ balance updates immediately

#### 6.3 Cash-Out Testing (Phase 3)
- [ ] Test J$ → USD cash-out
- [ ] Verify both FinancialRecords created
- [ ] Verify company cost tracked correctly
- [ ] Verify player balance decreases

#### 6.4 UI Testing
- [ ] Verify all J$ displays use FinancialRecord balance
- [ ] Verify points labels are clear
- [ ] Test modal performance with parallel fetching

**Status**: To be done after each phase

---

## Part 4: Implementation Order

**Critical Path (Sequential Execution):**

1. **Phase 0** (5 min): Confirm station naming for company buybacks
2. **Phase 1** (30 min): Data migration script + balance calculation updates
3. **Phase 2** (15 min): Points exchange cleanup + UI label fixes
4. **Phase 3** (45 min): J$ → USD cash-out implementation
5. **Phase 4** (20 min): Player Modal refinements
6. **Phase 6** (30 min): Testing after each phase

**Total Estimated Time**: ~2.5 hours

---

## Part 5: Key Decisions & Notes

### Terminology
- **User-facing**: Always use "J$" (not "Jungle Coins")
- **Code fields**: `jungleCoins` is acceptable (can't use $ in variable names)
- **Comments**: Use "J$" in comments and documentation

### Station Names ✅ CONFIRMED
- **Personal J$**:
  - `'Rewards'` - for Points → J$ exchange
  - `'Earnings'` - for J$ → USD or J$ → Zaps cash-out
- **Company J$ buyback**:
  - `'Founder'` - for Founder Role characters (already implemented) ✅
  - `'Team'` - for Team Role characters (not implemented yet)

### FinancialRecord Structure
- **NO new subtypes needed** - use existing `type: 'company' | 'personal'`
- **NO new enum values** - use existing Station enum
- **Metadata in link** - use link metadata for `exchangeType`

### Player Modal
- **Preserve footer** - current button layout is correct
- **Preserve third tab** - Progression tab content is correct
- **Refine, don't rebuild** - improve labels and clarity, keep structure

### Future Phases (Not Today)
- Ownership/Governance features
- Bitcoin Zaps alternative cash-out (J$ → Zaps flow defined but not implemented)
- Team Role support for company station (currently only Founder implemented)
- Character-specific J$ tracking (CHARACTER_FINREC)

---

## Part 6: Success Criteria

### Phase 1 Complete When:
- ✅ All existing J$ balances migrated to FinancialRecord
- ✅ Balance calculation uses FinancialRecord only
- ✅ No fallback to Player.jungleCoins or personalAssets.personalJ$

### Phase 2 Complete When:
- ✅ Points exchange creates FinancialRecord correctly
- ✅ No backward compatibility code for personalAssets
- ✅ UI labels clearly distinguish available vs lifetime points

### Phase 3 Complete When:
- ✅ Cash-out function creates both FinancialRecords
- ✅ Company USD cost tracked correctly
- ✅ UI allows cash-out with balance validation

### Phase 4 Complete When:
- ✅ Player Modal labels improved
- ✅ All "Jungle Coins" → "J$" in UI
- ✅ Structure preserved (footer, tabs)

### Overall Success:
- ✅ Single source of truth for J$ (FinancialRecord ledger)
- ✅ Clear separation: Points (progression) vs J$ (financial)
- ✅ Multi-player ready architecture
- ✅ Clean, maintainable code

---

## Appendix: Code References

### Key Files to Modify:
- `scripts/migrations/migrate-j$-to-financial-records.ts` (NEW)
- `workflows/financial-record-utils.ts` (UPDATE exchange function station to 'Rewards', ADD cash-out function)
- `app/api/player/cash-out-j$/route.ts` (NEW)
- `components/modals/player-modal.tsx` (CLEANUP exchange flow)
- `components/modals/modals-tabs/player-state-tab.tsx` (LABEL updates)
- `components/modals/modals-tabs/player-stats-tab.tsx` (REMOVE fallback)
- `lib/client-api.ts` (VERIFY balance function)

### Key Files Already Correct:
- `workflows/financial-record-utils.ts:334-407` (exchange function) ✅
- `app/api/player/exchange-points/route.ts` ✅
- `components/modals/modals-tabs/player-progression-tab.tsx` ✅ (preserve)
