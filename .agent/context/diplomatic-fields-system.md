# DIPLOMATIC FIELDS SYSTEM

**Status**: ✅ **Production-Ready** | **Version**: 2.0 | **Date**: January 15, 2025

## OVERVIEW

The Diplomatic Fields System is a core pattern in the Rosetta Stone architecture that categorizes every field in an entity based on its purpose and data presence guarantees. This system enables the Molecular Pattern (DNA/RNA/Ribosome) by providing clear rules about which fields are safe to display in different UI contexts.

**Implementation**: See `types/diplomatic-fields.ts`

## TERMINOLOGY NOTE

**"Parent UI"** in this document refers to **"Section UI"** - the parent container components (Sections) that display entity data. This is a well-established technical term meaning "the parent component that displays entity data" and is used throughout the diplomatic fields system to distinguish between modal forms and the parent containers that show the data.

## THE THREE CATEGORIES

### 🧬 NATIVE FIELDS
**What they are**: Core entity properties that define what the entity IS
**Data Presence**: Always present, always safe for parent UI
**Purpose**: Logged by the entity itself, represent the entity's core identity

**Examples**:
- `task.name`, `task.status`, `task.priority`
- `item.type`, `item.price`, `item.quantity`
- `sale.saleDate`, `sale.totals`, `sale.type`

### 🏛️ AMBASSADOR FIELDS
**What they are**: Cross-entity references that LIVE on the entity for UI convenience
**Data Presence**: Always present (even if 0/null), safe for parent UI
**Purpose**: Create Links to existing entities, provide UI convenience

**Examples**:
- `task.cost`, `task.revenue` (represent Financial entity)
- `item.siteId` (represents Site entity)
- `sale.siteId` (represents Site entity)

**Key Insight**: These fields are "permanently borrowed" - they live on the entity for UI purposes but represent other entities. They get copied via RNA (Links) to create relationships.

### 📡 EMISSARY FIELDS
**What they are**: Conditional entity creation fields that TEMPORARILY appear
**Data Presence**: Conditionally present, NOT safe for parent UI
**Purpose**: Create both Links AND new entities when conditions are met

**Examples**:
- `task.outputItemType`, `task.outputQuantity` (create Item entities)
- `financial.outputItemType` (create Item entities)
- `sale.requiresReconciliation` (create Task entities)

**Key Insight**: These fields are "temporarily borrowed" - they appear when creating other entities but might not exist, so parent UI cannot safely display them.

## DATA PRESENCE GUARANTEES

### Why Ambassador Fields Are Always Present
Ambassador fields are **permanently borrowed** from other entities. They live on the entity for UI convenience and are always present (even if 0 or null). This guarantees that parent UI can safely display them without breaking.

```typescript
// ✅ SAFE: Ambassador field is always present
<div>{task.cost}</div>  // Even if cost is 0, this won't break

// ✅ SAFE: Parent UI can display ambassador fields
const displayFields = getParentUISafeFields('task');
// Returns: native fields + ambassador fields (but NOT emissary fields)
```

### Why Emissary Fields Are Conditional
Emissary fields are **temporarily borrowed** and only appear when creating other entities. They might not exist, so parent UI cannot safely display them.

```typescript
// ❌ UNSAFE: Emissary field might not exist
<div>{task.outputItemType}</div>  // Could be undefined, breaks UI

// ✅ SAFE: Only display in modal where field is guaranteed
const modalFields = getAllFields('task');
// Returns: all fields (native + ambassador + emissary)
```

## INTEGRATION WITH ROSETTA STONE

### The DNA/RNA/Ribosome Pattern

```
Entity (DNA) → Diplomatic Fields → Links (RNA) → Ribosome (Workflows) → Other Entity
```

1. **DNA (Entity)**: Contains instructions in diplomatic fields
2. **Diplomatic Fields**: Provide delivery addresses for cross-entity communication
3. **RNA (Links)**: Copy DNA instructions and carry them between entities
4. **Ribosome (Workflows)**: Read RNA and synthesize new entities

### How Fields Become RNA (Links)

The `processLinkEntity()` function inspects diplomatic fields and creates Links:

```typescript
// Ambassador fields create Links to existing entities
if (task.cost) {
  await createLink('TASK_FINREC', task.id, financialRecord.id);
}

// Emissary fields create Links AND new entities
if (task.outputItemType) {
  const item = await createItemFromTask(task);
  await createLink('TASK_ITEM', task.id, item.id);
}
```

