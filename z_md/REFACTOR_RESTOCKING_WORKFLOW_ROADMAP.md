# Restocking Workflow Refactoring Roadmap

## Overview
This roadmap details the complete refactoring of the restocking system to separate concerns and implement proper inventory management logic.

## Current Problems
1. `restockable` field mixes two concerns: "keep item in inventory" + "restock to target quantity"
2. Hardcoded defaults for ARTWORK/DIGITAL items in `getDefaultRestockableForType()`
3. Missing "Keep Item in Inventory after Sold" toggle
4. Restock logic incorrectly tied to `restockable` field
5. No proper validation for selling more than available quantity
6. Missing UI confirmation prompts using submodal system
7. `requiresRestock` and `restockTaskId` fields exist on Sale entities but aren't functionally connected
8. Sold items always have `quantitySold = 0` in inventory (unless special case from Item Modal)

## New System Design

### Two Separate Concerns
1. **"Keep Item in Inventory after Sold"** - Controls whether inventory item stays after sale
2. **"Restock to Target Quantity"** - Controls whether quantity resets to target amount (mainly for Network Sales)

### Key Rules
- Items that stay in inventory always have `quantitySold = 0`
- `soldQuantity` field in Item Modal is only for special cases where user sells directly from Item Modal
- No hardcoded behavior for any item types
- Proper validation and user confirmation for edge cases

---

## Phase 1: Schema & Type Changes

### 1.1 Add New Fields to Item Entity
**File: `types/entities.ts`**

```typescript
export interface Item extends BaseEntity {
  // ... existing fields ...

  // NEW: Replace restockable with these two separate concerns:
  keepInInventoryAfterSold?: boolean;  // Controls whether item stays in inventory after sale
  // restockable?: boolean; // DEPRECATED - remove or mark as deprecated

  // ... existing fields ...
}
```

**Implementation Notes:**
- Add `keepInInventoryAfterSold?: boolean` field
- Mark `restockable` as deprecated or remove completely
- Default value: `false` for all item types (no hardcoding)

### 1.2 Update Sale Entity (if needed)
**File: `types/entities.ts`**

The Sale entity already has `requiresRestock` and `restockTaskId` fields, but these may need to be repurposed or documented better.

---

## Phase 2: Item Modal Updates

### 2.1 Replace Restockable Toggle
**File: `components/modals/item-modal.tsx`**

**Changes:**
1. Remove `restockable` state and UI toggle
2. Add `keepInInventoryAfterSold` state and UI toggle
3. Remove `getDefaultRestockableForType()` function
4. Update form state management
5. Update form data persistence

**New UI:**
```tsx
// Replace this:
<Switch id="restockable" checked={restockable} onCheckedChange={setRestockable} />
<Label htmlFor="restockable">Restock automatically when sold</Label>

// With this:
<Switch
  id="keepInInventoryAfterSold"
  checked={keepInInventoryAfterSold}
  onCheckedChange={setKeepInInventoryAfterSold}
/>
<Label htmlFor="keepInInventoryAfterSold">Keep Item in Inventory after Sold?</Label>
```

### 2.2 Update Form State
**Changes needed:**
- Remove `restockable` from state interface
- Add `keepInInventoryAfterSold` to state interface
- Remove `getDefaultRestockableForType()` function completely
- Update `useEffect` dependencies to use new field
- Update form data loading/saving logic

### 2.3 Update Form Data Persistence
**Changes needed:**
- Update form data JSON structure to use new field name
- Update all references to `formData.restockable` → `formData.keepInInventoryAfterSold`
- Update all form state resets to use new field

### 2.4 Update Item Creation/Editing Logic
**Changes needed:**
- Update `handleSave()` function to use `keepInInventoryAfterSold`
- Update `handleRefresh()` function to load new field
- Update `handleDuplicate()` function to copy new field
- Update `handleSoldNow()` function to use new field

### 2.5 Update Sold Now Functionality
**Current Behavior:**
- Creates clone with sold quantity, 0 stock
- Archives to current month
- **Needs to respect `keepInInventoryAfterSold` toggle**

**New Behavior:**
```typescript
// If keepInInventoryAfterSold = true:
// - Deduct sold quantity from inventory item
// - Keep inventory item active
// - Create sold clone in Sold Items tab

// If keepInInventoryAfterSold = false:
// - Deduct sold quantity from inventory item
// - Delete inventory item if quantity becomes 0
// - Create sold clone in Sold Items tab
// - Prompt user if selling more than available quantity
```

