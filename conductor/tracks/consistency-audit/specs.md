# Mission: Deep Analysis & Reality Check

### Objective
**Stop Assumptions. Internalize Reality.**
The primary goal is to perform a comprehensive, non-invasive analysis of the current codebase to understand *exactly* how the system works (0 to 100%). We will **NOT** change a single line of code until the **Reality Layer** is fully mapped and documented in `conductor/context`.

### Why?
Previous attempts failed due to "Validation by Assumption"—guessing how the system *should* work instead of verifying how it *does* work. The user requires 100% understanding before action to prevent "fixing" things that aren't broken or breaking things that work differently than assumed.

## Scope of Work

### 1. The Investigation (Read-Only)
- **Deep Dive**: Read *every* relevant file in `types/`, `lib/adapters/`, `api/`, and `workflows/`.
- **Map the Reality**:
  - What *exactly* happens when a Task is saved? (Trace execution path Trace).
  - How *exactly* are points/J$ calculated right now? (Find the math).
  - What *exactly* does `COLLECTED` do in the current code? (Is it just a string? Does it trigger logic?).
  - How are entities *actually* defined in `types` vs `schemas`?

### 2. The Verification (Context vs. Code)
- Compare the `conductor/context` documents (created from `z_md`) against the *actual code*.
- **Flag Inconsistencies**: Create a report of "Context says X, Code does Y".
- **Update Context**: Rewrite `conductor/context` to reflect the *actual code reality*, not the legacy documentation.

### 3. The Understanding (Synthesize)
- Can I explain the entire lifecycle of a Task/Item/Sale from UI to DB without guessing?
- Do I know where the "bodies are buried" (e.g., legacy flags, disparate logic)?

## Deliverables
- **Revised Context Files**: `product.md`, `architecture.md` updated with *verified* facts.
- **Reality Report**: A document detailing the exact current state of the system, including logic flows for "Done" and "Collected".
- **No Code Changes**: Zero implementation during this phase.

## Constraints
- **READ ONLY**: Do not write/edit code files.
- **NO GUESSING**: If I don't see the code, I don't write it in the docs.
- **VERIFY FIRST**: "I think..." must become "I verified that line 40 of X.ts does...".

## Success Metrics
- **Zero "Side Effect" Flags** in API routes/adapters.
- **100% Link Logic Coverage** in `workflows/`.
- **Clear Documentation** of the "Done vs. Collected" lifecycle in `context/product.md`.
- **Pass**: A manual walkthrough of the "Create Task -> Complete Task -> Check Logs/Links" flow works exactly as described in Architecture.md.
