## Executive Summary

Real-time UI updates after entity creates/updates are inconsistent across the app. Sales and Characters generally refresh immediately due to explicit event dispatches in parent components, while Tasks, Items, Financials, and Sites often require tab changes or manual refresh. There is no centralized cache refresh function despite documentation referencing `DataStore.refreshLinksCache()`. Modal components frequently emit `onSave(entity)` but do not dispatch UI update events themselves, leading to delayed or missing updates when parents don’t handle the dispatch.

Key fixes: standardize event dispatching, add a UI events helper, implement a small cache refresh layer if needed, and add a `useEntityUpdates` hook to simplify subscriptions. No security issues found in these paths; performance and UX can be improved by predictable and unified event flows.

---

## COMPARISON MATRIX: Entity UI Update Behavior

| Entity Type | Modal Event Dispatch | Parent Event Dispatch | Cache Refresh | Current Status | Notes |
|-------------|---------------------|----------------------|---------------|----------------|-------|
| **Tasks** | ❌ None | ✅ `tasksUpdated`, `financialsUpdated`, `linksUpdated` | ❌ None | **SLOW** | Control Room dispatches, TaskModal doesn't |
| **Items** | ❌ None | ✅ `itemsUpdated`, `linksUpdated` | ❌ None | **SLOW** | Inventory dispatches, ItemModal doesn't |
| **Financials** | ❌ None | ❌ None | ❌ None | **VERY SLOW** | No modal dispatch, no parent dispatch |
| **Sales** | ✅ `salesUpdated`, `linksUpdated` | ✅ `salesUpdated`, `linksUpdated` | ❌ None | **WORKS** | Both modal and parent dispatch |
| **Sites** | ❌ None | ❌ None | ❌ None | **VERY SLOW** | No modal dispatch, no parent dispatch |
| **Characters** | ✅ `charactersUpdated`, `linksUpdated` | ✅ `charactersUpdated`, `linksUpdated` | ❌ None | **BETTER** | Both modal and parent dispatch |
| **Players** | ✅ `playersUpdated`, `linksUpdated` | ✅ `playersUpdated`, `linksUpdated` | ❌ None | **BETTER** | Both modal and parent dispatch |

### Event Listener Coverage
| Event Type | Listeners Found | Components Listening |
|------------|----------------|---------------------|
| `tasksUpdated` | ✅ 2 | Control Room, Data Center |
| `itemsUpdated` | ✅ 4 | Finances, Inventory, Data Center, Settings |
| `financialsUpdated` | ✅ 5 | Finances (2x), Data Center, Financial Records (2x) |
| `salesUpdated` | ❌ 0 | No dedicated listeners found |
| `sitesUpdated` | ❌ 0 | No dedicated listeners found |
| `charactersUpdated` | ❌ 0 | No dedicated listeners found |
| `playersUpdated` | ❌ 0 | No dedicated listeners found |
| `linksUpdated` | ❌ 0 | No global listeners (informational only) |

---

## VERIFY: What we actually confirmed in code

1) Parent components and dispatch patterns
- Control Room (`components/control-room/control-room.tsx`): Dispatches `tasksUpdated`, `financialsUpdated`, `financialsCreated`, `linksUpdated` on task save/complete.
- Inventory (`components/inventory/inventory-display.tsx`): Dispatches `itemsUpdated`, `linksUpdated` after save, bulk edit, move, status change.
- Sales page (`app/admin/sales/page.tsx`): After `ClientAPI.upsertSale`, dispatches `salesUpdated`, `linksUpdated` and reloads.
- Character page (`app/admin/character/page.tsx`): Dispatches `playersUpdated`/`charactersUpdated` + `linksUpdated` after saves.
- Finances page (`app/admin/finances/page.tsx`): Listens to `financialsUpdated` and updates assets; does not itself dispatch on record save from within modal.

2) Modals and missing dispatches
- TaskModal (`components/modals/task-modal.tsx`): Calls `onSave(newTask)` then closes; DOES NOT dispatch events itself.
- ItemModal (`components/modals/item-modal.tsx`): Calls `onSave(newItem)` then closes; DOES NOT dispatch events itself.
- FinancialsModal (`components/modals/financials-modal.tsx`): Calls `onSave(recordData)` then closes; DOES NOT dispatch events itself.
- SiteModal (`components/modals/site-modal.tsx`): Calls `onSave(siteData)` then closes; DOES NOT dispatch events itself.
- SalesModal: Has internal dispatch of `salesUpdated`/`linksUpdated` in parent usage and within modal logic; appears consistent.

3) Event listeners
- Found listeners for `tasksUpdated`, `itemsUpdated`, `financialsUpdated`, `financialsCreated`, `assetsUpdated`. Characters and players listeners exist on their pages. No global `linksUpdated` listener surfaced in the UI (it’s more informational; various components may react by re-fetching).

4) DataStore / cache layer
- `DataStore.refreshLinksCache()` is referenced in docs but NOT implemented anywhere in the repo. No `refresh*Cache` function exists in `data-store`.
- Upsert flow is consistent: save to KV → entity-specific workflow (`onXUpsert`) → `processLinkEntity(saved, EntityType.*)`. No post-upsert cache refresh.

