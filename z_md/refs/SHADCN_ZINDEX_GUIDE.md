# Shadcn Component Z-Index Integration Guide

## Problem
Shadcn components (Popover, Select, Calendar, etc.) have z-index conflicts when used inside modals, causing:
- No hover effects
- Not selectable/clickable
- Not scrollable
- Dropdowns close immediately

## Root Cause Analysis
**The Real Issue**: Missing z-index management on **parent containers** (like Tabs) was intercepting pointer events from child components.

**What We Discovered**:
1. **Dialog components** use `z-100` (MODALS layer)
2. **Shadcn components** need higher z-index to appear above modals
3. **Parent containers** (Tabs, Subtabs) had NO z-index management
4. **Hardcoded z-index values** in Shadcn components conflicted with our system
5. **Missing z-index on parent containers** was the actual root cause

**The Fix That Solved Everything**:
Adding `getZIndexClass('SUBTABS')` to the Tabs component fixed ALL dropdown issues because it properly layered the parent container hierarchy.

## Solution: Centralized Z-Index Layer System

### Layer Hierarchy
```typescript
BASE: 0           // Base content, sections, background
SUBTABS: 50       // Subtabs and navigation  
MODALS: 100       // First level modals (task-modal, record-modal)
INNER_MODALS: 200 // Inner modals (calendar, dropdowns, popovers) ← Shadcn components
SUB_MODALS: 300   // Inner sub-modals and nested dropdowns
TOOLTIPS: 400     // Tooltips and small overlays
NOTIFICATIONS: 500// Notifications and alerts
CRITICAL: 1000    // Highest priority modals (delete confirmations)
DRAG: 1500        // For dragging elements
MAX: 9999         // Maximum z-index for emergency cases
```

### For Any New Shadcn Component

**1. Import the z-index utility:**
```typescript
import { getInteractiveInnerModalZIndex } from '@/lib/utils/z-index-utils';
```

**2. Apply to PopoverContent/SelectContent:**
```typescript
<PopoverContent className={`your-classes ${getInteractiveInnerModalZIndex()}`}>
  {/* content */}
</PopoverContent>
```

**3. Use Portal for proper DOM placement:**
```typescript
<PopoverPrimitive.Portal>
  <PopoverContent className={`your-classes ${getInteractiveInnerModalZIndex()}`}>
    {/* content */}
  </PopoverContent>
</PopoverPrimitive.Portal>
```

### Fixed Components
- ✅ **Tabs Component** (z-50) - **THE ROOT FIX** that solved everything
- ✅ DatePicker (z-200 + proper alignment + collision detection + hover effects + header alignment)
- ✅ FrequencyCalendar (z-200 + separate custom calendar popover z-300 + custom date input DD-MM-YYYY)
- ✅ SearchableSelect (z-200 + pointer-events-auto)
- ✅ Select (z-200 + pointer-events-auto)
- ✅ Task Tree Dropdown (z-200 + pointer-events-auto)
- ✅ Dialog (z-100)
- ✅ Tooltip (z-400)
- ✅ Calendar Focus States (z-200 + proper alignment)
- ✅ Item Modal Status Modals (z-100)
- ✅ Inventory Display Modals (z-100)
- ✅ **DateInput Component** (DD-MM-YYYY format, custom validation)

### Key Points
- **INNER_MODALS (z-200)** is higher than **MODALS (z-100)**
- Always use `getInteractiveInnerModalZIndex()` for Shadcn components
- Always use `PopoverPrimitive.Portal` for proper DOM placement
- Never use hardcoded z-index values
- Regular modals use `getZIndexClass('MODALS')` (z-100)
- Critical modals use `getZIndexClass('CRITICAL')` (z-1000)

### Critical Lesson Learned
**Parent containers MUST have proper z-index management!** 
- If parent containers (Tabs, Subtabs, etc.) don't have z-index, they intercept pointer events
- This causes ALL child components to fail, even if they have correct z-index values
- Always check the entire component hierarchy, not just the immediate component

### Testing Checklist
- [ ] Component opens properly in Task Modal
- [ ] Hover effects work
- [ ] Click/select works
- [ ] Scrollable if needed
- [ ] No z-index conflicts
- [ ] Uses centralized system
