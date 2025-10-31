## Bulk Loading and Bulk Logging – Unified KV-only Design

### 1. The HTTP anti‑pattern (plain language)
- Problem: Code on the server calls its own HTTP API routes (server→server HTTP) instead of going directly to the data/repository layer.
- Why it’s bad:
  - Extra network hops, slower, harder to debug
  - Coupling: server logic depends on HTTP plumbing instead of core repositories
  - Risk of circular calls and hidden side-effects
- What the docs mandate:
  - “No server-side HTTP to own routes; repositories must use @vercel/kv directly.”
  - API routes are for browser→server. Inside server/workflows, call the datastore/repositories (KV) directly.

### 2. Scope and constraints
- We are designing a single, standardized bulk-loading and bulk-logging system for the CORE entities:
  - Core: task, item, sale, financial, character, player, site
  - Not in scope: account (supra-entity), links (infrastructure fabric), settlements (reference), sessions (infra)
- Sources of bulk data:
  - CSV import (currently only Items from the General tab) – modes: add-only, merge, replace
  - JSON import (Seed Data tab and Seed button in General tab) – re/populating the system
- Requirements:
  - One unified API/workflow for bulk operations (no per-entity bulk route proliferation)
  - KV-only implementation (no server→server HTTP) and efficient batched writes
  - Standardized, explicit bulk operation logging (separate from regular workflows logging)
  - Idempotent behavior with deterministic deduplication per entity type

### 3. What exists today (state of the world)
- CSV (Items): UI parses CSV client-side, then calls ClientAPI methods.
  - `bulkImportItems()` works (loops individual upserts)
  - `bulkAddItemsOnly()` and `bulkMergeItems()` are stubs (not implemented)
- Full-environment import: `/api/settings` → `ImportDataWorkflow`
  - Uses KV batch pipelines (50/batch) to clear and import entities, links, logs
  - Good reference for batch mechanics, timeout handling, and progress, but it’s “replace” style and tailored for environment-wide operations
- Regular workflows logging: complete and working across entities (not what we need to alter)
  - Bulk logging must be handled separately (see below)

### 4. Unified design – one bulk entrypoint
- Single API route: `/api/bulk` (one place that handles all bulk imports)
  - Accepts both CSV-derived payloads (e.g., Items array) and JSON entity arrays for the seed use cases
  - Validates the target entityType is one of the core entities in scope
  - Enforces KV-only operations by calling datastore/repositories directly, not HTTP

- **Operations supported (modes) - Plain language:**
  - `add-only`: Only add NEW records. If a record already exists (based on its "business key"), skip it.
  - `merge`: Update existing records OR add new ones. If record exists, update it but keep its ID, creation date, and links.
  - `replace`: DELETE all existing records of this type, then add all new records. This is destructive!

- **Behavior:**
  - Processes records in batches of 50 to avoid overwhelming the system
  - Uses "business keys" (like a fingerprint) to detect duplicates per entity type
  - Calls normal save functions to keep workflows/links consistent (so everything that should happen on save, happens)

### 5. Bulk logging (separate from workflows)
- **Each entity logs bulk operations to its own log**: Bulk operations log to the entity-specific log endpoint
  - Items bulk operations → logged to `items-log` (accessible via `/api/items-log`)
  - Tasks bulk operations → logged to `tasks-log` (accessible via `/api/tasks-log`)
  - Sales bulk operations → logged to `sales-log` (accessible via `/api/sales-log`)
  - Financials bulk operations → logged to `financials-log` (accessible via `/api/financials-log`)
  - Characters bulk operations → logged to `character-log` (accessible via `/api/character-log`)
  - Players bulk operations → logged to `player-log` (accessible via `/api/player-log`)
  - Sites bulk operations → logged to `sites-log` (accessible via `/api/sites-log`)
- Use the existing helper in `workflows/entities-logging.ts`:
  - `appendBulkOperationLog(entityType, 'import' | 'export', { count, source, importMode, extra })`
  - This function uses `buildLogKey(entityType)` internally, which routes to the correct entity-specific log
