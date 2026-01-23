# Architecture Context

## Core Systems Architecture
**Production Flow**:
`ENUMS` → `ENTITIES` → `SECTIONS` (Parent UI) → `MODALS`
↓
`LINKS` ← `WORKFLOW` ← `LOGGING`
↓
`DATA-STORE` (Vercel KV)
↓
`APIs` → `MCP`
↓
`BROWSER`

## 1. The Rosetta Stone (Links System)
**Concept**: Transforms isolated entities into a coherent relationship network via explicit **Links**.
**Philosophy**: Entities don't just create other entities - they create **LINKS** to them.

### Molecular Pattern (The Mechanism)
The flow of creation follows a strict biological metaphor:
1.  **DNA (Entity)**: Self-contained data, cannot leave its "nucleus" (modal).
2.  **Diplomatic Fields**: Provide delivery addresses for context.
3.  **RNA (Links)**: Copy DNA instructions and carry them between entities.
4.  **Ribosome (Workflows)**: `processLinkEntity()` reads RNA and synthesizes new Entities/Links.

### Link Design Rules
- **Unidirectional Semantics**: Links have a Source and Target.
- **Bidirectional Querying**: `getLinksFor()` checks both sides.
- **Canonical Types**: Only create ONE link per relationship (e.g., `ITEM_CHARACTER` is canonical; do not create `CHARACTER_ITEM`).

## 2. Diplomatic Fields Pattern
Categorizes ALL entity fields based on safety and presence:

| Category | Icon | Definition | Data Presence | UI Safety | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Native** | 🧬 | Core properties (Identity) | **Always** | **Safe** | `task.name`, `item.price` |
| **Ambassador** | 🏛️ | Cross-entity references | **Always** (even null) | **Safe** | `task.cost`, `item.siteId` |
| **Emissary** | 📡 | Conditional creation fields | **Conditional** | **UNSAFE** (Modal only) | `task.outputItemType` |

**Rule**: "Parent UI" (Sections) must NEVER try to display Emissary fields.

## 3. Entity Purity & Logging
**Principle**: Each entity logs ONLY what defines it. relationships are handled **entirely** by the Links System.
- **No Side Effect Flags**: Workflows inspect entity properties (DNA), never manual flags like `isCompleting`.
- **Append-Only Logs**: All history is preserved.
- **Effects Registry**: Ensures idempotency (deduplication of side effects).

## 4. Systems Overview
- **Inventory System**: `stock[]` array is single source of truth. Smart Location System (Continent -> Country -> Region -> Settlement).
- **Authentication**: `jose` (JWT) based. Admin access via passphrase + cookie. Middleware protection on `/admin/*`.
- **Z-Index Management**:
  - `BASE (0)` -> `MODALS (100)` -> `INNER_MODALS (200)` -> `DROPDOWNS (500)` -> `CRITICAL (1000)`.
  - Always use `getInteractiveInnerModalZIndex()` for nested Shadcn components.
- **Smart Cache**: Automatic cache synchronization ensures immediate UI updates.

## 5. Security & Persistence
- **KV-Only**: Vercel KV is the single source of truth.
- **Anti-Patterns**:
  - Never call `ClientAPI` from server-side.
  - Never make HTTP calls to own API from server.
  - Never use `type="number"` (Use `NumericInput`).

## 6. Lifecycle States (Active vs Archived)
The system distinguishes between "Operational Completion" and "Accounting Completion".

### Active State (Operational)
Entities in this state appear in standard lists and views.
- **Status**: `CREATED`, `PENDING`, `IN_PROGRESS`, `DONE`, `SOLD`, `CHARGED`.
- **Behavior**: Operational actions (e.g. `DONE` task, `SOLD` item) keep the entity **ACTIVE**.
- **Data**: Stored in primary KV keys.

### Archived State (Accounting)
Entities move to this state via the **"Collected"** event (Monthly Close / Finalization).
- **Status/Flag**: `isCollected: true` OR `status: COLLECTED`.
- **Trigger**: Manual "Collect" action or Monthly Close workflow.
- **Action**:
    1.  **Snapshot**: A read-only copy is saved to `Archive` (e.g. `TaskSnapshot`).
    2.  **Indexing**: Added to `index:entities:collected:MM-YY`.
    3.  **Removal**: Filtered OUT of standard `getAll` queries.
- **Purpose**: Locks historical data for accounting/reporting while keeping operational views clean.

## 7. Economy System (Points vs J$)
Explicit separation between "Gamification Rewards" and "Financial Assets".

### Points (Gamification)
- **Nature**: Player Attribute (Stats).
- **Types**: `XP` (Work), `RP` (Research), `FP` (Family), `HP` (Health).
- **Source**: Awarded by Tasks, Sales, and Financial Records.
- **Storage**: `Player.points` (Accumulated on Player entity).
- **Value**: Symbolic performance metric.

### Jungle Coins / J$ (Currency)
- **Nature**: Financial Asset (Money).
- **Ratio**: 1 J$ = $10 USD.
- **Source**: Created **ONLY** via manual **Exchange** of Points.
- **Storage**:
    - **The Wallet**: `Character.jungleCoins` (Current Balance). The "Vault" that holds value.
    - **The Ledger**: `FinancialRecord` entries (History). The "Files" that track movement.
    - **Synchronization**: Transactions MUST update both atomically.
- **Flow**:
    1.  User accumulates Points.
    2.  User manually "Exchanges" Points.
    3.  System creates a `FinancialRecord` (Type: `Personal`, Category: `Exchange`, `jungleCoins`: +Amount).
    4.  J$ Balance increases based on ledger sum.
