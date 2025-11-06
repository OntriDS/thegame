# Logging Architecture

> **Architecture Update**: This project now uses a KV-only architecture with Upstash Redis.
> localStorage cache and offline mode are planned for future implementation.
> All references to HybridAdapter/LocalAdapter reflect the old 2-adapter system (removed Oct 2024).

## Overview

The Logging Architecture implements the "Best of Both Worlds" approach: **append-only logs** for clean history and **effects registry** for idempotency. This eliminates log corruption while preventing duplicate Links Effects.

## Core Principles

### 1. **Append-Only Logs**
- All logs (tasks, items, financials, character, player-progress, sales) are strictly append-only
- Never modify or delete existing log entries
- Clean, immutable audit trail

### 2. **Effects Registry for Idempotency**
- Tiny "effects checklist" per entity tracks what Links Effects have occurred
- Prevents duplicate item creation, financial logging, or point awards
- Simple KV/localStorage operations (no complex Lua scripts on large logs)

### 3. **Environment Agnostic**
- Workflows never detect environment
- Adapters handle environment-specific operations
- Consistent API regardless of storage backend

### 4. **Atomic Operations**
- localStorage operations are naturally atomic (synchronous)
- KV operations use simple GET/SET for effects registry
- No race conditions possible

## Best of Both Worlds Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                WORKFLOWS LAYER                            │
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌──────────────────┐ │
│  │ Task Workflows      │   │ Record Workflows    │   │ Item Workflows   │ │
│  │                     │   │                     │   │                  │ │
│  │ • processTaskEffects│   │ • logRecordCreation │   │ • logItemCreation│ │
│  │ • uncompleteTask    │   │ • logRecordUpdate   │   │ • logItemUpdate  │ │
│  └─────────────────────┘   └─────────────────────┘   └──────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           EFFECTS REGISTRY                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │              EffectsRegistry (Idempotency Layer)                   │ │
│  │                                                                    │ │
│  │ • hasEffect(entityId, effectKey): boolean                          │ │
│  │ • markEffect(entityId, effectKey): void                            │ │
│  │ • clearEffect(entityId, effectKey): void                           │ │
│  │                                                                    │ │
│  │ Effect Keys:                                                       │ │
│  │ • itemCreated: true                                                │ │
│  │ • financialLogged:2025-10: true                                    │ │
│  │ • pointsLogged:2025-10: true                                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         APPEND-ONLY LOGGING                              │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    LoggingDataStore                                 │ │
│  │                                                                     │ │
│  │ • addLogEntry(logType, entityId, entityType, status, data)          │ │
│  │ • NEVER updateLogEntry (append-only!)                               │ │
│  │ • NEVER removeLogEntry (append-only!)                               │ │
│  │ • getLogEntries(logType, filters?)                                  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         LOGGING ADAPTERS                                 │
│  ┌─────────────────────────┐         ┌─────────────────────────┐         │
│  │   KV-only system        │         │  KV-only system         │         │
│  │                         │         │                         │         │
│  │ • KV operations         │         │ • KV operations         │         │
│  │ • Append-only writes    │         │ • Append-only writes    │         │
│  │ • Production ready      │         │ • Production ready      │         │
│  └─────────────────────────┘         └─────────────────────────┘         │
└───────────────────────────────────────────────────────────────────────────┘
```

## How the Best of Both Worlds Works

### The Problem
We want logs that are a clean history (append-only), but we also don't want to double-count things (like items, money, or points) if a task gets toggled Done→In Progress→Done again.

### The Solution
1. **Keep logs simple and append-only** - Never modify existing entries
2. **Stop duplicates at the source** with a tiny "effects checklist" per task/record that remembers what we already did

### How It Works (In Human Terms)

#### Tiny Checklist Per Task/Record
When a task completes, we look at a tiny checklist (stored in KV in prod, localStorage in dev).

**Example keys:**
- `itemCreated: true`
- `financialLogged:2025-10: true`
- `pointsLogged:2025-10: true`

#### When You Mark a Task Done
- If `itemCreated` is not set → we create the item, log it, then set `itemCreated = true`
- If `itemCreated` is already true → we don't create the item again. We can optionally add a small "skipped duplicate" note in the logs for transparency

#### For Money and Points
Same thing but with a month tag:
- If `financialLogged:2025-10` is not set → log it once and set it
- If you toggle statuses and come back to Done in the same month, it won't re-count

#### When You "Uncomplete" a Task
We undo side effects (e.g., remove the created item), and we clear the checklist flags so doing Done again can recreate exactly what's needed.

Logs still stay append-only. We add a "reverted" entry instead of editing past entries.

### Why This Is Good
- **No more log corruption**: logs are append-only (no in-place edits)
- **No duplicates**: the checklist blocks extra creations or double-counting
- **Easy to reason about**: "Did we already do X?" is one tiny KV read/write, not a complex Lua dance on big log files

## Log Types and Entity Mapping

### Log Types (All Append-Only)
- **`tasks-log`**: Task lifecycle events (created, completed, updated, renamed)
- **`financials-log`**: Financial operations from tasks and records (created, updated)
- **`items-log`**: Item creation and management events (created, updated)
- **`character-log`**: Character lifecycle/history (full snapshots)
- **`player-progress-log`**: Points, achievements, progression (PLAYER role, time-series)

### Entity Types
- **`task`**: Task-related log entries
- **`financial`**: Financial record-related log entries
- **`item`**: Item-related log entries
- **`character`**: Character-related log entries (identity/roles/history)

### Entity Flow Mapping (With Effects Registry)

#### 1. **TASKS**
```
TaskModal → TaskSideEffects → KV-only system → Workflows → EffectsRegistry + Logs
├── Task Creation → tasks-log (always append)
├── Task Completion → 
│   ├── Check EffectsRegistry.hasEffect(taskId, 'itemCreated')
│   ├── If false: create item, log to items-log, mark effect
│   ├── Check EffectsRegistry.hasEffect(taskId, 'financialLogged:YYYY-MM')
│   ├── If false: log to financials-log, mark effect
│   ├── Check EffectsRegistry.hasEffect(taskId, 'pointsLogged:YYYY-MM')
│   └── If false: log to player-progress-log, mark effect
└── Task Update → tasks-log (append "updated" entry)
```

#### 2. **FINANCIAL RECORDS**
```
RecordModal → RecordSideEffects → KV-only system → Workflows → EffectsRegistry + Logs
├── Record Creation → financials-log (always append)
├── Item Creation → items-log (if record creates item)
└── Player Points → player-progress-log (if record awards points)
```

#### 3. **ITEMS**
```
ItemModal → ItemSideEffects → KV-only system → Workflows → Logs
└── Item Creation → items-log (always append)
```

## Implementation Details

### EffectsRegistry Interface

```typescript
// lib/utils/effects-registry.ts
export const EffectsRegistry = {
  async markEffect(entityId: string, effectKey: string): Promise<void> {
    const key = buildEntityKey(entityId);
    if (isBrowser()) {
      const effects = JSON.parse(localStorage.getItem(key) || '{}');
      effects[effectKey] = true;
      localStorage.setItem(key, JSON.stringify(effects));
    } else {
      await kv.hset(key, { [effectKey]: true });
    }
  },

  async hasEffect(entityId: string, effectKey: string): Promise<boolean> {
    const key = buildEntityKey(entityId);
    if (isBrowser()) {
      const effects = JSON.parse(localStorage.getItem(key) || '{}');
      return !!effects[effectKey];
    } else {
      const result = await kv.hget(key, effectKey);
      return !!result;
    }
  },

  async clearEffect(entityId: string, effectKey: string): Promise<void> {
    const key = buildEntityKey(entityId);
    if (isBrowser()) {
      const effects = JSON.parse(localStorage.getItem(key) || '{}');
      delete effects[effectKey];
      localStorage.setItem(key, JSON.stringify(effects));
    } else {
      await kv.hdel(key, effectKey);
    }
  }
};
```

### LoggingDataStore Interface (Append-Only)

```typescript
class LoggingDataStore {
  private adapter: LoggingAdapter | null = null;
  
