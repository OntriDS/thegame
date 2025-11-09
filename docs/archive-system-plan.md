# Archive System Plan – Verification and Implementation Map (Nov 2025)

> **Archive Definition (updated)**  
> The Archive is the curated space where completed outcomes live after they stop being part of the “active” game board. Think of it as the library of everything that already happened: sold items, collected sales, collected financial records, and completed tasks, ordered by the month. It is **not** a log dump; it is an organized catalogue of actual entities grouped by their closing month with rich, read-only snapshots.

## Verification – What we already have

- Design/specs (docs):
  - Systems Architecture mentions an Archive System (V0.1): retention windows, monthly compaction, separate archive namespace, and a “Load older history” UI pattern.
  - Detailed docs in `z_md/detailed-docs/ARCHIVE_SYSTEM.md` outline compaction, buckets by month, and on-demand retrieval.
  - PROJECT-STATUS.json Phase 13.1 enumerates deliverables 6–19 for archive structure, monthly close workflow, and summary generation.
- Code hooks/utilities:
  - `lib/utils/recurrent-task-utils.ts` exposes `archiveCompletedInstances(parentId)` which marks recurrent instances as `Collected` (soft archive flag) but does not move data into an archive namespace.
- Menu/section scaffolding:
  - `lib/constants/sections.ts` includes an `archive` section entry, indicating UI intent.
- Research/roadmap notes:
  - Multiple analysis docs reference the need to implement the archive namespace and to keep active views fast by moving older history.

Gaps confirmed:
- No implemented `archives/` namespace (KV keys) for entities/logs.
- No “Close Month” workflow that moves CHARGED/DONE entities into monthly archive buckets.
- No Archive UI screens to browse months, filter by entity type, and view “actual” archived entities (not just log entries).
- No compaction job and fetch API for archive buckets.
- Active DataStore still returns everything; it doesn’t exclude archived entities.

## Scope – What we need

1) Phase 1: Archive storage model (KV-only, namespace-first)
- Keys:
  - Active entities/logs: `data:{entity}:{id}`, `logs:{entity}`
  - Archive entities grouped by month: `archive:{entity}:{MM-YY}:{id}` (full read-only entity snapshot)
  - Archive entity indexes: `archive:index:{MM-YY}:{entity}` (ordered list/set of IDs) plus canonical month registry `archive:months`
  - Archive logs (optional later): `archive:logs:{entity}:{MM-YY}` for append-only “moved to archive” events
- Access patterns:
  - Active UI works from `data:*` and `logs:*` only
  - Archive UI queries `archive:*` by month; dashboard loaders can aggregate across months
  - Reverse lookup helpers can link archived entities to their active ancestors (e.g., parent tasks still open)

2) Phase 2: Logs organization (separate from Archive UI)
- Purpose:
  - Keep the current month’s logs fast and focused in the Logs/Research views.
  - Organize older logs by month for retrieval via a month-year selector (not displayed inside Archive).
- Keys:
  - Active month logs alias: `logs:{entity}` (always the current month)
  - Monthly buckets: `logs:{entity}:{MM-YY}`
- Rotation/retention (simple policy):
  - On Close Month, roll the finishing month’s active logs into `logs:{entity}:{MM-YY}` and start a fresh `logs:{entity}` for the new month (no deletion).
  - Optional later: compaction of very old months (merge, summarize, or compress).
- UI:
  - Logs view defaults to the active month; provide a month-year selector (and pagination if large).
  - Archive section does not render logs; it links out if needed.

3) Phase 3: Monthly Close workflow (automation foundations)
- Automations are now a dedicated task type with an “Automation Tree” surfaced in Control Room (positioned after the Recurrent Tree). The tree reuses the mission/recurrent UI, but automation tasks currently act as manual anchors until automated routines are implemented.
- Trigger: Manual status changes (`Collected`) act as today’s pre-automation flow; future automation tasks will orchestrate the same transitions.
- Selection rules (current month only unless user selects a range):
  - Tasks: `status ∈ {Done, Collected}` → mark `isCollected = true`, move to archive bucket. If task is a child of an active parent, Store a “ghost parent” reference so archive UI can show context without duplicating the active parent.
  - Sales: `status = Collected` (after payment reconciliation) → move, include lines and realized values.
  - Financials: `status = Collected` (paid/charged) → move. Pending/Not Paid entries stay active until collected.
  - Items: two categories
    - Sold Item (new “SOLD” items created by sale posting) → move to archive for the month of `saleDate` so archive becomes the running list of sold inventory.
    - For-sale inventory stays active; only move if explicitly collected/archived by business rule
