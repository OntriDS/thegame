# Status System Overview

**Date**: October 9, 2025  
**Status**: 🚧 PARTIAL IMPLEMENTATION  
**Note**: This file will change significantly after full migration is complete

---

## ⚠️ Important Note

Not all entities have fully developed status systems yet. This document describes what's **currently working** and planned changes. Many status transitions and automatic updates are not yet implemented.

---

## 🎯 What Statuses Are For

Statuses control entity **state** - they tell you where an entity is in its lifecycle and what operations are valid. Each entity has its own status enum with states relevant to its purpose.

---

## 📊 Current Status Systems

### **Task Status** ✅ IMPLEMENTED
**Enum**: `TaskStatus`  
**States**:
- `Created` → Just created, not started
- `On Hold` → Paused
- `In Progress` → Actively being worked on
- `Finishing` → Almost done
- `Done` → Completed (triggers outputs)
- `Collected` → Points collected
- `Failed` → Failed to complete
- `None` → No status

**Current Behavior**:
- Status manually set by user in Task Modal
- `Done` status triggers: Item creation, Financial records, Point awards
- Transition to `Collected` handled manually

**Planned**:
- Automatic transition to `Collected` after points claimed
- Validation rules (can't go from `Done` back to `In Progress`)

---

### **Item Status** ✅ IMPLEMENTED
**Enum**: `ItemStatus`  
**States**:
- `Created` → Just created
- `For Sale` → Available for purchase
- `Sold` → Has been sold
- `To Order` → Needs to be ordered
- `To Do` → Needs to be made
- `Gifted` → Given away
- `Reserved` → Reserved for someone
- `Obsolete` → No longer useful
- `Damaged` → Damaged/broken
- `Idle` → Not in use
- `Collected` → Collected/claimed

**Current Behavior**:
- Status manually set by user in Item Modal
- Initial status usually `Created` or `For Sale`
- Status changes don't trigger automatic actions yet

**Planned**:
- `Sold` → Auto-create Sale record
- `To Order` → Add to procurement list
- `To Do` → Create Task automatically

---

### **Site Status** ✅ JUST IMPLEMENTED
**Enum**: `SiteStatus`  
**States**:
- `Created` → First created (auto-set on creation)
- `Active` → Has Item or Task links
- `Updated` → Data was edited
- `Inactive` → No relationships

**Current Behavior**:
- `Created` auto-set on Site creation
- Other statuses manually set by user in Site Modal
- No automatic transitions yet

**Planned**:
- Auto-set `Active` when ITEM_SITE or TASK_SITE link created
- Auto-set `Inactive` when all links removed
- Auto-set `Updated` when Site data modified

---

### **Sale Status** ✅ IMPLEMENTED (Transaction Control)
**Enum**: `SaleStatus`  
**States**:
- `PENDING` → Draft, not processed yet
- `POSTED` → Effects applied (idempotent)
- `DONE` → Finalized, no further changes
- `CANCELLED` → Rolled back

**Current Behavior**:
- Controls transaction lifecycle
- `POSTED` triggers effects (once only, idempotent)
- Status transitions enforced

**Note**: This is a **transaction status**, not a lifecycle status like the others.

---

### **Financial Status** ✅ IMPLEMENTED (Simple)
**Enum**: `FinancialStatus`  
**States**:
- `Done` → Created (immediate)
- `Collected` → Points collected

**Current Behavior**:
- Very simple two-state system
- All financial records start as `Done`
- Transition to `Collected` when points claimed

---

## 🚧 Entities WITHOUT Status Systems

These entities don't have status systems yet:

- **Character** → No status (roles instead)
- **Player** → No status (progression instead)
- **Links** → No status (just exists or doesn't)

---

## 🎨 Status Colors

Status colors follow a consistent pattern across entities:

- **Orange** → Created, Started
- **Blue** → In Progress, Active, For Sale
- **Green** → Done, Sold, Active (relationships)
- **Yellow** → Collected, Finishing
- **Red** → Failed, Obsolete, Damaged
- **Gray** → On Hold, Idle, Inactive
- **Purple** → Reserved, Finishing

---

## 🔄 Status Transitions (Future)

### **Planned Automatic Transitions**

```typescript
// Task: Done → Collected (after points claimed)
if (task.status === TaskStatus.DONE && pointsClaimed) {
  task.status = TaskStatus.COLLECTED;
}

// Item: For Sale → Sold (after Sale created)
if (item.status === ItemStatus.FOR_SALE && saleCompleted) {
  item.status = ItemStatus.SOLD;
}

// Site: Created → Active (when first link created)
if (site.status === SiteStatus.CREATED && site.links.length > 0) {
  site.status = SiteStatus.ACTIVE;
}

// Site: Active → Inactive (when all links removed)
if (site.status === SiteStatus.ACTIVE && site.links.length === 0) {
  site.status = SiteStatus.INACTIVE;
}
```

### **Validation Rules (Future)**

```typescript
// Can't uncomplete a collected task
if (task.status === TaskStatus.COLLECTED) {
  throw new Error('Cannot modify a collected task');
}

// Can't sell a sold item again
if (item.status === ItemStatus.SOLD) {
  throw new Error('Item already sold');
}
```

---

## 📁 Status Implementation Pattern

### **1. Define Enum** (`types/enums.ts`)
```typescript
export enum EntityStatus {
  STATE_1 = 'State 1',
  STATE_2 = 'State 2',
  // ...
}
```

### **2. Add to Entity** (`types/entities.ts`)
```typescript
interface Entity extends BaseEntity {
  status: EntityStatus;
  // ...
}
```

### **3. Add Colors** (`lib/constants/color-constants.tsx`)
```typescript
export const ENTITY_STATUS_COLORS = {
  [EntityStatus.STATE_1]: {
    light: 'border-orange-500 bg-orange-100 text-orange-800',
    dark: 'border-orange-500 bg-orange-100 text-orange-800'
  },
  // ...
} as const;
```

### **4. Add to Modal** (entity modal component)
```typescript
<Select value={status} onValueChange={(v) => setStatus(v as EntityStatus)}>
  {Object.values(EntityStatus).map(s => (
    <SelectItem key={s} value={s}>{s}</SelectItem>
  ))}
</Select>
```

### **5. Display in Log** (entity log tab component)
```typescript
<Badge className={getStatusBadgeColor(status)}>
  {status}
</Badge>
```

---

## 🎯 Current Limitations

1. **Manual Control Only** → Most status changes are manual via modals
2. **No Validation** → Can set any status at any time
3. **No Transitions** → Status changes don't trigger automatic actions (except Task.Done)
4. **Inconsistent** → Some entities have statuses, others don't
5. **Not Logged** → Status changes not tracked in logs yet

---

## 🚀 Future Improvements (Post-Migration)

1. **Status Change Events** → Log when status changes
2. **Automatic Transitions** → Status updates based on Links, actions, time
3. **Validation Rules** → Enforce valid transitions
4. **Status-Based Filtering** → Filter entities by status in UI
5. **Status Metrics** → Dashboard widgets showing status distributions
6. **Workflow Integration** → Status changes trigger workflows
7. **Status History** → Track all status changes over time

---

## 📚 Related Systems

- **Links System** → Will trigger status changes (e.g., Site becomes Active when linked)
- **Workflows** → Status changes trigger workflows (e.g., Task.Done creates Item)
- **Entity Purity** → Status is entity-specific data, relationships are Links

---

**Last Updated**: October 9, 2025  
**Next Review**: After Links System fully implemented and tested