  async getLoggingAdapter(): Promise<LoggingAdapter> {
    if (this.adapter) return this.adapter;
    
    const storageMode = DEFAULT_STORAGE_MODE;
    switch (storageMode) {
      case StorageMode.LOCAL:
        this.adapter = new LoggingLocalAdapter();
        break;
      case StorageMode.HYBRID:
        this.adapter = new LoggingHybridAdapter();
        break;
    }
    return this.adapter;
  }
  
  // Append-only interface for all logging operations
  async addLogEntry(
    logType: LogType, 
    entityId: string, 
    entityType: EntityType, 
    status: string, 
    data: any, 
    description?: string
  ): Promise<LoggingResult> {
    const adapter = await this.getLoggingAdapter();
    return adapter.addLogEntry(logType, entityId, entityType, status, data, description);
  }
  
  // NO updateLogEntry - logs are append-only!
  // NO removeLogEntry - logs are append-only!
  
  async getLogEntries(logType: LogType, filters?: LogFilters): Promise<LogEntry[]> {
    const adapter = await this.getLoggingAdapter();
    return adapter.getLogEntries(logType, filters);
  }
}
```

### Workflow Integration Example

```typescript
// lib/workflows/entity-workflows.ts
async function processTaskCompletionEffects(task: Task): Promise<void> {
  // 1. Create item (with idempotency check)
  const itemCreatedKey = 'itemCreated';
  if (!(await EffectsRegistry.hasEffect(task.id, itemCreatedKey))) {
    await createItemFromTask(task);
    await EffectsRegistry.markEffect(task.id, itemCreatedKey);
    await logItemCreation(task);
  } else {
    await logItemSkippedDuplicate(task, itemCreatedKey); // Optional transparency
  }

  // 2. Log financials (with monthly idempotency check)
  const monthlyKey = buildMonthlyKey(task.doneAt || new Date());
  const financialLoggedKey = `financialLogged:${monthlyKey}`;
  if (!(await EffectsRegistry.hasEffect(task.id, financialLoggedKey))) {
    await logFinancialEffect(task);
    await EffectsRegistry.markEffect(task.id, financialLoggedKey);
  }

  // 3. Log player points (with monthly idempotency check)
  const pointsLoggedKey = `pointsLogged:${monthlyKey}`;
  if (!(await EffectsRegistry.hasEffect(task.id, pointsLoggedKey))) {
    await logPlayerEffect(task);
    await EffectsRegistry.markEffect(task.id, pointsLoggedKey);
  }
}

