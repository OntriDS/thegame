## Idempotent Lifecycle Logging — Deep Analysis, Cross-Entity Comparison, and Standardization Roadmap

### Problem statement
- Recent fix flipped the issue: legacy entries show Task A as Done while the latest entry shows Created for Task B. The most recent state is not reflected consistently across the task’s entire lifecycle log.
- Root cause category: non-idempotent append rules and partial in-place updates cause divergent snapshots per entry.

### Current architecture recap (ground truth)
- Append-only entity logs per entity type via `appendEntityLog(entityType, entityId, event, details)`.
- Selective, in-place updates via `updateEntityLogField(entityType, entityId, field, old, new)` that prefers updating the CREATED entry, otherwise the latest entry for that entity.
- Idempotency guard via `effects-registry` using effect keys like `task:{id}:created`, `task:{id}:itemCreated`, etc.
- Workflows per entity handle:
  - Appends for state transitions
  - In-place descriptive field updates
  - Effect-guarded side-effects (items, points, financials)

### Cross-entity comparison (how logging/state changes work today)

1) Tasks — `workflows/entities-workflows/task.workflow.ts`
- Appends:
  - CREATED (guarded by `task:{id}:created`) with `_logOrder: 0`
  - STATUS_CHANGED on any status delta
  - DONE when `status === 'Done'` and `doneAt` present (only if new `doneAt`)
  - COLLECTED when `collectedAt` added
  - MOVED when `siteId/targetSiteId` change
- In-place updates: `DESCRIPTIVE_FIELDS` (name, description, cost, revenue, rewards, priority)
- Special: If CREATED already logged and status is not Done, early return; allows creating “already Done” tasks to still append DONE once.
- Uncompletion flow: if status reverts from Done → other, run `uncompleteTask()` and append UNCOMPLETED.

2) Items — `item.workflow.ts`
- Appends: CREATED (guarded), MOVED (stock delta), SOLD (quantitySold increased), COLLECTED, UPDATED (status)
- In-place updates: name, description, price, unitCost, additionalCost, value

3) Financial Records — `financial.workflow.ts`
- Appends: CREATED (guarded), CHARGED (when `isNotCharged` flips), COLLECTED
- In-place updates: name, description, cost, revenue, jungleCoins, notes
- Effect-guarded: item creation from emissaries, points awarding, etc.

4) Sales — `sale.workflow.ts`
- Appends: CREATED (guarded), CHARGED, CANCELLED, COLLECTED
- In-place updates: counterpartyName, totals
- Effect-guarded: points awarded from revenue, lines processed when charged

Observation: All four follow the same pattern: append on state transitions; in-place update for descriptive fields; effects guarded via registry.

### Where inconsistency happens
- When the canonical state fields (status/progress/timestamps) change, we append new entries but may leave older entries with stale duplicated state fields (e.g., `status` mirrored into CREATED/DONE entries). The UI may show mixed, entry-local copies of state rather than deriving state consistently from the newest canonical state.
- `updateEntityLogField` updates CREATED entry or the latest entry only; prior state-bearing entries remain stale, producing visual contradictions (e.g., older entry says Done for Task A; newer entry shows Created for Task B but not Done) when an entity is renamed, reassigned, or merged.

### Principles to apply
- DRY logging: avoid copying volatile state into every entry; only include deltas/context necessary to explain the event.
- Idempotent writes: event appends must be deduplicated by effect keys or deterministic guards.
- Deterministic reading: render should compute current state from the latest canonical data, not from replicated fields in older entries.

### Proposed Standard: Event Minimalism + Canonical State Snapshot

1) Event Minimalism (write-time)
- Each append-only entry stores:
  - event (type), entityId, timestamp
  - minimal context needed to explain the event (e.g., oldStatus → newStatus for STATUS_CHANGED, oldSiteId → newSiteId for MOVED)
  - Optional immutable context at creation (e.g., name at CREATED as it was at creation for historical trace)
- DO NOT mirror current `status`, `progress`, `doneAt`, etc. into every entry. Keep these only when they are the subject of the transition.

2) Canonical State Snapshot (render-time)
- The UI derives the “current state” label/badge purely from the most recent authoritative fields from the entity store (KV via repositories) or from the latest state-carrying event.
- For history rows, show the event-specific context, not a re-echo of current state.

3) Scoped In-Place Updates
- Restrict `updateEntityLogField` to:
  - CREATED entry: allow descriptive fields that we want historically accurate as-of-creation name corrections.
  - The most recent entry only when correcting the same event (e.g., fixing a typo in an event description), not to propagate current state.
