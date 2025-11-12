<!-- Consolidated, actionable plan for real-time UI updates across entities -->

# Real-Time UI Updates: Unified Pattern, Findings, and Roadmap

## Executive Summary

- Root cause: incomplete implementation of unified event system - modals still use manual dispatch, creating mixed patterns.
- Solution: Complete the unified pattern implementation across ALL entities - no exceptions, no mixed approaches.
- Outcome: Single, DRY, reliable pattern for immediate UI refresh across all entities.

## Current State Analysis (HONEST)

| Entity | Modal Dispatch | Parent Listener | Pattern | Status |
|--------|---------------|-----------------|---------|--------|
| **Tasks** | Manual `window.dispatchEvent` | `useEntityUpdates` (fixed) | Mixed | ❌ Incomplete |
| **Items** | Manual `window.dispatchEvent` | `useEntityUpdates` (fixed) | Mixed | ❌ Incomplete |
| **Sales** | Manual `window.dispatchEvent` | Direct `loadSales()` call | Synchronous | ✅ Works but not DRY |
| **Characters** | Manual `window.dispatchEvent` | Manual `addEventListener` | Old stable | ✅ Works but not unified |
| **Financials** | Manual `window.dispatchEvent` | `useEntityUpdates` (fixed) | Mixed | ❌ Incomplete |
| **Sites** | Manual `window.dispatchEvent` | `useEntityUpdates` (fixed) | Mixed | ❌ Incomplete |

**Root Problem**: We have 3 different patterns instead of 1 unified pattern.

## Key Requirements (User Feedback Incorporated)

1. **Dispatch Timing**: Events must be dispatched ONLY after successful API response, not before or during
   - Rationale: If API fails, nothing changed - no event should fire
   - Implementation: `await ClientAPI.upsert()` → `dispatchEntityUpdated()` → `onSave()` → `onOpenChange(false)`

2. **Sales Page Pattern**: Keep BOTH direct call and event listener temporarily
   - Direct call: `await loadSales()` in `handleSaveSale` (synchronous refresh)
   - Event listener: `useEntityUpdates('sale', loadSales)` (event-driven refresh)
   - Rationale: Provides belt-and-suspenders approach during migration; can remove direct call after verification

3. **Character Page Multi-Entity**: Use TWO separate hooks for character and player updates
   - `useEntityUpdates('character', loadData)`
   - `useEntityUpdates('player', loadData)`
   - Rationale: Character page displays both entities; either changing requires full refresh. Not overcomplicated - just two simple hooks calling same function

4. **Error Handling**: NEVER dispatch events on API failure
   - Only dispatch after confirmed successful save
   - No entity was created/updated if API failed - no event to dispatch

## Unified Technical Pattern

1) Dispatch from modals

```startLine:endLine:lib/ui/ui-events.ts
export function dispatchEntityUpdated(kind: EntityKind): void {
  if (typeof window === 'undefined') return;
  const eventName = EVENT_MAP[kind];
  window.dispatchEvent(new Event(eventName));
  window.dispatchEvent(new Event('linksUpdated'));
}
```

2) Subscribe in parents with a stable handler

```startLine:endLine:lib/hooks/use-entity-updates.ts
export function useEntityUpdates(kind: EntityKind, onUpdate: () => void | Promise<void>) {
  const callbackRef = useRef(onUpdate);
  useEffect(() => { callbackRef.current = onUpdate; }, [onUpdate]);
  const stableHandler = useCallback(() => { void callbackRef.current(); }, []);
  useEffect(() => {
    const eventName = getEventName(kind);
    window.addEventListener(eventName, stableHandler);
    return () => window.removeEventListener(eventName, stableHandler);
  }, [kind, stableHandler]);
}
```

Notes:
- The handler has no dependencies → no churn. The ref always points to the latest callback.
- Parents may pass inline callbacks; memoization is recommended but not required.

## Comparison Matrix (After Fix)

| Entity | Modal Dispatch | Parent Subscription | Works Now |
|-------|-----------------|---------------------|-----------|
| Tasks | dispatchEntityUpdated('task') | useEntityUpdates('task', refresh) | Yes |
| Items | dispatchEntityUpdated('item') | useEntityUpdates('item', loadItems) | Yes |
| Financials | dispatchEntityUpdated('financial') | useEntityUpdates('financial', refresh) | Yes |
| Sales | dispatchEntityUpdated('sale') | useEntityUpdates('sale', loadSales) | Yes |
| Sites | dispatchEntityUpdated('site') | useEntityUpdates('site', loadSites) | Yes |
| Characters | dispatchEntityUpdated('character') | useEntityUpdates('character', loadChars) | Yes |
| Players | dispatchEntityUpdated('player') | useEntityUpdates('player', loadPlayers) | Yes |

## Complete Implementation Roadmap (UNIFIED PATTERN)

### Phase 1: Migrate ALL Modals to Centralized Dispatch (7 files)

