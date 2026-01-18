# Reality Report
**Last Verified:** 2026-01-15
**Verified By:** Pixelbrain (Deep Analysis Audit)

## 1. System Integrity Audit (Granular)

### A. Dashboards & Control Room (Tasks) - ✅ GREEN
- **UI**: `ControlRoom` component correctly handles hierarchical task display, filters, and drag-and-drop.
- **Data Flow**: `useEntityUpdates` ensures real-time sync. API `GET /tasks` supports historical filtering (month/year).
- **Workflow**: `task.workflow.ts` correctly triggers item creation and financial logging upon completion. "Collected" tasks are filtered out of active views.
- **Archives**: Task collection logic aligns with system lifecycle (Active -> Done -> Collected).

### B. Inventory & Items (Stock) - ✅ GREEN
- **UI**: `InventoryDisplay` correctly manages "Unified Stock" (array of `{siteId, quantity}`).
- **Stock Logic**: Inline editing uses `ClientAPI.updateStockAtSite`, ensuring atomic updates.
- **Indexing**: `upsertItem` maintains critical `index:item:mmyy` based on `soldAt` or `createdAt`, crucial for "Sold Items" history.
- **API**: Flexible filtering strategies (Time > Type > Fallback) optimized for performance.

### C. Sales (Point of Sale) - ✅ GREEN
- **Logic**: `SalesModal` enforces strict separation between "Product" (Item) and "Service" (Task) lines.
- **Service Integration**: Service sales correctly flagged to spawn Tasks (`createTask: true`) with associated rewards (XP, RP, etc.).
- **Booth Logic**: "Quick Count" rows and `BoothSalesView` integration verified.
- **Lifecycle**: `Collect Month` API route correctly transitions sales to `COLLECTED` status, creates archive snapshots, and uses `skipWorkflowEffects: true` to prevent side effects during archiving.

### D. Finances (Ledger) - ✅ GREEN
- **Aggregation**: on-the-fly aggregation in `FinancesPage` provides accurate Monthly Summaries without database bloat.
- **Assets**: Company and Personal assets separated correctly. Inventory values merged dynamically into asset reports.
- **Jungle Coins (J$)**: Confirmed as a ledger-based currency (derived from FinancialRecords sum), not a static field on entities.

## 2. Recent Consistency Checks

### Lifecycle: Done vs Collected
*   **Status**: **CONSISTENT**
*   **Definition**: "Done" is a functional state (task finished, sale charged). "Collected" is a lifecycle state (archived, snapshot taken, hidden from daily views).
*   **Mechanism**: The "Collect Month" workflow efficiently partitions active vs. historical data.

### Economy: Points vs Jungle Coins (J$)
*   **Status**: **CONSISTENT**
*   **Points**: Awarded via Tasks/Sales. Stored on `Player` entity.
*   **Jungle Coins**: Ledger-based. Calculated by summing `FinancialRecord` entries (Revenue - Cost).
*   **Treasury**: Company J$ holdings tracked separately from Personal J$.

## 3. Known Issues / Watchlist
*   **Constraint**: No current critical issues found.
*   **Observation**: `InventoryDisplay` relies on `ClientAPI` helper logic for stock moves; future refactors should ensure this logic remains robust if API changes.
*   **Performance**: Aggregating *all* financial records for monthly summary works now but may need optimization (server-side aggregation) as dataset grows >10k records.

## 4. Next Actions
*   Audit Phase Complete. System is consistent and operationally sound.
