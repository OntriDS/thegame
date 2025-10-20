# Item Architecture - Tangible & Digital Assets

## 🎯 Core Understanding: Item as Asset

Items are **tangible or digital assets** in the system - they represent physical products, digital creations, equipment, materials, and any other assets that can be tracked, stored, and sold. They form the inventory backbone of the entire system.

---

## 🏗️ Item Entity Architecture

### **Base Structure (Extends BaseEntity)**

```typescript
export interface Item extends BaseEntity {
  // Core Item Properties
  type: ItemType;                   // DIGITAL, ARTWORK, PRINT, STICKER, MERCH, etc.
  collection?: Collection;          // FERIA, OFFICE, STUDIO, etc.
  status: ItemStatus;               // FOR_SALE, SOLD, IN_USE, ARCHIVED, etc.
  station: Station;                 // ADMIN, DESIGN, PRODUCTION, SALES, PERSONAL
  category: Category;               // Category within the station
  
  // Distributed Stock System - SINGLE SOURCE OF TRUTH
  stock: StockPoint[];              // Multiple sites with quantities
  
  // Physical Dimensions (for physical items)
  dimensions?: {
    width: number;                  // width in cm
    height: number;                 // height in cm
    area: number;                   // mt2 calculation
  };
  
  // Size Field (for items like shoes, t-shirts, etc.)
  size?: string;                    // e.g., "7.5", "M", "XL", "38.5"
  
  // Financial Fields
  unitCost: number;                 // purchase cost per unit
  additionalCost: number;           // additional selling costs
  price: number;                    // target selling price
  value: number;                    // actual sale price (0 if not sold)
  
  // Inventory Tracking
  quantitySold: number;             // quantity sold so far
  targetAmount?: number;            // target stock level
  
  // Sticker Bundle Specific Fields
  soldThisMonth?: number;           // monthly sales tracking for bundles
  lastRestockDate?: Date;           // last restock date for bundles
  
  // Metadata
  year?: number;                    // year of creation/purchase
  subItemType?: SubItemType;        // for merch: T-Shirt, Bag, Shoes, etc.
  imageUrl?: string;                // URL to item image/photo
  
  // File Attachments
  originalFiles?: FileReference[];  // Original design files
  accessoryFiles?: FileReference[]; // Additional files (instructions, etc.)
  
  // Source Tracking
  sourceTaskId?: string | null;     // Related to "Order Stickers" task
  sourceRecordId?: string | null;   // Related to "Buy Fan" record
  
  // Links System
  links: Link[];                    // Relationship tracking
}
```

---

## 📦 Item Types & Classifications

### **ItemType Enum**

```typescript
export enum ItemType {
  DIGITAL         = 'Digital',         // Digital products, files, software
  ARTWORK         = 'Artwork',         // Paintings, drawings, digital art
  PRINT           = 'Print',           // Printed materials, posters, flyers
  STICKER         = 'Sticker',         // Individual stickers
  STICKER_BUNDLE  = 'Sticker Bundle',  // Sticker packages/bundles
  MERCH           = 'Merch',           // Merchandise, clothing, accessories
  EQUIPMENT       = 'Equipment',       // Tools, computers, machinery
  MATERIAL        = 'Material',        // Raw materials, supplies
  BOOK            = 'Book',            // Books, manuals, guides
  COURSE          = 'Course',          // Online courses, training
  SERVICE         = 'Service',         // Service offerings
  NFT             = 'NFT',             // Non-fungible tokens
  OTHER           = 'Other'            // Miscellaneous items
}
```

### **ItemStatus Enum**

```typescript
export enum ItemStatus {
  FOR_SALE        = 'for_sale',       // Available for purchase
  SOLD            = 'sold',           // Already sold
  IN_USE          = 'in_use',         // Currently being used
  IN_STOCK        = 'in_stock',       // In inventory, not for sale
  OUT_OF_STOCK    = 'out_of_stock',   // Temporarily unavailable
  DISCONTINUED    = 'discontinued',   // No longer produced
  ARCHIVED        = 'archived',       // Archived/historical items
  DELETED         = 'deleted'         // Deleted items
}
```

### **SubItemType (for Merchandise)**

```typescript
// For ItemType.MERCH
export enum SubItemType {
  T_SHIRT         = 'T-Shirt',
  BAG             = 'Bag',
  SHOES           = 'Shoes',
  RASHGUARD       = 'Rashguard',
  SPORTS_BRA      = 'Sports Bra',
  T_SHIRT_ALLOVER = 'T-Shirt AllOver',
  HOODIE          = 'Hoodie',
  CAP             = 'Cap',
  STICKER         = 'Sticker',
  POSTER          = 'Poster',
  MUG             = 'Mug',
  OTHER           = 'Other'
}
```

---

## 🏪 Distributed Stock System

### **StockPoint Interface**

```typescript
export interface StockPoint {
  siteId: string;                    // Site identifier
  quantity: number;                  // Quantity at this site
}
```

### **Multi-Site Inventory**

Items can be stored across multiple sites:

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

### **Stock Management**

- **Total Quantity**: Sum of all `stock.quantity`
- **Site Distribution**: Track where items are located
- **Stock Transfers**: Move items between sites
- **Low Stock Alerts**: When quantity falls below threshold

---

## 💰 Financial Structure

### **Cost & Pricing**

```typescript
{
  unitCost: 2.50,           // Cost to produce/purchase per unit
  additionalCost: 0.50,     // Selling costs (commission, booth rental)
  price: 5.00,              // Target selling price
  value: 5.00               // Actual sale price (0 if not sold)
}
```

### **Profit Calculation**

