# Reality Report: System Verification & Consistency
**Date**: 2026-01-13
**Track**: Consistency Audit
**Status**: Verified ✅

## 1. Lifecycle: Done vs Collected
The system implements a strik two-stage completion lifecycle.

### Stage A: Operational Completion ("Done")
- **Definition**: The work is finished, or the transaction is valid.
- **Statuses**:
    - **Tasks**: `TaskStatus.DONE`
    - **Sales**: `SaleStatus.CHARGED` (Both Paid & Charged)
    - **Financials**: `FinancialStatus.DONE` (Both Paid & Charged)
    - **Items**: `ItemStatus.SOLD`
- **Behavior**:
    - Entity remains **ACTIVE** in the database and UI lists.
    - Side effects (Points, Links, Item Creation) are triggered.
    - User can still interact/modify certain non-critical fields.

### Stage B: Accounting Completion ("Collected")
- **Definition**: The entity is closed for the accounting period (Monthly Close).
- **Triggers**:
    - Flag: `isCollected: true`
    - Status: `Status.COLLECTED`
    - Time: Usually end of month or manual "Collect" action.
- **Behavior**:
    1.  **Archiving**: A snapshot (e.g., `TaskSnapshot`) is created in the Archive Repo.
    2.  **Indexing**: Entity ID added to `index:[type]:collected:[mmyy]`.
    3.  **Hiding**: `getAll[Type]()` functions strictly filter out `isCollected` items.
    4.  **Locking**: Effectively becomes read-only history.

### Verification Status
- **Code**: `task.workflow.ts`, `sale.workflow.ts`, `financial.workflow.ts` all implement `isCollected` logic consistently.
- **Data Store**: `datastore.ts` queries consistently filter `!isCollected`.
- **Snapshots**: `snapshot-workflows.ts` correctly handles creation for all types.

## 2. Economy: Points vs Jungle Coins (J$)
The system enforces a strict strict separation between "Score" and "Money".

### Points (The Score)
- **Concept**: RPG Attributes representing effort in different life areas.
- **Types**: `XP`, `RP`, `FP`, `HP`.
- **Source**:
    - **Tasks**: Explicit rewards (`task.rewards`).
    - **Sales**: Calculated from Revenue ($100 Revenue = 1 Point, split across types).
    - **Financials**: Explicit rewards.
- **Storage**: **Entity Property**. Stored directly on `Player.points` and `Player.totalPoints`.
- **Link**: `TASK_PLAYER`, `SALE_PLAYER`, etc., link the *Source* to the *Player*.

### Jungle Coins / J$ (The Money)
- **Concept**: Exchangeable currency for in-game purchases (1 J$ = $10 USD).
- **Source**: **Explicit Exchange Only**. Points do NOT auto-convert.
- **Storage**: **Ledger Based**.
    - **NO** master `jungleCoins` field on Player/Character is the source of truth.
    - **Balance** = Sum of `jungleCoins` field in all `FinancialRecord`s linked to the Player (Type: `Personal`).
- **Exchange Mechanism**:
    - `app/api/player/[id]/jungle-coins/route.ts` calculates the balance dynamically.
    - **Inflow**: Exchange Points -> Creates `FinancialRecord` (Type: `Personal`, Category: `Exchange`, `jungleCoins`: +X).
    - **Outflow**: Purchase Asset -> Creates `FinancialRecord` (Type: `Personal`, Category: `Purchase`, `jungleCoins`: -X).

### Discrepancy Note
- `types/entities.ts` defines `Character.jungleCoins?: number`. This field appears to be a cache or frontend convenience. The **Real Truth** is the Financial Ledger (verified by API implementation).
- `Player` entity does NOT have a visible `jungleCoins` field in its interface, aligning with the "Ledger" philosophy.

## 3. Discrepancies & Resolutions
| Discrepancy | Reality | Action Taken |
| :--- | :--- | :--- |
| **Context Files** | Missing "Collected" and "Points/J$" details | **Updated `architecture.md`** to explicitly define Lifecycle States and Economy System. |
| **Character.jungleCoins** | Exists in Type, but API uses Ledger | Accepted as Cache/Legacy. **System Truth is Ledger**. No immediate code change needed, but aware for refactoring. |
| **Item Collection** | `item.workflow.ts` logs `COLLECTED` but didn't snapshot | `sale.workflow.ts` handles Item Snapshots when Sale is Collected. This is **Valid Design** (Items follow Sale lifecycle). |

## 4. Conclusion
The system implementation matches the core architectural principles, with "Collected" serving as the Archive gatekeeper and "Financial Records" serving as the J$ Source of Truth.
