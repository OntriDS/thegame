# Z-Index Layer System Guide

## Overview

The project uses a centralized z-index layer system to manage visual stacking order across all UI components. This system ensures consistent layering behavior, prevents z-index conflicts, and provides a predictable hierarchy for modals, dropdowns, tooltips, and other overlay components.

**Key Principle**: All z-index values are managed through the centralized layer system defined in `lib/constants/app-constants.ts`. Never use hardcoded z-index values.

## Layer System Reference

The z-index system consists of 11 distinct layers, each serving a specific purpose in the UI hierarchy:

```typescript
// Defined in lib/constants/app-constants.ts
export const Z_INDEX_LAYERS = {
  BASE: 0,              // Base content, sections, background
  SUBTABS: 100,         // Tabs at parent sections
  MODALS: 200,          // First level modals (includes fields and tabs within modals)
  INNER_FIELDS: 300,    // Reserved for special cases above modals but below submodals
  SUB_MODALS: 400,      // Independent submodals (mounted as separate Dialogs via Portal)
  SUPRA_FIELDS: 500,    // Dropdowns, popovers, calendars, over-field UI
  TOOLTIPS: 600,        // Tooltips and small overlays
  NOTIFICATIONS: 800,   // Notifications and alerts
  CRITICAL: 1000,       // Highest priority modals (delete confirmations, critical alerts)
  DRAG: 1500,           // For dragging elements
  MAX: 9999,            // Emergency upper bound
} as const;
```

### Layer Descriptions

| Layer | Value | Purpose | Usage |
|-------|-------|---------|-------|
| **BASE** | 0 | Base content layer | Default for all page content, sections, and background elements |
| **SUBTABS** | 100 | Navigation tabs | Tabs at parent section level (e.g., main navigation tabs) |
| **MODALS** | 200 | Primary modals | First-level modals, dialog overlays, and fields/tabs within modals |
| **INNER_FIELDS** | 300 | Special field cases | Reserved for edge cases requiring z-index above modals but below submodals (rarely used) |
| **SUB_MODALS** | 400 | Independent submodals | Submodals mounted as separate Dialog components via Portal |
| **SUPRA_FIELDS** | 500 | Interactive overlays | Dropdowns, popovers, calendars, select menus, and other over-field UI components |
| **TOOLTIPS** | 600 | Tooltip overlays | Tooltips and small informational overlays |
| **NOTIFICATIONS** | 800 | System notifications | Toast notifications, alerts, and system messages |
| **CRITICAL** | 1000 | Critical modals | Delete confirmations, critical alerts, and highest-priority dialogs |
| **DRAG** | 1500 | Drag operations | Elements being dragged (drag-and-drop operations) |
| **MAX** | 9999 | Emergency override | Maximum z-index for emergency cases only |

## Usage Guidelines

### When to Use Each Layer

#### BASE (0)
- Default layer for all page content
- Sections, cards, and background elements
- No explicit z-index needed (default behavior)

#### SUBTABS (100)
- Main navigation tabs
- Section-level tab navigation
- Parent container tabs that need to be above base content

#### MODALS (200)
- Primary application modals (Task Modal, Item Modal, etc.)
- Dialog overlays and backdrops
- Fields and tabs that exist within modals
- Any first-level modal dialog

#### INNER_FIELDS (300)
- **Rarely used** - Reserved for special edge cases
- Only use when you need something above MODALS but below SUB_MODALS
- Avoid unless absolutely necessary

#### SUB_MODALS (400)
- Independent submodals that open from within a parent modal
- Must be mounted as separate Dialog components via Portal
- Examples: Delete confirmation submodal, nested edit dialogs

#### SUPRA_FIELDS (500)
- **Primary layer for Shadcn components** (Popover, Select, Calendar, etc.)
- Dropdown menus and select components
- Date pickers and calendar popovers
- Searchable select components
- Any interactive overlay that appears above form fields

#### TOOLTIPS (600)
- Tooltip components
- Small informational overlays
- Help text popovers

#### NOTIFICATIONS (800)
- Toast notifications
- System alerts
- Success/error messages

#### CRITICAL (1000)
- Critical confirmation dialogs (delete confirmations)
- System-critical alerts
- Highest-priority modals that must appear above everything

#### DRAG (1500)
- Elements currently being dragged
- Drag-and-drop operation indicators

#### MAX (9999)
- Emergency override only
- Should never be used in normal development
- Reserved for debugging or emergency fixes

## Component Integration

### Using the Z-Index Utility Functions

All z-index values are accessed through utility functions in `lib/utils/z-index-utils.ts`:

```typescript
import { getZIndexClass, getZIndexValue, getInteractiveZIndex } from '@/lib/utils/z-index-utils';
```

### Available Utility Functions

| Function | Returns | Use Case |
|----------|---------|----------|
| `getZIndexClass(layer)` | `z-[value]` Tailwind class | Standard z-index class for any layer |
| `getZIndexValue(layer)` | `number` | Raw numeric value for inline styles |
| `getInteractiveZIndex(layer)` | `z-[value] pointer-events-auto` | Z-index with pointer events enabled |
| `getModalZIndex()` | `z-[200]` | Quick access for MODALS layer |
| `getSubModalZIndex()` | `z-[400]` | Quick access for SUB_MODALS layer |
| `getDropdownZIndex()` | `z-[500]` | Quick access for SUPRA_FIELDS layer |
| `getTooltipZIndex()` | `z-[600]` | Quick access for TOOLTIPS layer |
| `getCriticalZIndex()` | `z-[1000]` | Quick access for CRITICAL layer |

### Integration Patterns

#### Pattern 1: Shadcn Dropdown/Popover Components

