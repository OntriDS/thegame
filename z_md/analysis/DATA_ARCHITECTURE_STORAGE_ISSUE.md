# 🔍 COMPLETE DATA ARCHITECTURE ANALYSIS

## EXECUTIVE SUMMARY

**CRITICAL FINDING**: The system has **THREE DISTINCT DATA CATEGORIES** with different storage patterns, reset behaviors, and architectural purposes. The "configuration data" classification was **NOT a design decision** - it's an **architectural inconsistency** that creates the reset problems you're experiencing.

## DATA STORAGE PATTERNS ANALYSIS

### 1. ENTITY DATA (Properly Architected)
**Pattern**: `data:{entityType}:{id}` + `index:{entityType}`
**Reset Behavior**: ✅ **FULLY CLEARED** by reset workflow
**Purpose**: Business entities with full CRUD operations

#### Entity Types:
- `data:task:{id}` + `index:task`
- `data:item:{id}` + `index:item`  
- `data:sale:{id}` + `index:sale`
- `data:financial:{id}` + `index:financial`
- `data:character:{id}` + `index:character`
- `data:player:{id}` + `index:player`
- `data:account:{id}` + `index:account`
- `data:site:{id}` + `index:site`

#### Architecture:
- **Repository Pattern**: Each entity has dedicated repository
- **Index Management**: Automatic index updates on CRUD
- **Workflow Integration**: Full workflow and logging support
- **Reset Support**: Properly cleared by reset workflow

### 2. SYSTEM STATE (Singletons, Mixed Architecture)
**Pattern**: `data:{systemType}` (single key storage)
**Reset Behavior**: ❌ **PERSISTS** through resets (ARCHITECTURAL BUG)
**Purpose**: Singleton domain-level state (economic posture, global parameters)

#### System State Types:
- `data:company-assets` - Company financial assets
- `data:personal-assets` - Personal financial assets  
- `data:financial-conversion-rates` - Exchange rates
- `data:player-conversion-rates` - Point conversion rates
- `data:project-status` - Project milestone/status snapshot

#### Architecture Issues:
- **No Repository Pattern**: Direct KV access in datastore.ts
- **No Index Management**: Single key storage
- **No Workflow Integration**: Bypasses workflow system
- **Reset Bug**: Not included in reset workflow

### 3. OPERATIONAL DATA (Properly Architected)
**Pattern**: Various specialized patterns
**Reset Behavior**: ✅ **CLEARED** by appropriate workflows
**Purpose**: System operations and temporary state

#### Operational Data Types:
- `links:link:{id}` - Link relationships
- `index:links:by-entity:{entityType}:{id}` - Link indexes
- `effects:{entityType}:{id}:{effectName}` - Effects registry
- `logs:{entityType}` - Entity logs
- `logs:{entityType}:{YYYY-MM}` - Archived logs
- `user-preferences` - User UI preferences
- `processing-stack` - Workflow processing state

#### Architecture:
- **Specialized Patterns**: Each type has appropriate storage pattern
- **Workflow Integration**: Properly integrated with workflows
- **Reset Support**: Cleared by appropriate reset operations

## THE REAL PROBLEM: ARCHITECTURAL INCONSISTENCY

### What I Incorrectly Called "Configuration Data"

Assets are **System State** today, but conversion rates are better classified as **Configuration Data** (admin-editable parameters) and should not be cleared by resets.

### Why This Happened (Not a Design Decision)

1. **Historical Implementation**: Assets were implemented before the full entity architecture was established
2. **Quick Implementation**: Used simple single-key storage for "settings-like" data
3. **Missing Architecture**: No clear pattern for system-wide state data
4. **Technical Debt**: Never refactored to match entity architecture

### The Architectural Inconsistency

```typescript
// ENTITY DATA (Proper Architecture)
data:task:uuid-123 → Task entity
index:task → Set of task IDs
Repository: task.repo.ts
Workflows: task.workflow.ts
Reset: ✅ Cleared

// SYSTEM STATE DATA (Inconsistent Architecture)  
data:company-assets → Company assets object
No index
No repository
No workflows
Reset: ❌ NOT cleared (BUG)
```

## COMPLETE DATA INVENTORY

### Entity Data (8 types) ✅
1. **Tasks** - `data:task:{id}` + `index:task`
2. **Items** - `data:item:{id}` + `index:item`
3. **Sales** - `data:sale:{id}` + `index:sale`
4. **Financial Records** - `data:financial:{id}` + `index:financial`
5. **Characters** - `data:character:{id}` + `index:character`
6. **Players** - `data:player:{id}` + `index:player`
7. **Accounts** - `data:account:{id}` + `index:account`
8. **Sites** - `data:site:{id}` + `index:site`

