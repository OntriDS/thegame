# Entities Logging System - Deep Analysis

> **Excluded from Analysis**: Links logging (managed separately in `links/links-logging.ts`)  
> **Focus**: Core entity lifecycle logging (Tasks, Items, Financials, Characters, Players, Sales, Sites)

---

## EXECUTIVE SUMMARY

The entities logging system implements an "Append-Only + Effects Registry" pattern with 3 layers:

1. **Entity Workflows** - Detect changes and trigger logging
2. **Effects Registry** - Prevent duplicate operations (idempotency)
3. **Logging Layer** - Write append-only log entries to KV

**Current Issues:**
- ✅ Solid foundation with good separation of concerns
- ⚠️ Some inconsistencies in event payloads between entities
- ⚠️ Complex update propagation logic that could be simplified
- ⚠️ No standard event schema enforced

**Overall Assessment**: The architecture is sound, but needs standardization across entity types.

---

## ARCHITECTURE FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                      ENTRY POINT                                 │
│  API Route (app/api/{entity}/route.ts)                          │
│  ├─ POST /api/tasks → upsertTask()                               │
│  ├─ POST /api/items → upsertItem()                               │
│  ├─ POST /api/financials → upsertFinancial()                     │
│  ├─ POST /api/sales → upsertSale()                               │
│  ├─ POST /api/characters → upsertCharacter()                     │
│  ├─ POST /api/sites → upsertSite()                               │
│  ├─ POST /api/players → upsertPlayer()                           │
│  └─ POST /api/accounts → upsertAccount()                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATASTORE LAYER                               │
│  data-store/datastore.ts                                         │
│                                                                   │
│  Flow (ALL entities):                                            │
│  1. Get previous entity from KV                                 │
│  2. Save new entity to KV (repository)                          │
│  3. Call on{Entity}Upsert(entity, previous) → logging           │
│  4. Call processLinkEntity(entity, type) → links                │
│  5. Return saved entity                                         │
│                                                                   │
│  Special: Character/Player/Account support skipWorkflowEffects  │
│  (for Triforce initialization to avoid circular dependencies)    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ENTITY WORKFLOWS LAYER                          │
│  workflows/entities-workflows/                                   │
│  ├─ task.workflow.ts                                             │
│  ├─ item.workflow.ts                                             │
│  ├─ financial.workflow.ts                                        │
│  └─ [other entity workflows]                                     │
│                                                                  │
│  Each workflow (verify all follow this):                        │
│  1. CREATED: New entity → Check effect → Log CREATED → Mark     │
│  2. STATE CHANGES: Status/fields change → Log state event       │
│  3. SIDE EFFECTS: Create items, award points (if applicable)    │
│  4. UPDATE PROPAGATION: Propagate to related entities           │
│  5. DESCRIPTIVE: Update in-place via updateEntityLogField()    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                EFFECTS REGISTRY LAYER                            │
│  data-store/effects-registry.ts                                 │
│                                                                  │
│  Idempotency checks (prevent duplicate operations):             │
│  - hasEffect(effectKey): Promise<boolean>                       │
│  - markEffect(effectKey): Promise<void>                         │
│  - clearEffect(effectKey): Promise<void>                        │
│                                                                  │
│  Effect Keys:                                                    │
│  - task:{id}:created                                             │
│  - task:{id}:itemCreated                                         │
│  - task:{id}:financialCreated                                    │
│  - task:{id}:pointsAwarded                                       │
│                                                                  │
│  Circuit Breaker: Prevents circular references                  │
│  - isProcessing() / startProcessing() / endProcessing()          │
│  - Max depth: 10 levels                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LOGGING LAYER                                  │
│  workflows/entities-logging.ts                                   │
│  ├─ appendEntityLog() - Append new lifecycle event              │
│  ├─ updateEntityLogField() - Update descriptive fields          │
│  └─ Specialized loggers (appendPlayerPointsLog, etc.)           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                                │
│  KV Store (Upstash Redis)                                        │
│  ├─ logs:task → Array<LogEntry>                                  │
│  ├─ logs:item → Array<LogEntry>                                  │
│  └─ [other entity logs]                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## KEY COMPONENTS