For Popover, Select, Calendar, and other Shadcn components used within modals:

```typescript
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { PopoverPrimitive } from '@/components/ui/popover';

<PopoverPrimitive.Portal>
  <PopoverContent 
    className={`your-classes ${getZIndexClass('SUPRA_FIELDS')} pointer-events-auto`}
  >
    {/* content */}
  </PopoverContent>
</PopoverPrimitive.Portal>
```

**Key Points**:
- Always use `SUPRA_FIELDS` (500) for Shadcn dropdowns/popovers
- Always include `pointer-events-auto` for proper interaction
- Always use `PopoverPrimitive.Portal` for proper DOM placement

#### Pattern 2: Primary Modals

For main application modals:

```typescript
import { DialogContent } from '@/components/ui/dialog';

<DialogContent zIndexLayer={'MODALS'} className="...">
  {/* modal content */}
</DialogContent>
```

**Key Points**:
- Use `MODALS` (200) for first-level modals
- The `DialogContent` component accepts `zIndexLayer` prop
- Modals are automatically portaled by the Dialog component

#### Pattern 3: Submodals

For independent submodals that open from within a parent modal:

```typescript
import { DialogContent } from '@/components/ui/dialog';

<DialogContent zIndexLayer={'SUB_MODALS'} className="...">
  {/* submodal content */}
</DialogContent>
```

**Key Points**:
- Use `SUB_MODALS` (400) for independent submodals
- Submodals must be mounted as separate Dialog components
- Radix Dialog automatically portals to document body

#### Pattern 4: Critical Modals

For critical confirmation dialogs:

```typescript
import { DialogContent } from '@/components/ui/dialog';

<DialogContent zIndexLayer={'CRITICAL'} className="...">
  {/* critical modal content */}
</DialogContent>
```

#### Pattern 5: Inline Styles (Rare)

For cases where Tailwind classes aren't sufficient:

```typescript
import { getZIndexValue } from '@/lib/utils/z-index-utils';

<div style={{ zIndex: getZIndexValue('SUPRA_FIELDS') }}>
  {/* content */}
</div>
```

## Best Practices

### 1. Always Use the Centralized System
- ✅ **DO**: Use `getZIndexClass('SUPRA_FIELDS')`
- ❌ **DON'T**: Use hardcoded values like `z-[500]` or `z-50`

### 2. Parent Container Management
- Parent containers (Tabs, Subtabs, etc.) must have proper z-index management
- If parent containers lack z-index, they intercept pointer events from children
- Always check the entire component hierarchy, not just the immediate component

### 3. Portal Mounting for Submodals
- Submodals must be mounted as independent Dialog components via Portal
- Radix Dialog automatically handles portal mounting to document body
- This ensures proper stacking context separation

### 4. Stacking Context Awareness
- Parent dialogs create their own stacking context
- Children cannot escape parent stacking context regardless of z-index if not properly portaled
- Use Portal mounting to ensure components render at document body level

### 5. Layer Selection Guidelines
- **Within modals**: Use `SUPRA_FIELDS` for dropdowns/popovers
- **Independent dialogs**: Use `MODALS` for primary, `SUB_MODALS` for nested
- **Critical actions**: Use `CRITICAL` for delete confirmations
- **Avoid**: Using `INNER_FIELDS` unless absolutely necessary

### 6. Pointer Events
- Always include `pointer-events-auto` when using z-index for interactive components
- This ensures components remain clickable/interactable

## Common Component Examples

### SearchableSelect
```typescript
<PopoverContent 
  className={`... ${getZIndexClass('SUPRA_FIELDS')} pointer-events-auto`}
>
```

### DatePicker
```typescript
<PopoverContent 
  className={`p-0 ${getInteractiveZIndex('SUPRA_FIELDS')}`}
>
```

### Select Component
```typescript
<SelectContent 
  className={`... ${getInteractiveZIndex('SUPRA_FIELDS')}`}
>
```

### Tabs Component
```typescript
<Tabs className={cn(getZIndexClass('SUBTABS'), className)}>
```

## Reference: Layer Hierarchy Visualization

```
MAX (9999)          ──────────────────── Emergency override
DRAG (1500)         ──────────────────── Drag operations
CRITICAL (1000)     ──────────────────── Critical modals
NOTIFICATIONS (800) ──────────────────── System notifications
TOOLTIPS (600)      ──────────────────── Tooltips
SUPRA_FIELDS (500)  ──────────────────── Dropdowns, popovers, calendars
SUB_MODALS (400)    ──────────────────── Independent submodals
INNER_FIELDS (300)  ──────────────────── Special cases (rarely used)
MODALS (200)        ──────────────────── Primary modals
SUBTABS (100)       ──────────────────── Navigation tabs
BASE (0)            ──────────────────── Base content
```

## Technical Notes

### Stacking Context Behavior
- Radix Dialog components automatically create portals to document body
- When properly portaled, z-index values determine stacking order as siblings under `body`
- Custom wrappers with transforms/positioning can create unexpected stacking contexts
- Always ensure components are properly portaled for predictable behavior

### Migration Notes
The current system replaced older layer names:
- `INNER_MODALS` → Use `MODALS` or `SUPRA_FIELDS` depending on context
- `DROPDOWNS` → Use `SUPRA_FIELDS`
- `MODAL_TABS` → Use `MODALS` (tabs within modals stay at modal level)

## Related Files

- **Constants**: `lib/constants/app-constants.ts` - Layer definitions
- **Utilities**: `lib/utils/z-index-utils.ts` - Helper functions
- **Dialog Component**: `components/ui/dialog.tsx` - Modal implementation
- **Popover Component**: `components/ui/popover.tsx` - Popover implementation
