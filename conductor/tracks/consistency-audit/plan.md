# Plan: Deep Analysis & Reality Check

## Phase 1: The Foundation Scan (Types & Enums)
- [ ] **Analyze Types**: Read `types/*.ts` to understand the *actual* shape of entities.
  - *Verify*: Do we have `Collected` in `TaskStatus`? `FinancialStatus`? `ItemStatus`?
  - *Verify*: What are the exact fields for `Diplomatic` logic?
- [ ] **Analyze Constants**: Read `lib/constants.ts` (if exists) or wherever enums are used.

## Phase 2: The Execution Path Trace (API -> Adapter -> Workflow)
- [ ] **Trace Task Save**: Follow the code from `app/api/tasks/route.ts` -> `lib/data-store.ts` -> `lib/adapters/*.ts`.
  - *Goal*: Confirm if `sideEffects` flags represent reality or legacy code.
- [ ] **Trace Workflow Entry**: Verify how `processLinkEntity` is *actually* called in the codebase.
- [ ] **Trace Link Creation**: Read `workflows/entities-workflows/*.ts`.
  - *Goal*: Document exactly what happens for each entity type (don't assume it matches the wiki).

## Phase 3: The Logic Deep Dive ("Done" vs "Collected")
- [ ] **Find "Collected" Logic**: grep for `COLLECTED` or related status strings.
  - *Question*: Is there *any* code currently handling this? Or is it just a UI state?
- [ ] **Find Points/J$ Logic**: Find where `jungleCoins` or `points` are calculated.
  - *Question*: Is it in the workflow? In the component? In a utility function?

## Phase 4: Verification & Reporting
- [ ] **Update Context**: Rewrite `conductor/context/product.md` and `architecture.md` with the *verified reality*.
- [ ] **Create Reality Report**: Write `conductor/tracks/consistency-audit/reality-report.md`.
  - Document the *actual* flow vs the *expected* flow.
  - Document the *actual* state of "Done vs Collected".
  - Identify discrepancies.
- [ ] **Wait**: Present findings to Akiles before proposing ANY changes.