**Implementation Pattern:**
```typescript
import { dispatchEntityUpdated } from '@/lib/ui/ui-events';

const handleSave = async () => {
  try {
    setIsSaving(true);
    
    // 1. Make API call
    await ClientAPI.upsertEntity(entity);
    
    // 2. Dispatch event ONLY after successful API response
    dispatchEntityUpdated('entity-kind');
    
    // 3. Call parent callback
    onSave(entity);
    
    // 4. Close modal
    onOpenChange(false);
  } catch (error) {
    // On error: do NOT dispatch event (nothing changed)
    console.error('Failed to save:', error);
    alert('Failed to save. Please try again.');
  } finally {
    setIsSaving(false);
  }
};
```

**Files to Update:**

1. **TaskModal** (`components/modals/task-modal.tsx`)
   - Remove: `window.dispatchEvent(new Event('tasksUpdated'))` and `window.dispatchEvent(new Event('linksUpdated'))`
   - Add: `import { dispatchEntityUpdated } from '@/lib/ui/ui-events'`
   - Replace with: `dispatchEntityUpdated('task')` after successful API call
   - Location: After `await ClientAPI.upsertTask(newTask)` succeeds

2. **ItemModal** (`components/modals/item-modal.tsx`)
   - Remove: `window.dispatchEvent(new Event('itemsUpdated'))` and `window.dispatchEvent(new Event('linksUpdated'))`
   - Add: `import { dispatchEntityUpdated } from '@/lib/ui/ui-events'`
   - Replace with: `dispatchEntityUpdated('item')` after successful API call
   - Location: After `await ClientAPI.upsertItem(itemToSave)` succeeds

3. **FinancialsModal** (`components/modals/financials-modal.tsx`)
   - Remove: `window.dispatchEvent(new Event('financialsUpdated'))` and `window.dispatchEvent(new Event('linksUpdated'))`
   - Add: `import { dispatchEntityUpdated } from '@/lib/ui/ui-events'`
   - Replace with: `dispatchEntityUpdated('financial')` after successful API call
   - Location: After `await ClientAPI.upsertFinancialRecord(recordToSave)` succeeds

4. **SiteModal** (`components/modals/site-modal.tsx`)
   - Remove: `window.dispatchEvent(new Event('sitesUpdated'))` and `window.dispatchEvent(new Event('linksUpdated'))`
   - Add: `import { dispatchEntityUpdated } from '@/lib/ui/ui-events'`
   - Replace with: `dispatchEntityUpdated('site')` after successful API call
   - Location: After `await ClientAPI.upsertSite(siteToSave)` succeeds

5. **SalesModal** (`components/modals/sales-modal.tsx`)
   - Remove: `window.dispatchEvent(new Event('salesUpdated'))` and `window.dispatchEvent(new Event('linksUpdated'))`
   - Add: `import { dispatchEntityUpdated } from '@/lib/ui/ui-events'`
   - Replace with: `dispatchEntityUpdated('sale')` after successful API call
   - Location: After `await ClientAPI.upsertSale(saleToSave)` succeeds

6. **CharacterModal** (`components/modals/character-modal.tsx`)
   - Remove: `window.dispatchEvent(new Event('charactersUpdated'))` and `window.dispatchEvent(new Event('linksUpdated'))`
   - Add: `import { dispatchEntityUpdated } from '@/lib/ui/ui-events'`
   - Replace with: `dispatchEntityUpdated('character')` after successful API call
   - Location: After `await ClientAPI.upsertCharacter(characterToSave)` succeeds

7. **PlayerModal** (`components/modals/player-modal.tsx`)
   - Remove: `window.dispatchEvent(new Event('playersUpdated'))` and `window.dispatchEvent(new Event('linksUpdated'))`
   - Add: `import { dispatchEntityUpdated } from '@/lib/ui/ui-events'`
   - Replace with: `dispatchEntityUpdated('player')` after successful API call
   - Location: After `await ClientAPI.upsertPlayer(playerToSave)` succeeds

### Phase 2: Migrate Parent Components to useEntityUpdates Hook (2 files)

**1. Sales Page** (`app/admin/sales/page.tsx`)

**Current Pattern:**
```typescript
const handleSaveSale = async (sale: Sale) => {
  await ClientAPI.upsertSale(sale);
  await loadSales(); // Direct synchronous refresh
};
```

**New Pattern (Keep Both for Now):**
```typescript
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';

// At top of component
useEntityUpdates('sale', loadSales); // Event-driven refresh

const handleSaveSale = async (sale: Sale) => {
  await ClientAPI.upsertSale(sale);
  await loadSales(); // Keep direct call for now (temporary dual pattern)
};
```

**Rationale:** Keep both synchronous and event-driven patterns temporarily to ensure no regression while we verify the unified pattern works.

**2. Personas Page** (`app/admin/personas/page.tsx`)

**Current Pattern:**
```typescript
useEffect(() => {
  window.addEventListener('characterUpdated', handleCharacterUpdate);
  window.addEventListener('charactersUpdated', handleCharacterUpdate);
  window.addEventListener('playerUpdated', handleCharacterUpdate);
  window.addEventListener('playersUpdated', handleCharacterUpdate);
  
  return () => {
    window.removeEventListener('characterUpdated', handleCharacterUpdate);
    window.removeEventListener('charactersUpdated', handleCharacterUpdate);
    window.removeEventListener('playerUpdated', handleCharacterUpdate);
    window.removeEventListener('playersUpdated', handleCharacterUpdate);
  };
}, []);
```

