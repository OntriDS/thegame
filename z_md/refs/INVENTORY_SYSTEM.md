# 🎨 Inventory Management System

## **Overview**
A professional, gamified inventory management system designed for artists and creators. Features separate tabs for different item types, inline editing, and bulk operations.

## **🎯 Key Features**

### **1. Separate Inventory Tabs**
- **Digital**: Digital art, digitalization, NFTs
- **Artworks**: Canvas paintings, wood art, sculptures, murals
- **Stickers**: Reflective, brilliant white, mate finishes
- **Prints**: Standard print reproductions
- **Merch**: T-shirts, bags, shoes, rashguards, sports bras
- **Materials**: Art supplies, design tools, workshop materials
- **Equipment**: Tools, machines, vehicles

### **2. Inline Editing System**
- **Click any field** to edit directly in the view
- **Tab navigation** between editable fields
- **Enter to save**, **Escape to cancel**
- **Auto-save** on blur
- **Visual feedback** with hover effects

### **3. Smart Bulk Operations**
- **Selective editing** with individual checkboxes
- **Select All** option for mass operations
- **Multiple field types**: Price, cost, status, collection, subtype
- **Batch processing** for efficiency

### **4. Smart Status Automation**
- **Configurable "Set to Sold" modal** for specific inventory types
- **Settings-based control** - choose which item types trigger the modal
- **Default disabled** - no automatic prompts unless configured
- **Quantity-based triggers** - modal appears when quantity reaches 0

## **🚀 How to Use**

### **Adding Items**
1. Navigate to the appropriate inventory tab
2. Click "Add [ItemType]" button
3. Fill in the required fields (Quantity, Name, Type, Station, Category)
4. Set optional fields (Price, Collection, SubItemType, etc.)
5. Click "Create Item"
6. **Architecture**: ItemModal → InventoryDisplay (Parent) → DataStore → Adapter → Workflows

### **Editing Individual Items**
1. **Click any field** in the item row
2. **Type new value** or select from dropdown
3. **Press Enter** to save or **Escape** to cancel
4. **Tab** to move between fields

### **Bulk Editing**
1. Click "Bulk Edit" button in any tab
2. Select the field type to edit (Price, Status, etc.)
3. Enter the new value
4. **Check individual items** or use "Select All"
5. Click "Update Selected Items"

### **Filtering & Search**
- **Location filter**: Show items from specific sites
- **Status filter**: Filter by item status
- **Collection grouping**: Items automatically grouped by collection

### **Configuring Inventory Settings**
1. Go to **Admin → Settings → Inventory**
2. **Check/uncheck inventory types** that should show the "Set to Sold" modal
3. **Save settings** to apply changes
4. **Reset to default** to disable all automatic prompts
5. **Settings persist** across browser sessions

## **💾 Data Structure**

### **Item Interface**
```typescript
interface Item extends BaseEntity {
  type: ItemType;
  collection?: Collection;
  status: ItemStatus;
  station: Station;
  category: Category;           // Category within the station
  stock: StockPoint[];          // multiple sites - SINGLE SOURCE OF TRUTH
  
  // Physical dimensions (for physical items)
  dimensions?: {
    width: number;              // width in cm
    height: number;             // height in cm
    area: number;               // mt2 calculation
  };
  
  // Size field (for items like shoes, t-shirts, etc.)
  size?: string;                // e.g., "7.5", "M", "XL", "38.5"
  
  // Financial fields
  unitCost: number;             // purchase cost per unit (calculated from task)
  additionalCost: number;       // additional selling costs (commission, booth rental, etc.)
  price: number;                // target selling price
  value: number;                // actual sale price (0 if not sold)
  
  // Inventory tracking - UNIFIED STOCK SYSTEM
  quantitySold: number;         // quantity sold so far
  targetAmount?: number;        // target stock level (for stickers, materials, etc.)
  
  // Sticker Bundle specific fields (only used when type === ItemType.STICKER_BUNDLE)
  soldThisMonth?: number;       // monthly sales tracking for bundles
  lastRestockDate?: Date;       // last restock date for bundles
  
  // Metadata
  year?: number;                // year of creation/purchase
  subItemType?: SubItemType;    // for merch: T-Shirt, Bag, Shoes, Rashguard, Sports Bra, T-Shirt AllOver
  imageUrl?: string;            // URL to item image/photo
  
  // File attachments
  originalFiles?: FileReference[];
  accessoryFiles?: FileReference[];
  
  sourceTaskId?: string | null; // e.g. related to "Order Stickers"
  sourceRecordId?: string | null; // e.g. related to "Buy Fan" record
}
```

### **Unified Stock Management System**
```typescript
interface StockPoint {
  siteId: Site;
  quantity: number;
}

// Key Functions:
- calculateTotalQuantity(stock: StockPoint[]): number
- getQuantityAtSite(item: Item, siteId: Site): number
- updateStockAtSite(item: Item, siteId: Site, newQuantity: number): Item
- moveItemsBetweenSites(item: Item, fromSiteId: Site, toSiteId: Site, quantity: number): Item
```