### 1. Entity Workflows (`workflows/entities-workflows/`)

Each entity type has its own workflow file that detects state changes and triggers appropriate logging.

#### Example: Task Workflow (`task.workflow.ts`)

**Flow:**
1. **New Task Creation**
   - Checks Effects Registry: `task:{id}:created`
   - If not exists: Logs CREATED event + marks effect
   - Handles special case: Recurrent template instance spawning

2. **Status Changes**
   - Detects `previousTask.status !== task.status`
   - Logs UPDATED event with transition context
   - Special: If Done → Other, triggers `uncompleteTask()` to rollback

3. **Completion Handling**
   - Detects `task.status === 'Done'` + `task.doneAt`
   - Logs DONE event
   - Creates items from emissary fields (if `outputItemType` exists)
   - Awards points (if `rewards.points` exists)
   - Creates financial record (if `cost`/`revenue`/`rewards` exist)

4. **Update Propagation**
   - Detects property changes via helper functions:
     - `hasFinancialPropsChanged()` - Did cost/revenue change?
     - `hasOutputPropsChanged()` - Did outputItem* fields change?
     - `hasRewardsChanged()` - Did rewards change?
   - Propagates changes to related entities (items, financials, player)

5. **Descriptive Field Updates**
   - Loops through DESCRIPTIVE_FIELDS array
   - Calls `updateEntityLogField()` for each changed field
   - Updates in-place on CREATED entry (not append)

**Key Functions:**
- `onTaskUpsert(task, previousTask?)` - Main entry point
- `removeTaskLogEntriesOnDelete(task)` - Cleanup on delete
- `uncompleteTask(taskId)` - Rollback completion

#### Example: Item Workflow (`item.workflow.ts`)

**Simpler than Task** - Items don't create other entities on completion.

**Flow:**
1. **New Item Creation**
   - Logs CREATED event with source tracking
   - Tracks `sourceTaskId` or `sourceRecordId`

2. **Stock Changes**
   - Detects `JSON.stringify(previousItem.stock) !== JSON.stringify(item.stock)`
   - Logs MOVED event with old/new stock

3. **Quantity Sold Changes**
   - Detects `item.quantitySold > previousItem.quantitySold`
   - Logs SOLD event

4. **Collection Status**
   - Detects `item.isCollected === true`
   - Logs COLLECTED event

#### Key Differences by Entity

| Entity | State Fields | Side Effects | Logging of Side Effects |
|--------|-------------|-------------|-------------------------|
| **Task** | status, progress, doneAt, collectedAt, siteId | Creates items, awards points, creates financial | ✅ Item logs itself via upsertItem() → item.workflow<br>✅ Player logs itself via upsertPlayer() → player.workflow<br>✅ Financial logs itself via upsertFinancial() → financial.workflow |
| **Item** | status, stock, quantitySold, isCollected | None | None |
| **Financial** | isNotPaid, isNotCharged, isCollected | Creates items, awards points | ✅ Item logs itself via upsertItem() → item.workflow<br>✅ Player logs itself via upsertPlayer() → player.workflow |
| **Character** | roles, isActive | None | None |
| **Player** | points, totalPoints, level | None | None |
| **Sale** | status, collectedAt, isNotPaid, isNotCharged | Processes lines, awards points | ✅ Items log themselves via upsertItem() → item.workflow<br>✅ Player logs itself via upsertPlayer() → player.workflow |
| **Site** | isActive, status | None | None |

**Key Finding:** Side effects (items, player updates, financial records) created by Task/Financial/Sale **automatically log themselves** because they go through `datastore.ts` → their own workflows. **No special logging needed** - the workflow system handles it automatically.

---

### 2. Effects Registry (`data-store/effects-registry.ts`)

**Purpose**: Prevents duplicate operations (idempotency check)

**Key Functions:**
```typescript
hasEffect(effectKey: string): Promise<boolean>    // Check if effect already ran
markEffect(effectKey: string): Promise<void>      // Mark effect as done
clearEffect(effectKey: string): Promise<void>     // Clear effect (for rollback)
```

