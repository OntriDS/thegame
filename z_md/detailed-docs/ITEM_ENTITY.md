# Item Entity - Complete Reference Guide

## Overview

The Item entity represents all tangible and digital assets in the system - physical products, digital creations, equipment, materials, and any other assets that can be tracked, stored, and sold. Items form the inventory backbone of the entire system, supporting multi-site stock management, financial tracking, and comprehensive lifecycle management.

**Key Concept**: Items are assets that can be created from Tasks or Financial Records, tracked across multiple sites, sold through Sales, and linked to Characters. The system uses a unified stock management approach where the `stock[]` array is the single source of truth for inventory quantities.

---

## Item Entity Structure

### Complete Interface Definition

```typescript
export interface Item extends BaseEntity {
  // Core Classification
  type: ItemType;                   // DIGITAL, ARTWORK, PRINT, STICKER, MERCH, BUNDLE, MATERIAL, EQUIPMENT
  collection?: Collection;          // FERIA, OFFICE, STUDIO, etc.
  status: ItemStatus;               // FOR_SALE, SOLD, IN_USE, ARCHIVED, etc.
  station: Station;                 // ADMIN, DESIGN, PRODUCTION, SALES, PERSONAL
  stock: StockPoint[];              // Multiple sites with quantities - SINGLE SOURCE OF TRUTH
  
  // Physical Properties
  dimensions?: {
    width: number;                  // width in cm
    height: number;                  // height in cm
    area: number;                   // mt2 calculation
  };
  size?: string;                    // e.g., "7.5", "M", "XL", "38.5" (for shoes, t-shirts, etc.)
  
  // Financial Fields
  unitCost: number;                 // purchase cost per unit (calculated from task)
  additionalCost: number;           // additional selling costs (commission, booth rental, etc.)
  price: number;                    // target selling price
  value: number;                     // actual sale price (0 if not sold)
  
  // Inventory Tracking
  quantitySold: number;             // quantity sold so far
  targetAmount?: number;            // target stock level (for stickers, materials, etc.)
  
  // Bundle-Specific Fields (only used when category === BUNDLE_ITEM)
  itemsPerBundle?: number;          // how many individual items per bundle (e.g., 100 stickers per bundle)
  soldThisMonth?: number;           // monthly sales tracking for bundles
  lastRestockDate?: Date;           // last restock date for bundles
  
  // Metadata
  year?: number;                    // year of creation/purchase
  subItemType?: SubItemType;        // for merch: T-Shirt, Bag, Shoes, Rashguard, Sports Bra, etc.
  imageUrl?: string;                // URL to item image/photo
  
  // File Attachments
  originalFiles?: FileReference[];  // Original design files
  accessoryFiles?: FileReference[];  // Additional files (instructions, etc.)
  
  // Ambassador Fields (Links System - references to other entities)
  sourceTaskId?: string | null;     // Related to "Order Stickers" task
  sourceRecordId?: string | null;   // Related to "Buy Fan" record
  ownerCharacterId?: string | null; // Character who owns this item (customer, team member, etc.)
  
  // Emissary Fields
  newOwnerName?: string;            // EMISSARY: Name for new owner character creation
  
  // Archive Field
  isCollected: boolean;             // Item collected (monthly close)
}
```

**Note**: `category` is NOT a field on Item. It is derived from `type` using `getItemCategory(itemType)` which returns `ItemCategory.MODEL_ITEM`, `ItemCategory.BUNDLE_ITEM`, or `ItemCategory.RESOURCE_ITEM`.

---

## Item Types & Classifications

### ItemType Enum

```typescript
export enum ItemType {
  // MODEL_ITEM - Individual products
  DIGITAL         = 'Digital',         // Digital products, files, software
  ARTWORK         = 'Artwork',         // Paintings, drawings, digital art
  PRINT           = 'Print',           // Printed materials, posters, flyers
  STICKER         = 'Sticker',         // Individual stickers
  MERCH           = 'Merch',           // Merchandise, clothing, accessories
  
  // BUNDLE_ITEM - Business Logic Items
  BUNDLE          = 'Bundle',          // Pack of Items (Stickers or Prints)
  
  // RESOURCE_ITEM - Production resources
  MATERIAL        = 'Material',        // Raw materials, supplies
  EQUIPMENT       = 'Equipment',       // Tools, computers, machinery
}
```

