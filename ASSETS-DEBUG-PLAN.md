# Assets and Rates • Side Plan (Documentation Only)

## Scope
- No implementation. Captures current state, reset policy, and future direction for assets and conversion rates.

## Current State (Code-Verified)
- System State (Singletons today):
  - `data:company-assets` (DataStore.getCompanyAssets/saveCompanyAssets)
  - `data:personal-assets` (DataStore.getPersonalAssets/savePersonalAssets)
  - `data:project-status`
- Configuration (Preserved):
  - `data:financial-conversion-rates` (DataStore.getPlayerConversionRates/savePlayerConversionRates and financial rates)
  - `data:player-conversion-rates` (DataStore.getPlayerConversionRates/savePlayerConversionRates)
- User Preferences (Preserved):
  - `preferences:user` via repo/API (KV-backed)

## Reset Policy (Agreed)
- System State:
  - clear: delete keys
  - defaults: write baseline templates (assets zeroed)
  - backfill: n/a
- Configuration:
  - clear/defaults/backfill: preserve; ensure defaults exist on first run
- User Preferences:
  - preserve in all modes

## Immediate Problem
- Assets not cleared by reset → totals persist (e.g., $2084). Fix requires including System State keys in reset workflow.

## Future Evolution (Stage Setting)
- Personal Assets: per-account scope (multi-user)
  - Key: `data:personal-assets:{accountId}`
  - UI shows logged-in account’s personal assets
- Company Assets: multi-company support (founder-managed)
  - Key: `data:company-assets:{companyId}`
  - Founder can create/select companies; default company name on first run
- Migration Strategy (when implemented):
  - Read legacy singletons, write scoped keys, mark legacy as migrated
  - Non-destructive; reversible until cutover

## Open Questions
- Company selection UX on Finances page (initial company vs switcher)
- Founder role gating for creating companies
- Baseline templates for defaults (currency, zero balances, naming conventions)

## Risks & Constraints
- Avoid coupling assets to entities prematurely; start with scoped keys
- Keep conversion rates as Configuration; never clear on resets
- Use KV-only persistence (no localStorage)

## Next Steps (When Approved)
- Update documentation references to System State vs Configuration where needed
- Draft precise reset workflow changes (keys only) for review
- Prepare a migration doc for scoped keys (no code yet)

## LocalStorage Deprecation Plan (KV-only)

### Policy
- Target state is KV-only persistence. All current localStorage usages will migrate to KV-backed user preferences via `/api/user-preferences`.
- No offline cache in this phase; offline will be designed later as a separate feature.

### Inventory (Code-Verified)
- `components/modals/task-modal.tsx`
  - Keys: `taskModalEmissaryExpanded`, `lastUsedStation`, `lastUsedRecurrentType`, `lastUsedType`
- `components/modals/sales-modal.tsx`
  - Keys: `salesModal_advancedExpanded`, `salesModal_emissaryExpanded`
- `components/modals/financials-modal.tsx`
  - Keys: `finrecModal_emissaryColumnExpanded`, `finrecModal_descriptionExpanded`, `lastUsedRecordStation`, `lastUsedRecordCategory:{station}`
- `components/modals/item-modal.tsx`
  - Keys: `itemModalFormData`, `lastUsedStation`
- `components/inventory/inventory-display.tsx`
  - Keys: `stickerDivisionsCollapsed`, `stickerAllCollapsed`, `stickerSelectedLocations`, `stickerYellowThreshold`, `stickerRedThreshold`, `stickerSelectedColumns`
- `components/ui/searchable-select.tsx`
  - Keys: `searchable-select-collapsed-{instanceId}`
- `app/admin/research/page.tsx`
  - Keys: `notebooks`
- `workflows/settings/reset-data-workflow.ts` (dev-only block)
  - Behavior: clears localStorage during reset (legacy)

### Migration Approach
1) Namespacing: map each key to KV `preferences:user`, e.g. `ui.taskModal.emissaryExpanded`.
2) Read-once bridge: on first load after rollout, read localStorage → write KV → stop using localStorage.
3) Replace usages: remove localStorage get/set/remove calls; use `GET/POST /api/user-preferences`.
4) Reset workflow: remove localStorage-clearing logic once no usages remain.
5) SSR safety: ensure reads happen via client fetch; optimistic UI updates maintain snappy UX.

### Proposed KV Preference Keys
- `ui.taskModal.emissaryExpanded`, `ui.taskModal.lastUsedStation`, `ui.taskModal.lastUsedRecurrentType`, `ui.taskModal.lastUsedType`
- `ui.salesModal.advancedExpanded`, `ui.salesModal.emissaryExpanded`
- `ui.finrecModal.emissaryExpanded`, `ui.finrecModal.descriptionExpanded`, `ui.finrecModal.lastUsedStation`, `ui.finrecModal.lastUsedCategory.{station}`
- `ui.itemModal.formData`, `ui.itemModal.lastUsedStation`
- `ui.inventory.divisionsCollapsed`, `ui.inventory.allCollapsed`, `ui.inventory.selectedLocations`, `ui.inventory.yellowThreshold`, `ui.inventory.redThreshold`, `ui.inventory.selectedColumns`
- `ui.searchableSelect.collapsed.{instanceId}`
- `ui.research.notebooks`

### Risks
- Slight latency vs localStorage (mitigated by optimistic UI already in hook patterns).
- Preference payload size growth (can shard later if needed).

### Acceptance Criteria (For Later Implementation)
- No localStorage references remain in code.
- All previous UI states persist via KV across sessions/devices.
- Reset workflow no longer touches localStorage.