---

## Phase 3: Sales Workflow Updates

### 3.1 Update Item Sale Line Processing
**File: `workflows/sale-line-utils.ts`**

**Current Issues:**
- `processItemSaleLine()` doesn't check `keepInInventoryAfterSold`
- No validation for selling more than available quantity
- Auto-adjusts stock without user confirmation
- Doesn't handle item deletion when quantity reaches 0

**New Implementation:**
```typescript
export async function processItemSaleLine(line: ItemSaleLine, sale: Sale): Promise<void> {
  // ... existing validation code ...

  const item = await getItemById(line.itemId);
  if (!item) return;

  const currentStock = item.stock.reduce((sum, sp) => sum + sp.quantity, 0);
  const requiredTotal = line.quantity;

  // NEW: Validate quantity before processing
  if (requiredTotal > currentStock) {
    // Prompt user for confirmation (via submodal)
    const confirmed = await promptUserForOversell(item, requiredTotal, currentStock);
    if (!confirmed) return; // User cancelled
  }

  // NEW: Handle keepInInventoryAfterSold logic
  const shouldKeepInInventory = item.keepInInventoryAfterSold ?? false;

  // Deduct from stock (existing logic)
  // ... stock deduction code ...

  // NEW: Delete item if not keeping in inventory and quantity is 0
  if (!shouldKeepInInventory && currentStock - requiredTotal <= 0) {
    await deleteItem(item.id); // Or mark as archived
  } else {
    // Save updated item
    await upsertItem(updatedItem, { skipWorkflowEffects: true });
  }
}
```

### 3.2 Add User Confirmation for Overselling
**New Function Needed:**
```typescript
async function promptUserForOversell(item: Item, required: number, available: number): Promise<boolean> {
  // Create and show confirmation submodal
  // Message: "Selling ${required} but only ${available} available. Continue?"
  // Return true if user confirms, false if cancelled
}
```

**Implementation Notes:**
- Use existing submodal system (not window.confirm)
- Make non-blocking (user can proceed with warning)
- Add this to UI components layer

### 3.3 Update Sold Item Entity Creation
**File: `workflows/sale-line-utils.ts`**

**Current Behavior:**
- `ensureSoldItemEntities()` creates sold clone
- Sold clone has `quantitySold = line.quantity`

**New Behavior:**
- Keep existing logic (already correct)
- Ensure sold clone always has `quantitySold > 0`
- Ensure inventory item always has `quantitySold = 0`

### 3.4 Update Sale Modal for Restock Functionality
**File: `components/modals/sales-modal.tsx`**

**Current State:**
- Has `requiresRestock` and `restockTaskId` fields
- No UI for these fields
- Not connected to actual restocking logic

**New Requirements:**
- Only show restock option if sale type is NETWORK
- Validate that item has `targetAmount` set before allowing restock
- If `targetAmount` is missing, auto-disable restock option
- Add UI toggle for "Restock to Target Quantity" (Network Sales only)

```typescript
// In Sale Modal
{sale.type === SaleType.NETWORK && (
  <div>
    <Switch
      id="restockToTarget"
      checked={restockToTarget}
      onCheckedChange={setRestockToTarget}
      disabled={!hasTargetAmount}
    />
    <Label htmlFor="restockToTarget">
      Restock to Target Quantity
      {!hasTargetAmount && " (Item must have target amount)"}
    </Label>
  </div>
)}
```

---

## Phase 4: Item Workflow Updates

### 4.1 Refactor Restocking Logic
**File: `workflows/entities-workflows/item.workflow.ts`**

**Current Issues:**
- Uses `restockable` field incorrectly
- Mixed concerns (keep in inventory vs restock to target)
- Doesn't handle Network Sales specifically

**New Implementation:**