### ItemCategory (Derived from ItemType)

```typescript
export enum ItemCategory {
  MODEL_ITEM      = 'MODEL_ITEM',      // Individual products (Digital, Artwork, Print, Sticker, Merch)
  BUNDLE_ITEM     = 'BUNDLE_ITEM',     // Business Logic Items (Sticker Bundle, Print Bundle)
  RESOURCE_ITEM   = 'RESOURCE_ITEM',   // Production resources (Material, Equipment)
}

// Category is derived using:
function getItemCategory(itemType: ItemType): ItemCategory {
  switch (itemType) {
    case ItemType.DIGITAL:
    case ItemType.ARTWORK:
    case ItemType.PRINT:
    case ItemType.STICKER:
    case ItemType.MERCH:
      return ItemCategory.MODEL_ITEM;
    case ItemType.BUNDLE:
      return ItemCategory.BUNDLE_ITEM;
    case ItemType.MATERIAL:
    case ItemType.EQUIPMENT:
      return ItemCategory.RESOURCE_ITEM;
  }
}
```

### ItemStatus Enum

```typescript
export enum ItemStatus {
  CREATED     = 'Created',
  FOR_SALE    = 'For Sale',
  SOLD        = 'Sold',
  TO_ORDER    = 'To Order',
  TO_DO       = 'To Do',
  GIFTED      = 'Gifted',
  RESERVED    = 'Reserved',
  CONSIGNMENT = 'Consignment',
  OBSOLETE    = 'Obsolete',
  DAMAGED     = 'Damaged',
  IDLE        = 'Idle',
  COLLECTED   = 'Collected',
  ON_HOLD     = 'On Hold',
  STORED      = 'Stored',
  TO_REPAIR   = 'To Repair',
}
```

### SubItemType (Type-Safe Subtype System)

```typescript
// For ItemType.MERCH
export enum MerchSubType {
  T_SHIRT         = 'T-Shirt',
  BAG             = 'Bag',
  SHOES           = 'Shoes',
  RASHGUARD       = 'Rashguard',
  SPORTS_BRA      = 'Sports Bra',
  T_SHIRT_ALLOVER = 'T-Shirt AllOver',
  HOODIE          = 'Hoodie',
  CAP             = 'Cap',
  // ... other subtypes
}

// Type-safe union for all possible SubItemTypes
type SubItemType = DigitalSubType | ArtworkSubType | PrintSubType | 
                   StickerSubType | MerchSubType | BundleSubType | 
                   MaterialSubType | EquipmentSubType;
```

**Benefits**:
- Compile-time validation prevents invalid subtype combinations
- IDE auto-completion suggests valid options
- Business logic enforcement maintains data integrity
- TypeScript finds all references during refactoring

---

## Unified Stock Management System

### StockPoint Interface

```typescript
export interface StockPoint {
  siteId: string;                   // Site identifier
  quantity: number;                  // Quantity at this site
}
```

### Multi-Site Inventory

Items can be stored across multiple sites simultaneously:

```typescript
// Example: Sticker Bundle distributed across sites
{
  stock: [
    { siteId: 'studio', quantity: 50 },
    { siteId: 'feria_booth', quantity: 20 },
    { siteId: 'online_store', quantity: 30 }
  ]
}
```

### Stock Management Functions

```typescript
// Calculate total quantity across all sites
function calculateTotalQuantity(stock: StockPoint[]): number {
  return stock.reduce((sum, point) => sum + point.quantity, 0);
}

// Get quantity at specific site
function getQuantityAtSite(item: Item, siteId: string): number {
  const stockPoint = item.stock.find(sp => sp.siteId === siteId);
  return stockPoint?.quantity ?? 0;
}

// Update stock at specific site
function updateStockAtSite(item: Item, siteId: string, newQuantity: number): Item {
  const updatedStock = item.stock.map(sp => 
    sp.siteId === siteId ? { ...sp, quantity: newQuantity } : sp
  );
  // Add new site if it doesn't exist
  if (!updatedStock.some(sp => sp.siteId === siteId)) {
    updatedStock.push({ siteId, quantity: newQuantity });
  }
  return { ...item, stock: updatedStock };
}

// Move items between sites
function moveItemsBetweenSites(
  item: Item, 
  fromSiteId: string, 
  toSiteId: string, 
  quantity: number
): Item {
  // Implementation handles merging and creation at destinations
  // ...
}
```

