# Plan: System-Wide Deep Audit

**Objective**: Comprehensive verification of system functionality and workflow adherence across all modules (Dashboards, Tasks, Inventory, Sales, Finances).

## Phase 1: Control Room (Tasks & Dashboards) - ✅ COMPLETE
- [x] Inspect `app/admin/page.tsx` (Root redirect).
- [x] Inspect `app/admin/control-room/page.tsx` & `components/control-room`.
- [x] Verify `task.workflow.ts` triggers.
- [x] confirm "Collected" filter logic in `getTasks`.

## Phase 2: Inventory (Items) - ✅ COMPLETE
- [x] Inspect `app/admin/inventories/page.tsx` & `components/inventory`.
- [x] Verify "Unified Stock" logic (array of sites).
- [x] Check `item.workflow.ts` for "Sold" logic.

## Phase 3: Sales (Point of Sale) - ✅ COMPLETE
- [x] Inspect `app/admin/sales/page.tsx`.
- [x] Check `SalesModal` logic for "Service" vs "Product".
- [x] **CRITICAL**: Verify `app/api/sales/collect-all/route.ts` implementation details (Snapshot + Archive).

## Phase 4: Finances (Ledger & J$) - ✅ COMPLETE
- [x] Inspect `app/admin/finances/page.tsx`.
- [x] Verify J$ calculation logic (Ledger vs Entity Field).
- [x] Check `FinancialsModal` consistency.

## Phase 5: Verification & Reporting - ✅ COMPLETE
- [x] Synthesize findings.
- [x] Update `reality-report.md`.