```typescript
// In item selling workflow:

// 1. Handle "Keep in Inventory" logic
const shouldKeepInInventory = item.keepInInventoryAfterSold ?? false;

if (shouldKeepInInventory) {
  // Item stays in inventory
  updatedBaseItem = {
    ...item,
    status: ItemStatus.FOR_SALE,
    quantitySold: 0, // Always 0 for inventory items
    stock: [{ siteId: primarySite, quantity: remainingStock }],
    updatedAt: new Date()
  };
} else {
  // Item may be deleted if quantity becomes 0
  if (remainingStock <= 0) {
    // Delete item or mark as archived
    await deleteItem(item.id);
    updatedBaseItem = null; // No inventory item to update
  } else {
    updatedBaseItem = {
      ...item,
      status: ItemStatus.FOR_SALE,
      quantitySold: 0,
      stock: [{ siteId: primarySite, quantity: remainingStock }],
      updatedAt: new Date()
    };
  }
}

// 2. Handle "Restock to Target" logic (Network Sales only)
const shouldRestockToTarget = sale.type === SaleType.NETWORK &&
                          item.targetAmount &&
                          item.targetAmount > 0;

if (shouldRestockToTarget) {
  // Replace reduced quantity with target quantity
  updatedBaseItem = {
    ...updatedBaseItem,
    stock: [{ siteId: primarySite, quantity: item.targetAmount }],
    updatedAt: new Date()
  };
}
```

### 4.2 Update Sold Quantity Handling
**Key Rule:** Items that stay in inventory always have `quantitySold = 0`

**Changes needed:**
- Ensure all inventory items have `quantitySold: 0` after any sale
- Only sold clones in Sold Items tab have `quantitySold > 0`
- Special case: Item Modal direct sale can set `quantitySold` temporarily

### 4.3 Update Item Modal Direct Sale
**File: `components/modals/item-modal.tsx`**

**Current Behavior:**
- `handleSoldNow()` allows setting sold quantity
- Creates sold clone

**New Behavior:**
```typescript
// Handle direct sale from Item Modal
if (soldQuantity > 0) {
  // Deduct from inventory item stock
  const newStock = Math.max(0, currentStock - soldQuantity);

  if (keepInInventoryAfterSold && newStock > 0) {
    // Keep inventory item with reduced stock
    updatedInventoryItem = {
      ...item,
      stock: [{ siteId: item.stock[0].siteId, quantity: newStock }],
      quantitySold: 0, // Always 0
      updatedAt: new Date()
    };
  } else {
    // Delete inventory item if not keeping or quantity is 0
    await deleteItem(item.id);
  }

  // Create sold clone
  soldItem = {
    ...item,
    id: `${item.id}-sold-now`,
    status: ItemStatus.SOLD,
    stock: [{ siteId: item.stock[0].siteId, quantity: 0 }],
    quantitySold: soldQuantity, // This is the clone's sold quantity
    soldAt: new Date(),
    // ...
  };
}
```

---

## Phase 5: Validation & Error Handling

### 5.1 Add Quantity Validation
**Files:** Multiple (item-modal.tsx, sale-line-utils.ts, item.workflow.ts)

**Validation Rules:**
- Prevent negative quantities
- Validate sold quantity <= available quantity (with user confirmation)
- Validate target amount is set before allowing restock
- Validate item has stock before allowing sale

### 5.2 Add User Confirmation Prompts
**New Component Needed:** `OversellConfirmationSubmodal`

**Features:**
- Shows when user tries to sell more than available
- Non-blocking (user can proceed)
- Uses existing submodal system
- Returns boolean confirmation

### 5.3 Update Error Messages
**Changes needed:**
- Clear error messages for missing target amount
- Clear error messages for insufficient stock
- Clear error messages for invalid operations

---

## Phase 6: Migration & Data Cleanup

### 6.1 Migrate Existing Items
**Migration Script Needed:**

```typescript
// Migrate restockable → keepInInventoryAfterSold
async function migrateRestockableField() {
  const allItems = await getAllItems();

  for (const item of allItems) {
    if (item.restockable !== undefined) {
      // Old behavior: restockable = true meant keep in inventory
      // New behavior: keepInInventoryAfterSold = true means keep in inventory
      item.keepInInventoryAfterSold = item.restockable;
      delete item.restockable;

      await upsertItem(item);
    }
  }
}
```

### 6.2 Update Default Values
**Changes needed:**
- All new items default to `keepInInventoryAfterSold = false`
- All new items default to no target amount
- Remove hardcoded defaults for ARTWORK/DIGITAL items

### 6.3 Update Sale Entities (if needed)
**Changes needed:**
- Clean up unused `requiresRestock` and `restockTaskId` fields
- Or properly implement them if still needed

---

## Phase 7: Testing Strategy

### 7.1 Unit Tests
**Test Cases Needed:**
- Item creation with new toggle ON/OFF
- Item editing - toggle state preservation
- Sale from Item Modal - both toggle states
- Sale from Sales Modal - both toggle states
- Network Sale with restock ON/OFF
- Overselling scenario - user confirmation
- Quantity validation edge cases
- Item deletion when quantity reaches 0

