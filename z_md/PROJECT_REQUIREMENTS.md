# PROJECT REQUIREMENTS

**Last Updated**: January 15, 2025  
**Status**: ✅ **All Core Requirements Implemented and Verified**

## CORE PRINCIPLES
- **DRY**: No repeated code, single source of truth 
- **SIMPLICITY**: Keep it simple, no unnecessary changes
- **ASK FIRST**: If not 100% sure, ask before making changes
- **EXECUTOR ROLE**: I execute orders, don't change system unless told

## THEME SYSTEM
- **Use `active.light` (white) and `active.dark` (black)**
- **Hook location**: `lib/hooks/use-theme-colors.ts`
- **All admin pages use theme system**
- **No hardcoded colors**

## FILE ORGANIZATION
- **Hooks go in `lib/hooks/` folder**
- **Components in `components/` folder**
- **Utilities in `lib/` folder**

## DEVELOPMENT FILES
- **Don't delete**: Files unless 100% sure they're old code and unused

## ADMIN STRUCTURE
- **Default page**: `/admin` redirects to `/admin/mission-tree`
- **Headers**: Equal heights and proportions
- **Theme toggle**: Only in admin (not front-end)

## FRONT-END STRUCTURE
- **Header title**: "Akiles"
- **Admin button**: Always "Admin" (English)

## REMEMBER
- **Don't make changes unless explicitly requested**
- **Don't add features unless asked**
- **Keep it simple and efficient**
- **Ask before removing anything**
- **Focus on fundamentals**

## **Inventory Management System**

### **Core Principles**
- **Separate tabs** for each ItemType (Digital, Artworks, Stickers, Prints, Merch, Materials, Equipment)
- **Football Manager style**: Data-dense, professional, minimal scrolling
- **Direct inline editing**: Click any field to edit directly in the view
- **Bulk operations**: Selective editing with checkboxes for multiple items
- **Unified Stock Management**: `stock[]` array as single source of truth for quantities
- **Smart Location System**: Items can exist at multiple sites with individual quantities

### **Inline Editing Features**
- **Click to edit**: Any field becomes editable with a single click
- **Tab navigation**: Use Tab key to move between editable fields
- **Enter to save**: Press Enter to confirm changes
- **Escape to cancel**: Press Escape to discard changes
- **Auto-save**: Changes are saved automatically on blur

### **Supported Editable Fields**
- **Quantity**: Number input with validation (updates stock at current location)
- **Price**: Currency input with decimal precision
- **Status**: Dropdown selection from ItemStatus enum
- **Location**: Dropdown selection from Site enum (updates stock array)
- **Collection**: Dropdown selection from Collection enum
- **SubItemType**: Type-safe dropdown selection based on ItemType (enforces valid combinations)

### **Smart Business Rules**
- **Automatic Value Calculation**: `value = price × totalQuantity` (calculated from stock)
- **Hybrid Status Management**: Smart suggestions instead of automatic status changes
- **Working Move System**: Items can be moved between locations with proper quantity management
- **Type-Safe Foundation**: Strict adherence to enums and entities throughout the system

### **Bulk Edit System**
- **Selective editing**: Choose specific items with checkboxes
- **Select All option**: Quick selection of all items in a tab
- **Multiple field types**: Edit price, cost, status, collection, or subtype
- **Batch processing**: Update multiple items simultaneously