async function uncompleteTask(taskId: string): Promise<void> {
  // Clear all effects for this task
  await EffectsRegistry.clearEffect(taskId, 'itemCreated');
  
  const monthlyKey = buildMonthlyKey(new Date());
  await EffectsRegistry.clearEffect(taskId, `financialLogged:${monthlyKey}`);
  await EffectsRegistry.clearEffect(taskId, `pointsLogged:${monthlyKey}`);
  
  // Apply rollback effects (remove created items, etc.)
  await rollbackTaskEffects(taskId);
  
  // Log rollback as append-only entry
  await logTaskRollback(taskId);
}
```

### LoggingLocalAdapter (Development - Append-Only)

```typescript
export class LoggingLocalAdapter implements LoggingAdapter {
  async addLogEntry(
    logType: LogType, 
    entityId: string, 
    entityType: EntityType, 
    status: string, 
    data: any, 
    description?: string
  ): Promise<LoggingResult> {
    // Always append - never update existing entries
    const response = await fetch('/api/local-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logType,
        data: {
          entries: [createLogEntry(entityId, entityType, status, data, description)],
          lastUpdated: new Date().toISOString()
        }
      })
    });
    
    return response.ok ? { success: true } : { success: false, message: 'Failed to write to filesystem' };
  }
}
```

### LoggingHybridAdapter (Production - Append-Only)

```typescript
export class LoggingHybridAdapter implements LoggingAdapter {
  async addLogEntry(
    logType: LogType, 
    entityId: string, 
    entityType: EntityType, 
    status: string, 
    data: any, 
    description?: string
  ): Promise<LoggingResult> {
    // Always append - never update existing entries
    const logKey = KV_LOG_KEYS[logType.toUpperCase()];
    return await kvAddLogEntry(logKey, entityId, entityType, status, data, description);
  }
}
```

## Happy Path Flows (Best of Both Worlds)

### Development Environment (LocalAdapter + EffectsRegistry)

```
1. TaskModal → onSave(task, sideEffects)
2. ControlRoom → DataStore.upsertTask(task, sideEffects)
3. DataStore → LocalAdapter.upsertTask(task, sideEffects)
4. LocalAdapter → processTaskCompletionEffects(task)
5. Workflow → EffectsRegistry.hasEffect(taskId, 'itemCreated')
6. If false: createItemFromTask() + markEffect() + logItemCreation()
7. LoggingDataStore → LoggingLocalAdapter.addLogEntry() (append-only)
8. LoggingLocalAdapter → /api/local-logs → filesystem write (logs-entities/)
```

### Production Environment (HybridAdapter + EffectsRegistry)

```
1. TaskModal → onSave(task, sideEffects)
2. ControlRoom → DataStore.upsertTask(task, sideEffects)
3. DataStore → HybridAdapter.upsertTask(task, sideEffects)
4. HybridAdapter → fetch('/api/tasks', { method: 'POST', body: { task, sideEffects } })
5. API Route → kv.set(`task:${task.id}`, task) + processTaskCompletionEffects(task)
6. Workflow → EffectsRegistry.hasEffect(taskId, 'itemCreated') [KV check]
7. If false: createItemFromTask() + markEffect() + logItemCreation()
8. LoggingDataStore → LoggingHybridAdapter.addLogEntry() (append-only)
9. LoggingHybridAdapter → kvAddLogEntry() (KV append-only)
```

## How the Best of Both Worlds Works

### Development Flow (LocalAdapter + EffectsRegistry)
1. User saves in Modal
   ↓
2. Parent calls DataStore.upsertTask()
   ↓
3. DataStore → LocalAdapter.upsertTask()
   ↓
4. LocalAdapter calls processTaskCompletionEffects()
   ↓
5. Workflow checks EffectsRegistry (localStorage) for idempotency
   ↓
6. If effect not done: execute effect + mark in registry + log (append-only)
   ↓
7. LoggingDataStore → LoggingLocalAdapter (filesystem to logs-entities/)

### Production Flow (HybridAdapter + EffectsRegistry)
1. User saves in Modal
   ↓
2. Parent calls DataStore.upsertTask()
   ↓
3. DataStore → HybridAdapter.upsertTask()
   ↓
4. HybridAdapter calls fetch('/api/tasks')
   ↓
5. API Route calls processTaskCompletionEffects()
   ↓
6. Workflow checks EffectsRegistry (KV) for idempotency
   ↓
7. If effect not done: execute effect + mark in registry + log (append-only)
   ↓
8. LoggingDataStore → LoggingHybridAdapter (KV append-only)

---

## Benefits of Best of Both Worlds

### 1. **No Log Corruption**
- Append-only logs prevent data corruption
- No complex Lua scripts on large log blobs
- Clean, immutable audit trail

### 2. **No Duplicate Side Effects**
- Effects registry prevents double-counting items, money, points
- Simple KV/localStorage operations for idempotency
- Easy to reason about and debug

### 3. **Environment Consistency**
- Same behavior in development and production
- No environment detection in workflows
- Unified interface across all logging operations

### 4. **Simplicity**
- Tiny effects registry vs complex log manipulation
- Clear separation: logs = history, registry = idempotency
- Easy to extend and modify

### 5. **Performance**
- Simple GET/SET operations for effects registry
- Append-only logs are fast and reliable
- No unnecessary complexity or overhead

### 6. **Reliability**
- Atomic operations prevent race conditions
- Idempotent operations prevent duplicates
- Consistent error handling across environments

## Implementation Status

### ✅ Completed
- Effects registry utility (`lib/utils/effects-registry.ts`)
- Workflow integration with idempotency checks
- Append-only logging in all adapters
- Backfill logs API updated for both environments
- Documentation updated

### 🔄 Current State
- All four logs (tasks, items, financials, player) are append-only
- Effects registry gates all side effects (item creation, financial logging, player points)
- Backfill button works in both development and production
- Reset/Clear operations properly clear effects registry in both environments
- No more duplicate entries or log corruption
- Complete Best of Both Worlds implementation with proper cleanup

## File Structure (Best of Both Worlds)

```
lib/
├── data-store.ts                    # Contains LoggingDataStore (append-only)
├── adapters/
│   ├── logging-local-adapter.ts     # filesystem operations (logs-entities/)
│   ├── logging-hybrid-adapter.ts    # KV operations (append-only)
│   ├── local-adapter.ts            # Updated to use LoggingDataStore
│   └── hybrid-adapter.ts           # Updated to use LoggingDataStore
├── workflows/
│   └── entity-workflows.ts         # Updated with EffectsRegistry integration
└── utils/
    ├── logging-utils.ts            # Core types and utilities
    └── effects-registry.ts         # NEW: Idempotency layer