### Key Principles

1. **Single Source of Truth**: `stock[]` array is the only source for quantity data
2. **Multi-Site Support**: Items can exist at multiple sites simultaneously
3. **Total Quantity**: Always calculated as sum of all `stock.quantity` values
4. **Site Distribution**: Track where items are located for inventory management
5. **Stock Transfers**: Move items between sites with proper quantity management

---

## Financial Structure

### Cost & Pricing Fields

```typescript
{
  unitCost: 2.50,           // Cost to produce/purchase per unit
  additionalCost: 0.50,     // Selling costs (commission, booth rental)
  price: 5.00,              // Target selling price
  value: 5.00               // Actual sale price (0 if not sold)
}
```

### Profit Calculation

```typescript
// Profit per unit
const profitPerUnit = value - (unitCost + additionalCost);

// Total profit for sold items
const totalProfit = quantitySold * profitPerUnit;

// Total value of inventory
const totalValue = price * calculateTotalQuantity(item.stock);
```

### Bundle Economics

Special tracking for bundle items:

```typescript
{
  itemsPerBundle: 100,      // 100 individual stickers per bundle
  soldThisMonth: 25,        // Monthly sales tracking
  lastRestockDate: Date,    // When last restocked
  targetAmount: 100         // Target stock level
}
```

---

## Item Lifecycle & Workflows

### Item Creation Sources

Items can be created from three sources:

#### 1. Task Completion (via Emissary Fields)

```typescript
// Task configuration
{
  outputItemType: 'ARTWORK',
  outputItemSubType: 'PAINTING',
  outputQuantity: 1,
  outputUnitCost: 50,
  outputItemName: 'Custom Mural',
  outputItemCollection: 'FERIA',
  outputItemPrice: 150
}

// Creates item with:
{
  type: 'ARTWORK',
  subItemType: 'PAINTING',
  unitCost: 50,
  price: 150,
  status: 'FOR_SALE',
  sourceTaskId: taskId,
  // TASK_ITEM link automatically created
}
```

#### 2. Financial Record (via Emissary Fields)

```typescript
// Financial record configuration
{
  outputItemType: 'EQUIPMENT',
  outputItemSubType: 'COMPUTER',
  outputQuantity: 1,
  outputUnitCost: 1200,
  outputItemName: 'MacBook Pro',
  outputItemCollection: 'OFFICE',
  outputItemPrice: 1500
}

// Creates item with:
{
  type: 'EQUIPMENT',
  subItemType: 'COMPUTER',
  unitCost: 1200,
  price: 1500,
  status: 'IN_USE',
  sourceRecordId: recordId,
  // FINREC_ITEM link automatically created
}
```

#### 3. Direct Creation (via Item Modal)

```typescript
// Manual item creation through UI
{
  type: 'STICKER',
  name: 'Custom Sticker',
  price: 5.00,
  unitCost: 2.50,
  status: 'FOR_SALE',
  stock: [{ siteId: 'studio', quantity: 100 }]
  // No source links initially
}
```

### Item Status Flow

```
CREATED → FOR_SALE → SOLD
    ↓
TO_ORDER / TO_DO / RESERVED
    ↓
GIFTED / CONSIGNMENT
    ↓
ARCHIVED / OBSOLETE / DAMAGED (at any point)
```

### Sale Workflow

1. **Item Created** (status: FOR_SALE)
2. **Sale Recorded** (via Sale entity with item lines)
3. **Stock Updated** (quantity reduced in stock array)
4. **Item Status** (updated to SOLD if all sold)
5. **Links Created** (`ITEM_SALE` link established)

---

## Item Relationships & Links System

### Link Types for Items