**Effect Key Patterns:**
- `{entity}:{id}:created` - Creation logged
- `{entity}:{id}:itemCreated` - Item created
- `{entity}:{id}:pointsAwarded` - Points awarded
- `{entity}:{id}:financialCreated` - Financial record created

**Example Usage:**
```typescript
const effectKey = EffectKeys.created('task', task.id);
if (!(await hasEffect(effectKey))) {
  await appendEntityLog(EntityType.TASK, task.id, LogEventType.CREATED, {...});
  await markEffect(effectKey);
}
```

**Circuit Breaker:**
- `isProcessing()` - Checks if entity currently being processed
- `startProcessing()` - Locks entity (prevents circular references)
- `endProcessing()` - Unlocks entity
- Max depth: 10 levels (prevents infinite loops)

---

### 3. Logging Layer (`workflows/entities-logging.ts`)

**Main Functions:**

#### `appendEntityLog()`
```typescript
appendEntityLog(
  entityType: EntityType,    // Which entity (task, item, etc.)
  entityId: string,          // Entity ID
  event: LogEventType,       // Event type (CREATED, UPDATED, etc.)
  details: Record<string, any>  // Event-specific data
)
```

**Behavior:**
- Reads existing log array from KV: `logs:{entityType}`
- Creates new entry with `timestamp` + `event` + `entityId` + details
- Appends to array
- Writes back to KV

#### `updateEntityLogField()`
```typescript
updateEntityLogField(
  entityType: EntityType,
  entityId: string,
  fieldName: string,
  oldValue: any,
  newValue: any
)
```

**Behavior:**
- Finds CREATED entry for entity (by entityId + event === 'created')
- Updates that entry's field
- Adds `lastUpdated` timestamp
- Falls back to most recent entry if CREATED not found

**Specialized Loggers:**
- `appendPlayerPointsLog()` - Tracks points awards with source (XP, RP, FP, HP)
- `appendCharacterJungleCoinsLog()` - Tracks J$ awards with source
- `appendPlayerPointsUpdateLog()` - Tracks points changes (old vs new with delta)

**Why Specialized?**
These loggers track **complex structured data** (points objects with XP/RP/FP/HP) and provide:
1. **Source Attribution**: Which entity (task/financial/sale) awarded the points
2. **Change Tracking**: Old vs new values with delta calculation
3. **Rich Metadata**: Structured points objects instead of simple numbers

**Usage Pattern:**
- Called from utility functions (`points-rewards-utils.ts`) when awarding points
- Called from player workflow when logging point changes
- NOT used for regular entity logging (which uses `appendEntityLog()`)

**Standardization:** ✅ All 3 specialized loggers follow same pattern:
- Take entity ID, data, source ID, source type
- Create structured log entry with description
- Append to entity's log array
- Used ONLY for complex structured data (not simple status changes)

---

### 4. Event Types (`types/enums.ts`)

**LogEventType enum:**
```typescript
CREATED, UPDATED, DELETED,
DONE, PENDING,
MOVED, COLLECTED, SOLD,
ACTIVATED, DEACTIVATED,
ROLE_CHANGED,
POINTS_CHANGED,
UNCOMPLETED,
EMAIL_VERIFIED, PASSWORD_RESET, LOGIN, LOGOUT  // Defined but unused
```

**Not all entities use all events:**
- Tasks: CREATED, UPDATED, DONE, MOVED, COLLECTED, UNCOMPLETED
- Items: CREATED, UPDATED, MOVED, SOLD, COLLECTED
- Financials: CREATED, UPDATED, DONE, PENDING, COLLECTED
- Characters: CREATED, UPDATED, ROLE_CHANGED
- Players: CREATED, LEVEL_UP, POINTS_CHANGED, UPDATED
- Sales: CREATED, DONE, PENDING, CANCELLED, COLLECTED
- Sites: CREATED, ACTIVATED, DEACTIVATED, UPDATED
- Accounts: **NO LOGGING** (infrastructure entity only)

**Note:** Account workflow exists but does not log to avoid infrastructure noise.

---

## ISSUES IDENTIFIED

### 1. ⚠️ Inconsistent Event Payloads

**Problem:** Each entity logs different fields, no standard schema.

**Examples:**

