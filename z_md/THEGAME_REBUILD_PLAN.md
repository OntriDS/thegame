# TheGame Vercel‑KV Rebuild Plan (Authoritative)

Status: LIVE | Source of truth for rebuild tasks and decisions

## The architecture should be
ENUMS → ENTITIES → SECTIONS → MODALS
                    ↓
                  LINKS ← WORKFLOW ← LOGGING
                    ↓
                  DATA-STORE (Vercel KV)
                    ↓
                  APIs → MCP (AI Tools)
                    ↓
                  BROWSER (User Interface)

## Project Context & Motivation

**We are restarting from scratch in this new folder but only in the order and the way that we need.**

The original project was becoming a maintenance nightmare with both environments at the same time and after several rearchitectures with mixed leftovers sometimes, and trying to reorganize in the same project also became impossible. So we will restart fresh - this is the best strategy.

**This project will be Vercel KV Production environment Only; we will remove the over complexity of the adapters.**

## Architecture Clarification

**IMPORTANT**: This thegame/ project is the **clean KV-only rebuild**. The original akiles-ecosystem-rossetta/ project (in the parent directory) contains the old architecture with adapters. 

**thegame/ = Clean KV-only architecture (this project)**
**akiles-ecosystem-rossetta/ = Original project with adapters (separate project)**

**Component Organization**: Instead of a generic `components/sections/` folder, thegame uses **feature-based organization**:
- `components/control-room/` (Control Room section)
- `components/finances/` (Finances section) 
- `components/inventory/` (Inventory section)
- `components/data-center/` (Data Center section)
- `components/research/` (Research section)
- `components/settings/` (Settings section)

This is actually **better organization** than a generic "sections" folder.

Everything was working fine in the original project. The migration should make everything work fine as it was but in a total clean and organized state, with separation of concerns, adjusting to our new prime structure. We just had many bugs that when resolved in one environment the other got broken again and so on, creating the mess already described.

**Goal**: Clean, organized, maintainable codebase with Vercel KV-only architecture, following the Rosetta Stone system principles.

## Locked Decisions
- Auth: jose JWT cookie + middleware (same as now)
- Storage: Vercel KV only, server-first, no adapters, no server→server HTTP
- Logs: Split logging
  - Entities logging → workflows/entities-logging.ts (append lifecycle, update-in-place for descriptive fields)
  - Links logging → links/links-logging.ts (links log themselves)
  - Archive: postponed until app parity achieved
- UI naming: Parents → Sections; Submodals live under Modals
- Enums cleanup: Business Structure is canonical; Stations = ADMIN, DESIGN, PRODUCTION, SALES, PERSONAL; categories derived from it
- Sites: dynamic-ready; settlement remains free-form; map/Google later
- File subdivision: Per-entity modules where meaningful (workflows, repos), with thin index barrels
- Entity Hierarchy: ULTRA (Account, Links) → CORE (Task, Item, Sale, FinancialRecord, Site, Character, Player) → INFRA (Settlement)

## Architecture Flow
API route → datastore orchestrator → repositories (KV) → entity-workflows (side-effects) → links-workflows (Rosetta) → logging (entities + links) → KV

## KV Key Schema
- data:{entity}:{id}
- index:{entity} → Set<ID>
- links:link:{id}
- index:links:by-entity:{entityType}:{id} → Set<LinkID>
- effects:{entityType}:{id}:{effectName}
- logs:{entityType} (archive buckets later: logs:{entityType}:{YYYY-MM})

## Anti‑Patterns To Avoid
- No server-side HTTP to own routes; repositories must use @vercel/kv directly
- No global mutable flags to gate workflows; use effects-registry keys
- Keep entity purity: entities log only what defines them; relationships via Links

