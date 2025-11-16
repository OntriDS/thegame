<!-- d1e2d584-3e8d-44ba-a619-3b31885e7a32 b5739c72-398e-4e94-b143-946a0f79eb92 -->
# Active vs Archive Data Strategy Implementation

## Goal

Implement month-based filtering so "active data" = current month only, and historical months come from archive. Fix Finances page month selector and add month selector to Sales page.

## Current Issues Verified

1. **Archive System**: Creates snapshots but entities remain in active storage (verified in `sale.workflow.ts` lines 234, 284; `task.workflow.ts` line 184)
2. **Finances Page**: Month selector exists but filtering doesn't work correctly - shows November data when October selected (line 207-220 filters client-side after fetching ALL records)
3. **Sales Page**: No month selector at all (verified in `app/admin/sales/page.tsx`)
4. **Over-fetching (`getAll*`)**: Public API routes (`/api/tasks`, `/api/items`, `/api/financials`, `/api/sales`) call `getAllTasks()`, `getAllItems()`, `getAllFinancials()`, `getAllSales()` which scan the whole active data set (all months, only excluding `isCollected`). Finances currently filters by month on the client, Sales not at all. This wastes KV reads and bandwidth as data grows.

## Implementation Strategy

### Phase 1: Add Month Filtering to API Routes (Server-Side)

Status: IMPLEMENTED ✅ (Tasks, Items, Financials, Sales)

- All four routes now accept `month` (1-12) and `year` (YY or YYYY; normalized to YYYY).
- Default behavior returns the current month when params are omitted.
- Public routes no longer call `getAll*`; they call month-scoped helpers in `data-store/datastore.ts`.
- Items route preserves optional `type` filter, applied on top of the month scope.

**Files to Modify:**

- `app/api/financials/route.ts` - Add  `month` and `year` query params
- `app/api/sales/route.ts`      - Add  `month` and `year` query params  
- `app/api/tasks/route.ts`      - Add  `month` and `year` query params
- `app/api/items/route.ts`      - Add  `month` and `year` query params

**Performance rule for Phase 1 and beyond:**

- **Public API routes must not call `getAll*`** for Tasks/Items/Sales/Financials.
- Instead, they must call **month-scoped datastore helpers** that query by month/year (and id when needed).
- The existing `getAll*` functions stay only for:
  - Analytics/AI tools endpoints (explicit, infrequent heavy queries)
    - **Guardrails**: Analytics endpoints using `getAll*` should:
      - Be clearly labeled as heavy operations
      - Consider date range limits or result size caps for very large datasets
      - Be used infrequently (not in regular UI refresh cycles)
  - Internal workflows where full scans are absolutely neccesary (if present)

**Canonical Month Field Definition:**

Each entity type has a **single canonical date field** used consistently for month/year determination:

- **Tasks**: `collectedAt` (if present) → `doneAt` → `createdAt`
  - Month = month/year of `collectedAt` if task is Collected, else `doneAt` if Done, else `createdAt`
- **Sales**: `saleDate` (primary date for the sale transaction)
- **FinancialRecords**: `year`/`month` fields (already present on entity)
- **Items**: `createdAt` (for inventory items) or archive snapshot `createdAt` (for sold/collected items)
  - Active inventory items use `createdAt`
  - Sold items are archived as snapshots with their own date metadata

**New datastore helpers (Phase 1 - Filter After Load):**

Add functions in `data-store/datastore.ts` that filter after loading from repository:

