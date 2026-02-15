# Logic Report: Task Collection Workflow

This report details exactly what happens in `task.workflow.ts` when a Task transitions from **Done** to **Collected**.

### 1. Trigger Detection
The workflow starts by checking if the task is being "collected". This happens if either:
- The `status` changes to `'Collected'`.
- The `isCollected` flag changes to `true`.

```typescript
const statusBecameCollected = task.status === 'Collected' && (!prev || prev.status !== 'Collected');
const flagBecameCollected = !!task.isCollected && (!prev || !prev.isCollected);

if (statusBecameCollected || flagBecameCollected) { ... }
```

### 2. Date "Snap-to-Month" Calculation
The system calculates where to "file" this collection. It prioritizes the date the work was **Done**.
1. It takes `task.doneAt` (e.g., `2024-01-15`).
2. It runs `calculateClosingDate()`, which snaps it to the **last day of that month** (e.g., `2024-01-31`).
3. This becomes the `collectedAt` date used for indexing.

### 3. The "Effect Guard" (Critical Step)
Before doing anything, the system checks if this specific collection action has happened before.
- **Key Generation**: `effect:task:{id}:sideEffect:taskSnapshot:{MM-YY}`
  - Example: `effect:task:123:sideEffect:taskSnapshot:01-24`
- **Check**: `await hasEffect(snapshotEffectKey)`

> **CRITICAL:** If this key exists in the database/registry, **THE ENTIRE WORKFLOW STOPS HERE.** No snapshot, no index update, no logging. It assumes the work was already done.

### 4. Execution (If Guard Passes)
If the effect key is missing, the following steps execute sequentially:

#### A. Data Persistence
- Updates the task object in memory to ensure `isCollected: true` and `collectedAt` are set.
- Saves this updated state to the main database (`repoUpsertTask`).

#### B. Snapshot Creation
- Calls `createTaskSnapshot()`. This creates a static copy of the task for the Archive.

#### C. Logging
- Writes a `COLLECTED` event to the Task Log.

#### D. Indexing (The Issue Area)
- Determines the bucket key based on the **calculated date** (Step 2).
- Example: `index:tasks:collected:01-24`
- Adds the Task ID to this Redis Set.
- **Note**: If `calculateClosingDate` moves a Jan 15th task to Jan 31st, it goes into the `01-24` index.

#### E. Point Vesting
- Checks if points were "staged" (pending) for this task.
- If yes, moves them to "vested" (confirmed) status for the Player.

#### F. Locking the Guard
- Writes the `snapshotEffectKey` to the registry.
- **Result**: Future attempts to "Collect" this task for this specific month will be blocked at Step 3.

#### G. Cascading
- Checks if this is a Recurrent Template/Group.
- If so, finds all child instances and attempts to Collect them too.

---

### Potential Failure Points of "Nothing Happened":
1. **The Guard was already active**: If `hasEffect` returned true (maybe from a previous failed attempt or a UI double-click), the code silently exits at Step 3.
2. **Date Logic**: If `doneAt` was missing, it might have fallen back to `createdAt` or `Now`, filing the task in a different month index than expected.
