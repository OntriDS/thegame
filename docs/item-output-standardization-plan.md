# Item Output Standardization – Findings vs. Reality

| Modal / Flow                                                 | UI behaviour (toggle / selection)                                                                            | Data emitted on save                                                                          | Workflow behaviour                                                                                    | Reality gap                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `components/modals/task-modal.tsx`                           | `ItemNameField` toggles between new/existing; selecting existing writes ID back into form state.             | `buildTaskFromForm()` persists `outputItemId` when `isNewItem` is false.                      | `createItemFromTask()` reuses stock on existing item when `outputItemId` is present and marks effect. | ✅ Matches plan – existing items increment stock correctly.                        |
| `components/modals/financials-modal.tsx`                     | Same `ItemNameField` UX; allows picking an existing item.                                                    | `handleSave()` now persists `outputItemId` + `isNewItem` when reuse is selected.              | `createItemFromRecord()` reuses existing items, assigns `ownerCharacterId`, and falls back to `'None'` when no site is provided. | ✅ Reuse path + owner metadata now live. |
| `components/modals/sales-modal.tsx` (service lines)          | Item emissary submodal persists new/existing toggle and selected IDs.                                        | `ItemCreationData` returns `existingItemId`, `isNewItem`, `targetSite`, and status flags.     | Service-line tasks propagate reuse metadata + customer owner to `createItemFromTask()`, so downstream item reuse works.    | ✅ Tasks inherit reuse metadata + customer ownership.   |
| `components/modals/item-modal.tsx`                           | Direct item editor; no concept of emissary reuse.                                                            | N/A                                                                                           | N/A                                                                                                   | ✅ Works as primary inventory editor; not part of reuse story.                     |
| Shared `ItemNameField` (`components/ui/item-name-field.tsx`) | Maintains internal toggle state and surfaces selected item ID via `onItemSelect`.                            | Consumers must persist `selectedItemId` + `isNewItem`.                                        | Task, Financial, and Sales modals now persist both signals and wire them into workflows.              | ✅ Toggle state respected end-to-end.              |

## Metadata Copy Parity – Task vs Financial Record (Verified Nov 2025)

| Aspect                | Task Workflow (`createItemFromTask`) – verified | Financial Record Workflow (`createItemFromRecord`) – verified | Observation |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------- | ----------- |
| Station field         | Copies `task.station` into the new item.         | Copies `record.station` into the new item.                    | ✅ Alignment confirmed. |
| Unit cost & price     | Uses `task.outputUnitCost` and `task.outputItemPrice`. | Uses `record.outputUnitCost` and `record.outputItemPrice`.    | ✅ Alignment confirmed. |
| Owner character link  | Sets `ownerCharacterId` from `task.customerCharacterId` or leaves `null`. | Sets `ownerCharacterId` from `record.customerCharacterId` when present. | ✅ Both workflows tag ownership metadata. |
| Year metadata         | Derives year from `new Date().getFullYear()`.    | Uses `record.year`, preserving accounting context.            | ✅ Intentional divergence documented. |
| Stock site resolution | Falls back through `task.targetSiteId` → `task.siteId` → existing stock → `'hq'`. | Falls back through `record.targetSiteId` → `record.siteId` → existing stock → `'None'`. | ✅ Both flows avoid phantom HQ when no site applies. |

**Source verification**
- Task workflow: `workflows/item-creation-utils.ts` lines 82-114.
- Financial workflow: `workflows/item-creation-utils.ts` lines 187-211.

**Status**: ✅ Implementation verified (Nov 2025). Financial + sales pipelines now share reuse semantics.

## Key Standardization Targets

1. **Persist item IDs everywhere**: Financial and sales flows must capture `selectedItemId` alongside `isNewItem` to signal reuse intent.
2. **Extend workflows**: `createItemFromRecord()` and any downstream task creation from sales need parity with task workflow’s reuse branch (stock merge, effects registry).
3. **Align UI messaging**: Until backend supports reuse, either disable the toggle or implement the missing plumbing to avoid misleading behaviour.


---

## Verification & Tests (Nov 2025)

- Added `__tests__/workflows/item-creation-utils.test.ts` to cover financial-record reuse (owner metadata + `None` site fallback).
- Verified service-sale tasks now emit `customerCharacterId` + `outputItemId`, enabling downstream reuse in `createItemFromTask()`.

---