```typescript
export async function getTasksForMonth(year: number, month: number): Promise<Task[]> {
  // Phase 1: Filter after load (acceptable for small datasets)
  // Future: Add month indexes at repository level for true KV scoping
  const tasks = await repoGetAllTasks();
  return tasks.filter(t => {
    const date = t.collectedAt || t.doneAt || t.createdAt;
    if (!date) return false;
    const taskYear = date.getFullYear();
    const taskMonth = date.getMonth() + 1;
    // Active tasks: same month AND not archived (isCollected = false OR same month)
    const isSameMonth = taskYear === year && taskMonth === month;
    const isNotArchived = !t.isCollected || (taskYear === year && taskMonth === month);
    return isSameMonth && isNotArchived;
  });
}

export async function getSalesForMonth(year: number, month: number): Promise<Sale[]> {
  const sales = await repoGetAllSales();
  return sales.filter(s => {
    const date = s.saleDate || s.createdAt;
    if (!date) return false;
    const saleYear = date.getFullYear();
    const saleMonth = date.getMonth() + 1;
    const isSameMonth = saleYear === year && saleMonth === month;
    const isNotArchived = !s.isCollected || (saleYear === year && saleMonth === month);
    return isSameMonth && isNotArchived;
  });
}

export async function getFinancialsForMonth(year: number, month: number): Promise<FinancialRecord[]> {
  const financials = await repoGetAllFinancials();
  return financials.filter(f => {
    // Use year/month fields directly (already on entity)
    const isSameMonth = f.year === year && f.month === month;
    const isNotArchived = !f.isCollected || (f.year === year && f.month === month);
    return isSameMonth && isNotArchived;
  });
}

export async function getItemsForMonth(year: number, month: number): Promise<Item[]> {
  const items = await repoGetAllItems();
  return items.filter(i => {
    const date = i.createdAt; // Active inventory items use createdAt
    if (!date) return false;
    const itemYear = date.getFullYear();
    const itemMonth = date.getMonth() + 1;
    const isSameMonth = itemYear === year && itemMonth === month;
    // Items are only archived as snapshots when sold, so active items stay visible
    return isSameMonth && !i.isCollected;
  });
}
```

**Note on Performance:**
- **Phase 1 Optimization** implementation uses "filter after load" pattern (loads all active entities, filters in memory): Add month-based indexes at repository level (`index:task:by-month:MM-YY`) for true KV scoping and better performance as data grows

**Implementation Pattern (Implemented):**

```typescript
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const monthParam = params.get('month');
  const yearParam  = params.get('year');

  const toYear = (y: string | null): number | null => {
    if (!y) return null;
    const n = parseInt(y, 10);
    if (isNaN(n)) return null;
    return n < 100 ? 2000 + n : n;
  };
  const toMonth = (m: string | null): number | null => {
    if (!m) return null;
    const n = parseInt(m, 10);
    return isNaN(n) || n < 1 || n > 12 ? null : n;
  };

  const month = toMonth(monthParam);
  const year  = toYear(yearParam);

  const now   = new Date();
  const y     = year  ?? now.getFullYear();
  const m     = month ?? (now.getMonth() + 1);

  // Example: tasks route
  const data = await getTasksForMonth(y, m);
  return NextResponse.json(data);
}
```

**For each entity type, use the appropriate helper:**
- `/api/tasks` → `getTasksForMonth(month, year)`
- `/api/sales` → `getSalesForMonth(month, year)`
- `/api/financials` → `getFinancialsForMonth(month, year)`
- `/api/items` → `getItemsForMonth(month, year)`

**Helper Functions Needed:**

- `getEntityMonth(entity)` - Extract month from entity's appropriate date field
- `getEntityYear(entity)` - Extract year from entity's appropriate date field  
- `isArchived(entity)` - Check if entity is archived (isCollected = true for different month)

### Phase 2: Update ClientAPI Methods

**Files to Modify:**

- `lib/client-api.ts`

**Changes:**

- Add optional `month` and `year` parameters to:
  - `getFinancialRecords(month?, year?)`
  - `getSales(month?, year?)`
  - `getTasks(month?, year?)`
  - `getItems(month?, year?)`

**Implementation:**

```typescript
getFinancialRecords: async (month?: number, year?: number): Promise<FinancialRecord[]> => {
  let url = '/api/financials';
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  if (params.toString()) url += `?${params.toString()}`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch financial records');
  return await res.json();
},
```