## Cross‑Document Analysis Findings → Mitigations
Sources: cheetah_SYSTEM_ANALYSIS_2025-01-15.md, COMPREHENSIVE_ANALYSIS_2025-01-15.md, VERCEL_KV_VERIFICATION_ANALYSIS.md, UTILS_MATRIX_ANALYSIS.md
- Security gap in API routes → Phase 2 enforces jose JWT middleware + requireAdminAuth on all routes
- Server→server HTTP and circuit-breaker over‑engineering → KV-only repos + idempotency via effects-registry (no circuit breaker)
- Logging semantics consistency → Entities logs append/update-in-place; Links self-log (links-logging.ts)
- KV runtime untested → Phase 8 verification plan (manual tests per entity, links, logs, UI)
- Enums/stations confusion → Phase 5 normalization; SearchableSelect reads Business Structure
- Utilities spread/duplication → Utilities consolidation checklist (below)

## Directory Layout (target)
- types/
  - enums.ts (Business structure, entity/link enums, helpers)
  - entities.ts (BaseEntity, Link, Task, Item, Sale, FinancialRecord, Player, Character, Site, Settlement)
  - diplomatic-fields.ts (native/ambassador/emissary helpers)
- data-store/
  - kv.ts, keys.ts, effects-registry.ts
  - repositories/
    - task.repo.ts, item.repo.ts, sale.repo.ts, financial.repo.ts, player.repo.ts, character.repo.ts, site.repo.ts, link.repo.ts
  - datastore.ts (orchestrator; delegates to per-entity workflows/logging/links)
- links/
  - link-registry.ts (create/get/remove, indexes)
  - links-workflows.ts (processLinkEntity + per-entity effects)
  - links-logging.ts (append/update link logs)
- workflows/
  - entities-logging.ts (append lifecycle; update-in-place on descriptive changes)
  - entities-workflows/
    - task.workflow.ts, item.workflow.ts, sale.workflow.ts, financial.workflow.ts, player.workflow.ts, character.workflow.ts, site.workflow.ts
    - index.ts (re-export)
- components/
  - sections/ (ControlRoom, Inventory, Finances, Sales, DataCenter, Research, Settings, Maps)
  - modals/ (TaskModal, ItemModal, SaleModal, FinancialsModal, PlayerModal, CharacterModal, SiteModal, DeleteModal)
  - submodals/ (payments, sale-lines, move-items, links-submodal, character-role tools, selectors)
- app/
  - api/
    - tasks/(route.ts, [id]/route.ts)
    - items/(route.ts, [id]/route.ts)
    - financials/(route.ts, [id]/route.ts)
    - sales/(route.ts, [id]/route.ts)
    - players/(route.ts, [id]/route.ts)
    - characters/(route.ts, [id]/route.ts)
    - sites/(route.ts, [id]/route.ts)
    - links/(route.ts, [id]/route.ts)
  - middleware.ts (auth)
- mcp/ (server-only tools)

## Phased Checklist

### Phase 0 – Spine (KV-only) [COMPLETED]
- [x] types present (entities/enums/diplomatic-fields)
- [x] data-store/kv.ts (KV wrappers)
- [x] data-store/keys.ts (key builders)
- [x] data-store/effects-registry.ts (idempotency)
- [x] links/link-registry.ts
- [x] links/links-workflows.ts (basic Task/Item/Sale/Fin)
- [x] workflows/entities-logging.ts (append + update-in-place helpers)
- [x] data-store/repositories/task.repo.ts
- [x] data-store/datastore.ts (task upsert path)
- [x] app/api/tasks routes (list, byId, upsert, delete)
- [x] links/links-logging.ts (self-logging for links)

### Phase 1 – Entities (per-entity modules) [COMPLETED]
Tasks
- [x] task.repo.ts – complete queries
- [x] task.workflow.ts – property-inspection effects
- [x] app/api/tasks – finalize filters/pagination

Items
- [x] item.repo.ts
- [x] item.workflow.ts
- [x] app/api/items routes