| Aspect                     | Task Workflow                                                                                                                                                                   | Financial Record Workflow                                                                                                                                                       | Notes                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Entry point                | workflows/entities-workflows/task.workflow.ts → createItemFromTask                                                                                                              | workflows/entities-workflows/financial.workflow.ts → createItemFromRecord                                                                                                       | Both triggered when emissary fields are present and effects registry allows run.                                                    |
| Trigger conditions         | task.status === 'Done' and task.outputItemType + task.outputQuantity                                                                                                            | fin.outputItemType + fin.outputQuantity (status-independent)                                                                                                                    | Task path tied to completion; record path runs on upsert even if record not “done.”                                                 |
| Existing-item handling     | Updates stock on existing item if outputItemId set and isNewItem false, honoring target/site fallback.<br><br>item-creation-utils.tsLines 32-119                                | No existing-item branch; always creates a new record from financial emissary fields.<br><br>item-creation-utils.tsLines 133-181                                                 | Reflects doc plan: tasks can reuse inventory, financial records still mint new entries.                                             |
| Generated item ID          | item-${task.id}-${Date.now()}                                                                                                                                                   | item-${record.id}-${Date.now()}                                                                                                                                                 | Both deterministic to parent entity; protects uniqueness.                                                                           |
| Metadata copied            | Includes station, unitCost, price, ownerCharacterId (from customer), stock site resolver (target → site → ‘hq’).<br><br>item-creation-utils.tsLines 82-121                      | Similar base fields but uses record’s year, siteId, omits ownerCharacterId.<br><br>item-creation-utils.tsLines 144-179                                                          | Task path richer for customer ownership; record path focused on accounting context.                                                 |
| Stock initialization       | Chooses site via target→site→existing item→hq.<br><br>item-creation-utils.tsLines 108-113                                                                                       | Uses record.siteId (if not "None") or default hq.<br><br>item-creation-utils.tsLines 168-171                                                                                    | Different fallback rules; record path trusts site ambassador directly.                                                              |
| Effects & Links            | Marks task:{id}:itemCreated, later processLinkEntity creates TASK_ITEM and ITEM_TASK links.<br><br>task.workflow.tsLines 187-243<br><br>+<br><br>links-workflows.tsLines 94-114 | Marks financial:{id}:itemCreated, workflow creates FINREC_ITEM link plus ITEM_FINREC.<br><br>financial.workflow.tsLines 225-238<br><br>+<br><br>links-workflows.tsLines 309-329 | Bidirectional relationships maintained through Rosetta Stone pipeline.                                                              |
| Logging                    | Item workflow appends CREATED log with quantity, cost, price.<br><br>item.workflow.tsLines 18-44                                                                                | Same logging path; financial source tracked via sourceRecordId.<br><br>item.workflow.tsLines 24-41<br><br>+ task/record details on entry.                                       | Any manual log edits must preserve quantity field to show in Data Center.                                                           |
| Update propagation         | Task workflow’s updateItemsCreatedByTask adjusts quantities when emissary fields change.<br><br>task.workflow.tsLines 246-257                                                   | Financial workflow’s updateItemsCreatedByRecord invoked from update-propagation-utils.<br><br>financial.workflow.tsLines 223-255                                                | Both rely on shared helpers, but task path also handles reverting completion (uncompleteTask).<br><br>task.workflow.tsLines 664-742 |
| When emissary data removed | Task path calls removeItemsCreatedByTask during uncompletion/deletion.<br><br>task.workflow.tsLines 721-733<br><br>&<br><br>item-creation-utils.tsLines 192-220                 | Financial path uses removeItemsCreatedByRecord on delete.<br><br>item-creation-utils.tsLines 227-255                                                                            | Keeps KV and logs clean via repositories + effects cleanup.                                                                         |

### Key Differences & Health Check

- Reuse vs. always-new: Tasks now support reusing existing inventory (aligned with docs/task-output-refactor.md), while financial records still create fresh items. That matches the requirements we implemented.

- Site resolution logic: Task completion uses the new resolveTaskOutputSite() fallback; financial records rely on the record’s own siteId. No divergence spotted beyond intended behavior.

- Logging schema: Automated entries include quantity; manual Upstash edits must keep that field (the UI doesn’t read oldStock/newStock on CREATED entries).

- Effects registry: Task path checks multiple side-effect keys (itemCreated, financialCreated, pointsAwarded); financial path uses a single itemCreated key. No duplicated effects were introduced in the recent refactor.

### Recommendations

- Keep manual log fixes aligned with the workflow output shape to avoid UI gaps.

- If you want financial records to support “reuse existing item” like tasks, we’d need a parallel branch in createItemFromRecord and matching form controls—currently not implemented by design.

- Consider dispatching dispatchEntityUpdated('item') after a task completion creates an item so the Items tab refreshes automatically (requires agent mode to patch)

---

## Sales – Stock Decrement and Site-Aware Selection (Findings)

### Verified behaviour today
- Saving a Sale with product lines logs and links correctly, but does not decrement per-site on-hand stock:
  - `processItemSaleLine()` increments `item.quantitySold` but never subtracts from `item.stock[]` by site.
  - On initial creation, `onSaleUpsert` returns after CREATED logging; `processSaleLines()` (which triggers stock changes) only executes on a PENDING → CHARGED transition.
  - Even when `processSaleLines()` runs, it updates `quantitySold` and logs SOLD but does not mutate `stock[]`.
- Inventory availability in the UI is derived from `stock[]` (not from `quantitySold`), so quantities never go down after sales.

### Required behaviour (high-level)
1. When a Sale is CHARGED (or created in CHARGED status):
   - For each item line, decrement `stock[]` at the correct site by `line.quantity`.
   - Default source site = `sale.siteId`. If insufficient at that site, either block with validation, prompt the user to pick source site(s), or (advanced) distribute across sites with explicit UX.
   - If total available across all sites is insufficient, block with a clear message; no negative quantities.
   - Keep `quantitySold` for analytics; rely on `stock[]` for availability.
   - Optionally auto-set `status = SOLD` when total stock reaches zero (configurable).