### Phase 3: Fix Finances Page Month Filtering

**File:** `app/admin/finances/page.tsx`

**Changes:**

- Line 207-220: Update `loadSummaries` to pass `currentMonth` and `currentYear` to `ClientAPI.getFinancialRecords()`
- Remove client-side filtering by month (move to server-side)
- Ensure month selector properly triggers reload with new month/year

**Fix:**

```typescript
const loadSummaries = useCallback(async () => {
  const records = await ClientAPI.getFinancialRecords(
    filterByMonth ? currentMonth : undefined,
    filterByMonth ? currentYear : undefined
  );
  
  const companyRecords = records.filter(r => r.type === 'company');
  const personalRecords = records.filter(r => r.type === 'personal');
  // ... rest of aggregation logic
}, [currentYear, currentMonth, filterByMonth]);
```

### Phase 4: Add Month Selector to Sales Page

**File:** `app/admin/sales/page.tsx`

**Changes:**

1. Import `MonthYearSelector` component (same as Finances page uses)
2. Add state for `currentYear` and `currentMonth`
3. Add `filterByMonth` toggle (default: true)
4. Update `loadSales` to pass month/year to `ClientAPI.getSales()`
5. Add MonthYearSelector UI component in header section (similar to Finances page lines 573-578)

**Implementation:**

- Add after line 28: `const [currentYear, setCurrentYear] = useState(new Date().getFullYear());`
- Add after line 28: `const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());`
- Add after line 28: `const [filterByMonth, setFilterByMonth] = useState(true);`
- Update `loadSales` function (line 54) to pass month/year
- Add MonthYearSelector in header section (around line 158)

### Phase 5: Define Active vs Archive Separation Logic

**Active Data Definition:**

- Entity's month/year matches selected month/year AND
- Entity is NOT archived (`isCollected = false` OR `isCollected = true` but same month)

**Archive Data Definition:**

- Entity's month/year is different from current month/year OR
- Entity is archived (`isCollected = true` from different month)

**Helper Function Locations:**

- `lib/utils/date-utils.ts` - Add entity date extraction helpers

**Functions (using canonical month fields):**

```typescript
export function getEntityMonth(entity: Task | Sale | FinancialRecord | Item): number {
  if ('year' in entity && 'month' in entity) {
    // FinancialRecord: use year/month fields directly
    return (entity as FinancialRecord).month;
  }
  if ('saleDate' in entity) {
    // Sale: use saleDate
    const date = (entity as Sale).saleDate || (entity as Sale).createdAt;
    return date ? date.getMonth() + 1 : new Date().getMonth() + 1;
  }
  if ('collectedAt' in entity || 'doneAt' in entity || 'createdAt' in entity) {
    // Task: collectedAt → doneAt → createdAt
    // Item: createdAt (for active inventory)
    const taskOrItem = entity as Task | Item;
    const date = taskOrItem.collectedAt || (taskOrItem as Task).doneAt || taskOrItem.createdAt;
    return date ? date.getMonth() + 1 : new Date().getMonth() + 1;
  }
  return new Date().getMonth() + 1; // Fallback
}

export function getEntityYear(entity: Task | Sale | FinancialRecord | Item): number {
  if ('year' in entity && 'month' in entity) {
    // FinancialRecord: use year/month fields directly
    return (entity as FinancialRecord).year;
  }
  if ('saleDate' in entity) {
    // Sale: use saleDate
    const date = (entity as Sale).saleDate || (entity as Sale).createdAt;
    return date ? date.getFullYear() : new Date().getFullYear();
  }
  if ('collectedAt' in entity || 'doneAt' in entity || 'createdAt' in entity) {
    // Task: collectedAt → doneAt → createdAt
    // Item: createdAt (for active inventory)
    const taskOrItem = entity as Task | Item;
    const date = taskOrItem.collectedAt || (taskOrItem as Task).doneAt || taskOrItem.createdAt;
    return date ? date.getFullYear() : new Date().getFullYear();
  }
  return new Date().getFullYear(); // Fallback
}

export function isEntityArchived(entity: Task | Sale | FinancialRecord | Item, currentMonth: number, currentYear: number): boolean {
  if (!entity.isCollected) return false;
  const entityMonth = getEntityMonth(entity);
  const entityYear = getEntityYear(entity);
  return entityMonth !== currentMonth || entityYear !== currentYear;
}
```