- Steps (idempotent):
  - Copy entity to its current-month archive box: `archive:{entity}:{MM-YY}:{id}` (implemented for Tasks, Sales, Financials, Sold Item snapshots).
  - Append summary row to `archive:index:{MM-YY}:{entity}`. *(Implemented for runtime snapshots via archive helpers.)*
  - Append “moved-to-archive” entry in entity logs under `archive:logs:{entity}:{MM-YY}` (optional). *(Still optional; logs rotation handled in Phase 2.)*
  - Exclude archived snapshots from active fetchers so Current Month boxes stay lean. *(Applied to Tasks, Sales, Financials; Items remain visible until an inventory archive flow is introduced.)*
  - Preserve upstream context (parent, source sale/task) in `archiveMetadata` for future “ghost parent” presentation inside the Archive UI.

- Outstanding follow-ups for Phase 3:
  - Automation tasks themselves remain manual placeholders; full automation workflows will be staged once the tree and archive UI are in place.
  - Asset archive/boxes are deferred—assets continue to be managed manually in this iteration.

- Vault framework (notation only for v0.1)
  - “Vaults” are top-level secure containers that group high-value data (e.g., Archive Vault, Knowledge Vault, Digital Assets Vault). Future versions will add unified security and access policies. For this iteration we only implement the Archive Vault but keep naming consistent with the broader concept.

4) Phase 4: Archive UI (Top-class UX)
- Section: `Archive` contains the “Archive Vault” with primary navigation:
  - Month Boxes grid/list – each box is a saved view representing a specific month/year (latest month auto-selected).
  - Entity tabs within a box: Tasks, Sales, Financials, Items.
- Views:
  - Box header (Month) with stats (counts, totals, revenue, costs, net cashflow, items sold by type) and breadcrumb navigation (`/ Jun / Sales`). 'Archive Vault' is the Root for all Archive 'Boxes' ... there is going to be more Vaults , which mean they will have some kind of safety meassueres in the future.
  - Row-based tables per entity (elegant, modern, filterable, reorderable, searchable) similar to Logs but tuned for archived data density.
  - Entity drill-in shows the archived snapshot (read-only), provenance metadata, and logs for that month.
- Interop:
  - Copy link from archived entity back to the active entity it originated from (reverse lookup via links/metadata).
  - “Load older history” buttons in active pages to pull preceding months from archive (lazy fetch).

