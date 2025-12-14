# Repository Consolidation - Legal Entities & Contracts

**Date**: December 13, 2025  
**Status**: ✅ COMPLETE  
**Complexity**: Medium (Architectural Refactoring)

---

## PROBLEM STATEMENT

The system had over-engineered separate repository files for Legal Entities and Contracts, creating unnecessary architectural complexity:

- `legal-entity.repo.ts` - Standalone repo for Legal Entities (37 lines)
- `contract.repo.ts` - Standalone repo for Contracts (37 lines)

Both were simple CRUD operations with no special logic, following the exact same pattern as other repos.

---

## ARCHITECTURAL DECISION

### Why Consolidate?

**Legal Entities** → `character.repo.ts`
- Legal Entities are the "business persona" layer for Characters
- They represent the legal/tax identity of a person (Character)
- Architecturally: Legal Entity IS-A Character (in business terms)
- Example: "John Doe" (Character) operates as "John Doe LLC" (Legal Entity)

**Contracts** → `financial.repo.ts`
- Contracts are financial instruments that define revenue/payment splits
- They are used exclusively for financial calculations (booth sales, partnerships)
- Architecturally: Contract IS-A Financial Instrument
- Example: A contract defines how revenue splits between two Legal Entities

### Similar Pattern: Settlements

This follows the established pattern where **Settlements** live in `site.repo.ts` because:
- Settlements are reference data for Sites
- Sites can't exist without Settlements (for physical locations)
- Keeps related entities together

---

## CHANGES MADE

### 1. Consolidated Legal Entities into `character.repo.ts`

**File**: `data-store/repositories/character.repo.ts`

```typescript
// Added section:
// ============================================================================
// LEGAL ENTITY OPERATIONS (Business Persona Layer for Characters)
// ============================================================================

export async function getAllLegalEntities(): Promise<LegalEntity[]>
export async function getLegalEntityById(id: string): Promise<LegalEntity | null>
export async function upsertLegalEntity(entity: LegalEntity): Promise<LegalEntity>
export async function deleteLegalEntity(id: string): Promise<void>
```

**Lines Added**: 33 lines  
**Pattern**: Same KV operations using `EntityType.LEGAL_ENTITY`

---

### 2. Consolidated Contracts into `financial.repo.ts`

**File**: `data-store/repositories/financial.repo.ts`

```typescript
// Added section:
// ============================================================================
// CONTRACT OPERATIONS (Financial Instruments - Revenue/Payment Splits)
// ============================================================================

export async function getAllContracts(): Promise<Contract[]>
export async function getContractById(id: string): Promise<Contract | null>
export async function upsertContract(contract: Contract): Promise<Contract>
export async function deleteContract(id: string): Promise<void>
```

**Lines Added**: 37 lines  
**Pattern**: Same KV operations using `EntityType.CONTRACT`

---

### 3. Updated `datastore.ts` Exports

**File**: `data-store/datastore.ts`

**Changes**:
- Removed import from `./repositories/legal-entity.repo`
- Removed import from `./repositories/contract.repo`
- Added Legal Entity imports to `character.repo` import block
- Added Contract imports to `financial.repo` import block

**Result**: All exports remain the same, just sourced from consolidated repos

---

### 4. Deleted Old Repository Files

**Deleted**:
- ❌ `data-store/repositories/legal-entity.repo.ts` (37 lines)
- ❌ `data-store/repositories/contract.repo.ts` (37 lines)

**Verified**: No remaining references in codebase

---

### 5. API Routes (No Changes Needed)

**Files**:
- `app/api/legal-entities/route.ts` - ✅ Already uses `datastore.ts`
- `app/api/contracts/route.ts` - ✅ Already uses `datastore.ts`

Both routes import from `@/data-store/datastore`, so they automatically use the consolidated repos.

---

## VERIFICATION

### ✅ Build Status
```bash
npm run build
```
**Result**: Exit code 0 - Build successful

### ✅ No Orphaned References
```bash
grep -r "legal-entity.repo" --include="*.ts" --include="*.tsx"
grep -r "contract.repo" --include="*.ts" --include="*.tsx"
```
**Result**: No matches found

### ✅ Repository Count
**Before**: 13 repository files  
**After**: 11 repository files  
**Reduction**: 2 files removed (15% reduction)

---

## FINAL REPOSITORY STRUCTURE

```
data-store/repositories/
├─ account.repo.ts          (Accounts - Ultra Entity)
├─ archive.repo.ts          (Archive snapshots)
├─ character.repo.ts        (Characters + Legal Entities) ← CONSOLIDATED
├─ financial.repo.ts        (Financial Records + Contracts) ← CONSOLIDATED
├─ item.repo.ts             (Inventory items)
├─ player.repo.ts           (Players - Ultra Entity)
├─ sale.repo.ts             (Sales)
├─ session.repo.ts          (Sessions)
├─ site.repo.ts             (Sites + Settlements)
├─ task.repo.ts             (Tasks)
└─ user-preferences.repo.ts (User preferences)
```

---

## ARCHITECTURAL BENEFITS

### 1. **Reduced Complexity**
- Fewer files to maintain
- Less cognitive overhead
- Clearer architectural relationships

### 2. **Better Organization**
- Related entities grouped together
- Follows domain-driven design principles
- Matches business logic relationships

### 3. **Consistency**
- Follows the Settlement → Site pattern
- Legal Entity → Character relationship is clear
- Contract → Financial relationship is logical

### 4. **Maintainability**
- Easier to find related operations
- Simpler imports
- Reduced code duplication

---

## FUTURE CONSIDERATIONS

### Similar Consolidation Opportunities?

Review other potential consolidations using this pattern:

1. **Is Entity A a sub-entity of Entity B?** → Consolidate into B's repo
2. **Is Entity A exclusively used by Entity B?** → Consolidate into B's repo
3. **Does Entity A have <50 lines of simple CRUD?** → Consider consolidation

### Pattern to Follow

When consolidating:
1. Add clear section comments (`// ============================================================================`)
2. Use descriptive comments explaining the relationship
3. Group related imports in parent file
4. Keep EntityType constants separate (don't mix)
5. Update datastore.ts imports
6. Verify no orphaned references
7. Build and test

---

## CONCLUSION

This consolidation reduces architectural bloat while improving code organization. Legal Entities and Contracts are now properly positioned as sub-entities within their logical parent systems (Characters and Financials, respectively).

**Impact**: Cleaner architecture, easier maintenance, no functionality changes.

---

**Reviewed by**: Pixelbrain  
**Approved by**: Akiles  
**Deployment**: Ready for production