### **Smart Business Rules Engine**
- **Automatic Value Calculation**: `value = price × totalQuantity`
- **Hybrid Status Management**: Suggestions instead of automatic changes
- **Smart Item Movement**: Intelligent merging and creation at destinations
- **Type-Safe Operations**: All operations use proper enums and entities
- **Source Tracking**: Items track their origin via `sourceTaskId` and `sourceRecordId`
- **File Management**: Support for original and accessory file attachments

### **Type-Safe SubItemType System**
```typescript
// Enforces valid subtype combinations at compile time
type StickerSubType = "Brilliant White" | "Reflective" | "Mate";
type ArtworkSubType = "Acrylic on Canvas" | "Acrylic on Wood" | "Assamblages" | "Mural" | "Furniture Art";
type DigitalSubType = "Digital Art" | "Digitalization" | "NFT";
// ... other subtypes

// Union type for all possible SubItemTypes
type SubItemType = StickerSubType | ArtworkSubType | DigitalSubType | /* ... */;
```

**Benefits:**
- **Compile-time validation**: Prevents invalid subtype combinations
- **Auto-completion**: IDE suggests valid options
- **Business logic enforcement**: System maintains data integrity
- **Refactoring safety**: TypeScript finds all references

## **🔄 Import/Export**

### **CSV Import**
- **Template format**: ItemType, SubItemType, Name, Quantity, Locations, Status, Collection, UnitCost, Price, Year, ImageUrl, OriginalFiles, AccessoryFiles, Width, Height, Size
- **Bulk import** from Google Sheets or CSV files
- **Data validation** and error handling

### **CSV Export**
- **Export current inventory** to CSV
- **Include all fields** for external processing
- **Download ready** for spreadsheet applications

## **🎨 UI/UX Principles**

### **Football Manager Style**
- **Data-dense displays** with minimal scrolling
- **Professional appearance** suitable for business use
- **Efficient workflows** for power users
- **Clear visual hierarchy** and organization

### **Responsive Design**
- **Mobile-friendly** layouts
- **Adaptive grids** for different screen sizes
- **Touch-friendly** interactions

## **🔧 Technical Implementation**

### **Components**
- `InventoryDisplay`: Main inventory view with tabs (Parent component)
- `ItemModal`: Add/edit item modal (UI-only, follows ENTITIES_ARCHITECTURE_PATTERN.md)
- `BulkEditModal`: Bulk operations interface
- `InlineEditor`: Inline field editing
- `CSVImport`: Data import functionality

### **Architecture Pattern Compliance**
- **Modal Layer**: ItemModal is UI-only, emits `onSave(item, sideEffects)`
- **Parent Layer**: InventoryDisplay handles DataStore calls and side effects
- **DataStore Layer**: Delegates to appropriate adapter based on environment
- **Workflow Integration**: Item creation triggers logging via entity-workflows.ts

### **Data Management**
- **DataStore**: Adapter-managed persistence (LocalAdapter for dev, HybridAdapter for prod)
- **Environment Detection**: Automatic switching between localStorage and KV storage
- **Real-time updates**: Event-driven refresh system via custom events
- **Architecture**: Follows ENTITIES_ARCHITECTURE_PATTERN.md with proper separation of concerns

### **State Management**
- **React hooks** for local state
- **Custom events** for cross-component communication
- **Persistent storage** with automatic sync

### **Logging Integration**
- **Items Log**: All item operations logged to `items-log` via LoggingDataStore
- **Effects Registry**: Idempotent operations prevent duplicate logging
- **Best of Both Worlds**: Append-only logs with effects registry for idempotency
- **Cross-Environment**: Identical behavior in development and production
- **Workflow Integration**: Item creation, updates, and deletions trigger appropriate logging

## **🚀 Future Enhancements**

### **Planned Features**
- **Image previews** for visual inventory
- **Advanced filtering** and search
- **Inventory analytics** and reporting
- **Multi-location** stock management
- **Barcode scanning** integration

### **Performance Optimizations**
- **Virtual scrolling** for large inventories
- **Lazy loading** of item details
- **Caching strategies** for better performance

## **📚 Related Documentation**
- [THEGAME_WIKI.md](./THEGAME_WIKI.md) - Game system overview
- [ENTITIES_ARCHITECTURE_PATTERN.md](./ENTITIES_ARCHITECTURE_PATTERN.md) - Architecture pattern for all entities
- [LOGGING_ARCHITECTURE.md](./LOGGING_ARCHITECTURE.md) - Best of Both Worlds logging system
- [PROJECT_REQUIREMENTS.md](./PROJECT_REQUIREMENTS.md) - Development guidelines
- [DATA_SYNC_README.md](./DATA_SYNC_README.md) - Data persistence details

---

**Built with ❤️ for the creative community**