### 7.2 Integration Tests
**Test Scenarios Needed:**
- Full sales workflow (creation → posting → collection)
- Multi-site inventory management
- Sold Items tab population
- Archive month indexing
- Financial record integration

### 7.3 Manual Testing Checklist
- [ ] Item Modal - create new item with toggle ON
- [ ] Item Modal - create new item with toggle OFF
- [ ] Item Modal - edit existing item toggle state
- [ ] Item Modal - sell item directly with toggle ON
- [ ] Item Modal - sell item directly with toggle OFF
- [ ] Sales Modal - create DIRECT sale with various items
- [ ] Sales Modal - create NETWORK sale with restock ON
- [ ] Sales Modal - create NETWORK sale with restock OFF
- [ ] Sales Modal - oversell item (more than available)
- [ ] Sold Items tab - verify sold clones appear
- [ ] Inventory tab - verify items deleted/kept correctly
- [ ] Archive - verify proper month indexing
- [ ] Financial records - verify correct values

---

## Phase 8: Documentation Updates

### 8.1 Update Entity Documentation
**Files:**
- `z_md/detailed-docs/ITEM_ENTITY.md`
- `z_md/detailed-docs/SALES_ENTITIY.md`
- `z_md/ENTITIES_ARCHITECTURE.md`

**Changes needed:**
- Document `keepInInventoryAfterSold` field
- Remove/dep document `restockable` field
- Document new restocking behavior
- Update workflow diagrams

### 8.2 Update User Documentation
**Changes needed:**
- Item Modal - explain new toggle
- Sales Modal - explain restock option
- Inventory management - explain new behavior
- Troubleshooting guide for edge cases

---

## Implementation Order

### Priority 1 (Core Functionality)
1. Phase 1: Schema & Type Changes
2. Phase 2: Item Modal Updates
3. Phase 3: Sales Workflow Updates (basic)
4. Phase 4: Item Workflow Updates (basic)

### Priority 2 (Validation & UX)
5. Phase 5: Validation & Error Handling
6. Phase 6: Migration & Data Cleanup

### Priority 3 (Testing & Polish)
7. Phase 7: Testing Strategy
8. Phase 8: Documentation Updates

---

## Risk Assessment

### High Risk Areas
1. **Data Migration** - Existing items with `restockable` field
2. **Sales Workflow** - Complex stock deduction logic
3. **Archive Indexing** - Month indexing for sold items

### Medium Risk Areas
1. **UI Changes** - New toggle, removed toggle
2. **Validation** - New user confirmation flows
3. **Network Sales** - New restock behavior

### Low Risk Areas
1. **Documentation** - Text updates only
2. **Type Changes** - Backward compatible
3. **Unit Tests** - Isolated changes

---

## Success Criteria

✅ **Functional:**
- New toggle works correctly in Item Modal
- Items kept/deleted based on toggle state
- Sold clones always appear in Sold Items tab
- Network sales restock to target quantity correctly
- Inventory items always have `quantitySold = 0`

✅ **User Experience:**
- Clear validation messages
- Intuitive confirmation prompts
- No hardcoded behavior
- Consistent behavior across all item types

✅ **Technical:**
- Clean separation of concerns
- No data loss during migration
- All tests pass
- Documentation is accurate

✅ **Business Logic:**
- Proper inventory management
- Accurate financial tracking
- Correct archive indexing
- Valid stock quantities

---

## Notes for Implementation

### Important Reminders
1. **Sold Quantity Rule:** Inventory items always have `quantitySold = 0`
2. **Special Case:** Item Modal direct sale can temporarily set `quantitySold`
3. **Network Sales:** Only show restock option for NETWORK type sales
4. **Target Amount:** Must be set before allowing restock
5. **User Confirmation:** Use submodal system, not window.confirm
6. **No Hardcoding:** All item types behave the same by default

### Backward Compatibility
- Migration script needed for existing data
- Graceful degradation for missing fields
- Preserve existing inventory items
- Maintain Sold Items tab functionality

### Performance Considerations
- Batch migration for existing items
- Efficient stock deduction logic
- Minimal database queries
- Proper effect key management

---

## Next Steps

1. **Review this roadmap** with stakeholders
2. **Create feature branch** for implementation
3. **Start with Priority 1** phases
4. **Test incrementally** at each phase
5. **Document any deviations** from this plan
6. **Update roadmap** as needed during implementation

This roadmap provides a clear path to refactor the restocking system while maintaining data integrity and improving user experience.