- When the bulk route completes (success or error), append ONE aggregate log entry to that entity's log:
  - event: `BULK_IMPORT` or `BULK_EXPORT` (from LogEventType enum)
  - entityType: the target entity being bulk processed (determines which log file)
  - operation: 'import' | 'export'
  - count: total number of records processed (or breakdown: { addedCount, updatedCount, replacedCount? })
  - source: 'csv' | 'json' | 'seed-ui' | filename, etc.
  - importMode: 'add' | 'merge' | 'replace'
  - extra: summary stats and any validation errors (truncated)
  - timestamp: operation completion time
  - operationId: unique UUID for this bulk operation
- This bulk log entry is distinct from regular per-entity workflow logs (CREATED, UPDATED, etc.):
  - Regular workflows log individual entity lifecycle events (one log entry per entity created/updated)
  - Bulk operations log ONE aggregate entry summarizing the entire bulk operation
  - Both types of entries coexist in the same entity log file, distinguished by the `event` field
- Example: After bulk importing 150 items via CSV:
  - The `items-log` will have 150 individual CREATED entries (from regular workflows, if using upsertEntity)
  - PLUS one BULK_IMPORT entry summarizing: "Bulk import of 150 items from CSV, add-only mode, completed at [timestamp]"

### 6. Per-entity dedupe keys (deterministic business keys) - What are "business keys"?

**Plain language explanation:**
A "business key" is like a fingerprint that identifies a record based on its REAL-WORLD properties, not its technical ID. This lets us detect duplicates even if the ID is different.

**Example:** 
- Item with ID "abc123" and name "Sword", type "Weapon", collection "Main"
- Item with ID "xyz789" and name "Sword", type "Weapon", collection "Main"
- These are the SAME item! The business key would be: "weapon|sword|main" (all lowercase)
- When importing, we'd say "this already exists" and update the existing one instead of creating a duplicate

**Proposed business keys (how we identify duplicates):**
  - **item**: `type|name|collection` (e.g., "weapon|sword|main") - collection defaults to "No Collection"
  - **task**: `name|type|station` (e.g., "deliver package|delivery|warehouse")
  - **sale**: `saleDate|counterpartyName|totalRevenue` (e.g., "2024-01-15|John|100.00")
  - **financial**: `year|month|type|station|name` (e.g., "2024|january|revenue|shop|sales")
  - **character**: `name` (e.g., "john smith")
  - **player**: `email` (e.g., "player@example.com")
  - **site**: `name` (e.g., "warehouse") - defaults to "None" if name is missing

**Important notes:**
  - Keys are always lowercase and trimmed (no extra spaces)
  - For merge mode: When we find an existing record with the same business key, we keep its original ID, creation date, and links

### 7. Client responsibilities per surface
- General tab – CSV Items import:
  - Client parses CSV to Items[] (keep existing UI parsing and validation)
  - POST once to `/api/bulk` with `{ entityType: 'item', mode: 'add-only'|'merge'|'replace', source: 'csv', items }`
  - Server handles dedupe, batching, logging
- Seed Data tab (and Seed button in General tab) – JSON imports for any core entity type:
  - Client selects entity type + JSON
  - POST once to `/api/bulk` with `{ entityType, mode, source: 'json'|'seed-ui', records }`

### 8. API contract (sketch)
Request (CSV Items example):
```json
{
  "entityType": "item",
  "mode": "add-only", // or "merge" | "replace"
  "source": "csv",
  "records": [ /* normalized entity array */ ]
}
```
Response:
```json
{
  "success": true,
  "mode": "add-only",
  "counts": {
    "added": 123,
    "updated": 0,
    "replaced": 0
  },
  "errors": []
}
```

### 9) Implementation plan (no code yet)
1. Create bulk entrypoint: `/api/bulk` (single route)
   - Validate payload, entityType in allowed core types
   - Resolve dedupe key strategy by entity type
   - Branch by mode: add-only, merge, replace
   - Use batch chunking (50) for KV operations
   - Append bulk operation log on completion
2. Server utility: `getBusinessKey(entityType, record)`
   - Centralized strategy map
   - Lowercase/trim normalization; handle defaults (e.g., items collection)
3. Replace mode mechanics:
   - Clear index + data for entity type with KV pipeline (similar to ImportDataWorkflow)
   - Insert all new records; optional: bypass per-record workflows for speed (documented tradeoff)