```

## Directory Structure

```
logs-entities/                      # Entity logs (development)
├── tasks-log.json                 # Task lifecycle events (append-only)
├── items-log.json                 # Item creation/updates (append-only)
├── financials-log.json            # Financial transactions (append-only)
├── character-log.json             # Character lifecycle/history (append-only)
└── player-progress-log.json       # Player role points/progression (append-only)

logs-research/                      # Research logs (deployed)
├── dev-log.json                   # Development notes
└── notes-log.json                 # Research notes

KV Storage (Production):            # Namespaced keys
├── akiles::tasks-log              # Task lifecycle events (append-only)
├── akiles::items-log              # Item creation/updates (append-only)
├── akiles::financials-log         # Financial transactions (append-only)
├── akiles::character-log          # Character lifecycle/history (append-only)
├── akiles::player-progress-log    # Player role points/progression (append-only)
└── akiles::effects::taskId        # Effects registry (idempotency)
```

## API Compatibility

### Existing API Routes
- All existing API routes continue to work
- Routes use append-only logging internally
- No breaking changes to external interfaces

### Log File Structure
- Same JSON structure for both filesystem and KV
- Same filtering and sorting capabilities
- Same entity type mapping
- All logs are strictly append-only

## Error Handling

### LoggingDataStore
- Graceful fallback if adapter fails
- Consistent error response format
- Detailed error logging for debugging

### Adapters
- LocalAdapter: filesystem errors are handled gracefully
- HybridAdapter: KV connection errors with retry logic
- Both: Append-only operations are inherently safe

### EffectsRegistry
- Simple GET/SET operations rarely fail
- Graceful fallback if registry is unavailable
- Idempotency ensures safe retries

## Testing Strategy

### Unit Tests
- Test EffectsRegistry operations independently
- Test append-only logging with mocked adapters
- Test error handling and edge cases

### Integration Tests
- Test complete flows in both environments
- Test entity creation and logging with idempotency
- Test log retrieval and filtering

### End-to-End Tests
- Test Task → Record → Item creation flows
- Test log consistency across environments
- Test performance and reliability
- Test backfill functionality in both environments

## Conclusion

The Best of Both Worlds approach provides the optimal solution for logging: clean, append-only logs for audit trails and a simple effects registry for idempotency. This eliminates log corruption while preventing duplicate side effects, making the system both reliable and maintainable.

The implementation is complete and working in both development and production environments, with comprehensive documentation and testing strategies in place.




