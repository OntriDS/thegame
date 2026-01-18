# Implementation Plan: System Optimization & Robustness

**Goal**: Address scalability risks in Financial reporting and improve robustness of Inventory stock operations.

## User Review Required
> [!IMPORTANT]
> **Priority 0: Fix SearchableSelect Regression**
> The user identified a critical regression where `SearchableSelect` lost the ability to create new items on the fly, and displays "Item..." (placeholder) instead of the selected value for certain items. This effectively breaks the "New Item" workflow in Modals.
>
> **The Fix Strategy:**
> 1.  **Upgrade `SearchableSelect`**: Add `onCreate` prop. When a user types a query that doesn't match, show "Create '[query]'". content.
> 2.  **Fix Display Logic**: Ensure that if a `value` is passed that isn't in `options`, we either fetch it or accept a `displayValue` prop to show the user what they selected.
> 3.  **Apply to Modals**: Update `SaleItemsSubModal` and `FinancialsModal` to use this restored capability.

## Proposed Changes

### 0. Fix SearchableSelect Regression (PRIORITY)

#### [MODIFY] `components/ui/searchable-select.tsx`
- Add `onCreate?: (query: string) => void` prop.
- If `onCreate` is present and no options match `searchQuery`, render a `CommandItem` "Create: {searchQuery}".
- Allow the component to display a custom label if the value doesn't exist in options but `value` is set (or requires a new `initialLabel` prop).

#### [MODIFY] `components/modals/submodals/sale-items-submodal.tsx`
- Implement `handleCreateItem`.
- When "Create 'XYZ'" is clicked -> create a temporary local item (or persists it immediately depending on old behavior).
- **Hypothesis for Old Behavior**: It likely created a `PENDING` item or just allowed a string name. We will assume it should allow creating a standardized Item.

#### [MODIFY] `components/modals/financials-modal.tsx`
- Refactor the "Customer" selection to support "Create New" directly in the dropdown, simplifying the "Existing/New" toggle if desired (or at least fixing the item selection part if used there).

---

### 1. Inventory Robustness (Server-Side Stock Moves)
Currently, `InventoryDisplay` manages stock arrays manually via `ClientAPI`. We will create a dedicated atomic API endpoint.

#### [NEW] `app/api/inventory/move/route.ts`
- **Method**: `POST`
- **Body**: `{ itemId: string, toSiteId: string, quantity: number, fromSiteId?: string }` (If `fromSiteId` omitted, assumes "add/adjust" or requires smart deduction).
- **Logic**:
  1. Fetch Item from KV.
  2. Validate stock availability at `fromSiteId`.
  3. Atomically update the `stock` array.
  4. Persist Item.
  5. Return updated Item.

#### [MODIFY] `lib/client-api.ts`
- Update `updateStockAtSite` to call this new endpoint instead of manual local manipulation + upsert.

### 2. Financial Performance (Server-Side Aggregation)
Currently, `FinancesPage` downloads *all* raw records for a month to calculate totals. We will move this aggregation to the server.

#### [NEW] `app/api/financials/summary/route.ts`
- **Method**: `GET`
- **Query**: `month`, `year`
- **Logic**:
  1. Call `getFinancialsForMonth(year, month)` (Server-side KV fetch).
  2. Reuse the existing aggregation logic (refactored from `financial-utils.ts`) to compute `CompanyMonthlySummary` and `PersonalMonthlySummary` in memory on the server.
  3. Return **only** the summary JSON (tiny payload).

#### [MODIFY] `lib/utils/financial-utils.ts`
- Ensure functions are pure and safe for Node.js environment (they likely are).

#### [MODIFY] `app/admin/finances/page.tsx`
- Switch from `ClientAPI.getFinancialRecords()` + local math to `ClientAPI.getFinancialSummary()`.

## Verification Plan

### Automated Tests
- None planned (standard manual verification).

### Manual Verification
1. **Inventory**: Move an item between sites using the UI. Verify network tab calls `/api/inventory/move`. check persistence.
2. **Finances**: Load the Finances dashboard. Verify network tab calls `/api/financials/summary`. Compare numbers against "All Records" view to ensure accuracy.