Conclusion from VERIFY: Inconsistent event dispatching is the primary cause. Documentation mentions a cache refresh that doesn’t exist. Parents sometimes dispatch; modals often don’t. This explains why switching tabs (which triggers reloads) shows the new entities, while staying in-place doesn’t.

---

## ANALYSE: Architecture, data flow, performance, UX, security

1) System Architecture & Data Flow
- Architecture follows Modal → Section/Parent → ClientAPI → API Route → DataStore → Workflows → Links. Correct and production-ready.
- Missing central “UI change notification” abstraction leads to duplicated, inconsistent event names and dispatch locations.
- Links system works; but without a predictable event fire on all entity upserts, linked UIs may not refresh.

2) Data Integrity & Business Logic
- Upserts call workflows and `processLinkEntity`. Idempotency is guarded via Effects Registry.
- No evidence of data integrity issues; delays are UI-state only.

3) Performance
- Current approach causes multiple ad-hoc fetches on different listeners. A unified minimal event protocol would reduce redundant reloads.
- For heavy lists (items, tasks), throttled reloads or targeted state updates could improve responsiveness.

4) User Experience
- Inconsistent immediate feedback is the primary UX issue. Users must switch tabs to see changes.
- Standardizing event dispatch from modals yields immediate perceived performance improvements and consistent behavior.

5) Security
- API routes are protected by `requireAdminAuth`. No security regressions identified in this area.

6) Technical Debt
- Drift between docs and code (nonexistent `DataStore.refreshLinksCache`).
- Event names are many and ad-hoc (e.g., `financialsCreated`). A typed helper would reduce entropy.

---

## Action Items (Prioritized)

### P0 – Fix correctness and consistency
- Create `lib/ui/ui-events.ts` with typed helpers:
  - `dispatchEntityUpdated('task'|'item'|'financial'|'sale'|'site'|'character')`
  - Internally dispatch both `<entity>Updated` and `linksUpdated` consistently.
- Patch modals to use the helper AFTER successful `onSave()`:
  - `TaskModal`, `ItemModal`, `FinancialsModal`, `SiteModal`.
- Patch parent sections that currently dispatch events to also use the helper for parity.

### P1 – Listener standardization and DX
- Add `lib/hooks/useEntityUpdates.ts` that subscribes to `<entity>Updated` and returns a stable callback to refresh.
- Replace scattered inline `addEventListener` calls with the hook where feasible.

### P2 – Optional cache layer alignment
- Either (A) remove references to `DataStore.refreshLinksCache()` from docs; or (B) add a minimal in-memory cache with an explicit `refreshLinksCache()` that invalidates and refetches links on demand. Option B is nice-to-have; not required if events are reliable.

### P3 – Performance polish
- Debounce multiple event-driven reloads within 100–200ms windows in heavy pages to avoid burst refetches.
- Consider targeted state updates (append newly saved entity) when the parent already has the saved entity returned from the API, to avoid full reloads.

### P4 – Tests
- Add integration tests asserting that saving each entity type dispatches the expected events and causes UI consumers to refresh.

---

## Concrete Edits Proposed

1) New helper `lib/ui/ui-events.ts`:
```ts
// lib/ui/ui-events.ts
export type EntityKind = 'task'|'item'|'financial'|'sale'|'site'|'character'|'player';

export function dispatchEntityUpdated(kind: EntityKind) {
  if (typeof window === 'undefined') return;
  const map: Record<EntityKind, string> = {
    task: 'tasksUpdated',
    item: 'itemsUpdated',
    financial: 'financialsUpdated',
    sale: 'salesUpdated',
    site: 'sitesUpdated',
    character: 'charactersUpdated',
    player: 'playersUpdated',
  } as const;
  window.dispatchEvent(new Event(map[kind]));
  window.dispatchEvent(new Event('linksUpdated'));
}
```

2) Patch modals (post-`onSave`) to call helper:
- `TaskModal`: after `onSave(newTask)` and before close.
- `ItemModal`: after `onSave(newItem)` and before close.
- `FinancialsModal`: after `onSave(recordData)` and before close.
- `SiteModal`: after `onSave(siteData)` and before close.

3) Add hook `lib/hooks/use-entity-updates.ts`:
```ts
// lib/hooks/use-entity-updates.ts
import { useEffect } from 'react';

export function useEntityUpdates(eventName: string, handler: () => void) {
  useEffect(() => {
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName, handler]);
}
```

4) Optional: Implement `refreshLinksCache()` (if we want doc parity), or update docs to remove references.

---

## Rollout Plan

1. Add `ui-events` helper and `useEntityUpdates` hook.
2. Patch modals to call `dispatchEntityUpdated()` on successful saves.
3. Update parent components to use helper for consistency.
4. Verify live by creating Task, Item, Financial, Site – ensure immediate refresh.
5. Add minimal integration tests for dispatch/listen coupling.

---

## Risks & Mitigations

- Double-dispatch (modal + parent): Helper is idempotent for listeners; minor duplicate events are harmless. We can later unify to dispatch only once (parent preferred) if needed.
- Event name drift: Central helper prevents further drift.
- Over-fetching: Add debouncing on listeners where heavy.

---

## Success Criteria

- Creating/updating any entity reflects immediately in its section without tab changes or manual refresh.
- Events are emitted consistently from a single helper.
- No references exist to non-implemented cache APIs (or provide a minimal implementation).