Financials
- [x] financial.repo.ts
- [x] financial.workflow.ts
- [x] app/api/financials routes

Sales
- [x] sale.repo.ts
- [x] sale.workflow.ts
- [x] app/api/sales routes

Characters
- [x] character.repo.ts
- [x] character.workflow.ts
- [x] app/api/characters routes

Players
- [x] player.repo.ts
- [x] player.workflow.ts
- [x] app/api/players routes

Sites (dynamic-ready)
- [x] site.repo.ts
- [x] site.workflow.ts (status/activation logic)
- [x] app/api/sites routes

Links
- [x] link.repo.ts (optional; registry may be enough)
- [x] links-workflows: complete per-entity link creation
- [x] links-logging.ts: append link events

### Phase 2 – Auth & Middleware [COMPLETED]
- [x] Port jose JWT login/logout routes (same cookie name)
- [x] middleware.ts protecting admin/sections and all /api/* route handlers
- [x] lib/api-auth.ts → requireAdminAuth(req)
- [x] Apply requireAdminAuth to every API route (GET/POST/DELETE)
- [x] ENV wiring: ADMIN_ACCESS_KEY, ADMIN_SESSION_SECRET, cookie options

### Phase 3 – Logging Semantics (parity) [COMPLETED]
- Entities logs
  - [x] Append lifecycle events (Created, Done, Collected, Moved, Sold, etc.)
  - [x] Update-in-place for name/desc and propagated display fields
  - [x] Effects-registry guards for idempotency
- Links logs
  - [x] Append link create/remove/update events

### Phase 4 – UI Structure Ready [COMPLETED ✅]
- [x] components/sections created and imports adjusted (implemented as feature-based folders: control-room/, finances/, inventory/, data-center/, research/, settings/)
- [x] components/modals migrated
- [x] components/submodals migrated
- [x] Remove adapter references (none in KV-only - thegame is pure KV architecture)

#### Components Implementation Status
- Sections: ✅ ControlRoom (control-room/), ✅ Inventory (inventory/), ✅ Finances (finances/), ✅ Sales (sales/), ✅ DataCenter (data-center/), ✅ Research (research/), ✅ Settings (settings/), ⚠️ Maps (placeholder)
- Core Modals: ✅ TaskModal, ✅ ItemModal, ✅ FinancialsModal, ✅ SalesModal, ✅ PlayerModal, ✅ CharacterModal, ✅ SiteModal, ✅ DeleteModal
- Submodals: ✅ payments-submodal, ✅ sale-lines-submodal, ✅ move-items-modal, ✅ links-submodal, ✅ character-role tools, ✅ selectors
- Shared UI: ✅ ui/* (buttons, inputs, searchable-select), ✅ theme provider/selector, ✅ z-index utils usage

Checklist when pasting components
- [x] Replace any adapter calls with API/datastore calls (thegame uses ClientAPI → API routes → KV directly)
- [x] Ensure z-index uses unified utils (all components use z-index-utils.ts)
- [x] Numeric fields use NumericInput pattern (NumericInput used throughout)
- [x] Remove unused imports; UI emits pure entities only (clean implementation)

### Phase 5 – Enums Cleanup & Utilities [COMPLETED]
- [x] Normalize BUSINESS_STRUCTURE; expose getStations(), getCategoriesFor(station)
- [x] Update SearchableSelect utilities to consume BUSINESS_STRUCTURE
- [x] Remove/alias legacy helpers to avoid breakage
- [x] Utilities consolidation (from UTILS_MATRIX_ANALYSIS)
  - [x] Standardize on searchable-select-utils and site-options-utils
  - [x] Merge overlapping site/location utils; keep minimal map-ready helpers
  - [x] Ensure date-utils/theme-utils/z-index-utils are single sources for those concerns

### Phase 6 – Sites & Maps [COMPLETED ✅]
- [x] Site.metadata: { settlementId: string; googleMapsAddress: string } (dynamic settlements)
- [x] Settlement CRUD system implemented as reference data for Sites
- [x] Settlement submodal for creation from Site modal
- [x] Dynamic settlement dropdown with +New option
- [x] Settlement seed data migration from hardcoded enum
- [x] Sites-db.json updated with settlements section
- [x] Settlement utilities updated to use API data
- [x] Hardcoded Settlement enum and categories removed
- [x] Site query functions: getSitesBySettlement() and getSitesByRadius()
- [x] API query parameters: ?settlementId=X and ?lat=X&lng=Y&radius=Z
- [x] Settlement coordinates field for future Google Maps integration
- [x] Settings import/export/seed data workflows updated for settlements
- [x] Architectural consistency: settlements as reference data, not core entities

### Phase 7 – QA & Parity Verification
- [x] Links creation and queries parity (bidirectional query via unidirectional link types)
- [x] Logs parity (entities + links)
- [x] CRUD parity for all entities
- [x] No server-side HTTP anti-pattern anywhere

### Phase 8 – Verification & Testing (from analyses)
- API Authentication
  - [ ] Admin login/logout
  - [ ] Unauthorized requests rejected
  - [ ] Session persistence across requests
  - [ ] All API routes enforce auth
- Core Entity CRUD (KV)
  - [ ] Tasks / Items / Characters / Players / Sales / Financials / Sites
- Links System
  - [ ] Create/store/retrieve links via workflows
  - [ ] Bidirectional queries from unidirectional links
  - [ ] Orphan cleanup on delete (as applicable)
- Logging
  - [ ] Entities lifecycle append + update-in-place
  - [ ] Links append events
- UI Integration (smoke)
  - [ ] Sections load; modals save via API; DataCenter reads
- Performance & Error Handling
  - [ ] Large datasets, concurrent ops, graceful error paths

**STATUS**: ❌ **CODE COMPLETE, ZERO TESTING PERFORMED**
- All 31 API routes exist with proper code structure
- NO actual API calls tested in Vercel KV
- NO proof authentication works in production
- NO proof Links are created in KV storage
- NO proof any route actually functions

## Function Map (reference)
- data-store/kv.ts → kvGet, kvSet, kvDel, kvMGet, kvScan, kvSAdd, kvSRem, kvSMembers
- data-store/keys.ts → buildDataKey, buildIndexKey, buildLogKey, buildLinksIndexKey, buildEffectKey
- data-store/effects-registry.ts → hasEffect, markEffect
- data-store/repositories/*.repo.ts → getAll, getById, upsert, remove (entity-specific indexes kept inside)
- data-store/datastore.ts → upsert{Entity}, delete{Entity} orchestrations
- links/link-registry.ts → createLink, getLinksFor, removeLink
- links/links-workflows.ts → processLinkEntity + per-entity processors
- links/links-logging.ts → append/update link logs (self-logging)
- workflows/entities-logging.ts → appendEntityLog, updateEntityLogField
- workflows/entities-workflows/*.ts → onEntityUpsert/Delete with property inspection

## Notes
- Keep entity purity; relationships belong to Links
- Keep logs minimal and precise; lifecycle append, descriptive update-in-place
- Favor per-entity files for clarity and maintainability
- Entity hierarchy: ULTRA → CORE → INFRA provides clear architectural guidance
- Settlements are reference data managed within Site system, not core entities

## Recent Completions (January 15, 2025)
- ✅ **Settlement System**: Dynamic CRUD implemented as reference data for Sites
- ✅ **Data Management**: Import/Export/Seed workflows updated for settlements
- ✅ **Entity Hierarchy**: ULTRA → CORE → INFRA structure documented and implemented
- ✅ **Architectural Consistency**: All systems properly aligned with entity hierarchy
- ✅ **Documentation**: Comprehensive updates across all reference materials

---
This document is the living tracker. Update checkboxes as we land milestones.