- Never mass-update older entries when canonical state changes.

4) Idempotency Keys (uniform schema)
- Creation: `{entity}:{id}:created`
- Status transitions: `{entity}:{id}:status:{from}->{to}:{doneAt?|timestampBucket}`
- Side-effects: `{entity}:{id}:itemCreated`, `{entity}:{id}:financialCreated`, `{entity}:{id}:pointsAwarded` (keep monthly buckets where appropriate: `financialLogged:YYYY-MM`)
- Deletion/rollback flows clear the appropriate keys.

5) Deterministic Append Guards
- Task DONE append condition = append if previousTask missing OR previousTask.doneAt is null and current has doneAt.
- Re-applying save on the same DONE preserves a single DONE entry due to deterministic key or guard condition.

### Minimal code deltas needed (high-level)
- Logging writers:
  - Remove redundant state mirrors in `appendEntityLog` calls for TASK/ITEM/FINANCIAL/SALE where they are not transition subjects.
  - Keep transition context only (e.g., oldStatus/newStatus, moved from/to).
- `updateEntityLogField`:
  - Clarify semantics: only fix CREATED descriptive metadata or the latest entry of the same event kind; never overwrite state fields on prior entries.
- Workflows:
  - Ensure all state transitions use a consistent effect key or deterministic guard.
  - For Tasks, keep the special case allowing CREATED+DONE on first insert but avoid echoing `status` in CREATED/DONE beyond context.

### UI read model adjustments
- In `components/data-center/*-log-tab.tsx`:
  - Render badges using canonical state derived from either:
    - The latest `STATUS_CHANGED` / `DONE` / `COLLECTED` event for that entityId, or
    - The current entity snapshot (preferred if available in the view model),
    - Never trust status values copied into older entries.
  - Row display: show event kind + minimal context fields from that entry. Avoid mixing the “current status” into older rows.

### Will this solve idempotency issues system-wide?
- Yes. By:
  - Shrinking event payloads to deltas, we reduce chances of stale replication.
  - Using uniform effect keys/guards, repeated saves are no-ops for already-applied transitions/side-effects.
  - Deriving state at render-time from canonical sources prevents contradictions.

### Risks and mitigations
- Historical UX: Some entries currently show full `status`/`station` for convenience. After minimalism, rows may look “thinner.”
  - Mitigation: Show condensed context and add a details popover with the relevant fields for that event.
- Migration of existing logs: Old entries already contain replicated fields.
  - Mitigation: Reader normalizes: ignore replicated state fields when rendering; prefer event-specific fields.

### Standardized event payload templates
- CREATED: `{ nameAtCreation?, initialStatus? (optional), stationAtCreation?, taskType?, priority?, source*?, _logOrder:0 }`
- STATUS_CHANGED: `{ oldStatus, newStatus, transition, changedAt }`
- DONE: `{ doneAt }`
- COLLECTED: `{ collectedAt }`
- MOVED: `{ oldSiteId, newSiteId, oldTargetSiteId?, newTargetSiteId? }`
- CHARGED: `{ chargedAt, revenue? }`
- CANCELLED: `{ cancelledAt }`

Note: Only include fields directly relevant to the event.

### Roadmap (phased, safe, idempotent)
1) Reader normalization (no data risk)
   - Update `processLogData` and the log tabs to derive badges from canonical state (latest applicable event or current entity snapshot). Ignore replicated `status` on older entries.
2) Writer hardening
   - Remove redundant state mirrors from `appendEntityLog` calls across workflows.
   - Tighten `updateEntityLogField` semantics to CREATED-only or same-event-latest corrections.
3) Effect key standardization
   - Adopt uniform keys for transitions and side-effects across all entities. Add timestamp bucket where needed.
4) Backfill/cleanup (optional)
   - No destructive rewrite. Optionally, add a maintenance script to prune obvious redundant fields from historical entries if desired.
5) Verification
   - Add tests for idempotent re-saves (same state) and transition sequences (Created → Done → Uncompleted → Done) per entity.

### Decision on “log every state?” vs “only on change?”
- Adopt “only log when state changes.” Routine saves without state deltas should not append lifecycle entries. Descriptive edits use in-place update on CREATED or last-event-only.

### Conclusion
The standardized approach—Event Minimalism + Canonical State Snapshot + Uniform Effect Keys—aligns with our principles (DRY, unified patterns, entity purity) and should eliminate idempotency bugs across all entities without requiring per-entity firefighting.