- **`ITEM_TASK`**: Item created by Task
- **`ITEM_FINREC`**: Item purchased via Financial Record
- **`ITEM_SALE`**: Item sold in Sale
- **`ITEM_CHARACTER`**: Item possessed by Character
- **`ITEM_SITE`**: Item located at Site

### Example Link Creation

```typescript
// When item is created from task
Link {
  linkType: 'ITEM_TASK',
  source: { type: 'item', id: itemId },
  target: { type: 'task', id: taskId },
  createdAt: new Date(),
  metadata: {
    quantity: item.quantitySold,
    unitCost: item.unitCost,
    itemType: item.type
  }
}

// When item is sold
Link {
  linkType: 'ITEM_SALE',
  source: { type: 'item', id: itemId },
  target: { type: 'sale', id: saleId },
  createdAt: new Date(),
  metadata: {
    quantity: saleQuantity,
    unitPrice: salePrice,
    saleDate: sale.saleDate
  }
}
```

---

## Inventory Management UI

### Inventory Display Component

The `InventoryDisplay` component provides the main interface for managing items, organized by inventory tabs:

#### Inventory Tabs (Organized by Category)

```typescript
export enum InventoryTab {
  // MODEL_ITEM tabs
  DIGITAL     = 'digital',
  ARTWORKS    = 'artworks',
  STICKERS    = 'stickers',
  PRINTS      = 'prints',
  MERCH       = 'merch',
  
  // BUNDLE_ITEM tabs
  BUNDLES     = 'bundles',
  
  // RESOURCE_ITEM tabs
  MATERIALS   = 'materials',
  EQUIPMENT   = 'equipment',
}
```

#### Key Features

1. **Separate Inventory Tabs**: Each item type has its own tab for organization
2. **Inline Editing**: Click any field to edit directly in the view
3. **Bulk Operations**: Select multiple items for batch editing
4. **Smart Status Automation**: Configurable "Set to Sold" modal when quantity reaches 0
5. **Multi-Site Filtering**: Filter items by location
6. **Status Filtering**: Filter by item status
7. **Collection Grouping**: Items automatically grouped by collection
8. **View Options**: View by collection, subtype, location, or model

### Item Modal Features

- **Basic Info**: Name, description, type, collection, station
- **Stock Management**: Multi-site quantity tracking
- **Physical Properties**: Dimensions, size, images
- **Financial Data**: Cost, price, value tracking
- **File Attachments**: Original and accessory files
- **Source Tracking**: Link to creating task/record
- **Owner Management**: Link to owner character

### Inline Editing System

- **Click any field** to edit directly in the view
- **Tab navigation** between editable fields
- **Enter to save**, **Escape to cancel**
- **Auto-save** on blur
- **Visual feedback** with hover effects

### Bulk Operations

- **Selective editing** with individual checkboxes
- **Select All** option for mass operations
- **Multiple field types**: Price, cost, status, collection, subtype
- **Batch processing** for efficiency

### Smart Status Automation

- **Configurable "Set to Sold" modal** for specific inventory types
- **Settings-based control** - choose which item types trigger the modal
- **Default disabled** - no automatic prompts unless configured
- **Quantity-based triggers** - modal appears when quantity reaches 0

---

## Import/Export System

### CSV Import

**Template Format**: ItemType, SubItemType, Name, Quantity, Locations, Status, Collection, UnitCost, Price, Year, ImageUrl, OriginalFiles, AccessoryFiles, Width, Height, Size

**Features**:
- Bulk import from Google Sheets or CSV files
- Data validation and error handling
- Automatic item creation with proper structure

### CSV Export

**Features**:
- Export current inventory to CSV
- Include all fields for external processing
- Download ready for spreadsheet applications

---

## Technical Implementation

### Component Architecture

```
ItemModal (UI-only)
  ↓ emits onSave(item)
InventoryDisplay (Parent Component)
  ↓ calls ClientAPI
ClientAPI
  ↓ fetches to API routes
API Routes
  ↓ uses DataStore
DataStore
  ↓ delegates to Adapter
Adapter
  ↓ calls Workflows
Workflows
  ↓ creates Links + logs
```

### Data Management

