# LOG EDITING SYSTEM – Reality Check and Improvements Plan

**Status**: Draft for Review | Version: 0.1 → 0.2 Proposal | Date: October 2025

## Executive Summary

The current Founder-only log management delivers soft-delete and restore via a unified API and per-tab UI controls. However, the UI hides deleted entries by default with no way to reveal them, which makes restoring impossible in practice. This document analyzes the implementation against our principles (DRY, Unified Patterns, Complete Implementation, Smart Simplification) and proposes a simple, standardized improvement plan: add a tri-state filter (All / Active / Deleted), centralize log management UI/logic, and ship a minimal but safe Edit modal in a follow-up.

Key fixes (high impact, low risk):
- Add a Show Deleted filter to every Data Center tab (defaults to Active only)
- Centralize dropdown actions and handlers to avoid duplication
- Add confirmations/toasts for user feedback
- Backfill IDs on-read so legacy entries can be managed

## Reality Check (Current Behavior with Evidence)

- Soft-delete correctly marks entries and appends audit details:
```349:398:workflows/entities-logging.ts
export async function softDeleteLogEntry(
  entityType: EntityType,
  entryId: string,
  characterId: string,
  reason?: string
): Promise<void> {
  const key = buildLogKey(entityType);
  const list = (await kvGet<any[]>(key)) || [];
  
  const entry = list.find(e => e.id === entryId);
  if (!entry) {
    throw new Error(`Log entry ${entryId} not found in ${entityType} log`);
  }
  entry.isDeleted = true;
  entry.deletedAt = new Date().toISOString();
  entry.deletedBy = characterId;
  if (reason) {
    entry.deleteReason = reason;
  }
  if (!entry.editHistory) { entry.editHistory = []; }
  entry.editHistory.push({ editedAt: new Date().toISOString(), editedBy: characterId, action: 'delete', reason });
  await kvSet(key, list);
}
```

- UI filters out deleted entries unconditionally, making restore inaccessible:
```38:44:components/data-center/tasks-lifecycle-tab.tsx
// Filter out soft-deleted entries by default
const visibleEntries = (processedTasksLog.entries || []).filter((entry: any) => !entry.isDeleted);
```

- The dropdown offers Delete/Restore, but because deleted entries are filtered, user never sees Restore:
```441:469:components/data-center/tasks-lifecycle-tab.tsx
{logManagementEnabled && entry.id && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button ...>
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem 
        onClick={() => entry.isDeleted ? handleRestoreEntry(entry) : handleDeleteEntry(entry)}
        className={entry.isDeleted ? 'text-green-600' : 'text-red-600'}
      >
        {entry.isDeleted ? (<>... Restore Entry</>) : (<>... Delete Entry</>)}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

- Unified API adheres to KV-only (no server→server HTTP):
```1:10:app/api/logs/manage/route.ts
// KV-only implementation - no server→server HTTP anti-pattern
import { softDeleteLogEntry, restoreLogEntry, editLogEntry } from '@/workflows/entities-logging';
```

## Gaps vs Goals

- Complete Implementation: Missing a way to view deleted entries to restore (UI gap)
- Unified Patterns / DRY: Dropdown actions and handlers duplicated across tabs
- Smart Simplification: No global control for showing deleted; confirmations/toasts partially missing
- Edit Capability: Backend exists (`editLogEntry`) but no UI to edit fields yet
- Legacy Data: Some entries may lack IDs → cannot be deleted until ID exists
- UX: No easy way to review audit trail changes from UI
- Performance: Large logs may benefit from pagination/virtualization

## Risks and Edge Cases

- Deleted entries hidden without override → user cannot restore
- Entries without `id` → delete/restore impossible (currently guarded by checks)
- Inconsistent dropdowns across tabs → maintenance overhead, potential UI drift
- Silent failures without clear toasts/confirmations → poor UX

## Proposed Improvements (Simple, Unified, Complete)

1) Tri-state filter for visibility (All / Active / Deleted)
- Default: Active (hides deleted)
- Toggle stored via UserPreferences key: `log-management-show-deleted`
- Each tab uses a shared utility to select `displayEntries`
- Rationale: Restores become possible while keeping default safe

2) DRY Log Management UI and Logic
- Create `components/logs/log-management-actions.tsx` for the dropdown
- Create `lib/hooks/use-log-management.ts` with unified `handleDeleteEntry`, `handleRestoreEntry`, `handleEditEntry`
- Rationale: One place to maintain logic, fewer bugs, consistent UX

3) Confirmations and Feedback
- Standard confirmation dialog for delete
- Toasts for success/error on delete/restore/edit
- Rationale: Reduces mistakes, increases confidence

4) On-Read ID Backfill for Legacy Entries
- When rendering entries, if missing `id`, assign one in-memory and persist via `kvSet` once, or on action attempt
- Rationale: Makes all entries manageable without separate manual backfill run

5) Minimal Edit Modal (Phase 2)
- Create `LogEntryEditModal` with safe subset of fields and a JSON advanced editor mode
- Immutable: `id`, `entityId`, `timestamp`, `event`
- Include Reason field and audit preview
- Rationale: Practical fixes without over-complication

6) Optional: Inline Audit Trail Viewer
- Small expandable section per entry to list `editHistory`
- Rationale: Transparency of changes; useful for debugging

7) Scale/Performance Quality of Life
- Optional pagination or virtualization per tab for very large logs
- Rationale: Keep UI snappy as logs grow

## Minimal UX Changes (Wire-level)

- Add filter controls to each tab header (right-aligned):
  - Dropdown: View = Active | Deleted | All
  - Persist preference per log type (e.g., `log-view:tasks`)

- Use shared `LogManagementActions` component in all tabs:
  - Receives `entityType`, `entry`, `onReload`
  - Shows Delete or Restore depending on `entry.isDeleted`
  - Future: adds Edit option

## Action Items (Prioritized)

1. Add tri-state filter (All/Active/Deleted) to all 7 tabs, default Active
2. Create `useLogManagement` hook for shared delete/restore/edit handlers
3. Create `LogManagementActions` component and replace per-tab dropdowns
4. Add confirmations and toast notifications
5. Implement on-read ID backfill for legacy entries
6. Implement minimal `LogEntryEditModal` with validation and audit preview
7. Add inline audit trail viewer (expand/collapse)
8. Consider pagination/virtualization for very large logs
9. Update `LOG_EDITING_SYSTEM.md` to reflect final behavior and remove ambiguity

## Acceptance Criteria

- Deleted entries can be viewed (when desired) and restored easily
- All 7 tabs share the same dropdown UI and action logic
- Deleting requires confirmation; all actions show toasts
- Entries without `id` become manageable automatically
- Edit modal enables safe field corrections and records an audit trail
- Documentation matches shipped behavior

## Appendix – Supporting Code References

- Filtering hides deleted by default, preventing restore:
```38:44:components/data-center/tasks-lifecycle-tab.tsx
const visibleEntries = (processedTasksLog.entries || []).filter((entry: any) => !entry.isDeleted);
```

- Soft-delete implementation with audit trail:
```349:381:workflows/entities-logging.ts
entry.isDeleted = true;
entry.deletedAt = new Date().toISOString();
entry.deletedBy = characterId;
if (!entry.editHistory) { entry.editHistory = []; }
entry.editHistory.push({ editedAt: new Date().toISOString(), editedBy: characterId, action: 'delete', reason });
```

- Unified API imports workflow functions directly (KV-only):
```1:10:app/api/logs/manage/route.ts
import { softDeleteLogEntry, restoreLogEntry, editLogEntry } from '@/workflows/entities-logging';
```