### System State (3 types) ❌
1. **Company Assets** - `data:company-assets`
2. **Personal Assets** - `data:personal-assets`
3. **Project Status** - `data:project-status`

### Operational Data (6+ types) ✅
1. **Links** - `links:link:{id}` + `index:links:by-entity:{entityType}:{id}`
2. **Effects Registry** - `effects:{entityType}:{id}:{effectName}`
3. **Entity Logs** - `logs:{entityType}` + `logs:{entityType}:{YYYY-MM}`
4. **User Preferences** - `user-preferences`
5. **Processing Stack** - `processing-stack`
6. **Research Logs** - `data:notes-log`, `data:dev-log`

## THE $2084 MYSTERY SOLVED

### Root Cause
The $2084 comes from **persistent system state** that survives resets because:

1. **Wrong Storage Pattern**: Assets use single-key storage instead of entity pattern
2. **Missing Reset Logic**: Reset workflow only clears entity data, not system state
3. **Architectural Inconsistency**: System state not treated as resettable data

### The Real Calculation
```typescript
// Company Total = Monetary + Jungle Coins + Inventory
getCompanyTotal() = getCompanyMonetaryTotal() + getJungleCoinsTotal() + getCompanyInventoryTotal()

// Monetary Total comes from data:company-assets (PERSISTENT)
// Inventory Total comes from data:company-assets.inventory (PERSISTENT)
// Jungle Coins Total comes from data:company-assets.companyJ$ (PERSISTENT)
```

**The $2084 is real data stored in `data:company-assets` that was set previously and never cleared by resets.**

## PROPER DESIGN DECISIONS NEEDED

### Option 1: Fix Reset Workflow (Quick Fix)
**Add system state clearing to reset workflow:**
```typescript
// Add to ResetDataWorkflow.clearAllEntityData()
await kv.del('data:company-assets');
await kv.del('data:personal-assets');
await kv.del('data:financial-conversion-rates');
await kv.del('data:player-conversion-rates');
```

**Pros**: Quick fix, minimal changes
**Cons**: Doesn't fix architectural inconsistency

### Option 2: Refactor to Entity Architecture (Proper Fix)
**Convert system state data to proper entities:**
```typescript
// Create new entity types
EntityType.COMPANY_ASSETS
EntityType.PERSONAL_ASSETS  
EntityType.CONVERSION_RATES

// Use proper entity pattern
data:company-assets:{id} + index:company-assets
data:personal-assets:{id} + index:personal-assets
data:conversion-rates:{id} + index:conversion-rates
```

**Pros**: Consistent architecture, proper workflows, maintainable
**Cons**: More work, requires migration

### Option 3: Hybrid Approach (Recommended)
**Create dedicated system state management:**
```typescript
// Add to ResetDataWorkflow
const SYSTEM_STATE_KEYS = [
  'data:company-assets',
  'data:personal-assets', 
  'data:financial-conversion-rates',
  'data:player-conversion-rates'
];

// Clear system state data
for (const key of SYSTEM_STATE_KEYS) {
  await kv.del(key);
}
```

**Pros**: Fixes immediate problem, maintains current architecture
**Cons**: Still has architectural inconsistency

## RECOMMENDED ACTION PLAN

### Phase 1: Immediate Fix (1-2 hours)
1. Add system state data clearing to reset workflow
2. Test reset functionality thoroughly
3. Document the fix

### Phase 2: Architecture Review (1-2 days)
1. Audit all data storage patterns
2. Create consistent data classification system
3. Document proper data architecture patterns

### Phase 3: Long-term Refactoring (1-2 weeks)
1. Consider converting system state to entities
2. Implement proper system state management
3. Add comprehensive data management tools

## CONCLUSION

The $2084 discrepancy is caused by **architectural inconsistency** where system state uses a different storage pattern than entity data and is not included in reset operations. This was not a design decision but rather **technical debt** from inconsistent implementation patterns.

**The fix requires adding domain state clearing to the reset workflow, BUT the real solution is establishing consistent data architecture patterns across all data types.**

## CANONICAL DATA CATEGORIES AND DEFINITIONS