- **DataStore**: KV-only persistence (localStorage cache and offline mode planned)
- **Environment Detection**: Automatic switching between localStorage and KV storage
- **Real-time Updates**: Event-driven refresh system via custom events
- **Architecture**: Follows ENTITIES_ARCHITECTURE_PATTERN.md with proper separation of concerns

### Logging Integration

- **Items Log**: All item operations logged to `items-log` via LoggingDataStore
- **Effects Registry**: Idempotent operations prevent duplicate logging
- **Best of Both Worlds**: Append-only logs with effects registry for idempotency
- **Cross-Environment**: Identical behavior in development and production
- **Workflow Integration**: Item creation, updates, and deletions trigger appropriate logging

### Stock Calculations

```typescript
// Total quantity across all sites
const totalQuantity = item.stock.reduce((sum, point) => sum + point.quantity, 0);

// Check if item is in stock
const isInStock = totalQuantity > 0;

// Check if item is sold out
const isSoldOut = totalQuantity === 0 && item.quantitySold > 0;
```

### Status Management

```typescript
// Auto-update status based on stock
function updateItemStatus(item: Item): ItemStatus {
  const totalQuantity = item.stock.reduce((sum, point) => sum + point.quantity, 0);
  
  if (totalQuantity === 0 && item.quantitySold > 0) {
    return ItemStatus.SOLD;
  } else if (totalQuantity > 0) {
    return ItemStatus.FOR_SALE;
  } else {
    return ItemStatus.OUT_OF_STOCK;
  }
}
```

---

## Integration with Other Entities

### Item → Sale Flow

1. Item created with status: FOR_SALE
2. Sale created with item lines
3. `ITEM_SALE` link established
4. Stock quantity reduced
5. Item status updated if all sold

### Item → Character Flow

1. Item sold to customer
2. Character created/updated with customer role
3. `ITEM_CHARACTER` link established
4. Possession tracked via links
5. `ownerCharacterId` field updated

### Item → Task Flow

1. Task completed with item output
2. Item automatically created
3. `TASK_ITEM` link established
4. Inventory updated
5. `sourceTaskId` field set

### Item → Site Flow

1. Item stock points reference sites
2. `ITEM_SITE` links created for each stock location
3. Multi-site inventory tracking enabled

---

## Best Practices

### Stock Management

1. **Always use stock array**: Never store quantity separately
2. **Calculate totals**: Always sum stock.quantity for total quantity
3. **Site references**: Use site IDs consistently
4. **Stock transfers**: Use proper move functions to maintain integrity

### Financial Tracking

1. **Unit cost**: Always set from source (task or record)
2. **Price vs value**: Price is target, value is actual sale price
3. **Additional costs**: Track selling expenses separately
4. **Profit calculation**: Use value - (unitCost + additionalCost)

### Status Management

1. **Status suggestions**: System suggests status changes, user confirms
2. **Quantity zero**: Prompt user for status change or deletion
3. **Archive tracking**: Use `isCollected` for monthly reporting
4. **Lifecycle awareness**: Understand status flow before changing

### Link Management

1. **Source tracking**: Always set sourceTaskId or sourceRecordId when applicable
2. **Owner tracking**: Use ownerCharacterId for possession
3. **Link creation**: Workflows automatically create links
4. **Link queries**: Use DataStore.getLinksFor() to find relationships

---

## Related Files

- **Entity Definition**: `types/entities.ts` - Item interface
- **Enums**: `types/enums.ts` - ItemType, ItemStatus, ItemCategory, etc.
- **Utilities**: `lib/utils/item-utils.ts` - Helper functions
- **Components**: 
  - `components/inventory/inventory-display.tsx` - Main inventory UI
  - `components/modals/item-modal.tsx` - Item creation/editing modal
  - `components/modals/submodals/bulk-edit-submodal.tsx` - Bulk operations
  - `components/modals/submodals/move-items-submodal.tsx` - Stock transfers
- **Workflows**: `workflows/entities-workflows/item.workflow.ts` - Item creation logic
- **API**: `app/api/items/route.ts` - Item API endpoints

---

*This document serves as the comprehensive reference guide for Item entity architecture, inventory management, and system integration.*