### Phase 7: Task Done / Collected and J$ Exchange Semantics

**⚠️ Note: This phase is scoped for the Automation / Monthly Close / PixelBrain phase, NOT the initial Active vs Archive implementation (Phases 1-5).** This section documents the rules and relationships that will be implemented later.

This phase aligns task lifecycle, player points, and J$ exchanges so that:

- `Done` = points are awarded to the player
- `Collected` = those points become eligible to be exchanged to J$

#### 7.1 Task Status Rules

- `Done`:
- When a task transitions to `Done`, award points to the player (already implemented via existing workflows).
- Points are visible in the Player modal, but **not yet locked for J$ exchange** logic-wise.
- `Collected`:
- When a task transitions from `Done` (or equivalent completed state) to `Collected`:
  - Mark the task as `isCollected = true` and set `collectedAt`.
  - Treat this as the signal that its awarded points are **eligible for J$ exchange**.
- Add a confirmation submodal when manually setting status to `Collected`:
  - Warn: “Collected tasks enable J$ exchange. Are you sure? This may have financial implications.”
- Status regression:
- Disallow changing a task from `Collected` back to previous statuses **after points have been exchanged to J$**.
- For safety, we can:
  - Either hard-block regression when `isCollected = true` and there exists a J$ transaction linked to that task.
  - Or allow only with a “danger” confirmation plus automatic reversal logic in a later phase (more complex).

Implementation sketch (later phases, not now):

- UI: update Task modal to:
- Show a dedicated `Collected` state with explanation.
- Add confirmation dialog when moving into `Collected`.
- Disable/guard transitions out of `Collected` when linked J$ exchanges exist.
- Workflows:
- Keep `onTaskUpsert` as the single source of truth for `isCollected` and `collectedAt`.
- Add checks for linked J$ exchange records (via Links system) before allowing regression.

#### 7.2 Player Modal: Points → J$ Exchange Rules

- Maintain current behavior:
- Player can open an “Exchange Points” flow from the Player modal.
- Exchanges create `FinancialRecord` entries + Links + J$ transactions (already implemented).
- New rule:
- Only points from **Collected tasks** are considered “eligible” for J$ exchange.
- Future implementation idea:
  - In the Player modal, when showing exchangeable points, aggregate only from tasks where `isCollected = true`.
  - Optionally show a split: “Pending Points (Done, not Collected)” vs “Exchangeable Points (Collected)”.

#### 7.3 J$ Conversion Rate Stability

Goal: avoid ambiguous conversions when J$ rates change over time.

Two-layer approach:

1) Snapshot rate at exchange time (per transaction)

- When creating a J$ exchange transaction:
- Use the current `pointsConversionRates` / `financial-conversion-rates`.
- Store the effective `pointsToJ$` and `j$ToUSD` rates in:
  - Either the `FinancialRecord` metadata, or
  - The `Link` metadata for the PLAYER_FINREC / SALE_FINREC link.
- This guarantees every historical transaction “remembers” the rate used.

2) Rate-change governance (tied to Monthly Close, later phase)

- Rule of thumb:
- Allow changing the global conversion rates **only at the start of a new month**, after Monthly Close automation has run for the previous month.
- After Monthly Close:
  - All tasks and points for that month should already be Collected or explicitly left open.
  - All J$ exchanges for that month should be using the previous month’s rate snapshot.
- Implementation ideas (future automation phase, not now):
  - Add a flag or `effectiveFromMonthKey` to conversion rates.
  - Prevent editing rates while a month is “open” (no Monthly Close record yet).