4. Add-only / merge mechanics:
   - Load existing once (repository), map by business key
   - For merge, preserve `id`, `createdAt`, `links` on update
   - Call `upsert<Entity>()` to keep workflows/links/logging behavior consistent
5. ClientAPI thin wrappers:
   - `ClientAPI.bulkOperation({ entityType, mode, source, records })` → POST `/api/bulk`
   - Update CSV Import UI and Seed Data UI to call the unified method
6. Bulk logging:
   - Use `appendBulkOperationLog(entityType, 'import', { count, source, importMode, extra })`
   - Skip individual CREATED logs during bulk operations (use `skipWorkflowEffects: true`)
   - Only ONE aggregate BULK_IMPORT entry per bulk operation, not individual CREATED entries
7. Safe default statuses for bulk loading:
   - **Tasks**: Default to `"Created"` to avoid triggering item/financial creation (status "Done" triggers side effects)
   - **Sales**: Default to `"PENDING"` with `isNotPaid: true` and `isNotCharged: true` to avoid points/lines processing
   - **Financials**: Default to `"Created"` with `isNotPaid: true` and `isNotCharged: true` to avoid side effects
   - **Items, Sites, Characters, Players**: Any status is safe (no status-based side effects)
   - Even if status is provided, bulk API ensures safe payment flags for Sales and Financials
8. Guardrails & UX:
   - Replace mode: confirmation gates/messages
   - Progress feedback for large payloads (phase 2)

### 10. Critical gaps and missing details (VERIFIED findings)

#### 10.1 Workflow execution strategy ✅ DECIDED
**Decision**: Use `upsertEntity()` for ALL modes (add-only, merge, replace)
- Preserves workflows, links, and logging behavior consistently
- Matches current Seed Data page behavior
- Ensures Rosetta Stone links system works correctly

