# Archive System Fix - Session Handover

## Context
We've been fixing the archive/collection system for **thegame** project. The system handles collecting entities (Tasks, Items, Sales, Financials) and displaying them in History Tabs and Archive Vault.

## What Was Broken

1. **Inconsistent snapshot keys**: Items were using `archive:item:MM-YY:{id}` instead of `archive:item-snapshots:MM-YY:{id}`
2. **Tasks being deleted**: When collected, tasks were deleted from `data:task:{id}` instead of staying in place
3. **No month indexes**: Collection/sold entities had no efficient month-based indexes for querying
4. **Archive Vault showing 0**: Archive counting was using wrong entity type keys
5. **COLLECTED event not logged**: Lifecycle logs weren't showing collection events

## What We Fixed

### 1. Standardized Snapshot Keys
**File:** `data-store/datastore.ts` (lines 501-514)

Changed all snapshot archive functions to use consistent `-snapshots` suffix:
```typescript
archiveItemSnapshot() → uses 'item-snapshots' (was EntityType.ITEM)
archiveSaleSnapshot() → uses 'sale-snapshots' (was EntityType.SALE)
archiveFinancialRecordSnapshot() → uses 'financial-snapshots' (was EntityType.FINANCIAL)
```

**Result:** All snapshots now at: `archive:{entity}-snapshots:{MM-YY}:{snapshot-id}`

### 2. Fixed Task Collection Workflow
**File:** `workflows/entities-workflows/task.workflow.ts` (lines 177-196)

**Before (WRONG):**
- Created snapshot
- Moved task to `archive:tasks:{id}` 
- **DELETED** from `data:task:{id}`

**After (CORRECT):**
- Creates snapshot at `archive:task-snapshots:12-25:{id}`
- Logs COLLECTED event
- Adds task ID to `index:tasks:collected:12-25`
- **Task STAYS at `data:task:{id}` with `isCollected=true`**
- Mission Tree filters it out via `getAllTasks()` (line 103 filters `!task.isCollected`)

### 3. Added Month Indexes for Efficient Querying

**Tasks** (`task.workflow.ts` line 184):
```typescript
const collectedIndexKey = `index:tasks:collected:${monthKey}`;
await kvSAdd(collectedIndexKey, task.id);
```

**Items** (`item.workflow.ts` line 141 + `sale.workflow.ts` line 286):
```typescript
const soldIndexKey = `index:items:sold:${monthKey}`;
await kvSAdd(soldIndexKey, item.id);
```

**Sales** (`sale.workflow.ts` line 258):
```typescript
const collectedIndexKey = `index:sales:collected:${monthKey}`;
await kvSAdd(collectedIndexKey, sale.id);
```

**Financials** (`financial.workflow.ts` lines 133 and 205):
```typescript
const collectedIndexKey = `index:financials:collected:${monthKey}`;
await kvSAdd(collectedIndexKey, financial.id);
```

### 4. Created Efficient History API
**New File:** `app/api/tasks/history/route.ts`

Queries from month index instead of filtering all tasks:
```typescript
const collectedIndexKey = `index:tasks:collected:${monthKey}`;
const taskIds = await kvSMembers(collectedIndexKey);
const tasks = await Promise.all(taskIds.map(id => getTaskById(id)));
```

### 5. Updated History Tab Component
**File:** `components/control-room/task-history-view.tsx` (line 59)

Changed from:
```typescript
fetch(`/api/archive/tasks?month=${monthKey}`) // Old archive API
```

To:
```typescript
fetch(`/api/tasks/history?month=${currentMonth}&year=${currentYear}`) // New history API
```

### 6. Fixed Archive Vault Counting
**File:** `data-store/datastore.ts` (lines 517-534)

Changed to use snapshot entity types and extract `.data`:
```typescript
export async function getArchivedTasksByMonth(mmyy: string): Promise<Task[]> {
  const snapshots = await archiveRepo.getArchivedEntitiesByMonth<TaskSnapshot>('task-snapshots', mmyy);
  return snapshots.map(s => s.data as unknown as Task);
}
```

Added import:
```typescript
import type { TaskSnapshot, ItemSnapshot, SaleSnapshot, FinancialSnapshot } from '@/types/archive';
```

## Current System Architecture

### Entity Collection Flow

**When entity is collected/sold:**

1. **Entity stays in place** with status flag:
   - `data:task:{id}` → `isCollected=true`, `status=Collected`
   - `data:item:{id}` → `status=SOLD`
   - `data:sale:{id}` → `isCollected=true`, `status=COLLECTED`
   - `data:financial:{id}` → `isCollected=true`, `status=COLLECTED`