Task CREATED logs:
```typescript
{ name, taskType, station, priority, sourceSaleId, dueDate, frequencyConfig }
```

Item CREATED logs:
```typescript
{ name, itemType, station, collection, status, quantity, unitCost, totalCost, price, sourceType, sourceId }
```

Financial CREATED logs:
```typescript
{ name, type, station, cost, revenue, isNotPaid, isNotCharged }
```

**Impact:** Hard to query logs consistently across entity types.

**Recommendation:**
- Define standard fields: `name`, `type`, `entityId`, `timestamp`
- Keep entity-specific fields in `metadata` object

---

### 2. ⚠️ Complex State Detection Logic

**Problem:** State change detection is scattered across workflows.

**Examples:**

Task:
```typescript
if (previousTask && previousTask.status !== task.status) { /* ... */ }
if (task.status === 'Done' && task.doneAt) { /* ... */ }
if (previousTask && (previousTask.siteId !== task.siteId || previousTask.targetSiteId !== task.targetSiteId)) { /* ... */ }
```

Item:
```typescript
const stockChanged = JSON.stringify(previousItem.stock) !== JSON.stringify(item.stock);
if (stockChanged) { /* ... */ }
```

**Recommendation:**
- Create unified state detection utilities
- Define STATE_FIELDS arrays consistently across workflows

---

### 3. ⚠️ Descriptive vs State Fields Not Enforced

**Problem:** Defined but not consistently used.

**Example - Task:**
```typescript
const STATE_FIELDS = ['status', 'progress', 'doneAt', 'collectedAt', 'siteId', 'targetSiteId'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'cost', 'revenue', 'rewards', 'priority'];
```

But logic handles these manually, not using the arrays:
```typescript
if (previousTask.status !== task.status) { /* state change */ }
for (const field of DESCRIPTIVE_FIELDS) { /* descriptive change */ }
```

**Recommendation:**
- Create helper: `detectStateChanges(previous, current, stateFields)`
- Returns list of changed fields for automatic detection

---

### 4. ⚠️ Update Propagation Complexity

**Problem:** Complex change detection in `update-propagation-utils.ts`.

**Examples:**
```typescript
export function hasFinancialPropsChanged(task: Task, previousTask: Task): boolean {
  return (
    task.cost !== previousTask.cost ||
    task.revenue !== previousTask.revenue ||
    JSON.stringify(task.rewards) !== JSON.stringify(previousTask.rewards)
  );
}
```

These functions are duplicated across entities with slight variations.

**Recommendation:**
- Generic helper: `detectChangedFields(obj1, obj2, fields)`
- Works for any entity type

---

### 5. ⚠️ Effects Registry Overuse

**Problem:** Used for idempotency but also scattered throughout code.

**Example - Task workflow:**
```typescript
// Uses Effects Registry for:
- Task creation logging (effectKey: 'task:{id}:created')
- Item creation (effectKey: 'task:{id}:itemCreated')
- Points awarding (effectKey: 'task:{id}:pointsAwarded')
- Financial creation (effectKey: 'task:{id}:financialCreated')
- Template instances (effectKey: 'task:{id}:instancesGenerated')
```

**Recommendation:**
- Centralize effect key generation in `EffectKeys` helper (already exists)
- Document which effects each entity uses

---

## RECOMMENDATIONS FOR STANDARDIZATION

### 1. Create Standard Log Entry Schema

```typescript
interface StandardLogEntry {
  // Common fields (all entities)
  event: LogEventType;
  entityId: string;
  timestamp: string;
  lastUpdated?: string;
  
  // Standard metadata
  name: string;
  type?: string;
  
  // Entity-specific data
  metadata: Record<string, any>;
}
```

### 2. Unified State Change Detection

```typescript
function detectStateChanges<T>(
  previous: T,
  current: T,
  stateFields: string[]
): string[] {
  return stateFields.filter(field => {
    const prev = (previous as any)[field];
    const curr = (current as any)[field];
    return JSON.stringify(prev) !== JSON.stringify(curr);
  });
}
```

### 3. Generic Field Change Detector