#### 10.2 Entity ID generation and validation ✅ DECIDED
**Decision**: Generate IDs if missing, validate format
- Auto-generate IDs using same pattern as CSV import: `imported-${Date.now()}-${index}`
- Accept any string ID format (don't enforce UUID-only)
- In merge mode, business key determines match (not ID)

#### 10.3 Validation strategy ✅ DECIDED
**Decision**: Server-side validation, best-effort (continue on errors)
- Validate required fields, enum values, business rules server-side
- Continue processing other records even if some fail
- Collect all validation errors, return summary at end

#### 10.4 Error handling and partial failures ✅ DECIDED
**Decision**: Best-effort processing with error collection
- Continue processing all records even if individual ones fail
- Collect all errors (validation + upsert failures)
- Return detailed summary: counts (added, updated, skipped, failed) + error list

#### 10.5 Links handling in bulk operations ✅ DECIDED
**Decision**: Best-effort link creation (skip missing refs, don't fail)
- `upsertEntity()` automatically calls `processLinkEntity()` for each record
- If referenced entity doesn't exist, skip that link (don't fail import)
- Forward references not supported (if B imported after A, link to B won't be created - user must re-import or manually link)

#### 10.6 Replace mode and links preservation ✅ DECIDED
**Decision**: Full wipe (entities + links)
- Delete all existing entities via `deleteEntity()` (triggers workflow link cleanup)
- Then insert all new records
- Matches current ImportDataWorkflow and Seed Data behavior

#### 10.7 Business key collision handling ✅ DECIDED
**Decision**: Detect duplicates in batch, last-wins
- When processing incoming batch, detect duplicates with same business key
- If duplicate found within batch, use the last one (skip earlier ones)
- If existing entity has same business key, update it (merge mode) or skip (add-only mode)

#### 10.8 Bulk logging - current implementation status ✅ DECIDED
**Status**: ✅ **Bulk logging infrastructure EXISTS and WORKS**
- `appendBulkOperationLog()` exists and works (workflows/entities-logging.ts lines 103-133)
- New bulk endpoint calls `appendBulkOperationLog()` directly (KV-only, no HTTP)
- Skip individual CREATED logs during bulk operations using `skipWorkflowEffects: true`
- Only ONE aggregate BULK_IMPORT entry per bulk operation

#### 10.9 Default statuses for bulk loading ✅ DECIDED
**Decision**: Set safe default statuses to avoid side effects during bulk load
- **Tasks**: `"Created"` (status "Done" triggers item/financial creation)
- **Sales**: `"PENDING"` with `isNotPaid: true` and `isNotCharged: true` (prevents points/lines processing)
- **Financials**: `"Created"` with `isNotPaid: true` and `isNotCharged: true` (prevents side effects)
- **Items, Sites, Characters, Players**: Any status safe (no status-based side effects)
- Implementation: Defaults applied in `/api/bulk` before processing records

#### 10.10 Seed button in General tab
**Missing investigation:**
- Need to verify: Does General tab "Seed" button use same pattern as Seed Data tab?
- Location: `app/admin/settings/page.tsx` - lines 199-265 reference seed operations
- **Action needed**: Verify how Settings "Seed" button works and ensure it uses unified bulk endpoint

#### 10.11 Entity-specific validation requirements
**Missing details:**
- What are required fields per entity type?
- What enum validations exist per entity?
- Are there cross-entity validation rules? (e.g., task references valid station)
- **Action needed**: Document validation rules per entity type before implementation

### 11. Cleanup and migration plan (remove old implementations)
Once the new unified `/api/bulk` system is implemented and tested, we must remove all old bulk operation code to avoid confusion and prevent the anti-pattern from returning.

#### Files to clean up:

**1. `lib/client-api.ts`** - Remove old Item-specific bulk methods:
   - ❌ **DELETE**: `bulkImportItems()` (lines ~585-595)
     - Current: Loops individual `upsertItem()` calls
     - Replacement: Use `ClientAPI.bulkOperation()` instead
   - ❌ **DELETE**: `bulkAddItemsOnly()` (lines ~602-605)
     - Current: Stub that returns `{ success: false, addedCount: 0 }`
     - Replacement: Use `ClientAPI.bulkOperation({ mode: 'add-only' })` instead
   - ❌ **DELETE**: `bulkMergeItems()` (lines ~597-600)
     - Current: Stub that returns `false`
     - Replacement: Use `ClientAPI.bulkOperation({ mode: 'merge' })` instead

**2. `components/settings/csv-import.tsx`** - Update to use unified method:
   - 🔄 **UPDATE**: `handleImport()` function (lines ~277-385)
     - Current: Uses `ClientAPI.bulkImportItems()`, `bulkAddItemsOnly()`, `bulkMergeItems()`
     - Replacement: Call `ClientAPI.bulkOperation({ entityType: 'item', mode, source: 'csv', records: items })`
     - Keep all CSV parsing and validation logic (that's client-side UI responsibility)

**3. Verify no other code references old methods:**
   - 🔍 **SEARCH**: Codebase-wide grep for `bulkImportItems`, `bulkAddItemsOnly`, `bulkMergeItems`
   - 🔍 **SEARCH**: Any other entity-specific bulk methods (shouldn't exist, but verify)
   - If found: Update to use `ClientAPI.bulkOperation()` or document why it's an exception

**4. Documentation updates:**
   - ✅ Update any docs that reference old bulk methods
   - ✅ Document the new unified `/api/bulk` endpoint for future developers

#### Migration order:
1. ✅ Implement new `/api/bulk` endpoint and `ClientAPI.bulkOperation()`
2. ✅ Update CSV Import UI to use new method
3. ✅ Update Seed Data UI to use new method
4. ✅ Test all bulk operations (CSV import + JSON seed) work correctly
5. ✅ Verify bulk logging works for all entity types
6. ❌ **THEN** remove old stub methods from `client-api.ts`
7. ❌ **THEN** verify no remaining references to old methods

**Important**: Do not delete old code until the new system is fully tested and confirmed working!

### 12. Risk mitigation and phased implementation strategy

#### Why we're doing this now (not later)
- Current system has **inconsistent bulk loading patterns** (CSV vs Seed Data vs ImportDataWorkflow)
- **Stub implementations exist** (`bulkAddItemsOnly`, `bulkMergeItems`) that will fail in production
- **Better to fix now** while the system is still in development than after users depend on it
- **KV-only architecture is critical** - we must get this right from the start

#### Risk mitigation strategy

**1. Incremental rollout (one entity at a time)**
- ✅ **Phase 1: Items only** (CSV import)
  - Implement `/api/bulk` for Items entity type only
  - Test thoroughly with CSV import UI
  - Verify: deduplication, logging, links creation work correctly
- ✅ **Phase 2: Add Items JSON seed**
  - Extend `/api/bulk` to handle Items from Seed Data tab
  - Test merge/replace modes
- ✅ **Phase 3: Add remaining entities one by one**
  - Add Tasks, then Sales, then Financials, etc.
  - Test each entity type independently before moving to next
- ✅ **Phase 4: Cleanup old code**
  - Only after all entity types are proven working
  - Remove stubs and old implementations

**2. Safety guards**
- **Keep old code during migration**: Don't delete until new system is proven
- **Feature flag approach**: New bulk endpoint can coexist with old methods initially
- **Comprehensive logging**: Every bulk operation logged (we have this already)
- **Error collection**: Don't fail silently - collect and report all errors
- **Idempotency**: Safe to retry failed imports (business keys prevent duplicates)

**3. Testing strategy**
- **Unit tests**: Test business key generation, deduplication logic
- **Integration tests**: Test `/api/bulk` endpoint with real KV
- **Manual testing checklist**:
  - ✅ CSV import (add-only, merge, replace modes)
  - ✅ JSON seed import (all entity types, all modes)
  - ✅ Verify links are created correctly
  - ✅ Verify logs are written correctly
  - ✅ Verify deduplication works
  - ✅ Verify error handling (invalid data, missing refs, etc.)

**4. Rollback plan**
- **If new system fails**: Old code still exists, can revert UI changes
- **If data corruption**: Use backup/export feature before bulk operations
- **If performance issues**: Can optimize batching or use raw KV for replace mode

**5. Decision points - All finalized** ✅
All 7 critical decisions have been made (see section 10.1-10.7)

#### Phased implementation plan

**Phase 1: Items CSV import (add-only) - COMPLETE ✅**
1. ✅ Create `/api/bulk` endpoint skeleton
2. ✅ Implement business key generation for Items
3. ✅ Implement add-only mode for Items
4. ✅ Wire CSV Import UI to new endpoint
5. ⏳ Test thoroughly (after all phases complete)

**Phase 2: All entities Seed Data support (all modes)**
1. Add merge mode for Items
2. Add replace mode for Items
3. Add all other entities to `/api/bulk`:
   - Tasks (add-only, merge, replace modes)
   - Sales (add-only, merge, replace modes)
   - Financials (add-only, merge, replace modes)
   - Characters (add-only, merge, replace modes)
   - Players (add-only, merge, replace modes)
   - Sites (add-only, merge, replace modes)
4. Implement business keys for all entities
5. Wire Seed Data tab UI for all entities
6. Test all entities and modes

**Phase 3: Seed button in General tab**
1. Verify how Settings "Seed" button works (app/admin/settings/page.tsx)
2. Update to use unified `/api/bulk` endpoint
3. Test Seed button functionality

**Phase 4: Cleanup and final testing**
1. Comprehensive testing of all bulk operations
2. Remove old code (stubs, old implementations from client-api.ts)
3. Verify no remaining references to old methods

**Important**: Each phase must be fully tested and verified before moving to the next phase!

### 13. User experience considerations ✅ DECIDED

1. **Progress feedback**: Keep simple "importing..." message (no progress bar initially)
2. **Error messages**: Show detailed errors - specific records that failed and why (e.g., "Row 10 - Missing name")
3. **Success messages**: Show detailed breakdown (e.g., "Added 120 new items, updated 5, skipped 3 duplicates")
4. **Confirmation dialogs**: Strong warning for replace mode ("Are you sure? This will delete ALL existing items.")
5. **Loading states**: Lock UI during import to prevent double-submission

### 14. Ready for implementation ✅

All decisions finalized:
- ✅ 7 technical decisions (section 10.1-10.7)
- ✅ 5 UX decisions (section 13)
- ✅ Implementation plan defined (section 12)
- ✅ Cleanup plan defined (section 11)

**Next action**: Start Phase 1 implementation - Items only (CSV import)

**Key principle**: Test thoroughly after each phase before moving to the next.