### Table behavior (per entity)
- **Global filters**: Month selector (`MM-YY` + “All Months”), Year selector (`YY` + “All Years`), entity tab, search box, advanced filter drawer (status, owner, site, source entity, etc.), pagination (50 rows per page default). Month Boxes act as saved presets for these filters.
- **Sorting defaults**: Sales sorted by `saleDate` desc, Tasks by `collectedAt` desc, Financials by `collectedAt` desc, Items by `saleDate` desc; any sortable column can be clicked to change order (amount, owner, site, etc.).
- **Cross-archive queries**: “All Months/All Years” shows data across the whole archive; result set always returns the top N records for the current sort (e.g., top 50 highest revenue sales). Default view remains the selected Month Box.
- **Inline totals**: compact badges above the table summarizing totals relevant to the current filter (e.g., Total Revenue, Total Items Sold, Total Tasks Collected) instead of large KPI cards.
- **Column manager**: all entity fields are available; users can toggle visibility via a column menu. Defaults highlight the most important KPIs per entity.
- **Row expansion**: rows can expand to reveal extended metadata (notes, provenance details, link snapshot) without navigating away; expansion is optional per entity type.

4) APIs and DataStore changes
- Read:
  - `GET /api/archive/:entity?month=MM-YY` → returns array for that month
  - `GET /api/archive/months` → returns available months and per-entity counts
- Write/Close:
  - `POST /api/archive/close-month?month=MM-YY` → orchestrates the monthly move; idempotent
- DataStore:
  - Ensure all active fetchers exclude archived keys (no mixed datasets)

5) Automation & Observability
- New “Automations” section (or a tab under Settings) that lists available automation tasks:
  - Close Month (with dry-run mode → preview counts and sums)
  - Future: compaction, archive vacuum, re-index
- Logging & Idempotency:
  - Effects registry entries for close-month runs to avoid double-moves
  - Summaries written into `archive:summary:{MM-YY}.json`

## Implementation Plan (phased)

Phase A – Foundations
- Implement archive key builders and indexers.
- Implement read APIs and a minimal Archive UI (month picker + counts + simple tables).

Phase B – Close Month
- Implement `closeMonth({ month, year })` in a dedicated workflow:
  - Select entities by date/status rules (Tasks, Sales, Financials, Sold Items).
  - Move/copy to archive buckets; write indexes; hard-delete from active; idempotent stamps.
- Add admin action to run Close Month + a dry-run preview.

Phase C – UX Polish & Dashboards prep
- High-signal archive pages with filters, entity drill-ins, and quick navigation.
- Provide “Load older history” in active pages to pull a prior month on demand.
- Provide summary API for dashboards (later phase).

## Guardrails & Decisions
- Hard-move vs soft-flag: prefer hard-move to keep active views lean; soft-flag is acceptable for early iterations but must be excluded in active queries.
- Month attribution: use `saleDate` for Sales and Sold Items; use `doneAt/collectedAt` for Tasks; use `month/year` on Financials.
- Sold Item duplication model: post-sale creates a SOLD lot; close-month moves those lots into the archive for the sale’s month.
- Financial status rules: introduce explicit `Collected` flag distinct from `Done` so archive only captures realized money. Pending financials stay active until the automation flips them.
- Task hierarchy handling: Archived child tasks store metadata about their active parent (id, name, status) to display context without moving the parent prematurely.
- Naming: continue using “Archive” unless a better metaphor emerges; keep door open for later rename (e.g., “Vault”, “Library”) as UX solidifies.
- No special “SOLD_ITEMS” Site: Sold items use the existing `siteId` semantics (e.g., sale site, `World`, or `None`) and owner set via normal fields. No hardcoded site is introduced.
- Archive snapshot contents: Store the full entity object at the time of archiving (all fields), plus a `provenance` metadata block (e.g., `sourceTaskId`, `sourceSaleId`, `ownerCharacterId`, `siteId`, `collectedAt`, `closedMonth`). Optionally include `linksSnapshot` for complete historic reconstruction; UI relies primarily on provenance.
- Logs navigation: Keep a `logs:{entity}` file for the active month, rotate it to `logs:{entity}:{MM-YY}` during Close Month automation, and let the Data Center/Archive selector pick the month to display. No compaction yet; every month remains accessible indefinitely.
- Parent task visibility: Keep parent metadata inside the provenance block for now without rendering extra UI; revisit visual surfacing once Archive lists prove stable.
- Working terminology:
  - Section label candidate: “Vault” (honors protected knowledge/assets metaphor).
  - Monthly containers inside the Vault: “Month Boxes” (placeholder until we finalize UI copy); entities listed as “Archive Rows”.
- Table-first UX: Archive lists default to data tables (not cards). Filters include Month/Year with “All” options; default page size 50 to show top results under active sort (e.g., highest revenue).
- Breadcrumbs: Use `Vault / <Month Box> / <Entity>` to orient users and support navigation between boxes.
- Saved views: Month Boxes persist chosen filters/sorts so returning to a box restores its configuration.
- Column controls: Provide per-entity column manager so users can hide/show fields; all entity fields are available so nothing is lost.
- Provenance surfacing: Default drill-in layout = top metadata panel with elegant summary (no extra collapsible complexity); revisit only if we hit density issues.
- Column defaults: Decide per-entity default column sets (e.g., Sales → `saleDate`, `status`, `site`, `counterparty`, `totalRevenue`) while keeping full field list available for toggling.

## Done = Evidence
- Archive UI shows the month with correct counts and totals.
- Pulling the same month twice returns exactly the same data (idempotent move).
- Active sections no longer contain archived entities from prior months.
- Links and logs resolve for archived entities (read-only), and reverse lookups work.