```typescript
function hasFieldsChanged<T>(
  previous: T,
  current: T,
  fields: string[]
): boolean {
  return fields.some(field => {
    const prev = (previous as any)[field];
    const curr = (current as any)[field];
    return JSON.stringify(prev) !== JSON.stringify(curr);
  });
}
```

### 4. Standardize Event Payloads

Create helper:
```typescript
function createLogEntry(
  event: LogEventType,
  entity: any,
  entityId: string,
  additionalData: Record<string, any> = {}
): StandardLogEntry {
  return {
    event,
    entityId,
    timestamp: new Date().toISOString(),
    name: entity.name,
    type: entity.type,
    metadata: {
      ...additionalData,
      // Add standard metadata by entity type
    }
  };
}
```

### 5. Document Effect Keys

Create mapping:
```typescript
const EFFECT_KEY_USAGE = {
  task: ['created', 'itemCreated', 'pointsAwarded', 'financialCreated', 'instancesGenerated'],
  item: ['created'],
  financial: ['created', 'itemCreated', 'pointsAwarded'],
  // ... etc
};
```

---

## SUMMARY

**Strengths:**
- ✅ Clear separation: Workflows → Effects → Logging → Storage
- ✅ Idempotency protection via Effects Registry
- ✅ Append-only logs prevent corruption
- ✅ Circuit breaker prevents infinite loops

**Weaknesses:**
- ⚠️ Inconsistent event payloads between entities
- ⚠️ Complex state detection logic duplicated
- ⚠️ No standard schema enforced
- ⚠️ Update propagation could be simplified

**Next Steps:**
1. Create standard log entry schema
2. Add unified state change detection utilities
3. Document effect key usage per entity
4. Standardize event payloads across entities
5. Simplify update propagation logic

---

---

## VERIFICATION RESULTS

### ✅ VERIFIED: `updateEntityLogField()` Usage is Standardized

**All entities use the same pattern:**

```typescript
if (previousEntity) {
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousEntity as any)[field] !== (entity as any)[field]) {
      await updateEntityLogField(EntityType, id, field, oldValue, newValue);
    }
  }
}
```

**Standardized across:** Task, Item, Financial, Sale, Site, Character, Player

**Fixed:** Removed non-standard `updateItemLogEntryForItem()` and `updateAllItemLogEntries()` functions from Item workflow. Item now uses the standard DESCRIPTIVE_FIELDS loop like all other entities.

---

### ✅ VERIFIED: Logging Layer `appendEntityLog()` is Consistent Across All Entities

**All entities call `appendEntityLog()` correctly:**
- **Task:** 7 calls (CREATED, UPDATED, DONE, COLLECTED, MOVED, UNCOMPLETED, status transitions)
- **Item:** 5 calls (CREATED, MOVED, SOLD, COLLECTED, UPDATED)
- **Financial:** 4 calls (CREATED, DONE, PENDING, COLLECTED)
- **Character:** 3 calls (CREATED, ROLE_CHANGED, UPDATED)
- **Player:** 4 calls (CREATED, LEVEL_UP, POINTS_CHANGED, UPDATED)
- **Sale:** 5 calls (CREATED, CANCELLED, DONE, PENDING, COLLECTED)
- **Site:** 4 calls (CREATED, ACTIVATED, DEACTIVATED, UPDATED)