2. Reversal flows:
   - On uncharge (CHARGED → PENDING) or delete, restore the decremented quantities exactly once (idempotent via Effects Registry keyed per `saleId:lineId`).

### Site-aware selection – UX requirements
- The shared item picker must display: Name, Site label, Available quantity, and (optionally) Price.
- Selection should bind to a specific stock point (itemId + siteId) where a site matters:
  - Sales: default from `sale.siteId`; allow choosing a different site when needed.
  - Sales (multi-item submodal): already has `defaultSiteId`; ensure options show per-site quantities and honor the selected site.
  - Service → Task emissary and Financial reuse: continue to target explicit sites for increments; expose site in the picker when user control is desired.

### System-wide touchpoints (for later implementation)
- Pickers/Options:
  - Enhance `ItemNameField` and SearchableSelect option builders to show site + quantity.
  - Provide builders for per-site options: e.g., flatten `stock[]` into options when multi-site selection is needed.
- Workflows:
  - `processItemSaleLine()` → subtract from `stock[]` at the selected site; fail clearly if insufficient; keep existing idempotency keys.
  - `updateItemsFromSale()` → on sale edits (quantity or site changes), reconcile adds/subtracts on `stock[]` using per-site logic; restore on deletions.
- Validation:
  - Modal pre-check for sufficient stock at `sale.siteId` before posting CHARGED; server-side guardrails mirror the rule with useful error messages.

### Data & logging considerations
- No schema changes required; `StockPoint[]` already models per-site quantities.
- Items log: continue SOLD entries with `quantity` and `siteId`.
- Links: `SALE_ITEM` metadata keeps `siteId` and `quantity` to align with decrements.

### Verification checklist (post-implementation)
1. CHARGED sale (single item): correct site decremented; SOLD log includes site; UI availability drops.
2. Multiple items: each line decrements from the correct site; totals consistent.
3. Insufficient stock: clear blocking validation; no negative stocks.
4. Reversal: uncharge/delete restores stock once (idempotent).
5. Multi-site edge: if sale site has zero stock, picker/validation makes source site explicit; no silent cross-site pulls.

---

## Sales – “Sold Lot” Duplication Model (Design Decision)

To keep status semantics clean and avoid mixing states in a single entity, when a sale is CHARGED:
- Decrement the original item’s per-site stock by the sold quantity from the source site (default = `sale.siteId`).
- Create a new “sold lot” item that represents exactly what left inventory in that sale:
  - Fields (derived):
    - name/type/collection/station copied from the original model
    - status = `SOLD`
    - price = line.unitPrice (unit price used in sale)
    - value = line.quantity × line.unitPrice (optional: realized value)
    - ownerCharacterId = sale.customerId (the buyer), when present
    - quantitySold = line.quantity (for analytics)
    - stock = [{ siteId: sale.siteId, quantity: line.quantity }] (or a dedicated system “Sold Items” site if configured)
    - year = sale.saleDate.year
    - createdAt/updatedAt = now
  - ID: predictable (e.g., `item-sold-${sale.id}-${lineId}`) for idempotency
  - Links:
    - `SALE_ITEM` (Sale → Sold Item) with { quantity, unitPrice, siteId, soldAt }
    - `ITEM_SITE` (Sold Item → Site)
    - `ITEM_CHARACTER` (Sold Item → Buyer Character) when buyer exists
  - Logs:
    - Items log: CREATED (status SOLD, include quantity and site in details)
  - Effects:
    - Idempotency key per line (e.g., `sale:{id}:soldLotCreated:{lineId}`) to prevent duplicates
  - Reversal:
    - On uncharge or sale deletion: remove the sold lot item and restore the original item’s stock at the same site (exact quantity), using the same per-line effect keys to ensure a single reversal

Rationale:
- Preserves the purity of the original “for sale” inventory model by not flipping its status to `SOLD` prematurely or mixing sold quantities inside the model’s `stock[]`.
- Allows post-facto traceability of exactly what was sold (per lot) with its own links and logs, and supports downstream accounting or fulfilment workflows.

Open choices (to finalize before implementation):
- Destination site for sold lots:
  - a) Use `sale.siteId` (as immediate “left from this site” trace), or
  - b) Route to a system site `SOLD_ITEMS` for centralization. Recommendation: make this configurable; default to `sale.siteId`.
- Whether to emit an additional SOLD event on the original model (for analytics) or rely solely on the sold-lot CREATED entry + `quantitySold` on model (avoid double counting).

Post-implementation verification add-ons:
1. Original model retains status (e.g., `FOR_SALE`) with `stock[]` reduced correctly.
2. A new sold-lot item exists with status `SOLD`, per-site stock equal to the sold quantity, correct buyer link (when buyer exists), and a `SALE_ITEM` link from the sale.
3. Deleting the sale removes the lot and restores the original model’s stock exactly once (idempotent).