#### 7.4 How This Connects to Active vs Archive Strategy

- Active month:
- Tasks:
  - `Created / In Progress / Done` tasks remain in active task trees.
  - `Collected` tasks for the **current month** remain in active views (for exchange and review).
- Sales / Financials:
  - Current month records continue to feed dashboards and Player balances.
- Archive months:
- After Monthly Close (later phase):
  - Collected tasks and related financial records for that month are snapshotted and treated as “final”.
  - Active views show only current-month tasks / sales; historical ones are accessed via Archive.
- The J$ rate used for that month is locked via per-transaction snapshots.

This phase defines the rules and relationships; actual UI and workflow changes will be scheduled in the Automation / Monthly Close phases so we don’t mix concerns with the current Active vs Archive filtering work.

## Testing Checklist

- [ ] Finances page: Select October shows only October data (not November)
- [ ] Finances page: Toggle "Filter by month" off shows all data (see note below)
- [ ] Sales page: Month selector appears and works
- [ ] Sales page: Selected month shows only that month's sales
- [ ] Archive page: Still shows historical data correctly
- [ ] Control Room: Month filtering works for tasks (if month selector added)
- [ ] Inventories page: Month filtering works for items (if month selector added)

**Note on "Filter by month = off" behavior:**
When the toggle is off, "all data" should mean:
- **Option A (recommended)**: Last 6 months (prevents accidental heavy loads)
- **Option B**: All months in current year
- **Option C**: All months with a performance warning (for audits/exports only)

**Decision needed**: Choose which option to implement based on typical usage patterns.

## Principles Compliance

- **DRY**: Reuse `MonthYearSelector` component and date utility functions
- **Unified Patterns**: Same month filtering pattern across all entity types
- **Complete Implementation**: All sections get month filtering, not partial
- **Anti-Patterns**: Server-side filtering in API routes (no ClientAPI from server)

### To-dos

**Phase 1 - API Routes:**
- [ ] Add month/year query parameters to /api/financials route with filtering logic (use `getFinancialsForMonth`)
- [ ] Add month/year query parameters to /api/sales route with filtering logic (use `getSalesForMonth`)
- [ ] Add month/year query parameters to /api/tasks route with filtering logic (use `getTasksForMonth`)
- [ ] Add month/year query parameters to /api/items route with filtering logic (use `getItemsForMonth`)
- [ ] Implement `getTasksForMonth`, `getSalesForMonth`, `getFinancialsForMonth`, `getItemsForMonth` helpers in `data-store/datastore.ts`

**Phase 2 - ClientAPI:**
- [ ] Update ClientAPI.getFinancialRecords() to accept optional month/year parameters
- [ ] Update ClientAPI.getSales() to accept optional month/year parameters
- [ ] Update ClientAPI.getTasks() to accept optional month/year parameters
- [ ] Update ClientAPI.getItems() to accept optional month/year parameters

**Phase 3 - Finances Page:**
- [ ] Fix Finances page loadSummaries to pass month/year to API and remove client-side month filtering
- [ ] Decide and implement "Filter by month = off" behavior (see Testing Checklist note)

**Phase 4 - Sales Page:**
- [ ] Add MonthYearSelector component and state management to Sales page
- [ ] Update loadSales to pass month/year to ClientAPI.getSales()

**Phase 5 - Helper Functions:**
- [ ] Create getEntityMonth, getEntityYear, isEntityArchived helper functions in date-utils.ts (using canonical month field definitions)

**Phase 6 - Future Optimization:**
- [ ] Add month-based indexes at repository level for true KV scoping (`index:task:by-month:MM-YY` pattern)
- [ ] Refactor `get*ForMonth` helpers to use indexes instead of filter-after-load

**Testing:**
- [ ] Test month filtering across Finances, Sales, Control Room, Inventories
- [ ] Verify archive separation works correctly (archived entities don't appear in active month views)
- [ ] Verify performance with realistic data volumes