### Category Definitions
- **Entity Data**: Business records with identity and lifecycle. Stored as `data:{entityType}:{id}` with `index:{entityType}`. Examples: tasks, items, sales, financial records, characters, players, accounts, sites.

- **Operational Data**: Infrastructure supporting entity workflows and observability. Includes logs, links, effects registry, processing stacks. Patterns: `logs:{entityType}[{:YYYY-MM}]`, `links:link:{id}` and link indexes, `effects:{entityType}:{id}:{effect}`, `processing-stack`.

- **System State (Singletons)**: Singleton system-level state shaping the simulation/economy (today). Not per-user, not per-entity (future: may become per-account/company). Examples: `data:company-assets`, `data:personal-assets`, `data:project-status`.

- **Configuration Data**: User or environment preferences and admin-editable parameters that should survive resets. Examples: `user-preferences` (KV-backed), `data:financial-conversion-rates`, `data:player-conversion-rates`; environment variables; feature flags. Not part of domain simulation.

### Key Differentiators
- **Scope**: Entity (many) vs Singleton (one) vs Infra (supporting) vs User/Env (preferences)
- **Ownership**: Domain team owns Entity/System State; Platform team owns Operational; UX/Platform own Configuration
- **Lifecycle**: Entities change via CRUD; Operational rotates/accumulates; System State changes via admin actions; Configuration changes ad-hoc per user/env
- **Source of Truth**: Entities are authoritative business data; System State is authoritative world state; Operational is derivative/observability; Configuration is preference

### Reset Policy Matrix
- **Entity Data**:
  - clear: delete all data + indexes
  - defaults: delete all, optionally seed minimal demo entities if chosen
  - backfill: rebuild logs/indexes from existing entities only

- **Operational Data**:
  - clear: delete all logs, links, effects, processing stacks
  - defaults: clear; optionally rehydrate computed artifacts after seeding
  - backfill: regenerate from entities (idempotent)

- **System State**:
  - clear: delete all singleton keys
  - defaults: write baseline templates (assets zeroed; default conversion rates)
  - backfill: no-op (do not infer from entities)

- **Configuration Data**:
  - clear: preserve
  - defaults: preserve
  - backfill: preserve

### Current Key Inventory Mapping
- Entity Data: `data:{task|item|sale|financial|character|player|account|site}:{id}`, `index:{...}`
- Operational:
  - Logs: `logs:{entityType}`, `logs:{entityType}:{YYYY-MM}`; Research logs: `data:notes-log`, `data:dev-log`
  - Links: `links:link:{id}`, `index:links:by-entity:{entityType}:{id}`
  - Effects/Processing: `effects:{entityType}:{id}:{effectName}`, `processing-stack`
- System State (Singletons):
  - Assets: `data:company-assets`, `data:personal-assets`
  - Project: `data:project-status`
- Configuration:
  - Rates: `data:financial-conversion-rates`, `data:player-conversion-rates`
  - `user-preferences` (via repo/API)
- Configuration: `user-preferences` (via repo/API)

### Decisions and Rationale
- **Assets classification**: System State (today). Represents financial posture; participates in resets. Future: per-account/company entities or scoped keys.
- **Conversion rates classification**: Configuration. Admin-editable parameters; preserved across resets; defaults provided on first run.
- **User preferences**: Configuration. Never cleared by resets.

### Roadmap (Documentation-only; no code changes yet)
1) Adopt names: Entity Data, Operational Data, System State (Singletons), Configuration Data
2) Update reset documentation to include System State handling
3) When implementing: extend reset workflow to apply the above matrix, gated by options
4) Optionally rename keys to make singletons explicit (e.g., `system:assets:company`) – migration plan to be discussed

## FUTURE EVOLUTION (Stage-Setting, No Implementation Yet)

### Assets: From Singleton to Scoped
- Today: `data:company-assets` (global), `data:personal-assets` (global)
- Future (multi-user):
  - Per-account personal assets: `data:personal-assets:{accountId}`
  - Per-company assets (multi-company): `data:company-assets:{companyId}`
  - UI selects which company to display; founder can add companies
  - Reset policy: scoped clears by selected account/company; global reset clears all

### Rates: Configuration, Not State
- Keep as configuration keys, preserved across resets
- Provide sensible defaults on first run
- Editable in Admin → Finances → Conversion Rates

### Triforce Initialization
- On first start/reset (defaults mode):
  - Create Account ↔ Player ↔ Character links
  - Initialize selected System State keys to zero/baselines
  - Do not touch Configuration (rates, preferences)

