# Task Output & Inventory Adjustments (Nov 2025)

This note consolidates every change that landed after we created the “Fix Task Output Improvements” plan. It covers the UI fixes in the task modal, the workflow updates for task-completion side effects, and the guard rails we added for stock synchronization.

---

## 1. `components/modals/task-modal.tsx`

- **Persist existing item selection**
  - Toggled `isNewItem` and `selectedItemId` in sync so the SearchableSelect reflects the current choice.
  - `buildTaskFromForm` now writes `selectedItemId` back into `outputItemId` when we’re using an existing inventory record.
- **Right-hand emissary column behaviour**
  - Clearing the “Use Existing Item” toggle resets the selected ID and name.
  - Selecting an item automatically flips the modal into “existing item” mode and pre-fills unit cost/price from that record.

These changes make the modal round-trip safe: reopening a task that references an existing item keeps the dropdown populated instead of showing an empty field.

---

## 2. `workflows/item-creation-utils.ts`

- **Reuse instead of duplicate**
  - When `task.outputItemId` is present (and the task is not marked as `isNewItem`), completion no longer clones a new inventory entity.
  - The workflow looks up the existing item, merges the quantity into the selected stock site, and only falls back to the old creation path if that ID cannot be found.

This prevents “Bastidores (task copy)”–style duplicates and respects the single-source-of-truth stock array.

---

## 3. `workflows/update-propagation-utils.ts`

- **Switching between new and existing**
  - If a task moves from “new item output” to “existing item output”, the orphaned clones are removed (`removeItem`) and their effects are marked so the cleanup is idempotent.
- **Stock deltas for existing items**
  - Added `adjustExistingItem()` helper to apply positive/negative quantity deltas at the correct site (including site changes).
  - Handles four scenarios: same item/same site, same item/different site, switching items, and reverting quantities.
- **Legacy propagation guarded**
  - The legacy update path (which mutates the first stock element) now runs only while either the current or previous state is “new item.” That avoids double-counting when the item is an external inventory record.

---

## 4. `workflows/entities-workflows/task.workflow.ts`

- **Site resolver**
  - Added `resolveTaskOutputSite()` to share the “target → site → HQ” fallback logic between completion and uncompletion flows.
- **Undo completion**
  - When reverting a task from “Done”, we now subtract the quantity that was added to the linked existing item, so the stock returns to its prior value instead of only deleting cloned items.
- **Imports wired**
  - Brought in `getItemById` / `upsertItem` so the new logic can adjust existing inventory rows.

---

## 5. `components/control-room/control-room.tsx`

- Wired the latest `TaskTree` API (`onChangeOrder`) so the plan’s inline order editor keeps compiling. No behavioural changes beyond the prop plumbing.

---

## Testing / Follow-up

- Manual regression is still required: open a task with an existing output item, complete it, confirm the stock increments, then undo the task to verify the stock rolls back.
- Watch the effects registry when flipping between “new” and “existing” to ensure we don’t leave stale clones or duplicate adjustments.