**New Pattern:**
```typescript
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';

// Replace entire useEffect with 2 hook calls
useEntityUpdates('character', loadData);
useEntityUpdates('player', loadData);
```

**Rationale:** Both Character and Player entities are displayed on the same page. When either changes, the entire page data needs to refresh. Both hooks call the same `loadData` function.

### Phase 3: Verify All Other Pages Already Use Hook

**Pages to Verify:**

1. **Control Room** (`components/control-room/control-room.tsx`)
   - Check: `useEntityUpdates('task', ...)` is present
   - Verify: Task updates refresh immediately

2. **Inventory Display** (`components/inventory/inventory-display.tsx`)
   - Check: `useEntityUpdates('item', loadItems)` is present
   - Verify: Item updates refresh immediately

3. **Finances Page** (`app/admin/finances/page.tsx`)
   - Check: `useEntityUpdates('financial', ...)` is present
   - Verify: Financial record updates refresh immediately

4. **Financial Records Components** (`components/finances/financial-records-components.tsx`)
   - Check: `useEntityUpdates('financial', ...)` is present
   - Verify: Monthly/yearly views refresh immediately

5. **Data Center** (`app/admin/data-center/page.tsx`)
   - Check: Multiple `useEntityUpdates` calls for different tabs
   - Verify: Tab data refreshes immediately

6. **Settings - Items Import/Export** (`components/settings/items-import-export.tsx`)
   - Check: `useEntityUpdates('item', ...)` is present
   - Verify: Bulk operations refresh immediately

### Phase 4: Final Cleanup and Verification

**Cleanup Checklist:**
- [ ] Grep codebase for `window.dispatchEvent` in modals - should be ZERO matches
- [ ] Grep codebase for manual `addEventListener` in parent components - should be ZERO matches (except temporary Sales)
- [ ] Verify all modals import `dispatchEntityUpdated` from `@/lib/ui/ui-events`
- [ ] Verify all parent components import `useEntityUpdates` from `@/lib/hooks/use-entity-updates`

**Testing Checklist:**

For EACH entity (Task, Item, Financial, Sale, Site, Character, Player):
1. [ ] Create new entity → UI updates immediately without manual refresh
2. [ ] Edit existing entity → UI updates immediately without manual refresh
3. [ ] Delete entity (if applicable) → UI updates immediately
4. [ ] No console errors during any operation
5. [ ] No duplicate API calls or double refreshes
6. [ ] Modal closes smoothly after save

**Performance Verification:**
- [ ] Open React DevTools Profiler
- [ ] Create/edit entities and verify no excessive re-renders
- [ ] Verify listener count remains constant (no listener churn)
- [ ] Check Network tab - ensure only expected API calls are made

**Pattern Verification:**
- [ ] All 7 modals use `dispatchEntityUpdated(kind)`
- [ ] All parent components use `useEntityUpdates(kind, callback)`
- [ ] No mixed patterns exist
- [ ] DRY principle is maintained
- [ ] Code is consistent and maintainable

## Diagnostics and Guardrails

- Add an ESLint rule or guideline: prefer passing stable callbacks, but the hook tolerates inline functions.
- Integration test: mount component, cause a render, dispatch event while rendering, assert callback invoked exactly once.
- Performance: verify listener count is constant over time; use React Profiler to confirm no listener churn.

## Risks and Mitigations

- Risk: components with conditional hook calls. Mitigation: ensure `useEntityUpdates` is called unconditionally at the top-level.
- Risk: forgotten dispatch in a modal. Mitigation: code review checklist and small unit test around each modal’s save path.

## Success Criteria (UNIFIED PATTERN)

✅ **Single Pattern**: All entities use `dispatchEntityUpdated(kind)` + `useEntityUpdates(kind, callback)`
✅ **No Mixed Approaches**: Zero manual `window.dispatchEvent` or `addEventListener` calls
✅ **DRY Compliance**: One dispatch function, one subscription hook, used everywhere
✅ **Immediate Updates**: All entities refresh instantly after create/update
✅ **Complete Implementation**: No partial migrations or "good enough" states
✅ **Smart Simplification**: Complex event system made simple through proper abstraction

## Why This Solution is Right

1. **Unified**: One pattern for all entities - no confusion
2. **DRY**: Centralized dispatch and subscription - no duplication
3. **Complete**: Full implementation across all entities - no exceptions
4. **Smart**: Makes complex event system simple through proper abstraction
5. **Reliable**: Ref-based stable handlers prevent race conditions
6. **Scalable**: Easy to add new entities following the same pattern

## Appendix: What Changed in Code

### useEntityUpdates

```startLine:endLine:lib/hooks/use-entity-updates.ts
import { useEffect, useCallback, useRef } from 'react';
// ... see full file for details ...
```

### UI Events Dispatcher

```startLine:endLine:lib/ui/ui-events.ts
export type EntityKind = 'task' | 'item' | 'financial' | 'sale' | 'site' | 'character' | 'player';
// ... see full file for details ...
```


