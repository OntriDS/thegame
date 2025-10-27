### Tasks Log rename issue and Player Points context – VERIFY + HONEST ANALYSE

Executive summary
- Task rename not reflected in Tasks Lifecycle Log after editing in modal. Financial log does reflect the new name. Verified root cause: display name resolution uses the latest entry by timestamp; task renames update the CREATED entry in-place without advancing its timestamp, so a later DONE/UPDATED entry still wins and shows the old name.
- Player Log entries always look like “POINTS_CHANGED Akiles …” with little context. Verified root cause: entries include sourceId/sourceType and a description, but the UI prioritizes `displayName` (the player’s name) over `description`, so the useful message is hidden. No fetching of source names is done for display.

Evidence (code citations)
1) Task workflow performs descriptive field updates via in-place CREATED-entry mutations:

```229:236:workflows/entities-workflows/task.workflow.ts
  if (previousTask) {
    for (const field of DESCRIPTIVE_FIELDS) {
      if ((previousTask as any)[field] !== (task as any)[field]) {
        await updateEntityLogField(EntityType.TASK, task.id, field, (previousTask as any)[field], (task as any)[field]);
      }
    }
  }
```

2) The in-place updater writes the field and sets `lastUpdated`, but it does not append a new entry or update the entry `timestamp`:

```39:59:workflows/entities-logging.ts
  const createdEntry = list.find(entry => 
    entry.entityId === entityId && 
    entry.event?.toLowerCase() === 'created'
  );
  
  if (createdEntry) {
    createdEntry[fieldName] = newValue;
    createdEntry.lastUpdated = new Date().toISOString();
  } else {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i]?.entityId === entityId) {
        list[i][fieldName] = newValue;
        list[i].lastUpdated = new Date().toISOString();
        break;
      }
    }
  }
```

3) Display name resolution for logs prefers the latest entry by `timestamp` (or `date`) and does not consider `lastUpdated`:

```345:362:lib/utils/logging-utils.ts
export function buildLatestNameMap(entries: any[]): Record<string, string> {
  const latestName: Record<string, { when: number; name: string }> = {};
  for (const e of entries || []) {
    const entityId = e.entityId || e.id;
    if (!entityId) continue;
    const name = extractEntryName(e);
    if (!name) continue;
    const whenRaw = e.timestamp ?? e.date;
    const when = whenRaw ? new Date(whenRaw).getTime() : 0;
    const prev = latestName[entityId];
    if (!prev || when >= prev.when) {
      latestName[entityId] = { when, name };
    }
  }
  const result: Record<string, string> = {};
  Object.keys(latestName).forEach(id => (result[id] = latestName[id].name));
  return result;
}
```

4) Tasks log UI uses `displayName` from the normalization map, so renames only show when a later entry carries the new name:

```204:211:components/data-center/tasks-lifecycle-tab.tsx
const name: string = entry.displayName || entry.name || entry.taskName || data.taskName || data.name || entry.message || '—';
```

5) Player points entries include source and description text at write-time:

```141:158:workflows/entities-logging.ts
export async function appendPlayerPointsLog(
  playerId: string,
  points: { xp: number; rp: number; fp: number; hp: number },
  sourceId: string,
  sourceType: string
): Promise<void> {
  const logEntry = {
    event: LogEventType.POINTS_CHANGED,
    entityId: playerId,
    points: points,
    sourceId: sourceId,
    sourceType: sourceType,
    description: `Points awarded from ${sourceType}: XP+${points.xp}, RP+${points.rp}, FP+${points.fp}, HP+${points.hp}`,
    timestamp: new Date().toISOString()
  };
  ...
}
```

6) Player log UI renders `displayName || description`, so the name “Akiles” (from player CREATED entry) hides the description with the source:

```98:103:components/data-center/player-log-tab.tsx
<Badge variant="outline" className="capitalize shrink-0">{entry.event}</Badge>
<span className="text-sm font-medium truncate">
  {entry.displayName || entry.description || 'Player activity'}
</span>
```

Why financial log shows the rename correctly
- Financial records are updated/created with the new task name via propagation; those updates append entries with fresh timestamps including the new name, so `buildLatestNameMap` picks the newer name.

Problems restated
- Tasks: Descriptive edits (like `name`) are idempotent but invisible because display-name resolution ignores in-place `lastUpdated` mutations and prefers the latest by `timestamp`.
- Player Log: Good data is written (source and description), but the UI prioritizes the player’s `displayName`, obscuring the context.

Solution pathway (low-risk, aligned with append-only logs)
1) Fix display-name resolution to respect in-place descriptive edits
   - Update `buildLatestNameMap` to consider `lastUpdated` when picking the “latest” name. Use `whenRaw = e.lastUpdated ?? e.timestamp ?? e.date`.
   - Keep `updateEntityLogField` as-is (it already sets `lastUpdated`).
   - Impact: Renames applied to the CREATED entry will immediately surface in the Tasks log without adding new entries.

   Suggested change:
   - In `lib/utils/logging-utils.ts` within `buildLatestNameMap`, change the time selection to prefer `lastUpdated` if present.

2) Improve Player Log context rendering
   - UI: Prefer rendering a contextual label and source pill:
     - If entry has `points` but no `delta`: label “Win Points” and show `sourceType` + fetched source name (Task/Financial/Sale). If future negative points, label “Lost Points”.
     - If entry has `delta` (from `appendPlayerPointsUpdateLog`): label “Points Updated” and show new totals.
     - If we later log exchanges to J$: label “Points Exchanged for” with J$ amount.
   - Implementation pattern: mirror `components/data-center/items-lifecycle-tab.tsx` source name caching by bulk-fetching tasks/financials to resolve `sourceId → name`.
   - Keep `displayName` for the player but render the contextual description next to it instead of hiding behind it.

   Minimal UI adjustments (illustrative):
   - Compute `label` per entry:
     - `POINTS_CHANGED` with `points` → “Win Points” (or “Lost Points” if negative in future)
     - `POINTS_CHANGED` with `delta` → “Points Updated”
   - Render a small source badge: `from {sourceType}: {resolvedSourceName}` when `sourceId` present.

Alternative (heavier) option for tasks
- Append a dedicated `RENAMED` or `UPDATED` entry when `name` changes. This preserves strict immutability of historical timestamps and avoids relying on `lastUpdated`. Requires a simple effect key (`pointsLogged`-style) to keep idempotency for a given (entityId, fieldName, newValue) combination. More churn and UI noise; recommend the low-risk name-map fix first.

Test plan
- Task rename:
  1. Create a task, mark Done; confirm two entries exist (CREATED, DONE) with initial name.
  2. Rename task in modal; confirm tasks log now shows the new name for all entries.
  3. Confirm financial log still reflects the new name (baseline).
- Player log:
  1. Complete a task with rewards; confirm Player Log shows “Win Points” with the source type and resolved source name.
  2. Edit task rewards; confirm “Points Updated” entry with delta and new totals appears.
  3. Delete the task; confirm the rollback entries remain coherent.

Risks / compatibility
- Name-map change is backward compatible; it only affects how we pick latest names. Entries remain append-only.
- Player log UI changes are additive and do not change stored data; safe to ship.

Next steps
- Implement the `buildLatestNameMap` change.
- Update Player Log UI per above to display label + source pill and resolved source names.