2. **Snapshot created** for Archive Vault statistics:
   - `archive:task-snapshots:12-25:{snapshot-id}`
   - `archive:item-snapshots:12-25:{snapshot-id}`
   - `archive:sale-snapshots:12-25:{snapshot-id}`
   - `archive:financial-snapshots:12-25:{snapshot-id}`

3. **Month index updated** for efficient History Tab queries:
   - `index:tasks:collected:12-25` → Set of collected task IDs
   - `index:items:sold:12-25` → Set of sold item IDs
   - `index:sales:collected:12-25` → Set of collected sale IDs
   - `index:financials:collected:12-25` → Set of collected financial IDs

### Display Logic

**Tasks:**
- Mission Tree: Uses `getAllTasks()` which filters `!isCollected`
- History Tab: Queries from `index:tasks:collected:{MM-YY}` via `/api/tasks/history`

**Items:**
- Inventory: Filters `status !== SOLD`
- Sold Items Tab: Should query from `index:items:sold:{MM-YY}` (not yet implemented)

**Sales & Financials:**
- Monthly views show ALL (active + collected)
- UI can display badge/icon for `isCollected=true` entities

## Current Testing Status

### Test Results (From user's last test):
1. ✅ **History Tab**: Shows collected task in December 2025
2. ❌ **Lifecycle Log**: COLLECTED event not showing (SHOULD BE FIXED NOW - we added logging)
3. ❌ **Archive Vault**: Shows 0 tasks (SHOULD BE FIXED NOW - we fixed snapshot queries)

## What Needs Testing

**Collect a NEW task and verify:**
1. Task disappears from Mission Tree ✅ (should work - confirmed code filters correctly)
2. Task appears in History Tab December 2025 ✅ (confirmed working)
3. Lifecycle Log shows COLLECTED event ❓ (fixed, needs re-test)
4. Archive Vault shows "Tasks: 1" for December ❓ (fixed, needs re-test)
5. Database has:
   - ✅ `data:task:{id}` with `isCollected=true`
   - ✅ `archive:task-snapshots:12-25:{snapshot-id}`
   - ✅ `index:tasks:collected:12-25` contains task ID
   - ❌ NO `archive:tasks:{id}` key

## Manual Database Cleanup Needed

After confirming code works correctly, user needs to manually clean up 4 existing entities:

**Delete wrong keys:**
```
archive:tasks:task-{old-id} (full task that was incorrectly saved)
archive:item:11-25:* (3 items with old key pattern)
archive:index:11-25:item (wrong index)
```

**Restore/Create correct data:**
```
data:task:{id} (restore from snapshot if deleted)
index:tasks:collected:12-25 (add task ID)
index:items:sold:11-25 (add 3 item IDs)
```

## Files Modified

1. ✅ `data-store/datastore.ts` - Snapshot functions, Archive imports
2. ✅ `workflows/entities-workflows/task.workflow.ts` - Collection workflow
3. ✅ `workflows/entities-workflows/item.workflow.ts` - Sold index
4. ✅ `workflows/entities-workflows/sale.workflow.ts` - Sold index + collection index
5. ✅ `workflows/entities-workflows/financial.workflow.ts` - Collection index
6. ✅ `components/control-room/task-history-view.tsx` - New history API
7. ✅ `app/api/tasks/history/route.ts` - NEW FILE (efficient history endpoint)

## Files Created

- `app/api/tasks/history/route.ts` - Month-based history API for tasks

## TypeScript Status

✅ Compiles with no errors (confirmed with `npx tsc --noEmit`)

## Next Steps

1. **Test NEW task collection** to verify all 3 issues are resolved
2. If all green:
   - Manually clean database (delete wrong keys)
   - Create missing indexes for existing 4 entities
3. **Future enhancements** (not urgent):
   - Create `/api/items/sold-history` for Sold Items tab
   - Create `/api/sales/history` and `/api/financials/history` if needed
   - Add visual badges for collected Sales/Financials in monthly views

## Key Design Principles Established

1. **Entities stay in place** - Never delete when collected, just flag
2. **Snapshots for statistics** - Archive Vault reads snapshots
3. **Indexes for queries** - History Tabs use month indexes for efficiency
4. **Consistent naming** - All snapshots use `{entity}-snapshots` pattern

---

**Ready to test!** The code should now correctly:
- Keep tasks in place with `isCollected=true`
- Show COLLECTED events in logs
- Display correct counts in Archive Vault
- Efficiently query History Tab via indexes
