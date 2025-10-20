# Archive System (V0.1)

## Purpose

Keep active logs lean and responsive by moving older history into an archive namespace with periodic compaction. This preserves full auditability without overloading UI queries or primary storage.

## Scope

- Applies to: `tasks-log`, `items-log`, `financials-log`, `sales-log`, `character-log`, `player-progress-log`.
- Active window: configurable per log (default 90 days).
- Archive: immutable monthly segments beyond the active window.

## Data Model

- Active logs: append-only JSON arrays (filesystem) or KV lists (prod)
- Archive logs: monthly buckets, by `orgId::logType::YYYY-MM`
- Indexes: `entityId`, `status`, `linkType`, `role` (for character/player-progress)

## Operations

- Compaction (manual in V0.1):
  - Move entries older than retention window into monthly archive buckets
  - Optionally keep a monthly snapshot summary per entity
  - Maintain counters for quick analytics (e.g., points per month)

- Retrieval:
  - UI fetches active by default
  - "Load older history" fetches archive segments by month range

## API Sketch (Future)

- `GET /api/logs/:type?from=YYYY-MM&to=YYYY-MM&includeArchive=true`
- `POST /api/archive/compact?type=items|tasks|...&before=YYYY-MM`

## UI Notes

- Add lazy-load controls in each log tab (Tasks, Items, Financials, Sales, Characters, Player Progress)
- Show archive indicators and month boundaries in timelines

## Considerations

- Append-only invariant preserved in both active and archive layers
- Idempotency unaffected (Effects Registry lives outside the archive layer)
- Storage costs predictable via monthly segmentation

## Roadmap

- V0.1: Manual compaction, basic archive retrieval
- V0.2: Automated scheduled compaction, summaries, analytics