```typescript
// Profit per unit
const profitPerUnit = value - (unitCost + additionalCost);

// Total profit for sold items
const totalProfit = quantitySold * profitPerUnit;
```

### **Sticker Bundle Economics**

Special tracking for sticker bundles:

```typescript
{
  soldThisMonth: 25,        // Monthly sales tracking
  lastRestockDate: Date,    // When last restocked
  targetAmount: 100         // Target stock level
}
```

---

## 🔄 Item Lifecycle & Workflows

### **Item Creation Sources**

Items can be created from:

1. **Task Completion** (via `outputItemType`)
   - Task creates Item when completed
   - `TASK_ITEM` link established
   - Cost calculated from task

2. **Financial Record** (via `outputItemType`)
   - Purchase recorded in financial record
   - `FINREC_ITEM` link established
   - Cost from purchase amount

3. **Direct Creation** (via Item Modal)
   - Manual item creation
   - No source links initially

### **Item Status Flow**

```
IN_STOCK → FOR_SALE → SOLD
    ↓
ARCHIVED (at any point)
```

### **Sale Workflow**

1. **Item Created** (status: FOR_SALE)
2. **Sale Recorded** (via Sale entity)
3. **Stock Updated** (quantity reduced)
4. **Item Status** (updated to SOLD if all sold)
5. **Links Created** (`ITEM_SALE` link)

---

## 🔗 Item Relationships & Links

### **Link Types for Items**

- **`ITEM_TASK`**: Item created by Task
- **`ITEM_FINREC`**: Item purchased via Financial Record
- **`ITEM_SALE`**: Item sold in Sale
- **`ITEM_CHARACTER`**: Item possessed by Character

### **Example Link Creation**

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

## 📊 Inventory Management

### **Stock Tracking**

```typescript
interface StockSummary {
  itemId: string;
  totalQuantity: number;
  sites: {
    [siteId: string]: {
      quantity: number;
      siteName: string;
    }
  };
  status: ItemStatus;
  lastUpdated: Date;
}
```

### **Inventory Reports**

- **Stock Levels**: Current quantities by site
- **Low Stock Alerts**: Items below threshold
- **Sales Performance**: Items sold vs available
- **Site Distribution**: Stock allocation across sites
- **Profit Analysis**: Revenue vs cost by item

---

## 🎯 Item Modal & UI

### **Item Modal Features**

- **Basic Info**: Name, description, type, collection
- **Stock Management**: Multi-site quantity tracking
- **Physical Properties**: Dimensions, size, images
- **Financial Data**: Cost, price, value tracking
- **File Attachments**: Original and accessory files
- **Source Tracking**: Link to creating task/record

### **Item List Features**

- **Type Filtering**: Filter by item type
- **Status Filtering**: Filter by availability
- **Stock Alerts**: Highlight low stock items
- **Site View**: Show stock distribution
- **Search & Sort**: Find items quickly

---

## 🏭 Item Creation Workflows

### **From Task Completion**

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
  sourceTaskId: taskId
}
```

### **From Financial Record**

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
  sourceRecordId: recordId
}
```

---

## 🚀 Integration with Other Entities

### **Item → Sale Flow**

1. Item created with status: FOR_SALE
2. Sale created with item lines
3. `ITEM_SALE` link established
4. Stock quantity reduced
5. Item status updated if all sold

### **Item → Character Flow**

1. Item sold to customer
2. Character created/updated with customer role
3. `ITEM_CHARACTER` link established
4. Possession tracked via links

### **Item → Task Flow**

1. Task completed with item output
2. Item automatically created
3. `TASK_ITEM` link established
4. Inventory updated

---

## 📈 Item Analytics & Reporting

### **Sales Performance**

```typescript
interface ItemSalesReport {
  itemId: string;
  itemName: string;
  type: ItemType;
  totalSold: number;
  totalRevenue: number;
  averagePrice: number;
  profitMargin: number;
  salesTrend: 'increasing' | 'decreasing' | 'stable';
}
```

### **Inventory Analytics**

- **Turnover Rate**: How quickly items sell
- **Profit Margins**: Revenue vs cost analysis
- **Stock Optimization**: Optimal stock levels
- **Site Performance**: Sales by location
- **Seasonal Trends**: Sales patterns over time

---

## 🔧 Technical Implementation

### **Stock Calculations**

```typescript
// Total quantity across all sites
const totalQuantity = item.stock.reduce((sum, point) => sum + point.quantity, 0);

// Check if item is in stock
const isInStock = totalQuantity > 0;

// Check if item is sold out
const isSoldOut = totalQuantity === 0 && item.quantitySold > 0;
```

### **Status Management**

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

## 📊 Item Logging System

### **Items Log**

All item activities are logged to the Items Log:

```typescript
// Log entry structure
{
  entityId: item.id,
  itemName: item.name,
  description: item.description,
  type: item.type,
  status: item.status,
  station: item.station,
  category: item.category,
  quantity: totalQuantity,
  quantitySold: item.quantitySold,
  unitCost: item.unitCost,
  price: item.price,
  value: item.value,
  createdAt: item.createdAt
}
```

---

## ✅ Item Architecture Benefits

1. **Unified Inventory**: Single system for all asset types
2. **Multi-Site Tracking**: Distributed stock management
3. **Financial Integration**: Built-in cost and pricing
4. **Source Tracking**: Links to creating entities
5. **Flexible Types**: Support for various item categories
6. **File Attachments**: Original and accessory files
7. **Status Management**: Comprehensive lifecycle tracking
8. **Link Integration**: Full relationship tracking

---

*This document serves as the comprehensive guide for Item entity architecture and inventory management.*