## EXAMPLES BY ENTITY

### Task Entity
```typescript
// 🧬 NATIVE FIELDS - What makes a Task a Task
name: string, description: string, status: TaskStatus, priority: TaskPriority

// 🏛️ AMBASSADOR FIELDS - Permanently borrowed, always present
cost: number, revenue: number, siteId: string, isNotPaid: boolean

// 📡 EMISSARY FIELDS - Conditionally borrowed, can be hidden
outputItemType: ItemType, outputQuantity: number, outputItemName: string
```

### FinancialRecord Entity
```typescript
// 🧬 NATIVE FIELDS - What makes a FinancialRecord a FinancialRecord
year: number, month: number, cost: number, revenue: number, jungleCoins: number

// 🏛️ AMBASSADOR FIELDS - Permanently borrowed, always present
siteId: string, targetSiteId: string

// 📡 EMISSARY FIELDS - Conditionally borrowed, can be hidden
outputItemType: ItemType, outputQuantity: number, outputItemName: string
```

### Sale Entity
```typescript
// 🧬 NATIVE FIELDS - What makes a Sale a Sale
saleDate: Date, type: SaleType, status: SaleStatus, totals: SaleTotals

// 🏛️ AMBASSADOR FIELDS - Permanently borrowed, always present
siteId: string

// 📡 EMISSARY FIELDS - Conditionally borrowed, can be hidden
requiresReconciliation: boolean, reconciliationTaskId: string
```

## VISUAL DIAGRAMS

### Field Flow Through System
```
Modal UI
    ↓
Diplomatic Fields (DNA)
    ↓
Field Inspection (RNA Synthesis)
    ↓
Link Creation (RNA Delivery)
    ↓
Entity Synthesis (Ribosome)
    ↓
Parent UI (Safe Fields Only)
```

### Modal vs Parent UI Distinction
```
Modal UI:
├── Native Fields (always shown)
├── Ambassador Fields (always shown)
└── Emissary Fields (conditionally shown)

Parent UI:
├── Native Fields (always shown)
└── Ambassador Fields (always shown)
❌ Emissary Fields (NOT shown - might not exist)
```

## IMPLEMENTATION GUIDELINES

### When to Use Each Field Type

**Use Native Fields for**:
- Core entity properties that define what the entity IS
- Fields that are always present and safe for any UI
- Fields that the entity logs itself

**Use Ambassador Fields for**:
- Cross-entity references that are always present
- Fields that represent other entities but live on this entity for UI convenience
- Fields that create Links to existing entities

**Use Emissary Fields for**:
- Conditional entity creation fields
- Fields that might not exist (optional features)
- Fields that create both Links AND new entities

### How to Add New Fields

1. **Identify the field type** based on purpose and data presence
2. **Add to appropriate configuration** in `types/diplomatic-fields.ts`
3. **Set displayInParentUI correctly**:
   - `true` for Native and Ambassador fields
   - `false` for Emissary fields
4. **Update workflow logic** to handle the new field type

### Common Patterns

**Pattern 1: Financial Integration**
```typescript
// Ambassador fields for financial data
cost: number, revenue: number, isNotPaid: boolean
// Creates TASK_FINREC links
```

**Pattern 2: Location Integration**
```typescript
// Ambassador fields for site references
siteId: string, targetSiteId: string
// Creates TASK_SITE links
```

**Pattern 3: Item Creation**
```typescript
// Emissary fields for item creation
outputItemType: ItemType, outputQuantity: number, outputItemName: string
// Creates TASK_ITEM links AND new Item entities
```

## KEY BENEFITS

- **UI Safety**: Clear rules about which fields are safe to display where
- **Data Presence Guarantees**: Developers know what fields are always present
- **Rosetta Stone Integration**: Fields automatically become Links
- **Maintainable**: Clear categorization makes code easier to understand
- **Extensible**: Easy to add new fields following established patterns

## CONCLUSION

The Diplomatic Fields System provides the foundation for the Rosetta Stone architecture by categorizing every field based on its purpose and data presence guarantees. This enables the Molecular Pattern where entities communicate through Links, creating a coherent relationship network where every action is traceable and every relationship is explicit.