**Special Cases Verified:**
- ✅ Task created with `status='Done'` logs both CREATED and DONE (early return doesn't prevent this)
- ✅ All side effects (items, financials, points) log themselves via their own workflows
- ✅ `appendEntityLog()` writes to KV correctly for all entity types

**No inconsistencies found in logging layer implementation.**

---

### ✅ VERIFIED: Side Effects Create Once, Then Update Via Propagation

**Verified Flow:**

1. **First Time (Task marked Done):**
   - Lines 147-156: Creates item from task emissary fields → Calls `upsertItem()` → Item logs itself (CREATED)
   - Lines 170-181: Creates financial record → Calls `upsertFinancial()` → Financial logs itself (CREATED)
   - Effects marked: `task:{id}:itemCreated`, `task:{id}:financialCreated`

2. **Subsequent Updates (Task properties change):**
   - Lines 184-197: Update propagation detects changes
   - Calls `updateFinancialRecordsFromTask()` → Updates financial → Calls `upsertFinancial()` → Financial logs itself (UPDATED)
   - Calls `updateItemsCreatedByTask()` → Updates item → Calls `upsertItem()` → Item logs itself (UPDATED)

**Conclusion:** Side effects (items, financials) **DO log** when:
- ✅ First created (CREATED event)
- ✅ Updated via propagation (UPDATED event)

**If items/financials are NOT logging, the issue is elsewhere** (not in task workflow logic).

---

### ✅ All Entities Follow Same Flow

**Datastore Layer:**
- All entities: Get previous → Save to KV → Call workflow → Process links → Return saved
- Special: Character/Player/Account support `skipWorkflowEffects` for Triforce initialization

**Workflow Layer:**
- All entities follow same 5-step pattern: CREATED → State changes → Side effects → Update propagation → Descriptive updates
- Side effects automatically log themselves (items, player updates, financials)

**Logging Layer:**
- All entities use same `appendEntityLog()` and `updateEntityLogField()` functions
- Consistent logging behavior across all entities

**No inconsistencies found** in core architecture flow.

---

### ✅ VERIFIED: Storage Layer and API Routes Working Correctly

**Storage:**
- Logs stored in KV as arrays: `logs:task`, `logs:item`, `logs:financial`, etc.
- Key builder: `buildLogKey(entityType)` creates correct keys
- All entities use same storage pattern

**API Routes:**
- `/api/tasks-log` → GET returns all task logs from KV
- `/api/items-log` → GET returns all item logs from KV
- `/api/financials-log` → GET returns all financial logs from KV
- All routes: Import `kvGet` → Call `buildLogKey(EntityType)` → Return entries array

**Flow Verified:**
1. ✅ Workflows call `appendEntityLog()` → writes to KV
2. ✅ API routes call `kvGet(buildLogKey())` → reads from KV
3. ✅ Keys match: `logs:task`, `logs:item`, `logs:financial`

**Conclusion:** Storage layer is working correctly. If logs are not appearing, the issue is in:
- Workflows not calling `appendEntityLog()` (unlikely - verified above)
- KV write failures (check console for errors)
- KV connection issues (check KV credentials/setup)

**🔴 CRITICAL: Items/Financials Not Logging When Task Done**

**Problem:** Items and Financials lifecycle logs are empty even after completing tasks that have the required fields.

**Actual Root Cause:**
- Effects Registry has leftover `effectKey` marks from previous runs
- Task workflow checks `if (!(await hasEffect(effectKey)))` before creating items/financials
- If effect is already marked → Creation/logging is SKIPPED
- Effects never cleared when task is uncompleted or when testing

**Evidence:**
- Task A has `outputItemType` and `revenue: $2` (visible in UI)
- Task A shows as Done in tasks log
- But items and financials logs are empty
- This means: `hasEffect('task:TaskA:id:itemCreated')` returns `true`
- This means: `hasEffect('task:TaskA:id:financialCreated')` returns `true`

**Solution:**
1. Clear all effects: Run Settings → Clear Cache or manually clear KV `effects:*` keys
2. Fix Task: Uncomplete Task A → Re-complete it → Should create items/financials
3. **PROPER FIX**: Effects should be cleared when task status changes from Done to non-Done

### 🟡 FUTURE: Log Storage Architecture (Pagination not root cause of current issues)

**Current State:** All logs stored in single unbounded arrays (`logs:task`, `logs:item`, etc.)

**What happens:**
- Every log fetch loads **ENTIRE** log history (no pagination)
- Frontend filters in-memory
- Logs grow unbounded (never pruned)

**Evidence:**
- API routes: `/api/tasks-log`, `/api/items-log`, etc. load entire arrays
- `buildLogKey()` supports `yyyymm` parameter but never used

**Note:** System is blank/new, so this is not current production issue. Address when logs grow.

---

**Last Updated:** 2025-01-27  
**Analysis By:** AI Assistant  
**Related Files:**
- `workflows/entities-logging.ts`
- `workflows/entities-workflows/*.workflow.ts`
- `data-store/effects-registry.ts`
- `data-store/keys.ts`
- `app/api/**-log/route.ts`
